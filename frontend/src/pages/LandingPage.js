import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight, Asterisk, ShieldCheck, Coins, RefreshCcw, FileText, Gift, Clock3, CheckCircle2,
} from "lucide-react";
import { API, trackEvent } from "@/api";
import DynamicForm from "@/components/DynamicForm";

const HERO_BG = "https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2OTV8MHwxfHNlYXJjaHwyfHxsYXB0b3AlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3OTE1NTAwMDZ8MA&ixlib=rb-4.1.0&q=85";

const ICONS = {
  shield: ShieldCheck,
  coins: Coins,
  refresh: RefreshCcw,
  file: FileText,
  gift: Gift,
  clock: Clock3,
};

const TRACKING_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "campaign_id", "adset_id", "ad_id"];

function useTrackingParams() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tracking = {};
    TRACKING_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) tracking[k] = v;
    });
    return tracking;
  }, []);
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" },
};

export default function LandingPage() {
  const [content, setContent] = useState(null);
  const [form, setForm] = useState(null);
  const [legalDialog, setLegalDialog] = useState("");
  const formRef = useRef(null);
  const tracking = useTrackingParams();

  useEffect(() => {
    trackEvent("page_view", { meta: tracking });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([API.get("/content"), API.get("/form/published")])
      .then(([c, f]) => {
        setContent(c.data);
        setForm(f.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!content?.colors) return;
    const c = content.colors;
    let el = document.getElementById("brand-colors");
    if (!el) {
      el = document.createElement("style");
      el.id = "brand-colors";
      document.head.appendChild(el);
    }
    el.textContent = `:root{--brand-orange:${c.orange};--brand-orange-light:${c.orange_light}}.btn-primary-orange{background-color:${c.orange} !important}.btn-primary-orange:hover{background-color:${c.orange_light} !important}.offer-box{border-color:${c.orange} !important}`;
  }, [content]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!content || !form) {
    return (
      <div className="min-h-screen bg-[#0B111B] flex items-center justify-center" data-testid="landing-loading">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF683D] border-t-transparent" />
      </div>
    );
  }

  const { hero, offer, curiosity, advantages, how, reassurance, faq, form_texts, final_cta, legal, brand } = content;

  const CtaButton = ({ label, testid, className = "" }) => (
    <button type="button" data-testid={testid} onClick={scrollToForm} className={`btn-primary-orange ${className}`}>
      {label} <ArrowRight className="h-5 w-5" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0B111B] text-[#F8F6F2] overflow-x-hidden" data-testid="landing-page">
      {/* ============ HERO ============ */}
      <section className="relative" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="" className="h-full w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-[#0B111B]/90" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B111B]/40 via-transparent to-[#0B111B]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pt-8 pb-16 md:px-8 lg:pb-24">
          {/* Logo */}
          <div className="flex items-center gap-1 mb-10" data-testid="brand-logo">
            <span className="font-display text-3xl md:text-4xl font-bold tracking-tight">{brand?.name || "Claude"}</span>
            <span className="text-[#FF683D] font-display text-3xl md:text-4xl font-bold">.</span>
            <Asterisk className="h-8 w-8 md:h-10 md:w-10 text-[#FF683D]" strokeWidth={2.5} />
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12">
            {/* Bloc A : titre */}
            <div className="order-1 lg:col-span-7">
              <motion.p {...fadeUp} className="text-xs md:text-sm font-semibold tracking-[0.22em] text-[#FF683D] uppercase mb-5" style={{ color: "var(--brand-orange, #FF683D)" }} data-testid="hero-eyebrow">
                {hero.eyebrow}
              </motion.p>
              <motion.h1
                {...fadeUp}
                className="font-display text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.12] tracking-tight mb-6"
                data-testid="hero-title"
              >
                {hero.title_pre}
                <em className="text-[#FF683D] font-display italic" style={{ color: "var(--brand-orange, #FF683D)" }}>{hero.title_highlight}</em>
                {hero.title_post}
              </motion.h1>
              <motion.p {...fadeUp} className="text-base md:text-lg text-[#F8F6F2]/75 leading-relaxed max-w-xl mb-6" data-testid="hero-subtitle">
                {hero.subtitle}
              </motion.p>
              <motion.div {...fadeUp} className="offer-box max-w-xl mb-7" data-testid="offer-box">
                <p className="text-xs md:text-sm font-bold tracking-[0.18em] text-[#FF683D] uppercase mb-1" style={{ color: "var(--brand-orange, #FF683D)" }}>{offer.title}</p>
                {offer.rate_visible && (
                  <div className="flex items-end gap-3 flex-wrap my-3">
                    <span className="font-display text-5xl md:text-7xl font-bold text-[#FF683D] leading-none" style={{ color: "var(--brand-orange, #FF683D)" }} data-testid="offer-rate">{offer.rate}</span>
                    <span className="font-display text-xl md:text-2xl text-[#F8F6F2] pb-1.5">{offer.rate_label}</span>
                  </div>
                )}
                <p className="text-sm md:text-base text-[#F8F6F2]/75 leading-relaxed">{offer.text}</p>
              </motion.div>
              <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-xl mb-8" data-testid="offer-arguments">
                {offer.arguments.map((arg, i) => {
                  const Icon = ICONS[arg.icon] || ShieldCheck;
                  return (
                    <motion.div
                      key={arg.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.12 }}
                      className="flex flex-col md:flex-row items-start md:items-center gap-2.5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FF683D]/40 bg-[#FF683D]/10">
                        <Icon className="h-5 w-5 text-[#FF683D]" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{arg.title}</p>
                        <p className="text-xs text-[#F8F6F2]/55 mt-0.5 hidden md:block">{arg.text}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <motion.p {...fadeUp} className="font-display italic text-lg md:text-xl text-[#FF914D] mb-8" style={{ color: "var(--brand-orange-light, #FF914D)" }} data-testid="hero-complement">
                {hero.complement}
              </motion.p>
              <motion.div {...fadeUp} className="hidden lg:block">
                <CtaButton label={hero.cta} testid="hero-cta-btn" />
                <p className="mt-3 text-sm text-[#F8F6F2]/60" data-testid="hero-cta-note">{hero.cta_note}</p>
              </motion.div>
            </div>

            {/* Formulaire — priorité mobile */}
            <div className="order-2 lg:col-span-5 lg:row-span-2 mt-10 lg:mt-0" ref={formRef} id="formulaire">
              <div className="mb-4 lg:text-left" data-testid="pre-form-accroche">
                <p className="font-display text-xl md:text-2xl font-semibold leading-snug">{form_texts.pre_form_title}</p>
                <p className="mt-1 text-sm text-[#F8F6F2]/65">{form_texts.pre_form_text}</p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="bg-[#F8F6F2] rounded-2xl shadow-2xl p-6 md:p-8 text-[#0B111B] border border-white/20"
                data-testid="form-card"
              >
                <DynamicForm form={form} texts={form_texts} tracking={tracking} />
              </motion.div>
              <div className="mt-6 lg:hidden">
                <p className="text-center text-sm text-[#F8F6F2]/60">{hero.cta_note}</p>
              </div>
            </div>

            {/* Bloc B : offre */}
            <div className="order-3 lg:col-span-7 mt-12 lg:mt-14">
              <motion.div {...fadeUp}>
                <h2 className="font-display text-2xl md:text-3xl font-bold leading-snug mb-3" data-testid="offer-accroche">
                  {offer.accroche}
                </h2>
                <p className="text-[#F8F6F2]/70 leading-relaxed max-w-xl">{offer.accroche_text}</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CURIOSITÉ ============ */}
      <section className="relative bg-[#101722] py-16 md:py-24" data-testid="curiosity-section">
        <div className="mx-auto max-w-4xl px-5 md:px-8 text-center">
          <motion.h2 {...fadeUp} className="font-display text-3xl md:text-4xl font-bold leading-tight mb-6">
            {curiosity.title}
          </motion.h2>
          <motion.p {...fadeUp} className="text-[#F8F6F2]/70 leading-relaxed text-base md:text-lg mb-8 max-w-2xl mx-auto">
            {curiosity.text1}
          </motion.p>
          <motion.div {...fadeUp}>
            <CtaButton label={curiosity.cta} testid="curiosity-cta-btn" />
          </motion.div>
        </div>
      </section>

      {/* ============ 3 AVANTAGES ============ */}
      <section className="bg-[#0B111B] py-16 md:py-24" data-testid="advantages-section">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="grid gap-5 md:grid-cols-3 md:gap-8">
            {advantages.map((adv, i) => {
              const Icon = ICONS[adv.icon] || FileText;
              return (
                <motion.div
                  key={adv.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="rounded-2xl border border-white/10 bg-[#101722] p-7 hover:border-[#FF683D]/40 hover:-translate-y-1 transition-[border-color,transform] duration-300"
                  data-testid={`advantage-card-${i}`}
                >
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF683D]/12 border border-[#FF683D]/30">
                    <Icon className="h-6 w-6 text-[#FF683D]" />
                  </span>
                  <h3 className="text-sm font-bold tracking-[0.12em] mb-2.5">{adv.title}</h3>
                  <p className="text-sm text-[#F8F6F2]/65 leading-relaxed">{adv.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section className="bg-[#101722] py-16 md:py-24" data-testid="how-section">
        <div className="mx-auto max-w-5xl px-5 md:px-8">
          <motion.h2 {...fadeUp} className="font-display text-3xl md:text-4xl font-bold text-center leading-tight mb-14">
            {how.title}
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {how.steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
                data-testid={`how-step-${i + 1}`}
              >
                <span className="font-display text-6xl font-bold text-[#FF683D]/25 leading-none">{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[#F8F6F2]/65 leading-relaxed">{step.text}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-12 text-center">
            <CtaButton label={how.cta} testid="how-cta-btn" />
          </motion.div>
        </div>
      </section>

      {/* ============ RÉASSURANCE ============ */}
      <section className="bg-[#0B111B] py-16 md:py-24" data-testid="reassurance-section">
        <div className="mx-auto max-w-3xl px-5 md:px-8 text-center">
          <motion.h2 {...fadeUp} className="font-display text-3xl md:text-4xl font-bold leading-tight mb-6">
            {reassurance.title}
          </motion.h2>
          <motion.p {...fadeUp} className="text-[#F8F6F2]/70 leading-relaxed text-base md:text-lg mb-8">
            {reassurance.text}
          </motion.p>
          <motion.div {...fadeUp} className="mb-9 flex flex-col items-center gap-3">
            {(reassurance.points || []).map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-[#F8F6F2]/85">
                <CheckCircle2 className="h-5 w-5 text-[#FF683D] shrink-0" />
                <span className="text-sm md:text-base font-medium">{p}</span>
              </div>
            ))}
          </motion.div>
          <motion.div {...fadeUp}>
            <CtaButton label={reassurance.cta} testid="reassurance-cta-btn" />
          </motion.div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-[#101722] py-16 md:py-24" data-testid="faq-section">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <motion.h2 {...fadeUp} className="font-display text-3xl md:text-4xl font-bold text-center leading-tight mb-10">
            Questions fréquentes
          </motion.h2>
          <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
            {faq.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-white/10 bg-[#0B111B] px-5 data-[state=open]:border-[#FF683D]/40 transition-colors"
              >
                <AccordionTrigger className="text-left text-sm md:text-base font-semibold text-[#F8F6F2] hover:text-[#FF914D] hover:no-underline py-5" data-testid={`faq-question-${i}`}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base text-[#F8F6F2]/65 leading-relaxed pb-5">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="relative bg-[#0B111B] py-16 md:py-28" data-testid="final-cta-section">
        <div className="mx-auto max-w-4xl px-5 md:px-8 text-center">
          <motion.h2 {...fadeUp} className="font-display text-3xl md:text-[2.6rem] font-bold leading-tight mb-6">
            {final_cta.title}
          </motion.h2>
          <motion.p {...fadeUp} className="text-[#F8F6F2]/70 leading-relaxed text-base md:text-lg mb-9 max-w-2xl mx-auto">
            {final_cta.text}
          </motion.p>
          <motion.div {...fadeUp}>
            <CtaButton label={final_cta.cta} testid="final-cta-btn" />
          </motion.div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/10 bg-[#0B111B] py-10" data-testid="footer">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="flex items-center gap-1 mb-4">
            <span className="font-display text-2xl font-bold">{brand?.name || "Claude"}</span>
            <span className="text-[#FF683D] font-display text-2xl font-bold">.</span>
            <Asterisk className="h-6 w-6 text-[#FF683D]" strokeWidth={2.5} />
          </div>
          <p className="text-sm text-[#F8F6F2]/55 mb-6">{brand?.footer_line}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" id="confidentialite">
            <button type="button" data-testid="footer-mentions-btn" onClick={() => setLegalDialog("mentions")} className="text-[#F8F6F2]/60 underline hover:text-[#FF914D] transition-colors">
              Mentions légales
            </button>
            <button type="button" data-testid="footer-privacy-btn" onClick={() => setLegalDialog("privacy")} className="text-[#F8F6F2]/60 underline hover:text-[#FF914D] transition-colors">
              Politique de confidentialité
            </button>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-[#F8F6F2]/40 max-w-3xl">
            Cette page est une demande d'informations. Elle ne constitue ni une offre de souscription, ni un conseil en investissement. Tout investissement comporte des risques : les caractéristiques, conditions et risques de toute offre sont présentés dans ses documents contractuels.
          </p>
        </div>
      </footer>

      <Dialog open={!!legalDialog} onOpenChange={() => setLegalDialog("")}>
        <DialogContent className="max-w-lg" data-testid="legal-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {legalDialog === "mentions" ? "Mentions légales" : "Politique de confidentialité"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
            {legalDialog === "mentions" ? legal.mentions : legal.privacy}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
