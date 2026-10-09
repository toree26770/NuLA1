import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { API, fmtError, trackEvent } from "@/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

function validateField(q, value) {
  if (q.field_type === "checkbox") {
    if (q.required && !value) return "Votre consentement est nécessaire pour être recontacté";
    return null;
  }
  if (q.field_type === "multichoice") {
    if (q.required && (!value || value.length === 0)) return `« ${q.label} » est requis`;
    return null;
  }
  const v = (value ?? "").toString().trim();
  if (!v) return q.required ? `« ${q.label} » est requis` : null;
  switch (q.field_type) {
    case "email":
      return EMAIL_RE.test(v) ? null : "Le format de l'adresse e-mail est invalide";
    case "phone":
      return PHONE_RE.test(v) ? null : "Numéro de téléphone français invalide";
    case "date": {
      if (q.validation_rules?.min_age) {
        const d = new Date(v);
        if (isNaN(d)) return "Date invalide";
        const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (age < q.validation_rules.min_age) return `Vous devez avoir au moins ${q.validation_rules.min_age} ans`;
      }
      return null;
    }
    case "name":
    case "firstname":
      return /^[A-Za-zÀ-ÖØ-öø-ÿ'’\- ]{2,60}$/.test(v) ? null : "Ce champ est invalide";
    case "cards":
    case "radio":
    case "select":
    case "yesno":
      return null;
    default:
      return null;
  }
}

function Field({ q, value, error, onChange, consentText }) {
  const common = {
    id: `field-${q.question_key}`,
    "data-testid": `field-${q.question_key}`,
  };
  const inputCls = `form-input-premium ${error ? "border-red-400 ring-1 ring-red-300" : ""}`;

  let control = null;
  switch (q.field_type) {
    case "textarea":
      control = <textarea {...common} className={inputCls} rows={4} placeholder={q.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "email":
      control = <input {...common} type="email" className={inputCls} placeholder={q.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} autoComplete="email" />;
      break;
    case "phone":
      control = (
        <div className="flex items-stretch">
          <span className="flex items-center gap-1.5 px-3 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600">
            <span aria-hidden>🇫🇷</span> +33
          </span>
          <input {...common} type="tel" className={`${inputCls} rounded-l-none`} placeholder={q.placeholder || "06 12 34 56 78"} value={value || ""} onChange={(e) => onChange(e.target.value)} autoComplete="tel" />
        </div>
      );
      break;
    case "date":
      control = <input {...common} type="date" className={inputCls} value={value || ""} onChange={(e) => onChange(e.target.value)} max={new Date().toISOString().slice(0, 10)} />;
      break;
    case "number":
    case "amount":
      control = <input {...common} type="number" inputMode="decimal" className={inputCls} placeholder={q.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "select":
      control = (
        <select {...common} className={inputCls} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Sélectionnez…</option>
          {(q.options || []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
      break;
    case "cards":
      control = (
        <div className="space-y-2.5" role="radiogroup" data-testid={`field-${q.question_key}`}>
          {(q.options || []).map((o) => {
            const active = value === o;
            return (
              <button
                type="button"
                key={o}
                data-testid={`card-option-${q.question_key}-${o.slice(0, 12).replace(/\W/g, "-")}`}
                onClick={() => onChange(o)}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm md:text-base font-medium transition-[border-color,background-color] duration-200 ${
                  active ? "border-[#FF683D] bg-[#FF683D]/5 text-[#0B111B]" : "border-gray-200 bg-white text-gray-700 hover:border-[#FF914D]/60"
                }`}
              >
                <span>{o}</span>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${active ? "border-[#FF683D] bg-[#FF683D] text-white" : "border-gray-300 text-transparent"}`}>
                  <Check className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      );
      break;
    case "radio":
    case "yesno": {
      const opts = q.field_type === "yesno" ? ["Oui", "Non"] : q.options || [];
      control = (
        <div className="flex flex-wrap gap-2.5" role="radiogroup" data-testid={`field-${q.question_key}`}>
          {opts.map((o) => (
            <button
              type="button"
              key={o}
              data-testid={`radio-${q.question_key}-${o.slice(0, 10).replace(/\W/g, "-")}`}
              onClick={() => onChange(o)}
              className={`rounded-full border-2 px-5 py-2.5 text-sm font-medium transition-colors ${value === o ? "border-[#FF683D] bg-[#FF683D]/5 text-[#0B111B]" : "border-gray-200 bg-white text-gray-600 hover:border-[#FF914D]/60"}`}
            >
              {o}
            </button>
          ))}
        </div>
      );
      break;
    }
    case "multichoice":
      control = (
        <div className="space-y-2" data-testid={`field-${q.question_key}`}>
          {(q.options || []).map((o) => {
            const arr = Array.isArray(value) ? value : [];
            const checked = arr.includes(o);
            return (
              <label key={o} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:border-[#FF914D]/60 transition-colors">
                <input
                  type="checkbox"
                  data-testid={`multi-${q.question_key}-${o.slice(0, 10).replace(/\W/g, "-")}`}
                  checked={checked}
                  onChange={() => onChange(checked ? arr.filter((x) => x !== o) : [...arr, o])}
                  className="h-5 w-5 accent-[#FF683D]"
                />
                <span className="text-sm text-gray-700">{o}</span>
              </label>
            );
          })}
        </div>
      );
      break;
    case "checkbox": {
      const label = q.question_key === "consent" && consentText ? consentText : q.description || q.label;
      control = (
        <label className="flex items-start gap-3 cursor-pointer" data-testid={`field-${q.question_key}`}>
          <input
            type="checkbox"
            data-testid={`checkbox-${q.question_key}`}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#FF683D]"
          />
          <span className="text-sm leading-relaxed text-gray-600">{label}</span>
        </label>
      );
      break;
    }
    default:
      control = <input {...common} type="text" className={inputCls} placeholder={q.placeholder} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }

  const hideLabel = q.field_type === "checkbox";
  return (
    <div className="space-y-1.5">
      {!hideLabel && (
        <label htmlFor={`field-${q.question_key}`} className="block text-sm font-medium text-gray-700">
          {q.label} {q.required && <span className="text-[#FF683D]">*</span>}
        </label>
      )}
      {!hideLabel && q.description && q.field_type !== "cards" && <p className="text-xs text-gray-500">{q.description}</p>}
      {q.field_type === "cards" && q.description && <p className="text-xs text-gray-500 mb-1">{q.description}</p>}
      {control}
      {error && <p data-testid={`error-${q.question_key}`} className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function DynamicForm({ form, texts, tracking, preview = false, compact = false }) {
  const steps = form?.steps || [];
  const questions = form?.questions || [];
  const stepQuestions = useMemo(
    () => steps.map((s) => questions.filter((q) => q.step_id === s.id)),
    [steps, questions]
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const honeypotRef = useRef(null);
  const startedAtRef = useRef(new Date().toISOString());
  const startedRef = useRef(false);

  const t = texts || {};
  const total = steps.length || 1;
  const currentQuestions = stepQuestions[stepIndex] || [];
  const isLast = stepIndex === total - 1;

  useEffect(() => {
    if (preview) return;
    trackEvent("step_view", { step_index: stepIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const setValue = (key, v) => {
    if (!preview && !startedRef.current) {
      startedRef.current = true;
      trackEvent("form_start", { step_index: stepIndex });
    }
    setAnswers((prev) => ({ ...prev, [key]: v }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateStep = () => {
    const next = {};
    for (const q of currentQuestions) {
      const err = validateField(q, answers[q.question_key]);
      if (err) next[q.question_key] = err;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (preview) return;
    if (!validateStep()) return;
    setStepIndex((i) => Math.min(i + 1, total - 1));
  };

  const submit = async () => {
    if (preview || submitting) return;
    if (!validateStep()) return;
    setSubmitting(true);
    setGlobalError("");
    try {
      await API.post("/leads", {
        form_version_id: form.version.id,
        answers,
        meta: { ...tracking, started_at: startedAtRef.current, website: honeypotRef.current?.value || "" },
      });
      trackEvent("form_submit", { step_index: stepIndex });
      setDone(true);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (detail && typeof detail === "object" && !Array.isArray(detail)) {
        setErrors(detail);
        const firstKey = Object.keys(detail)[0];
        const idx = stepQuestions.findIndex((qs) => qs.some((q) => q.question_key === firstKey));
        if (idx >= 0) setStepIndex(idx);
      } else {
        setGlobalError(fmtError(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!steps.length) return null;

  if (done) {
    return (
      <motion.div
        data-testid="form-confirmation"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="text-center py-10 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 14 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF683D]/10"
        >
          <CheckCircle2 className="h-9 w-9 text-[#FF683D]" />
        </motion.div>
        <h3 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B] mb-3">{t.confirm_title}</h3>
        <p className="text-gray-600 leading-relaxed max-w-md mx-auto">{t.confirm_text}</p>
      </motion.div>
    );
  }

  const stepLabel = (t.step_label || "Étape {current} sur {total}").replace("{current}", stepIndex + 1).replace("{total}", total);

  return (
    <div data-testid="dynamic-form">
      {!compact && (
        <div className="mb-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#FF683D] uppercase mb-2">{t.eyebrow}</p>
          <h3 className="font-display text-2xl md:text-[1.7rem] font-bold text-[#0B111B] leading-snug">{t.title}</h3>
          <p className="mt-1.5 text-sm text-gray-500">{t.subtitle}</p>
        </div>
      )}

      <div className="mb-5" data-testid="form-progress">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
          <span>{stepLabel}</span>
          <span>{steps[stepIndex]?.title}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#FF683D]"
            initial={false}
            animate={{ width: `${((stepIndex + 1) / total) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Honeypot anti-bot : invisible pour les humains */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -24, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-4"
        >
          {currentQuestions.map((q) => (
            <Field
              key={q.id || q.question_key}
              q={q}
              value={answers[q.question_key]}
              error={errors[q.question_key]}
              onChange={(v) => setValue(q.question_key, v)}
              consentText={t.consent_text}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {globalError && <p data-testid="form-global-error" className="mt-4 text-sm text-red-600">{globalError}</p>}

      <div className={`mt-6 flex gap-3 ${stepIndex > 0 ? "" : ""}`}>
        {stepIndex > 0 && (
          <button
            type="button"
            data-testid="form-back-btn"
            onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
            className="rounded-xl border border-gray-300 px-5 py-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> {t.back_label || "RETOUR"}
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            data-testid="form-submit-btn"
            disabled={submitting || preview}
            onClick={submit}
            className="btn-primary-orange flex-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "ENVOI EN COURS…" : (t.submit_label || "VALIDER MA DEMANDE")} <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="form-continue-btn"
            onClick={goNext}
            className="btn-primary-orange flex-1"
          >
            {t.continue_label || "CONTINUER"} <ArrowRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {isLast && t.privacy_link_text && (
        <p className="mt-3 text-center text-xs text-gray-400">
          <a href="#confidentialite" data-testid="privacy-link" className="underline hover:text-[#FF683D] transition-colors">{t.privacy_link_text}</a>
        </p>
      )}
    </div>
  );
}
