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

const SECTIONS = [
  {
    title: "1. Présentation de la société",
    body: [
      "AXINVEST est une société de gestion agréée par l'Autorité des marchés financiers (AMF) sous le numéro GP-080761085, en date du 16 août 2003.",
      "La société est constituée sous la forme d'une société par actions simplifiée (SAS), au capital social de 1 167 600 euros.",
      "Son siège social, correspondant également à son adresse postale, est établi à l'adresse suivante :",
    ],
    address: ["AXINVEST", "16, rue Abel Ferry", "75008 Paris – France"],
    after: ["Immatriculée au Registre du commerce et des sociétés de Paris sous le numéro 264 484 728."],
  },
  {
    title: "2. Responsable de la publication",
    body: ["Le responsable de la publication du présent site internet est :"],
    address: ["Pascal TURLIN"],
    after: ["Pour toute demande d'information ou communication relative au site, les utilisateurs peuvent contacter AXINVEST aux coordonnées indiquées ci-dessus."],
  },
  {
    title: "3. Hébergement du site",
    body: ["Le présent site internet est hébergé par :"],
    address: ["Alwaysdata", "62, rue Tiquetonne", "75002 Paris – France", "Site internet : www.alwaysdata.com"],
    after: ["Société immatriculée au Registre du commerce et des sociétés de Paris sous le numéro 492 893 490."],
  },
  {
    title: "4. Protection des données personnelles",
    body: [
      "AXINVEST attache une importance particulière à la confidentialité et à la protection des données personnelles de ses utilisateurs.",
      "Les informations personnelles collectées par l'intermédiaire du présent site sont destinées à un usage interne et sont traitées dans le respect de la réglementation applicable en matière de protection des données personnelles.",
      "Ces informations ne font l'objet d'aucune cession ni vente à des tiers.",
      "Conformément à la réglementation en vigueur, notamment au Règlement général sur la protection des données (RGPD), chaque utilisateur dispose d'un droit d'accès, de rectification, de modification et d'effacement des données personnelles le concernant, ainsi que des autres droits prévus par la législation applicable.",
      "Toute demande relative à l'exercice de ces droits peut être adressée directement à AXINVEST.",
    ],
  },
  {
    title: "5. Propriété intellectuelle",
    body: [
      "L'ensemble des éléments composant le présent site internet, notamment les marques, logos, icônes, textes, infographies, photographies, illustrations et éléments graphiques, est protégé par les dispositions nationales et internationales relatives à la propriété intellectuelle.",
      "Ces éléments sont la propriété d'AXINVEST ou font l'objet de droits d'utilisation régulièrement accordés à la société.",
      "Toute reproduction, représentation, diffusion, adaptation ou exploitation, totale ou partielle, du site ou de l'un de ses éléments, par quelque procédé que ce soit et sur quelque support que ce soit, est strictement interdite sans autorisation écrite préalable des titulaires des droits concernés.",
      "Toute utilisation non autorisée est susceptible d'engager la responsabilité de son auteur conformément aux dispositions légales applicables.",
    ],
  },
  {
    title: "6. Droit applicable et juridiction compétente",
    body: [
      "Les présentes mentions légales sont soumises au droit français.",
      "La langue de référence des présentes mentions légales est le français.",
      "En cas de différend relatif à l'utilisation du présent site, les parties privilégieront dans un premier temps une résolution amiable.",
      "À défaut d'accord, le litige sera soumis aux juridictions françaises compétentes, conformément aux règles légales applicables.",
    ],
  },
  {
    title: "7. Liens hypertextes",
    body: [
      "Le présent site peut contenir des liens hypertextes redirigeant vers des sites internet externes.",
      "Ces liens sont proposés à titre informatif et pratique. Les sites tiers concernés ne sont pas placés sous le contrôle d'AXINVEST.",
      "En conséquence, AXINVEST ne saurait être tenue responsable du contenu, des informations, des services ou des éventuelles modifications apportées à ces sites externes.",
      "La présence de liens hypertextes ne constitue en aucun cas une validation, une approbation ou une garantie concernant les contenus proposés par les sites concernés.",
      "Les utilisateurs sont invités à consulter les conditions d'utilisation ainsi que les politiques de confidentialité et de propriété intellectuelle propres à chaque site externe.",
    ],
  },
];

export default function DefenseMentionsLegales() {
  useEffect(() => {
    applyDefenseBranding("Mentions légales — AXINVEST");
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6F8]" data-testid="defense-mentions-legales">
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
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#071D3A]">Mentions légales</h1>
        <div className="mt-1 h-1 w-20 rounded-full" style={{ background: NAVY }} />

        <div className="mt-8 space-y-8 rounded-2xl border border-[#163A63]/10 bg-white p-6 sm:p-9 shadow-sm">
          {SECTIONS.map((s) => (
            <section key={s.title} data-testid="ml-section">
              <h2 className="font-display text-lg font-bold text-[#071D3A]">{s.title}</h2>
              <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-[#3A4A5E]">
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
                {s.address && (
                  <address className="not-italic rounded-lg bg-[#F5F6F8] px-4 py-3 font-medium text-[#071D3A]">
                    {s.address.map((line, i) => <div key={i}>{line}</div>)}
                  </address>
                )}
                {s.after && s.after.map((p, i) => <p key={`a${i}`}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[#6B7A8D]">© {new Date().getFullYear()} AXINVEST — Tous droits réservés.</p>
      </main>
    </div>
  );
}
