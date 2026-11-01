import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEGAL_DOCS } from "@/pages/legal/legalContent";

const KINDS = [
  { kind: "mentions", label: "Mentions légales", testid: "footer-mentions-legales" },
  { kind: "politique", label: "Politique de confidentialité", testid: "footer-politique-confidentialite" },
  { kind: "cookies", label: "Gestion des cookies", testid: "footer-cookies" },
];

function LegalSection({ s }) {
  return (
    <section data-testid="legal-section">
      <h3 className="font-semibold text-[#071D3A]">{s.title}</h3>
      <div className="mt-1.5 space-y-2 text-sm leading-relaxed text-[#3A4A5E]">
        {(s.body || []).map((p, i) => <p key={i}>{p}</p>)}
        {s.address && (
          <address className="not-italic rounded-lg bg-[#F5F6F8] px-4 py-3 font-medium text-[#071D3A]">
            {s.address.map((line, i) => <div key={i}>{line}</div>)}
          </address>
        )}
        {(s.after || []).map((p, i) => <p key={`a${i}`}>{p}</p>)}
        {s.table && (
          <div className="overflow-x-auto">
            <table className="mt-1 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#071D3A] text-left text-white">
                  <th className="rounded-tl-lg px-3 py-2 font-semibold">Nom du cookie</th>
                  <th className="px-3 py-2 font-semibold">Fonction</th>
                  <th className="rounded-tr-lg px-3 py-2 font-semibold">Durée</th>
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

// Popup légal réutilisable : rend les 3 liens + une belle modale, sans changement de page ni d'URL.
export function LegalLinks({ linkClassName = "" }) {
  const [kind, setKind] = useState(null);
  const doc = kind ? LEGAL_DOCS[kind] : null;

  return (
    <>
      {KINDS.map((k) => (
        <button
          key={k.kind}
          type="button"
          data-testid={k.testid}
          onClick={() => setKind(k.kind)}
          className={linkClassName}
        >
          {k.label}
        </button>
      ))}

      <Dialog open={!!kind} onOpenChange={(o) => !o && setKind(null)}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 gap-0"
          data-testid="legal-dialog"
        >
          {doc && (
            <>
              <DialogHeader className="sticky top-0 z-10 border-b border-[#163A63]/10 bg-white px-6 py-4">
                <DialogTitle className="font-display text-xl text-[#071D3A]">{doc.pageTitle}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 px-6 py-5">
                {doc.intro && (
                  <div className="space-y-2 text-sm leading-relaxed text-[#3A4A5E]">
                    {doc.intro.map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
                {doc.sections.map((s) => <LegalSection key={s.title} s={s} />)}
                <p className="pt-2 text-center text-xs text-[#6B7A8D]">
                  © {new Date().getFullYear()} AXINVEST — Tous droits réservés.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default LegalLinks;
