import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { applyDefenseBranding, DEFENSE_LANDING_PATH } from "@/defenseBase";

const NAVY = "#071D3A";

const Tricolore = () => (
  <div className="flex h-full w-full">
    <div className="h-full w-1/3 bg-[#0055A4]" />
    <div className="h-full w-1/3 bg-white" />
    <div className="h-full w-1/3 bg-[#C8102E]" />
  </div>
);

const INTRO = [
  "AXINVEST vous remercie de votre visite sur son site internet et de l'intérêt que vous portez à ses services et à ses produits.",
  "La protection de vos données personnelles constitue une priorité pour AXINVEST. Nous accordons une attention particulière à la confidentialité des informations que vous nous communiquez et mettons en œuvre les mesures nécessaires afin de protéger les données personnelles collectées, traitées ou utilisées dans le cadre de votre navigation sur notre site internet.",
];

const SECTIONS = [
  {
    title: "La protection de vos données personnelles",
    body: [
      "AXINVEST veille à assurer la confidentialité et la sécurité des données personnelles de ses utilisateurs, dans le respect des dispositions légales et réglementaires applicables en matière de protection des données.",
      "Les informations recueillies lors de votre navigation ou à l'occasion de vos échanges avec nos services sont traitées conformément aux finalités pour lesquelles elles ont été collectées.",
    ],
  },
  {
    title: "Traitement des données selon votre pays de résidence",
    body: [
      "Les modalités de collecte, de traitement et de protection des données personnelles peuvent varier en fonction du pays de résidence de l'utilisateur et des réglementations locales applicables.",
      "Lorsque des dispositions spécifiques s'appliquent, celles-ci viennent compléter les principes énoncés dans la présente politique de confidentialité.",
      "Les utilisateurs sont invités à prendre connaissance des dispositions relatives à la protection des données personnelles applicables dans leur pays de résidence.",
    ],
  },
  {
    title: "Consultation de notre politique de confidentialité",
    body: [
      "Pour toute information complémentaire concernant la protection de vos données personnelles, vos droits et les modalités de traitement de vos informations, nous vous invitons à consulter notre politique de confidentialité ou à contacter directement AXINVEST.",
    ],
  },
  {
    title: "Mise à jour de la politique de confidentialité",
    body: [
      "La présente politique de confidentialité est susceptible d'être modifiée ou actualisée à tout moment, notamment afin de tenir compte des évolutions législatives, réglementaires et des pratiques relatives à la protection des données personnelles.",
      "Nous vous invitons à consulter régulièrement cette page afin de prendre connaissance de sa dernière version.",
    ],
  },
];

export default function DefensePolitiqueConfidentialite() {
  useEffect(() => {
    applyDefenseBranding("Politique de confidentialité — AXINVEST");
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6F8]" data-testid="defense-politique-confidentialite">
      <div className="h-1.5 w-full"><Tricolore /></div>
      <header className="bg-[#071D3A] text-white">
        <div className="mx-auto max-w-4xl px-5 py-6 flex items-center justify-between">
          <Link to={DEFENSE_LANDING_PATH} data-testid="back-to-landing" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
          <span className="text-xs font-semibold tracking-widest text-white/50">AXINVEST</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#071D3A]">Politique de confidentialité</h1>
        <div className="mt-1 h-1 w-20 rounded-full" style={{ background: NAVY }} />

        <div className="mt-8 space-y-8 rounded-2xl border border-[#163A63]/10 bg-white p-6 sm:p-9 shadow-sm">
          <div className="space-y-2 text-[15px] leading-relaxed text-[#3A4A5E]">
            {INTRO.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {SECTIONS.map((s) => (
            <section key={s.title} data-testid="pc-section">
              <h2 className="font-display text-lg font-bold text-[#071D3A]">{s.title}</h2>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-[#3A4A5E]">
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[#6B7A8D]">© {new Date().getFullYear()} AXINVEST — Tous droits réservés.</p>
      </main>
    </div>
  );
}
