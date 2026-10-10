import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Trash2, Download, FileDown, X } from "lucide-react";
import { toast } from "sonner";
import { API, downloadCsv, fmtDateFr, fmtTimeFr } from "@/api";

const STATUSES = ["nouveau", "recupere", "traite", "doublon", "invalide"];
const STATUS_LABELS = { nouveau: "Nouveau", recupere: "Récupéré", traite: "Traité", doublon: "Doublon", invalide: "Invalide" };
const STATUS_COLORS = {
  nouveau: "bg-[#C8102E]/10 text-[#C8102E] border-[#C8102E]/30",
  recupere: "bg-blue-50 text-blue-700 border-blue-200",
  traite: "bg-emerald-50 text-emerald-700 border-emerald-200",
  doublon: "bg-amber-50 text-amber-700 border-amber-200",
  invalide: "bg-red-50 text-red-700 border-red-200",
};

export default function DefenseLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    API.get(`/defense/admin/leads?${params.toString()}`)
      .then((r) => { setLeads(r.data.leads); setTotal(r.data.total); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  }, [page, status, q]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id, s) => {
    await API.patch(`/defense/admin/leads/${id}/status`, { status: s });
    toast.success("Statut mis à jour");
    load();
  };

  const removeLead = async (id) => {
    if (!window.confirm("Supprimer définitivement ce prospect ?")) return;
    await API.delete(`/defense/admin/leads/${id}`);
    toast.success("Prospect supprimé");
    setDetail(null);
    load();
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Supprimer ${selected.length} prospect(s) ?`)) return;
    const r = await API.post("/defense/admin/leads/bulk-delete", { lead_ids: selected });
    toast.success(`${r.data.deleted} prospect(s) supprimé(s)`);
    setSelected([]);
    load();
  };

  const exportNew = async () => {
    try {
      const r = await API.post("/defense/admin/exports/new-leads");
      await downloadCsv(`/defense/admin/exports/${r.data.id}/download`, `defense_leads_lot_${String(r.data.batch_number).padStart(4, "0")}.csv`);
      toast.success("Export téléchargé — les nouveaux leads passent en « Récupéré »");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Aucun nouveau lead à exporter");
    }
  };

  const exportCustom = async () => {
    try {
      const r = await API.post("/defense/admin/exports/custom", { filters: { status, q } });
      await downloadCsv(`/defense/admin/exports/${r.data.id}/download`, `defense_export_${r.data.batch_number}.csv`);
      toast.success("Export personnalisé téléchargé");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Aucun lead correspondant");
    }
  };

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (s.length === leads.length ? [] : leads.map((l) => l.id)));

  const openDetail = (l) => { setDetail(l); setNotes(l.notes || ""); };
  const saveNotes = async () => {
    await API.patch(`/defense/admin/leads/${detail.id}/notes`, { notes });
    toast.success("Notes enregistrées");
    load();
  };

  return (
    <div data-testid="defense-leads-page" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#071D3A]">Prospects <span className="text-[#071D3A]/40 text-lg">({total})</span></h1>
        <div className="flex gap-2">
          <button type="button" data-testid="defense-export-new" onClick={exportNew} className="inline-flex items-center gap-2 rounded-lg bg-[#071D3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c2a52]"><Download className="h-4 w-4" /> Exporter les nouveaux</button>
          <button type="button" data-testid="defense-export-custom" onClick={exportCustom} className="inline-flex items-center gap-2 rounded-lg border-2 border-[#163A63]/20 px-4 py-2 text-sm font-semibold text-[#071D3A] hover:bg-white"><FileDown className="h-4 w-4" /> Export filtré</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#071D3A]/40" />
          <input data-testid="defense-leads-search" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Rechercher nom, e-mail, téléphone…" className="w-full rounded-lg border border-[#163A63]/15 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-[#163A63]" />
        </div>
        <select data-testid="defense-leads-status-filter" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} className="rounded-lg border border-[#163A63]/15 bg-white px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {selected.length > 0 && (
          <button type="button" data-testid="defense-bulk-delete" onClick={bulkDelete} className="inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A00C24]"><Trash2 className="h-4 w-4" /> Supprimer ({selected.length})</button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#163A63]/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-[#071D3A]/50">Aucun prospect pour ces filtres.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F5F6F8] text-left text-[#071D3A]/60">
              <tr>
                <th className="px-4 py-3"><input type="checkbox" data-testid="defense-select-all" checked={selected.length === leads.length && leads.length > 0} onChange={toggleAll} /></th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Situation</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#163A63]/5">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-[#F5F6F8]/60">
                  <td className="px-4 py-3"><input type="checkbox" data-testid={`defense-select-${l.id}`} checked={selected.includes(l.id)} onChange={() => toggle(l.id)} /></td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => openDetail(l)} className="font-semibold text-[#071D3A] hover:text-[#C8102E]">{l.first_name} {l.last_name}</button>
                  </td>
                  <td className="px-4 py-3 text-[#071D3A]/70"><div>{l.email}</div><div className="text-xs">{l.phone_e164}</div></td>
                  <td className="px-4 py-3 text-[#071D3A]/70">{l.situation || "—"}</td>
                  <td className="px-4 py-3 text-[#071D3A]/70">{fmtDateFr(l.created_at)} {fmtTimeFr(l.created_at)}</td>
                  <td className="px-4 py-3">
                    <select data-testid={`defense-status-${l.id}`} value={l.status} onChange={(e) => changeStatus(l.id, e.target.value)} className={`rounded-md border px-2 py-1 text-xs font-semibold ${STATUS_COLORS[l.status] || ""}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" data-testid={`defense-delete-${l.id}`} onClick={() => removeLead(l.id)} className="text-[#071D3A]/40 hover:text-[#C8102E]"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Précédent</button>
          <span className="px-2">Page {page} / {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Suivant</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setDetail(null)}>
          <div data-testid="defense-lead-detail" className="h-full w-full max-w-md bg-white p-6 overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-['Bricolage_Grotesque'] text-xl font-extrabold text-[#071D3A]">{detail.first_name} {detail.last_name}</h2>
              <button type="button" onClick={() => setDetail(null)} className="text-[#071D3A]/40 hover:text-[#071D3A]"><X className="h-5 w-5" /></button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              {[["E-mail", detail.email], ["Téléphone", detail.phone_e164], ["Situation", detail.situation || "—"], ["Campagne", detail.campaign || "(direct)"], ["Source", detail.utm_source || "—"], ["Reçu le", `${fmtDateFr(detail.created_at)} ${fmtTimeFr(detail.created_at)}`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-[#071D3A]/55">{k}</dt><dd className="font-medium text-[#071D3A] text-right">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-5">
              <label className="block text-sm font-medium text-[#071D3A] mb-1.5">Notes internes</label>
              <textarea data-testid="defense-lead-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="w-full rounded-lg border border-[#163A63]/15 p-3 text-sm outline-none focus:border-[#163A63]" />
              <button type="button" data-testid="defense-save-notes" onClick={saveNotes} className="mt-2 rounded-lg bg-[#071D3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c2a52]">Enregistrer</button>
            </div>
            <button type="button" onClick={() => removeLead(detail.id)} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#C8102E]"><Trash2 className="h-4 w-4" /> Supprimer ce prospect</button>
          </div>
        </div>
      )}
    </div>
  );
}
