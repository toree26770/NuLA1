import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, CreditCard, Clock, ShieldCheck, Check, ChevronDown, ArrowRight,
} from "lucide-react";
import { API, getSessionId, trackLivret } from "@/api";
import { applyLivretBranding } from "@/defenseBase";
import { loadPixels, trackSingle } from "@/metaPixel";

const NAVY = "#0B1B3A";
const ORANGE = "#FF6B3D";
const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.6, ease: "easeOut" } };

const FR_PREFIXES = [
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+590", label: "🇬🇵 Guadeloupe (+590)" },
  { code: "+596", label: "🇲🇶 Martinique (+596)" },
  { code: "+594", label: "🇬🇫 Guyane (+594)" },
  { code: "+262", label: "🇷🇪 Réunion (+262)" },
  { code: "+262", label: "🇾🇹 Mayotte (+262)" },
  { code: "+508", label: "🇵🇲 Saint-Pierre-et-Miquelon (+508)" },
  { code: "+590", label: "🇧🇱 Saint-Barthélemy (+590)" },
  { code: "+590", label: "🇲🇫 Saint-Martin (+590)" },
  { code: "+687", label: "🇳🇨 Nouvelle-Calédonie (+687)" },
  { code: "+689", label: "🇵🇫 Polynésie française (+689)" },
  { code: "+681", label: "🇼🇫 Wallis-et-Futuna (+681)" },
];

function composePhone(prefix, local) {
  const digits = (local || "").replace(/[^\d]/g, "").replace(/^0+/, "");
  return digits ? `${prefix}${digits}` : "";
}

const FAQ = [
  { q: "Qu'est-ce qu'un compte rémunéré ?", a: "Un compte rémunéré est un placement sur lequel votre épargne génère des intérêts, tout en restant disponible. Le Super Livret applique un taux boosté de 5 % brut garanti pendant 12 mois." },
  { q: "Quelle est la différence entre le Livret A et un super livret ?", a: "Le Livret A est un placement réglementé dont le taux est fixé par l'État. Le Super Livret est une offre commerciale qui propose un taux boosté temporaire, ici 5 % brut garanti pendant 12 mois dans la limite de 75 000 €." },
  { q: "Le taux de 5 % brut est-il garanti pendant toute la durée du placement ?", a: "Le taux de 5 % brut est garanti pendant 12 mois, dans la limite de 75 000 € versés. Au-delà de cette période, le taux appliqué peut évoluer selon les conditions en vigueur." },
  { q: "Mon capital est-il garanti sur ce compte rémunéré ?", a: "Oui : le capital versé est garanti à 100 %, sans exposition aux marchés financiers." },
  { q: "Puis-je retirer mon argent à tout moment ?", a: "Oui, vos fonds restent disponibles à tout moment, sans blocage ni pénalité de retrait." },
  { q: "Quel est le plafond de versement du Super Livret ?", a: "Le taux boosté de 5 % brut s'applique dans la limite de 75 000 € versés par titulaire." },
  { q: "Comment sont imposés les intérêts de ce placement financier ?", a: "Les intérêts sont soumis au prélèvement forfaitaire unique (PFU) de 30 %, sauf option pour le barème de l'impôt sur le revenu. La simulation présentée est fournie à titre indicatif." },
];

// ---------------------------------------------------------------------------
// Formulaire d'éligibilité (dynamique, lit le formulaire publié /livret)
// ---------------------------------------------------------------------------
function EligibilityForm({ idPrefix = "livret", form, content }) {
  const tid = (s) => `${idPrefix}-${s}`;
  const steps = form?.steps || [];
  const questionsByStep = useMemo(() => {
    const map = {};
    (form?.questions || []).forEach((q) => { (map[q.step_id] = map[q.step_id] || []).push(q); });
    return map;
  }, [form]);
  const ft = content?.form_texts || {};

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phones, setPhones] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const honey = useRef(null);
  const startedAt = useRef(null);
  const startedTracked = useRef(false);

  const touch = () => {
    if (!startedTracked.current) {
      startedTracked.current = true;
      startedAt.current = new Date().toISOString();
      trackLivret("form_start");
    }
  };

  const set = (k, v) => { touch(); setAnswers((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const updatePhone = (k, idx, loc) => {
    touch();
    setPhones((p) => ({ ...p, [k]: { prefix: idx, local: loc } }));
    setAnswers((p) => ({ ...p, [k]: composePhone(FR_PREFIXES[idx].code, loc) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => { if (startedTracked.current) trackLivret("step_view", { step_index: step }); }, [step]);

  useEffect(() => {
    if (!startedTracked.current || done) return;
    const t = setTimeout(() => {
      let campaign = ""; try { campaign = localStorage.getItem("livret_campaign") || ""; } catch {}
      API.post("/livret/leads/partial", {
        session_id: getSessionId(), step_index: step, answers,
        meta: { campaign, website: honey.current?.value || "" },
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [answers, step, done]);

  const validateStep = (idx) => {
    const e = {};
    (questionsByStep[steps[idx]?.id] || []).forEach((q) => {
      const v = answers[q.question_key];
      if (q.field_type === "checkbox") {
        if (q.required && v !== true) e[q.question_key] = "Votre accord est requis.";
      } else if (q.required && (!v || String(v).trim() === "")) {
        e[q.question_key] = "Ce champ est requis.";
      } else if (q.field_type === "email" && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
        e[q.question_key] = "E-mail invalide.";
      } else if (q.field_type === "phone" && v && !/^\+?\d{8,15}$/.test(String(v).replace(/[\s.\-]/g, ""))) {
        e[q.question_key] = "Numéro invalide.";
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validateStep(step)) return;
    setSubmitting(true);
    try {
      const campaign = (() => { try { return localStorage.getItem("livret_campaign") || ""; } catch { return ""; } })();
      const pixelIds = window.__livretPixelIds || [];
      await API.post("/livret/leads", {
        form_version_id: form.version.id,
        answers,
        meta: { session_id: getSessionId(), campaign, pixel_ids: pixelIds, started_at: startedAt.current, website: honey.current?.value || "" },
      });
      trackLivret("form_submit");
      pixelIds.forEach((id) => trackSingle(id, "Lead"));
      setDone(true);
    } catch (err) {
      const d = err?.response?.data?.detail;
      if (d && typeof d === "object") { setErrors(d); setStep(0); }
      else setErrors({ _global: typeof d === "string" ? d : "Une erreur est survenue. Réessayez." });
    } finally { setSubmitting(false); }
  };

  const inputCls = "w-full rounded-xl border-2 border-[#0B1B3A]/10 bg-[#F4F5FA] px-4 py-3 text-[#0B1B3A] outline-none focus:border-[#FF6B3D] focus:ring-4 focus:ring-[#FF6B3D]/10 transition font-['Manrope']";
  const lbl = "block text-sm font-semibold text-[#0B1B3A] mb-1.5 font-['Manrope']";

  if (!form || !steps.length) {
    return <div className="py-10 text-center text-[#0B1B3A]/50 font-['Manrope']" data-testid={tid("form-loading")}>Chargement du formulaire…</div>;
  }

  if (done) {
    return (
      <div className="text-center py-8" data-testid={tid("confirmation")}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#16A34A]/10">
          <Check className="h-8 w-8 text-[#16A34A]" />
        </div>
        <h3 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#0B1B3A]">{ft.confirm_title || "Votre demande a bien été enregistrée"}</h3>
        <p className="mt-3 text-[#0B1B3A]/70 font-['Manrope']">{ft.confirm_text || "Merci. Un conseiller pourra vous recontacter afin de vous présenter le Super Livret."}</p>
      </div>
    );
  }

  const renderField = (q) => {
    const k = q.question_key;
    const v = answers[k];
    const err = errors[k];
    const errEl = err ? <p className="mt-1 text-xs text-[#E8542A]">{err}</p> : null;

    if (q.field_type === "checkbox") {
      return (
        <div key={k}>
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-[#0B1B3A]/10 bg-[#F4F5FA] p-3.5">
            <input type="checkbox" data-testid={tid("consent")} checked={v === true} onChange={(e) => set(k, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#FF6B3D]" />
            <span className="text-sm text-[#0B1B3A]/75 font-['Manrope']">{ft.consent_text || "J'accepte d'être recontacté(e) et la politique de confidentialité."}</span>
          </label>
          {errEl}
        </div>
      );
    }

    if (q.field_type === "phone") {
      const ph = phones[k] || { prefix: 0, local: "" };
      return (
        <div key={k}>
          <label className={lbl}>{q.label}</label>
          <div className="flex items-stretch gap-2">
            <select data-testid={tid("phone-prefix")} aria-label="Indicatif" value={ph.prefix} onChange={(e) => updatePhone(k, Number(e.target.value), ph.local)} className={`${inputCls} !w-auto !px-2 shrink-0 max-w-[9.5rem] text-sm cursor-pointer`}>
              {FR_PREFIXES.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
            </select>
            <input data-testid={tid("phone")} type="tel" inputMode="tel" className={inputCls} placeholder={q.placeholder || "6 12 34 56 78"} value={ph.local} onChange={(e) => updatePhone(k, ph.prefix, e.target.value)} autoComplete="tel" />
          </div>
          {errEl}
        </div>
      );
    }

    if (q.field_type === "select") {
      return (
        <div key={k}>
          <label className={lbl}>{q.label}</label>
          <select data-testid={tid(k)} className={inputCls} value={v || ""} onChange={(e) => set(k, e.target.value)}>
            <option value="">Sélectionnez…</option>
            {(q.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {errEl}
        </div>
      );
    }

    if (["radio", "yesno", "cards"].includes(q.field_type)) {
      const opts = q.options && q.options.length ? q.options : (q.field_type === "yesno" ? ["Oui", "Non"] : []);
      return (
        <div key={k}>
          <label className={lbl}>{q.label}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid={tid(k)}>
            {opts.map((o) => (
              <button type="button" key={o} onClick={() => set(k, o)} className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium font-['Manrope'] transition-colors ${v === o ? "border-[#FF6B3D] bg-[#FF6B3D]/5 text-[#0B1B3A]" : "border-[#0B1B3A]/10 bg-[#F4F5FA] text-[#0B1B3A]/80 hover:border-[#FF6B3D]/40"}`}>{o}</button>
            ))}
          </div>
          {errEl}
        </div>
      );
    }

    if (q.field_type === "textarea") {
      return (
        <div key={k}>
          <label className={lbl}>{q.label}</label>
          <textarea data-testid={tid(k)} rows={3} className={inputCls} placeholder={q.placeholder || ""} value={v || ""} onChange={(e) => set(k, e.target.value)} />
          {errEl}
        </div>
      );
    }

    const inputType = q.field_type === "email" ? "email" : q.field_type === "date" ? "date" : "text";
    const testKey = k === "first_name" ? "first-name" : k === "last_name" ? "last-name" : k;
    return (
      <div key={k}>
        <label className={lbl}>{q.label}</label>
        <input data-testid={tid(testKey)} type={inputType} className={inputCls} placeholder={q.placeholder || ""} value={v || ""} onChange={(e) => set(k, e.target.value)} />
        {errEl}
      </div>
    );
  };

  const isLast = step === steps.length - 1;
  const stepQuestions = questionsByStep[steps[step]?.id] || [];

  return (
    <div data-testid={tid("form")}>
      <div className="mb-6 flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.id} className="flex-1">
            <div className={`h-1.5 rounded-full ${step >= i ? "bg-[#FF6B3D]" : "bg-[#0B1B3A]/10"}`} />
            <span className="mt-1.5 block text-xs font-medium text-[#0B1B3A]/60 font-['Manrope']">Étape {i + 1} sur {steps.length}</span>
          </div>
        ))}
      </div>

      <input ref={honey} type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" aria-hidden />

      <div className="space-y-4">
        {stepQuestions.map(renderField)}
        {errors._global && <p className="text-xs text-[#E8542A]">{errors._global}</p>}
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-full border-2 border-[#0B1B3A]/15 px-5 py-3.5 font-semibold text-[#0B1B3A] hover:bg-[#F4F5FA] transition-colors font-['Manrope']">Retour</button>
          )}
          {isLast ? (
            <button type="button" data-testid={tid("submit")} onClick={submit} disabled={submitting} className="flex-1 rounded-full bg-[#FF6B3D] px-6 py-3.5 font-bold text-white hover:bg-[#E8542A] transition-colors font-['Manrope'] disabled:opacity-60 shadow-lg shadow-[#FF6B3D]/30">
              {submitting ? "Envoi…" : (ft.submit_label || "Vérifier mon éligibilité")}
            </button>
          ) : (
            <button type="button" data-testid={tid("continue")} onClick={() => validateStep(step) && setStep(step + 1)} className="flex-1 rounded-full bg-[#FF6B3D] px-6 py-3.5 font-bold text-white hover:bg-[#E8542A] transition-colors font-['Manrope'] inline-flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B3D]/30">
              {ft.continue_label || "Continuer"} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-[#0B1B3A]/45 font-['Manrope']">Demande gratuite et sans engagement.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Stat({ value, label }) {
  return (
    <div>
      <p className="font-['Bricolage_Grotesque'] text-3xl sm:text-4xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-sm text-white/55 font-['Manrope']">{label}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <motion.div {...fade} className="rounded-3xl bg-white p-7 shadow-[0_10px_40px_-15px_rgba(11,27,58,0.18)]" data-testid="livret-feature">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF0F7]">
        <Icon className="h-7 w-7 text-[#2A4BE0]" />
      </div>
      <h3 className="text-center font-['Bricolage_Grotesque'] text-xl font-extrabold text-[#0B1B3A]">{title}</h3>
      <p className="mt-2 text-center text-[#64748B] font-['Manrope'] leading-relaxed">{text}</p>
    </motion.div>
  );
}

function CookieBanner({ onAccept }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-[#0B1B3A] text-white" data-testid="livret-cookie-banner">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/80 font-['Manrope']">
          Nous utilisons des cookies, dont des cookies de mesure publicitaire, pour améliorer votre expérience et évaluer nos campagnes. En poursuivant, vous les acceptez.
        </p>
        <button type="button" data-testid="livret-cookie-accept" onClick={onAccept} className="shrink-0 rounded-full bg-[#FF6B3D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#E8542A] transition-colors">Accepter</button>
      </div>
    </div>
  );
}

export default function LivretLanding() {
  const [openFaq, setOpenFaq] = useState(0);
  const [form, setForm] = useState(null);
  const [content, setContent] = useState(null);
  const [amount, setAmount] = useState(10000);
  const [cookieOk, setCookieOk] = useState(() => { try { return localStorage.getItem("livret_cookie") === "1"; } catch { return false; } });

  const campaign = useMemo(() => {
    let c = (new URLSearchParams(window.location.search).get("campaign") || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
    try { if (c) localStorage.setItem("livret_campaign", c); else c = localStorage.getItem("livret_campaign") || ""; } catch {}
    return c;
  }, []);

  useEffect(() => {
    applyLivretBranding();
    API.get("/livret/form/published").then((r) => setForm(r.data)).catch(() => {});
    API.get("/livret/content").then((r) => setContent(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    trackLivret("page_view", { meta: { campaign } });
    API.get(`/livret/pixels/active${campaign ? `?campaign=${encodeURIComponent(campaign)}` : ""}`).then((r) => {
      const ids = (r.data.pixels || []).map((p) => p.pixel_id);
      window.__livretPixelIds = ids;
      if (ids.length) loadPixels(ids).then(() => ids.forEach((id) => trackSingle(id, "PageView"))).catch(() => {});
    }).catch(() => {});
  }, [campaign]);

  const acceptCookie = () => { try { localStorage.setItem("livret_cookie", "1"); } catch {} setCookieOk(true); };
  const scrollToForm = () => { document.getElementById("livret-form-top")?.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const euro = (n) => n.toLocaleString("fr-FR");
  const grossInterest = Math.round(amount * 0.05);
  const pfu = Math.round(grossInterest * 0.30);
  const netTotal = amount + (grossInterest - pfu);

  return (
    <div className="min-h-screen bg-[#EEF0F7] font-['Manrope'] text-[#0B1B3A]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#0B1B3A]/5 bg-[#EEF0F7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2" data-testid="livret-logo">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B1B3A] text-sm font-extrabold text-white font-['Bricolage_Grotesque']">SL</span>
            <span className="font-['Bricolage_Grotesque'] text-lg font-extrabold">Super <span className="text-[#FF6B3D]">Livret</span></span>
          </div>
          <button type="button" data-testid="livret-header-cta" onClick={scrollToForm} className="rounded-full bg-[#FF6B3D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E8542A] transition-colors shadow-lg shadow-[#FF6B3D]/25">
            Vérifier mon éligibilité
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1B3A]">
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-[#FF6B3D]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-5 inline-flex items-center gap-2 text-sm font-semibold tracking-widest text-[#FF6B3D]">
              <span className="h-2 w-2 rounded-full bg-[#FF6B3D]" /> COMPTE RÉMUNÉRÉ — SUPER LIVRET
            </p>
            <h1 className="font-['Bricolage_Grotesque'] text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl">
              Un compte rémunéré à <span className="text-[#FF6B3D]">5 % brut garanti</span>, pour faire vraiment travailler votre épargne
            </h1>
            <p className="mt-6 max-w-xl text-base text-white/70 sm:text-lg leading-relaxed">
              Le Super Livret est un placement financier sans risque : capital garanti à 100 %, aucun frais de gestion, et un taux boosté à 5 % brut pendant 12 mois, dans la limite de 75 000 € par titulaire. Vos fonds restent disponibles à tout moment.
            </p>
            <div className="mt-9 grid grid-cols-3 gap-6 border-t border-white/10 pt-7">
              <Stat value="5%" label="garanti 12 mois" />
              <Stat value="100%" label="capital garanti" />
              <Stat value="0€" label="frais de gestion" />
            </div>
          </motion.div>

          {/* Form card */}
          <motion.div id="livret-form-top" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#0B1B3A]">{content?.form_texts?.title || "Vérifiez votre éligibilité en 1 minute"}</h2>
            <p className="mt-2 mb-6 text-sm text-[#64748B]">{content?.form_texts?.subtitle || "Répondez à quelques questions rapides pour savoir si ce Livret d'épargne correspond à votre profil d'épargnant."}</p>
            <EligibilityForm idPrefix="livret" form={form} content={content} />
          </motion.div>
        </div>
      </section>

      {/* Pourquoi choisir */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <motion.div {...fade} className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-[#FF6B3D]">● POURQUOI CHOISIR CE PLACEMENT</p>
          <h2 className="font-['Bricolage_Grotesque'] text-3xl font-extrabold leading-tight text-[#0B1B3A] sm:text-4xl">
            Un compte rémunéré pensé pour l'épargne de précaution comme pour vos projets
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={Clock} title="0 frais" text="Aucuns frais d'entrée, de gestion ou de sortie sur votre Super Livret." />
          <Feature icon={ShieldCheck} title="Capital garanti à 100%" text="Votre épargne est intégralement protégée, sans exposition aux marchés financiers." />
          <Feature icon={TrendingUp} title="Taux boosté à 5% brut" text="Un rendement garanti pendant 12 mois, dans la limite de 75 000 € versés." />
          <Feature icon={CreditCard} title="Argent disponible à tout moment" text="Aucun blocage : retirez vos fonds quand vous le souhaitez, sans pénalité." />
        </div>

        {/* Rendement comparison */}
        <motion.div {...fade} className="mx-auto mt-12 max-w-3xl rounded-3xl bg-[#FDEBE2] p-7 sm:p-9" data-testid="livret-rendement">
          <div className="flex items-center justify-between gap-4">
            <span className="font-['Bricolage_Grotesque'] text-lg font-extrabold text-[#0B1B3A]">Rendement</span>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#0B1B3A] px-5 py-3 text-center text-white">
                <p className="font-['Bricolage_Grotesque'] text-2xl font-extrabold">1,70%<span className="align-super text-xs">*</span></p>
                <p className="text-xs text-white/60">en 2026</p>
              </div>
              <div className="rounded-2xl bg-[#FF6B3D] px-5 py-3 text-center text-white">
                <p className="font-['Bricolage_Grotesque'] text-2xl font-extrabold">5%<span className="align-super text-xs">**</span></p>
                <p className="text-xs text-white/80">en 2026</p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm text-[#64748B]">*Taux du Livret A en vigueur (source : Banque de France). **Taux annuel brut garanti pendant 12 mois sur le Super Livret, hors fiscalité applicable, dans la limite de 75 000 €.</p>
        </motion.div>
      </section>

      {/* Comparatif */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-5">
          <motion.div {...fade} className="text-center">
            <h2 className="font-['Bricolage_Grotesque'] text-3xl font-extrabold leading-tight text-[#0B1B3A] sm:text-4xl">Comparatif du Livret A et de notre Super Livret</h2>
            <p className="mx-auto mt-5 max-w-2xl text-[#64748B] leading-relaxed">Le Livret A reste le placement réglementé le plus répandu en France, mais son taux ne suit pas toujours le coût de la vie. Voici comment il se compare au Super Livret.</p>
          </motion.div>

          <motion.div {...fade} className="mx-auto mt-10 max-w-2xl rounded-3xl bg-[#FDEBE2] p-6 sm:p-8" data-testid="livret-comparatif">
            <div className="mb-2 flex items-center justify-end gap-3">
              <span className="rounded-full bg-[#0B1B3A] px-5 py-2 text-sm font-bold text-white">Livret A</span>
              <span className="rounded-full bg-[#FF6B3D] px-5 py-2 text-sm font-bold text-white">Super Livret</span>
            </div>
            {[
              { label: "Versement libre", a: true, b: true },
              { label: "Disponible à tout moment", a: true, b: true },
              { label: "Fonds garantis", a: true, b: true },
              { label: "Taux boosté à 5 % brut", a: false, b: true },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-[#0B1B3A]/10 py-4">
                <span className="font-semibold text-[#0B1B3A]">{row.label}</span>
                <span className="flex w-20 justify-center">{row.a ? <Check className="h-5 w-5 text-[#16A34A]" strokeWidth={3} /> : <span className="text-[#0B1B3A]/30">—</span>}</span>
                <span className="flex w-20 justify-center">{row.b ? <Check className="h-5 w-5 text-[#16A34A]" strokeWidth={3} /> : <span className="text-[#0B1B3A]/30">—</span>}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Simulateur */}
      <section className="mx-auto max-w-4xl px-5 py-16 lg:py-24">
        <motion.div {...fade} className="text-center">
          <p className="mb-3 text-sm font-semibold tracking-widest text-[#FF6B3D]">● SIMULATEUR</p>
          <h2 className="font-['Bricolage_Grotesque'] text-3xl font-extrabold leading-tight text-[#0B1B3A] sm:text-4xl">Estimez les intérêts de votre placement financier</h2>
          <p className="mx-auto mt-5 max-w-2xl text-[#64748B] leading-relaxed">Simulation basée sur le taux boosté de 5 % brut garanti pendant 12 mois, dans la limite de 75 000 €.</p>
        </motion.div>

        <motion.div {...fade} className="mx-auto mt-10 max-w-2xl rounded-3xl bg-white p-7 shadow-[0_10px_40px_-15px_rgba(11,27,58,0.2)] sm:p-9" data-testid="livret-simulateur">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-[#0B1B3A]/70">Montant placé</span>
            <span className="font-['Bricolage_Grotesque'] text-3xl font-extrabold text-[#0B1B3A]" data-testid="livret-sim-amount">{euro(amount)} €</span>
          </div>
          <input
            type="range" min={500} max={75000} step={500} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            data-testid="livret-sim-slider"
            className="mt-5 w-full accent-[#FF6B3D]"
          />
          <div className="mt-8 rounded-2xl bg-[#F4F5FA] p-6">
            <div className="flex items-center justify-between border-b border-dashed border-[#0B1B3A]/15 py-3">
              <span className="text-[#64748B]">Intérêts bruts (12 mois)</span>
              <span className="font-['Bricolage_Grotesque'] text-lg font-extrabold text-[#0B1B3A]">{euro(grossInterest)} €</span>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-[#0B1B3A]/15 py-3">
              <span className="text-[#64748B]">Prélèvement forfaitaire unique (30%)</span>
              <span className="font-['Bricolage_Grotesque'] text-lg font-extrabold text-[#0B1B3A]">{euro(pfu)} €</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="font-semibold text-[#0B1B3A]">Capital + intérêts nets estimés</span>
              <span className="font-['Bricolage_Grotesque'] text-xl font-extrabold text-[#FF6B3D]" data-testid="livret-sim-net">{euro(netTotal)} €</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-[#64748B]">Simulation non contractuelle sur une durée de 12 mois, réalisée à titre indicatif à partir du taux de 5 % brut garanti.</p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-5">
          <motion.div {...fade} className="text-center">
            <p className="mb-3 text-sm font-semibold tracking-widest text-[#FF6B3D]">● QUESTIONS FRÉQUENTES</p>
            <h2 className="font-['Bricolage_Grotesque'] text-3xl font-extrabold leading-tight text-[#0B1B3A] sm:text-4xl">Tout savoir sur le compte rémunéré et le Super Livret</h2>
          </motion.div>
          <div className="mt-10 space-y-3" data-testid="livret-faq">
            {FAQ.map((item, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-[#F4F5FA]">
                <button
                  type="button"
                  data-testid={`livret-faq-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-['Bricolage_Grotesque'] text-base font-bold text-[#0B1B3A]">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#FF6B3D] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="px-6 pb-5 text-[#64748B] leading-relaxed">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Second form */}
      <section className="bg-[#0B1B3A] py-16 lg:py-24">
        <div className="mx-auto max-w-xl px-5">
          <motion.div {...fade} className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#0B1B3A]">{content?.form_texts?.title || "Vérifiez votre éligibilité en 1 minute"}</h2>
            <p className="mt-2 mb-6 text-sm text-[#64748B]">{content?.form_texts?.subtitle || "Répondez à quelques questions rapides pour savoir si ce Livret d'épargne correspond à votre profil d'épargnant."}</p>
            <EligibilityForm idPrefix="livret-bottom" form={form} content={content} />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#081425] py-10 text-center">
        <div className="mx-auto max-w-4xl px-5">
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-extrabold text-white font-['Bricolage_Grotesque']">SL</span>
            <span className="font-['Bricolage_Grotesque'] text-base font-extrabold text-white">Super Livret</span>
          </div>
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-white/45">
            {content?.brand?.footer_line || "Demande d'informations gratuite et sans engagement."} Les taux et conditions présentés sont fournis à titre indicatif et non contractuel. Un conseiller pourra vous recontacter pour vous présenter l'offre, ses conditions et ses modalités.
          </p>
        </div>
      </footer>

      {!cookieOk && <CookieBanner onAccept={acceptCookie} />}
    </div>
  );
}
