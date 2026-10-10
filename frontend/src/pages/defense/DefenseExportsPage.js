import { useCallback, useEffect, useState } from "react";
import { Loader2, Download, X } from "lucide-react";
import { toast } from "sonner";
import { API, downloadCsv, fmtDateFr, fmtTimeFr } from "@/api";

export default function DefenseExportsPage() {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    API.get("/defense/admin/exports").then((r) => setExports(r.data.exports)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const newExport = async () => {
    try {
      const r = await API.post("/defense/admin/exports/new-leads");
      await downloadCsv(`/defense/admin/exports/${r.data.id}/download`, `defense_leads_lot_${String(r.data.batch_number).padStart(4, "0")}.csv`);
      toast.success("Export téléchargé — nouveaux leads passés en « Récupéré »");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Aucun nouveau lead à exporter");
    }
  };

  const dl = async (b) => {
    await downloadCsv(`/defense/admin/exports/${b.id}/download`, `defense_leads_lot_${String(b.batch_number).padStart(4, "0")}.csv`);
    load();
  };

  const cancel = async (b) => {
    await API.post(`/defense/admin/exports/${b.id}/cancel`);
    toast.success("Lot annulé");
    load();
  };

  return (
    <div data-testid="defense-exports-page" className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#071D3A]">Exports</h1>
        <button type="button" data-testid="defense-new-export" onClick={newExport} className="inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00C24]"><Download className="h-4 w-4" /> Exporter les nouveaux leads</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#163A63]/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>
        ) : exports.length === 0 ? (
          <div className="py-16 text-center text-[#071D3A]/50">Aucun export pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F5F6F8] text-left text-[#071D3A]/60">
              <tr>
                <th className="px-4 py-3">Lot</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Prospects</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#163A63]/5">
              {exports.map((b) => (
                <tr key={b.id} className="hover:bg-[#F5F6F8]/60">
                  <td className="px-4 py-3 font-semibold">#{String(b.batch_number).padStart(4, "0")}</td>
                  <td className="px-4 py-3">{b.kind === "new" ? "Nouveaux" : "Personnalisé"}</td>
                  <td className="px-4 py-3">{b.lead_count}</td>
                  <td className="px-4 py-3 text-[#071D3A]/70">{fmtDateFr(b.created_at)} {fmtTimeFr(b.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${b.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{b.status === "pending" ? "En attente" : "Téléchargé"}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button type="button" onClick={() => dl(b)} className="inline-flex items-center gap-1 text-[#071D3A] hover:text-[#C8102E] font-medium"><Download className="h-4 w-4" /> Télécharger</button>
                    {b.status === "pending" && <button type="button" onClick={() => cancel(b)} className="inline-flex items-center gap-1 text-[#071D3A]/50 hover:text-[#C8102E]"><X className="h-4 w-4" /> Annuler</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
