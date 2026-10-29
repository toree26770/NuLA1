import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, TrendingUp, CalendarCheck, Wallet, Lock, FileText, Users, PhoneCall,
  ChevronDown, Check, ArrowRight,
} from "lucide-react";
import { API, getSessionId, trackDefense } from "@/api";
import { applyDefenseBranding } from "@/defenseBase";
import { loadPixels, trackSingle } from "@/metaPixel";

const NAVY = "#071D3A";
const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.6, ease: "easeOut" } };
const heroFade = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: "easeOut" } };

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

const FEATURES = [
  { icon: TrendingUp, title: "7,10 % net annuel", text: "Un rendement annoncé, présenté avec ses conditions d'application selon les documents contractuels." },
  { icon: ShieldCheck, title: "Capital garanti", text: "La nature, l'étendue et le fournisseur de la garantie sont précisés dans les conditions de l'offre." },
  { icon: CalendarCheck, title: "Intérêts mensuels", text: "Le calendrier et les modalités de versement des intérêts sont détaillés dans le contrat." },
  { icon: Wallet, title: "Disponibilité des fonds", text: "Les conditions de retrait et d'éventuelles restrictions sont indiquées selon l'offre." },
];

const ADVANTAGES = [
  { icon: FileText, title: "Caractéristiques claires", text: "Des informations expliquées simplement, sans jargon." },
  { icon: Users, title: "Conditions consultables", text: "Les conditions d'accès au livret sont transparentes." },
  { icon: Lock, title: "Sans engagement", text: "Une demande d'information gratuite, sans obligation de souscription." },
  { icon: PhoneCall, title: "Accompagnement", text: "Un conseiller vous aide à comprendre les modalités du produit." },
];

const STEPS = [
  { n: "01", title: "Découvrez le livret", text: "Consultez ses caractéristiques et ses conditions." },
  { n: "02", title: "Vérifiez votre éligibilité", text: "Remplissez un court formulaire de demande d'information." },
  { n: "03", title: "Échangez avec un conseiller", text: "Un interlocuteur vous présente les informations utiles, sans obligation de souscription." },
];

const FAQ = [
  { q: "Le Livret Défense est-il réservé aux militaires ?", a: "Non. Le Livret d'Épargne Défense est présenté comme accessible à tous les particuliers remplissant les conditions, indépendamment de leur profession." },
  { q: "Qui peut demander des informations ?", a: "Toute personne majeure intéressée : salarié, indépendant, retraité ou militaire peut consulter les conditions et demander une étude d'éligibilité." },
  { q: "Comment fonctionne le taux annuel ?", a: "Le taux net annuel annoncé s'applique selon les conditions précisées dans les documents contractuels du produit." },
  { q: "Comment sont versés les intérêts ?", a: "Les modalités et le calendrier de versement sont décrits dans les conditions de l'offre." },
  { q: "Quelles sont les conditions de retrait ?", a: "La disponibilité des fonds et d'éventuelles restrictions sont indiquées dans le contrat." },
  { q: "Quelles sont les garanties applicables ?", a: "La nature et l'étendue de la garantie du capital, ainsi que son fournisseur, sont précisées dans les documents du produit." },
  { q: "Une demande d'information engage-t-elle à souscrire ?", a: "Non. La demande est gratuite et sans engagement de souscription." },
];

function Tricolore({ className = "" }) {
  return (
    <div className={`flex h-full w-full ${className}`} aria-hidden>
      <span className="flex-1 bg-[#0055A4]" />
      <span className="flex-1 bg-white" />
      <span className="flex-1 bg-[#EF4135]" />
    </div>
  );
}

function Logo({ dark = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="defense-logo">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#071D3A] ring-1 ring-white/10 shadow-sm">
        <span className="font-['Bricolage_Grotesque'] text-[15px] font-extrabold leading-none tracking-tight text-white">LD</span>
        <span className="absolute inset-x-[3px] bottom-[3px] flex h-[3px] overflow-hidden rounded-full" aria-hidden>
          <span className="flex-1 bg-[#2E5AA8]" />
          <span className="flex-1 bg-white" />
          <span className="flex-1 bg-[#C8102E]" />
        </span>
      </span>
      <span className="leading-none">
        <span className={`block font-['Bricolage_Grotesque'] text-[17px] font-extrabold tracking-tight ${dark ? "text-white" : "text-[#071D3A]"}`}>Livret Défense</span>
        <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.22em] ${dark ? "text-white/45" : "text-[#163A63]/60"}`}>Épargne patrimoniale</span>
      </span>
    </div>
  );
}

function CookieBanner({ onAccept }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[#163A63]/20 bg-white/95 backdrop-blur px-5 py-4 shadow-[0_-4px_20px_rgba(7,29,58,0.08)]" data-testid="defense-cookie-banner">
      <div className="mx-auto max-w-5xl flex flex-col md:flex-row md:items-center gap-3">
        <p className="flex-1 text-sm text-[#071D3A]/75 font-['Manrope']">
          Nous utilisons des cookies, dont des cookies de mesure publicitaire, pour améliorer votre expérience et évaluer nos campagnes. En poursuivant, vous les acceptez.
        </p>
        <button type="button" data-testid="defense-cookie-accept" onClick={onAccept} className="shrink-0 rounded-md bg-[#C8102E] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#a60d26] transition-colors">Accepter</button>
      </div>
    </div>
  );
}

function EligibilityForm({ idPrefix = "defense", form, content }) {
  const tid = (s) => `${idPrefix}-${s}`;
  const steps = (form?.steps || []);
  const questionsByStep = useMemo(() => {
    const map = {};
    (form?.questions || []).forEach((q) => { (map[q.step_id] = map[q.step_id] || []).push(q); });
    return map;
  }, [form]);
  const ft = content?.form_texts || {};

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phones, setPhones] = useState({}); // key -> {prefix, local}
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
      trackDefense("form_start");
    }
  };

  const set = (k, v) => { touch(); setAnswers((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const updatePhone = (k, idx, loc) => {
    touch();
    setPhones((p) => ({ ...p, [k]: { prefix: idx, local: loc } }));
    setAnswers((p) => ({ ...p, [k]: composePhone(FR_PREFIXES[idx].code, loc) }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  useEffect(() => { if (startedTracked.current) trackDefense("step_view", { step_index: step }); }, [step]);

  useEffect(() => {
    if (!startedTracked.current || done) return;
    const t = setTimeout(() => {
      let campaign = ""; try { campaign = localStorage.getItem("defense_campaign") || ""; } catch {}
      API.post("/defense/leads/partial", {
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
      const campaign = (() => { try { return localStorage.getItem("defense_campaign") || ""; } catch { return ""; } })();
      const pixelIds = window.__defensePixelIds || [];
      await API.post("/defense/leads", {
        form_version_id: form.version.id,
        answers,
        meta: { session_id: getSessionId(), campaign, pixel_ids: pixelIds, started_at: startedAt.current, website: honey.current?.value || "" },
      });
      trackDefense("form_submit");
      pixelIds.forEach((id) => trackSingle(id, "Lead"));
      setDone(true);
    } catch (err) {
      const d = err?.response?.data?.detail;
      if (d && typeof d === "object") { setErrors(d); setStep(0); }
      else setErrors({ _global: typeof d === "string" ? d : "Une erreur est survenue. Réessayez." });
    } finally { setSubmitting(false); }
  };

  const inputCls = "w-full rounded-md border-2 border-[#163A63]/15 bg-[#F5F6F8] px-4 py-3 text-[#071D3A] shadow-[inset_0_1px_2px_rgba(7,29,58,0.05)] outline-none focus:border-[#163A63] focus:ring-4 focus:ring-[#163A63]/10 transition font-['Manrope']";
  const lbl = "block text-sm font-medium text-[#071D3A] mb-1.5 font-['Manrope']";

  if (!form || !steps.length) {
    return <div className="py-10 text-center text-[#071D3A]/50 font-['Manrope']" data-testid={tid("form-loading")}>Chargement du formulaire…</div>;
  }

  if (done) {
    return (
      <div className="text-center py-8" data-testid={tid("confirmation")}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#163A63]/10">
          <Check className="h-8 w-8 text-[#163A63]" />
        </div>
        <h3 className="font-['Bricolage_Grotesque'] text-2xl font-bold text-[#071D3A]">{ft.confirm_title || "Votre demande a bien été enregistrée"}</h3>
        <p className="mt-3 text-[#071D3A]/70 font-['Manrope']">{ft.confirm_text || "Un conseiller pourra prendre contact avec vous prochainement pour vous présenter les informations relatives au Livret Défense."}</p>
      </div>
    );
  }

  const renderField = (q) => {
    const k = q.question_key;
    const v = answers[k];
    const err = errors[k];
    const errEl = err ? <p className="mt-1 text-xs text-[#C8102E]">{err}</p> : null;

    if (q.field_type === "checkbox") {
      return (
        <div key={k}>
          <label className="flex items-start gap-3 cursor-pointer rounded-md border border-[#163A63]/15 bg-[#F5F6F8] p-3.5">
            <input type="checkbox" data-testid={tid("consent")} checked={v === true} onChange={(e) => set(k, e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#C8102E]" />
            <span className="text-sm text-[#071D3A]/75 font-['Manrope']">{ft.consent_text || "J'accepte d'être recontacté(e) et la politique de confidentialité."}</span>
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

    if (["select"].includes(q.field_type)) {
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
              <button type="button" key={o} onClick={() => set(k, o)} className={`rounded-md border-2 px-4 py-3 text-left text-sm font-medium font-['Manrope'] transition-colors ${v === o ? "border-[#C8102E] bg-[#C8102E]/5 text-[#071D3A]" : "border-[#163A63]/15 bg-[#F5F6F8] text-[#071D3A]/80 hover:border-[#163A63]/30"}`}>{o}</button>
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

    const inputType = q.field_type === "email" ? "email" : q.field_type === "date" ? "date" : (["number", "amount", "postal_code"].includes(q.field_type) ? "text" : "text");
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
            <div className={`h-1.5 rounded-full ${step >= i ? "bg-[#C8102E]" : "bg-[#163A63]/15"}`} />
            <span className="mt-1.5 block text-xs font-medium text-[#071D3A]/60 font-['Manrope']">Étape {i + 1} sur {steps.length}</span>
          </div>
        ))}
      </div>

      <input ref={honey} type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" aria-hidden />

      <div className="space-y-4">
        {stepQuestions.map(renderField)}
        {errors._global && <p className="text-xs text-[#C8102E]">{errors._global}</p>}
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-md border-2 border-[#163A63]/20 px-5 py-3.5 font-semibold text-[#071D3A] hover:bg-[#F5F6F8] transition-colors font-['Manrope']">Retour</button>
          )}
          {isLast ? (
            <button type="button" data-testid={tid("submit")} onClick={submit} disabled={submitting} className="flex-1 rounded-md bg-[#C8102E] px-6 py-3.5 font-semibold text-white hover:bg-[#a60d26] transition-colors font-['Manrope'] disabled:opacity-60">
              {submitting ? "Envoi…" : (ft.submit_label || "Vérifiez mon éligibilité")}
            </button>
          ) : (
            <button type="button" data-testid={tid("continue")} onClick={() => validateStep(step) && setStep(step + 1)} className="flex-1 rounded-md bg-[#071D3A] px-6 py-3.5 font-semibold text-white hover:bg-[#0c2a52] transition-colors font-['Manrope'] inline-flex items-center justify-center gap-2">
              {ft.continue_label || "Continuer"} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-[#071D3A]/45 font-['Manrope']">Demande gratuite et sans engagement.</p>
    </div>
  );
}

export default function DefenseLanding() {
  const [openFaq, setOpenFaq] = useState(0);
  const [form, setForm] = useState(null);
  const [content, setContent] = useState(null);
  const [cookieOk, setCookieOk] = useState(() => { try { return localStorage.getItem("defense_cookie") === "1"; } catch { return false; } });

  const campaign = useMemo(() => {
    let c = (new URLSearchParams(window.location.search).get("campaign") || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
    try { if (c) localStorage.setItem("defense_campaign", c); else c = localStorage.getItem("defense_campaign") || ""; } catch {}
    return c;
  }, []);

  useEffect(() => {
    applyDefenseBranding();
    API.get("/defense/form/published").then((r) => setForm(r.data)).catch(() => {});
    API.get("/defense/content").then((r) => setContent(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    trackDefense("page_view", { meta: { campaign } });
    API.get(`/defense/pixels/active${campaign ? `?campaign=${encodeURIComponent(campaign)}` : ""}`).then((r) => {
      const ids = (r.data.pixels || []).map((p) => p.pixel_id);
      window.__defensePixelIds = ids;
      if (ids.length) loadPixels(ids).then(() => ids.forEach((id) => trackSingle(id, "PageView"))).catch(() => {});
    }).catch(() => {});
  }, [campaign]);

  const rateNum = (content?.offer?.rate || "7,10 %").replace("%", "").trim();

  const scrollToForm = () => document.getElementById("eligibilite")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white font-['Manrope'] text-[#071D3A]" data-testid="defense-landing">
      <div className="h-2 w-full"><Tricolore /></div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#163A63]/10 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#071D3A]/70">
            <a href="#livret" className="hover:text-[#071D3A]">Le livret</a>
            <a href="#tous" className="hover:text-[#071D3A]">Pour qui ?</a>
            <a href="#faq" className="hover:text-[#071D3A]">FAQ</a>
          </nav>
          <button type="button" data-testid="header-cta" onClick={scrollToForm} className="rounded-md bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a60d26] transition-colors">Vérifier mon éligibilité</button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F6F8] via-white to-white border-b border-[#163A63]/10">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center px-5 py-10 lg:py-14">
          <motion.div {...heroFade}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#163A63]/20 bg-white px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#163A63] uppercase">
              <span className="h-3 w-5 overflow-hidden rounded-[2px]"><Tricolore /></span> Épargne patrimoniale française
            </span>
            <h1 className="mt-5 font-['Bricolage_Grotesque'] text-4xl md:text-5xl lg:text-[3.3rem] font-extrabold leading-[1.04] tracking-tight text-[#071D3A]">Livret d'Épargne Défense</h1>
            <p className="mt-5 text-lg text-[#071D3A]/80 max-w-xl">Une solution d'épargne à découvrir, accessible à tous les Français éligibles — civils ou militaires.</p>
            <ul className="mt-7 space-y-3">
              {[
                { icon: ShieldCheck, t: "Capital garanti selon l'offre" },
                { icon: CalendarCheck, t: "Intérêts mensuels" },
                { icon: Lock, t: "Demande gratuite et sans engagement" },
              ].map((x) => (
                <li key={x.t} className="flex items-center gap-3 text-[#071D3A]/80 font-['Manrope']">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#163A63]/10"><x.icon className="h-4 w-4 text-[#163A63]" /></span>
                  {x.t}
                </li>
              ))}
            </ul>
            <div className="mt-9 relative overflow-hidden rounded-2xl ring-1 ring-[#163A63]/15 shadow-lg" data-testid="hero-image">
              <div className="h-1.5 w-full"><Tricolore /></div>
              <img
                src="https://static.prod-images.emergentagent.com/jobs/b2757569-a5af-4725-afd6-41a8a894534e/images/0ad954386dc24d6142b3b93f3006bf9f1afbaae54aaeaaa5471d879e843aef53.jpeg"
                alt="Militaire français en tenue moderne devant le drapeau tricolore"
                className="h-56 w-full object-cover object-center"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071D3A]/90 via-[#071D3A]/40 to-transparent px-5 pb-4 pt-10">
                <p className="text-sm font-semibold text-white font-['Manrope']">Une épargne qui porte les valeurs de la Défense française.</p>
              </div>
            </div>
            {content?.logo && (
              <div className="mt-6 flex justify-center" data-testid="defense-hero-logo">
                <img
                  src={content.logo}
                  alt={content?.brand?.name ? `Logo ${content.brand.name}` : "Logo"}
                  className="w-auto object-contain"
                  style={{ height: `${content.logo_size || 80}px`, maxWidth: "100%" }}
                />
              </div>
            )}
          </motion.div>

          <motion.div {...heroFade} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="rounded-2xl bg-white border border-[#163A63]/10 shadow-2xl overflow-hidden" data-testid="hero-form-card">
              <div className="relative flex items-stretch justify-between gap-4 overflow-hidden bg-[#071D3A] px-7 py-6 text-white">
                <span className="absolute left-0 top-0 flex h-full w-[6px] flex-col" aria-hidden>
                  <span className="flex-1 bg-[#0055A4]" />
                  <span className="flex-1 bg-white" />
                  <span className="flex-1 bg-[#EF4135]" />
                </span>
                <div className="pl-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55 font-['Manrope']">Taux net annuel annoncé</p>
                  <p className="mt-1 flex items-baseline gap-1 font-['Bricolage_Grotesque'] font-extrabold leading-none tracking-tight">
                    <span className="text-[3.6rem]">{rateNum}</span>
                    <span className="text-4xl text-[#EF4135]">%</span>
                    <span className="ml-1 text-sm font-semibold uppercase tracking-wide text-white/60">net / an</span>
                  </p>
                </div>
                <div className="flex flex-col justify-center border-l border-white/10 pl-4 text-right text-[11px] leading-snug text-white/65 font-['Manrope']">
                  <span>Capital garanti</span>
                  <span className="mt-1">Intérêts mensuels</span>
                  <span className="mt-1 text-white/40">Selon l'offre</span>
                </div>
              </div>
              <div className="p-6 md:p-7">
                <p className="mb-4 font-['Bricolage_Grotesque'] text-lg font-bold text-[#071D3A]">Vérifiez votre éligibilité en 1 minute</p>
                <EligibilityForm idPrefix="hero" form={form} content={content} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Caractéristiques */}
      <section id="livret" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <motion.div {...fade} className="max-w-2xl">
          <h2 className="font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-bold">Les caractéristiques du Livret Défense</h2>
          <p className="mt-3 text-[#071D3A]/65">Des conditions présentées de manière transparente, confirmées par les documents contractuels du produit.</p>
        </motion.div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fade} transition={{ duration: 0.5, delay: i * 0.06 }} className="rounded-xl border border-[#163A63]/10 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F5F6F8]"><f.icon className="h-5 w-5 text-[#163A63]" /></span>
              <h3 className="mt-4 font-['Bricolage_Grotesque'] text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-[#071D3A]/65 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ouvert à tous */}
      <section id="tous" className="bg-[#071D3A] text-white">
        <div className="mx-auto max-w-5xl px-5 py-16 lg:py-20 text-center">
          <motion.div {...fade}>
            <span className="mx-auto mb-5 inline-block h-5 w-9 overflow-hidden rounded-[2px]"><Tricolore /></span>
            <h2 className="font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-bold">La Défense concerne tous les Français.</h2>
            <p className="mt-3 text-lg text-white/70">Un livret qui ne s'adresse pas uniquement aux militaires.</p>
            <p className="mx-auto mt-6 max-w-3xl text-white/70 leading-relaxed">
              Le Livret d'Épargne Défense est présenté comme une solution destinée aux particuliers remplissant les conditions d'accès, indépendamment de leur profession. Que vous soyez salarié, indépendant, retraité ou militaire, vous pouvez consulter les conditions du produit et demander une étude d'éligibilité.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-xl border border-[#C8102E]/40 bg-[#C8102E]/10 px-6 py-5">
              <p className="font-semibold">Aucune carrière militaire n'est nécessaire pour demander des informations sur ce livret.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Avantages */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <motion.h2 {...fade} className="font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-bold max-w-2xl">Une approche claire et transparente de votre épargne.</motion.h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ADVANTAGES.map((a, i) => (
            <motion.div key={a.title} {...fade} transition={{ duration: 0.5, delay: i * 0.06 }} className="rounded-xl bg-[#F5F6F8] p-6">
              <a.icon className="h-6 w-6 text-[#C8102E]" />
              <h3 className="mt-3 font-semibold text-[#071D3A]">{a.title}</h3>
              <p className="mt-1.5 text-sm text-[#071D3A]/60">{a.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-[#F5F6F8]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <motion.h2 {...fade} className="font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-bold text-center">Comment ça marche ?</motion.h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div key={s.n} {...fade} transition={{ duration: 0.5, delay: i * 0.1 }} className="relative">
                <span className="font-['Bricolage_Grotesque'] text-5xl font-bold text-[#163A63]/20">{s.n}</span>
                <h3 className="mt-2 font-['Bricolage_Grotesque'] text-xl font-bold text-[#071D3A]">{s.title}</h3>
                <p className="mt-2 text-sm text-[#071D3A]/65">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Secteur de la défense */}
      <section id="secteur" className="bg-[#071D3A] text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <motion.div {...fade} className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <span className="h-3 w-5 overflow-hidden rounded-[2px]"><Tricolore /></span> Souveraineté française
            </span>
            <h2 className="mt-5 font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-extrabold tracking-tight">Au cœur de la croissance du secteur de la défense française</h2>
            <p className="mt-4 text-white/70 leading-relaxed">
              La défense et la souveraineté françaises s'appuient sur de grands acteurs industriels de référence. Le Livret d'Épargne Défense vous propose de placer votre épargne dans une thématique d'avenir, au service de l'autonomie stratégique de la France et de l'Europe.
            </p>
          </motion.div>
          <motion.div {...fade} transition={{ duration: 0.6, delay: 0.1 }} className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {["Thales", "Safran", "Dassault Aviation", "Airbus"].map((name) => (
              <div key={name} className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center" data-testid={`sector-${name.split(" ")[0].toLowerCase()}`}>
                <span className="font-['Bricolage_Grotesque'] text-lg font-bold tracking-tight text-white/90">{name}</span>
              </div>
            ))}
          </motion.div>
          <p className="mt-6 text-xs text-white/40">Les noms et marques cités appartiennent à leurs propriétaires respectifs et sont mentionnés à titre illustratif du secteur d'activité.</p>
        </div>
      </section>

      {/* Formulaire */}
      <section id="eligibilite" className="mx-auto max-w-6xl px-5 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-start">
        <motion.div {...fade}>
          <h2 className="font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-bold">Vérifiez votre éligibilité au Livret Défense</h2>
          <p className="mt-4 text-[#071D3A]/70 text-lg">Quelques instants suffisent pour effectuer votre demande d'information, gratuitement et sans engagement.</p>
          <ul className="mt-6 space-y-3">
            {["Demande 100 % gratuite", "Sans engagement de souscription", "Réponse d'un conseiller"].map((t) => (
              <li key={t} className="flex items-center gap-3 text-[#071D3A]/75"><Check className="h-5 w-5 text-[#163A63]" /> {t}</li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...fade} transition={{ duration: 0.6, delay: 0.1 }} className="rounded-2xl border border-[#163A63]/10 bg-white p-6 md:p-8 shadow-xl">
          <EligibilityForm idPrefix="bottom" form={form} content={content} />
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-[#F5F6F8]">
        <div className="mx-auto max-w-3xl px-5 py-16 lg:py-20">
          <motion.h2 {...fade} className="font-['Bricolage_Grotesque'] text-3xl md:text-4xl font-bold text-center">Questions fréquentes</motion.h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rounded-xl border border-[#163A63]/10 bg-white overflow-hidden" data-testid={`faq-${i}`}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-[#071D3A]">
                  {item.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#163A63] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-5 text-sm text-[#071D3A]/65 leading-relaxed">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#071D3A] text-white/70">
        <div className="h-2 w-full"><Tricolore /></div>
        <div className="mx-auto max-w-6xl px-5 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <Logo dark />
            <p className="mt-4 text-white/50">Demande d'information sur le Livret d'Épargne Défense. Service de mise en relation, sans garantie gouvernementale ni agrément d'État non documenté.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Informations</p>
            <ul className="mt-3 space-y-2 text-white/55">
              <li><a href="#livret" className="hover:text-white">Le livret</a></li>
              <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              <li><a href="#eligibilite" className="hover:text-white">Vérifier mon éligibilité</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Légal</p>
            <ul className="mt-3 space-y-2 text-white/55">
              <li>Mentions légales</li>
              <li>Politique de confidentialité</li>
              <li>Gestion des cookies</li>
              <li>Conditions générales</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Risques & garanties</p>
            <p className="mt-3 text-white/50">Tout produit d'épargne comporte des conditions et d'éventuels risques détaillés dans les documents contractuels. Les caractéristiques annoncées sont présentées sous réserve de leur confirmation documentaire.</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} Livret Défense — Toutes les informations sont fournies à titre indicatif.</div>
      </footer>

      {!cookieOk && <CookieBanner onAccept={() => { try { localStorage.setItem("defense_cookie", "1"); } catch {} setCookieOk(true); }} />}
    </div>
  );
}
