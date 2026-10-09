import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ExternalLink, Plus, Trash2 } from "lucide-react";
import { API, fmtError } from "@/api";

function Field({ label, value, onChange, textarea = false, testid, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea ? (
        <textarea data-testid={testid} rows={3} className="form-input-premium !p-3 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input data-testid={testid} className="form-input-premium !p-3 text-sm" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children, testid }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm" data-testid={testid}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left" data-testid={`${testid}-toggle`}>
        <span className="font-semibold text-[#0B111B]">{title}</span>
        <span className="text-gray-400 text-sm">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="space-y-4 border-t border-gray-100 px-5 py-5">{children}</div>}
    </div>
  );
}

export default function ContentEditor() {
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/admin/content").then((r) => setContent(r.data)).catch((e) => toast.error(fmtError(e)));
  }, []);

  if (!content) return <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="content-loading" />;

  const set = (path, value) => {
    setContent((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/admin/content", content);
      toast.success("Contenu publié sur la landing page.");
    } catch (e) {
      toast.error(fmtError(e));
    } finally {
      setSaving(false);
    }
  };

  const o = content.offer;
  const ft = content.form_texts;

  return (
    <div className="space-y-5" data-testid="content-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Éditeur de landing page</h1>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer" data-testid="preview-landing-link" className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 inline-flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Voir la page
          </a>
          <button type="button" data-testid="save-content-btn" onClick={save} disabled={saving} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "PUBLICATION…" : "PUBLIER LES MODIFICATIONS"}
          </button>
        </div>
      </div>

      <Section title="Section principale (héros)" testid="section-hero">
        <Field label="Petit texte orange" testid="hero-eyebrow" value={content.hero.eyebrow} onChange={(v) => set("hero.eyebrow", v)} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Titre — avant" testid="hero-title-pre" value={content.hero.title_pre} onChange={(v) => set("hero.title_pre", v)} />
          <Field label="Titre — mot en orange" testid="hero-title-highlight" value={content.hero.title_highlight} onChange={(v) => set("hero.title_highlight", v)} />
          <Field label="Titre — après" testid="hero-title-post" value={content.hero.title_post} onChange={(v) => set("hero.title_post", v)} />
        </div>
        <Field label="Sous-titre" testid="hero-subtitle" textarea value={content.hero.subtitle} onChange={(v) => set("hero.subtitle", v)} />
        <Field label="Phrase d'accroche (italique orange)" testid="hero-complement" value={content.hero.complement} onChange={(v) => set("hero.complement", v)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Bouton principal" testid="hero-cta" value={content.hero.cta} onChange={(v) => set("hero.cta", v)} />
          <Field label="Note sous le bouton" testid="hero-cta-note" value={content.hero.cta_note} onChange={(v) => set("hero.cta_note", v)} />
        </div>
      </Section>

      <Section title="Encadré offre (Livret)" testid="section-offer">
        <Field label="Accroche au-dessus de l'encadré" testid="offer-accroche" value={o.accroche} onChange={(v) => set("offer.accroche", v)} />
        <Field label="Texte d'introduction" testid="offer-accroche-text" textarea value={o.accroche_text} onChange={(v) => set("offer.accroche_text", v)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titre de l'encadré" testid="offer-title" value={o.title} onChange={(v) => set("offer.title", v)} />
          <Field label="Nom du produit" testid="offer-product" value={o.product_name} onChange={(v) => set("offer.product_name", v)} />
        </div>
        <Field label="Texte de l'encadré" testid="offer-text" textarea value={o.text} onChange={(v) => set("offer.text", v)} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Taux annuel affiché" testid="offer-rate" value={o.rate} onChange={(v) => set("offer.rate", v)} hint="Ne publier un rendement réel qu'après vérification documentaire." />
          <Field label="Libellé du taux" testid="offer-rate-label" value={o.rate_label} onChange={(v) => set("offer.rate_label", v)} />
          <div className="flex items-end gap-5 pb-1">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" data-testid="offer-rate-visible" checked={!!o.rate_visible} onChange={(e) => set("offer.rate_visible", e.target.checked)} className="h-4 w-4 accent-[#FF683D]" /> Afficher le taux
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" data-testid="offer-rate-verified" checked={!!o.rate_verified} onChange={(e) => set("offer.rate_verified", e.target.checked)} className="h-4 w-4 accent-[#FF683D]" /> Vérifié (pièces justificatives)
            </label>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nature du taux" testid="offer-nature" value={o.nature_taux} onChange={(v) => set("offer.nature_taux", v)} />
          <Field label="Durée" testid="offer-duree" value={o.duree} onChange={(v) => set("offer.duree", v)} />
          <Field label="Conditions d'accès" testid="offer-acces" value={o.conditions_acces} onChange={(v) => set("offer.conditions_acces", v)} />
          <Field label="Conditions de retrait" testid="offer-retrait" value={o.conditions_retrait} onChange={(v) => set("offer.conditions_retrait", v)} />
          <Field label="Risques" testid="offer-risques" textarea value={o.risques} onChange={(v) => set("offer.risques", v)} />
          <Field label="Garantie éventuelle" testid="offer-garantie" textarea value={o.garantie} onChange={(v) => set("offer.garantie", v)} />
          <Field label="Organisme émetteur" testid="offer-emetteur" value={o.emetteur} onChange={(v) => set("offer.emetteur", v)} />
          <Field label="Documents justificatifs" testid="offer-documents" value={o.documents} onChange={(v) => set("offer.documents", v)} />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Arguments (icônes orange)</p>
          {o.arguments.map((arg, i) => (
            <div key={i} className="grid gap-3 md:grid-cols-2">
              <Field label={`Argument ${i + 1} — titre`} testid={`offer-arg-title-${i}`} value={arg.title} onChange={(v) => set(`offer.arguments.${i}.title`, v)} />
              <Field label={`Argument ${i + 1} — texte`} testid={`offer-arg-text-${i}`} value={arg.text} onChange={(v) => set(`offer.arguments.${i}.text`, v)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Section de curiosité" testid="section-curiosity">
        <Field label="Titre" testid="curiosity-title" textarea value={content.curiosity.title} onChange={(v) => set("curiosity.title", v)} />
        <Field label="Texte" testid="curiosity-text" textarea value={content.curiosity.text1} onChange={(v) => set("curiosity.text1", v)} />
        <Field label="Bouton" testid="curiosity-cta" value={content.curiosity.cta} onChange={(v) => set("curiosity.cta", v)} />
      </Section>

      <Section title="Trois avantages" testid="section-advantages">
        {content.advantages.map((adv, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-2">
            <Field label={`Avantage ${i + 1} — titre`} testid={`adv-title-${i}`} value={adv.title} onChange={(v) => set(`advantages.${i}.title`, v)} />
            <Field label={`Avantage ${i + 1} — texte`} testid={`adv-text-${i}`} value={adv.text} onChange={(v) => set(`advantages.${i}.text`, v)} />
          </div>
        ))}
      </Section>

      <Section title="Comment ça marche" testid="section-how">
        <Field label="Titre de la section" testid="how-title" value={content.how.title} onChange={(v) => set("how.title", v)} />
        {content.how.steps.map((s, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-2">
            <Field label={`Étape ${i + 1} — titre`} testid={`how-step-title-${i}`} value={s.title} onChange={(v) => set(`how.steps.${i}.title`, v)} />
            <Field label={`Étape ${i + 1} — texte`} testid={`how-step-text-${i}`} value={s.text} onChange={(v) => set(`how.steps.${i}.text`, v)} />
          </div>
        ))}
        <Field label="Bouton" testid="how-cta" value={content.how.cta} onChange={(v) => set("how.cta", v)} />
      </Section>

      <Section title="Section rassurante" testid="section-reassurance">
        <Field label="Titre" testid="reassurance-title" value={content.reassurance.title} onChange={(v) => set("reassurance.title", v)} />
        <Field label="Texte" testid="reassurance-text" textarea value={content.reassurance.text} onChange={(v) => set("reassurance.text", v)} />
        {(content.reassurance.points || []).map((p, i) => (
          <Field key={i} label={`Point ${i + 1}`} testid={`reassurance-point-${i}`} value={p} onChange={(v) => set(`reassurance.points.${i}`, v)} />
        ))}
        <Field label="Bouton" testid="reassurance-cta" value={content.reassurance.cta} onChange={(v) => set("reassurance.cta", v)} />
      </Section>

      <Section title="FAQ" testid="section-faq">
        {content.faq.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Field label={`Question ${i + 1}`} testid={`faq-q-${i}`} value={item.q} onChange={(v) => set(`faq.${i}.q`, v)} />
              </div>
              <button
                type="button"
                data-testid={`faq-delete-${i}`}
                onClick={() => setContent((prev) => ({ ...prev, faq: prev.faq.filter((_, j) => j !== i) }))}
                className="mt-6 rounded-lg p-2 text-red-400 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <Field label="Réponse" testid={`faq-a-${i}`} textarea value={item.a} onChange={(v) => set(`faq.${i}.a`, v)} />
          </div>
        ))}
        <button
          type="button"
          data-testid="faq-add-btn"
          onClick={() => setContent((prev) => ({ ...prev, faq: [...prev.faq, { q: "", a: "" }] }))}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#FF683D] hover:text-[#FF914D]"
        >
          <Plus className="h-4 w-4" /> Ajouter une question
        </button>
      </Section>

      <Section title="Textes du formulaire" testid="section-form">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Petit texte orange" testid="ft-eyebrow" value={ft.eyebrow} onChange={(v) => set("form_texts.eyebrow", v)} />
          <Field label="Accroche au-dessus du formulaire" testid="ft-pre-title" value={ft.pre_form_title} onChange={(v) => set("form_texts.pre_form_title", v)} />
        </div>
        <Field label="Texte sous l'accroche" testid="ft-pre-text" value={ft.pre_form_text} onChange={(v) => set("form_texts.pre_form_text", v)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Titre du formulaire" testid="ft-title" value={ft.title} onChange={(v) => set("form_texts.title", v)} />
          <Field label="Sous-titre" testid="ft-subtitle" value={ft.subtitle} onChange={(v) => set("form_texts.subtitle", v)} />
          <Field label="Indicateur d'étape" testid="ft-step-label" value={ft.step_label} onChange={(v) => set("form_texts.step_label", v)} hint="{current} et {total} sont remplacés automatiquement." />
          <Field label="Bouton « continuer »" testid="ft-continue" value={ft.continue_label} onChange={(v) => set("form_texts.continue_label", v)} />
          <Field label="Bouton « retour »" testid="ft-back" value={ft.back_label} onChange={(v) => set("form_texts.back_label", v)} />
          <Field label="Bouton final" testid="ft-submit" value={ft.submit_label} onChange={(v) => set("form_texts.submit_label", v)} />
        </div>
        <Field label="Texte de consentement" testid="ft-consent" textarea value={ft.consent_text} onChange={(v) => set("form_texts.consent_text", v)} />
        <Field label="Lien politique de confidentialité" testid="ft-privacy-link" value={ft.privacy_link_text} onChange={(v) => set("form_texts.privacy_link_text", v)} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Confirmation — titre" testid="ft-confirm-title" value={ft.confirm_title} onChange={(v) => set("form_texts.confirm_title", v)} />
          <Field label="Confirmation — texte" testid="ft-confirm-text" textarea value={ft.confirm_text} onChange={(v) => set("form_texts.confirm_text", v)} />
        </div>
      </Section>

      <Section title="Accroche de bas de page" testid="section-final">
        <Field label="Titre" testid="final-title" textarea value={content.final_cta.title} onChange={(v) => set("final_cta.title", v)} />
        <Field label="Texte" testid="final-text" textarea value={content.final_cta.text} onChange={(v) => set("final_cta.text", v)} />
        <Field label="Bouton" testid="final-cta" value={content.final_cta.cta} onChange={(v) => set("final_cta.cta", v)} />
      </Section>

      <Section title="Mentions légales & confidentialité" testid="section-legal">
        <Field label="Mentions légales" testid="legal-mentions" textarea value={content.legal.mentions} onChange={(v) => set("legal.mentions", v)} />
        <Field label="Politique de confidentialité" testid="legal-privacy" textarea value={content.legal.privacy} onChange={(v) => set("legal.privacy", v)} />
      </Section>

      <Section title="Couleurs" testid="section-colors">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {Object.entries(content.colors).map(([k, v]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{k}</label>
              <div className="flex items-center gap-2">
                <input type="color" data-testid={`color-${k}`} value={v} onChange={(e) => set(`colors.${k}`, e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200" />
                <span className="text-xs text-gray-500">{v}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">La couleur orange pilote les boutons, l'encadré offre et les accents principaux.</p>
      </Section>
    </div>
  );
}
