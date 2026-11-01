import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  applyDefenseBranding, applyLivretBranding,
  DEFENSE_LANDING_PATH, LIVRET_LANDING_PATH,
} from "@/defenseBase";
import { LEGAL_DOCS } from "@/pages/legal/legalContent";

const NAVY = "#071D3A";

const Tricolore = () => (
  <div className="flex h-full w-full">
    <div className="h-full w-1/3 bg-[#0055A4]" />
    <div className="h-full w-1/3 bg-white" />
    <div className="h-full w-1/3 bg-[#C8102E]" />
  </div>
);

function backPath(scope) {
  if (scope === "defense") return DEFENSE_LANDING_PATH;
  if (scope === "livret") return LIVRET_LANDING_PATH;
  return "/";
}

function applyBranding(scope, title) {
  if (scope === "defense") applyDefenseBranding(title);
  else if (scope === "livret") applyLivretBranding(title);
  else document.title = title;
}

function Section({ s }) {
  return (
    <section data-testid="legal-section">
      <h2 className="font-display text-lg font-bold text-[#071D3A]">{s.title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-[#3A4A5E]">
        {(s.body || []).map((p, i) => <p key={i}>{p}</p>)}
        {s.address && (
          <address className="not-italic rounded-lg bg-[#F5F6F8] px-4 py-3 font-medium text-[#071D3A]">
            {s.address.map((line, i) => <div key={i}>{line}</div>)}
          </address>
        )}
        {(s.after || []).map((p, i) => <p key={`a${i}`}>{p}</p>)}
        {s.table && (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#071D3A] text-white text-left">
                  <th className="px-3 py-2 font-semibold rounded-tl-lg">Nom du cookie</th>
                  <th className="px-3 py-2 font-semibold">Fonction</th>
                  <th className="px-3 py-2 font-semibold rounded-tr-lg">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                {s.table.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-mono text-[#071D3A]">{r.nom}</td>
                    <td className="px-3 py-2 text-[#3A4A5E]">{r.fonction}</td>
                    <td className="px-3 py-2 text-[#3A4A5E]">{r.duree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default function LegalPage({ kind, scope }) {
  const doc = LEGAL_DOCS[kind];
  useEffect(() => {
    applyBranding(scope, `${doc.pageTitle} — AXINVEST`);
    window.scrollTo(0, 0);
  }, [kind, scope, doc.pageTitle]);

  return (
    <div className="min-h-screen bg-[#F5F6F8]" data-testid={`legal-page-${kind}`}>
      <div className="h-1.5 w-full"><Tricolore /></div>
      <header className="bg-[#071D3A] text-white">
        <div className="mx-auto max-w-4xl px-5 py-6 flex items-center justify-between">
          <Link to={backPath(scope)} data-testid="back-to-landing" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Retour au site
          </Link>
          <span className="text-xs font-semibold tracking-widest text-white/50">AXINVEST</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#071D3A]">{doc.pageTitle}</h1>
        <div className="mt-1 h-1 w-20 rounded-full" style={{ background: NAVY }} />

        <div className="mt-8 space-y-8 rounded-2xl border border-[#163A63]/10 bg-white p-6 sm:p-9 shadow-sm">
          {doc.intro && (
            <div className="space-y-2 text-[15px] leading-relaxed text-[#3A4A5E]">
              {doc.intro.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          {doc.sections.map((s) => <Section key={s.title} s={s} />)}
        </div>

        <p className="mt-8 text-center text-xs text-[#6B7A8D]">© {new Date().getFullYear()} AXINVEST — Tous droits réservés.</p>
      </main>
    </div>
  );
}
