import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, XCircle, RefreshCcw } from "lucide-react";
import { API, downloadBatch, fmtDateFr, fmtTimeFr, fmtError } from "@/api";

export default function ExportsPage() {
  const [exports, setExports] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    API.get("/admin/exports").then((r) => setExports(r.data.exports)).catch((e) => toast.error(fmtError(e)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = exports.find((e) => e.status === "pending");

  const exportNew = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await API.post("/admin/exports/new-leads");
      await downloadBatch(res.data.id, `leads_lot_${String(res.data.batch_number).padStart(4, "0")}.csv`);
      toast.success(`Lot n°${res.data.batch_number} : ${res.data.lead_count} lead(s) exporté(s) et marqués récupérés.`);
      load();
    } catch (e) {
      toast.error(fmtError(e));
      if (e?.response?.status === 409) load();
    } finally {
      setCreating(false);
    }
  };

  const redownload = async (batch) => {
    try {
      await downloadBatch(batch.id, `leads_lot_${String(batch.batch_number).padStart(4, "0")}.csv`);
      if (batch.status === "pending") {
        toast.success("Lot téléchargé : les leads sont maintenant marqués comme récupérés.");
        load();
      }
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const cancel = async (batch) => {
    try {
      await API.post(`/admin/exports/${batch.id}/cancel`);
      toast.success("Lot annulé : les leads restent au statut « Nouveau ».");
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  return (
    <div className="space-y-5" data-testid="exports-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Historique des exports</h1>
        <button type="button" data-testid="export-new-leads-btn" onClick={exportNew} disabled={creating || !!pending} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
          <Download className="h-4 w-4" /> EXPORTER LES NOUVEAUX LEADS — CSV
        </button>
      </div>

      {pending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#FF683D] bg-[#FF683D]/5 p-4" data-testid="pending-batch-banner">
          <p className="text-sm font-medium text-[#0B111B]">
            Lot n°{pending.batch_number} en attente : <b>{pending.lead_count} lead(s)</b> prêts. Le téléchargement confirme la récupération.
          </p>
          <div className="flex gap-2">
            <button type="button" data-testid="pending-download-btn" onClick={() => redownload(pending)} className="rounded-xl bg-[#FF683D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#FF914D] transition-colors inline-flex items-center gap-2">
              <Download className="h-4 w-4" /> Télécharger
            </button>
            <button type="button" data-testid="pending-cancel-btn" onClick={() => cancel(pending)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white transition-colors inline-flex items-center gap-2">
              <XCircle className="h-4 w-4" /> Annuler
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm" data-testid="exports-table">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="p-3">Lot</th>
              <th className="p-3">Date</th>
              <th className="p-3">Heure</th>
              <th className="p-3">Leads</th>
              <th className="p-3">Type</th>
              <th className="p-3">Administrateur</th>
              <th className="p-3">Statut</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {exports.map((b) => (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-[#FF683D]/[0.03]" data-testid={`export-row-${b.batch_number}`}>
                <td className="p-3 font-semibold">n°{b.batch_number}</td>
                <td className="p-3">{fmtDateFr(b.created_at)}</td>
                <td className="p-3">{fmtTimeFr(b.created_at)}</td>
                <td className="p-3">{b.lead_count}</td>
                <td className="p-3">{b.kind === "new" ? "Nouveaux leads" : "Export personnalisé"}</td>
                <td className="p-3">{b.created_by}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${b.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    {b.status === "pending" ? "En attente" : "Téléchargé"}
                  </span>
                </td>
                <td className="p-3">
                  <button type="button" data-testid={`redownload-${b.batch_number}`} onClick={() => redownload(b)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-[#FF683D] transition-colors">
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {exports.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-gray-400" data-testid="exports-empty">Aucun export pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Format CSV compatible Excel français : UTF-8 avec BOM, séparateur point-virgule, dates françaises, protection contre les injections de formules.
      </p>
    </div>
  );
}
