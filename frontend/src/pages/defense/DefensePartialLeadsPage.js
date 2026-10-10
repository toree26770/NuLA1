import { useEffect, useState } from "react";
import { Loader2, FileDown } from "lucide-react";
import { API, downloadCsv, fmtDateFr, fmtTimeFr } from "@/api";

export default function DefensePartialLeadsPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/defense/admin/partial-leads?limit=100")
      .then((r) => { setItems(r.data.items); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="defense-partial-leads-page" className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#071D3A]">Leads incomplets <span className="text-[#071D3A]/40 text-lg">({total})</span></h1>
        <button type="button" data-testid="defense-partial-export" onClick={() => downloadCsv("/defense/admin/partial-leads/export.csv", "defense_leads_incomplets.csv")} className="inline-flex items-center gap-2 rounded-lg bg-[#071D3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c2a52]"><FileDown className="h-4 w-4" /> Exporter en CSV</button>
      </div>
      <p className="text-sm text-[#071D3A]/55">Prospects ayant commencé le formulaire sans l'envoyer.</p>

      <div className="overflow-x-auto rounded-xl border border-[#163A63]/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-[#071D3A]/50">Aucun lead incomplet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F5F6F8] text-left text-[#071D3A]/60">
              <tr>
                <th className="px-4 py-3">Prénom</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Étape</th>
                <th className="px-4 py-3">Dernière activité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#163A63]/5">
              {items.map((it) => {
                const a = it.answers || {};
                return (
                  <tr key={it.id} className="hover:bg-[#F5F6F8]/60">
                    <td className="px-4 py-3">{a.first_name || "—"}</td>
                    <td className="px-4 py-3">{a.last_name || "—"}</td>
                    <td className="px-4 py-3">{a.phone || "—"}</td>
                    <td className="px-4 py-3">{a.email || "—"}</td>
                    <td className="px-4 py-3">{typeof it.step_index === "number" ? `Étape ${it.step_index + 1}` : "—"}</td>
                    <td className="px-4 py-3 text-[#071D3A]/70">{fmtDateFr(it.updated_at)} {fmtTimeFr(it.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
