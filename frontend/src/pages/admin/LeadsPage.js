import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Download, Eye, Trash2, ChevronLeft, ChevronRight, FileDown, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { API, STATUS_LABELS, STATUS_COLORS, downloadBatch, fmtDateFr, fmtTimeFr, fmtError } from "@/api";

const AMOUNTS = [
  "500 € à moins de 5 000 €", "5 000 € à moins de 10 000 €", "10 000 € à moins de 25 000 €",
  "25 000 € à 50 000 €", "Plus de 50 000 €",
];

function StatusBadge({ status }) {
  return (
    <span data-testid={`status-badge-${status}`} className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] || ""}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function LeadsPage({ status, title }) {
  const [data, setData] = useState({ leads: [], total: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [campSel, setCampSel] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [campOpen, setCampOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      const res = await API.post("/admin/leads/bulk-delete", { lead_ids: confirmDel.ids });
      toast.success(`${res.data.deleted} lead(s) supprimé(s).`);
      setConfirmDel(null);
      setDetail(null);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const load = useCallback(() => {
    API.get("/admin/leads", {
      params: { status, q, campaign: campSel.join(","), amount, date_from: dateFrom, date_to: dateTo, page, limit: 25 },
    })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(fmtError(e)));
  }, [status, q, campSel, amount, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  // Liste des campagnes connues (leads + Pixels Meta + balises Google) pour le filtre.
  useEffect(() => {
    Promise.all([
      API.get("/admin/campaigns").then((r) => (r.data.campaigns || []).map((c) => c.campaign)).catch(() => []),
      API.get("/admin/pixels").then((r) => (r.data.items || []).flatMap((p) => p.campaigns || [])).catch(() => []),
      API.get("/admin/google-tags").then((r) => (r.data.items || []).flatMap((t) => t.campaigns || [])).catch(() => []),
    ]).then((arrs) => {
      const set = new Set(arrs.flat().map((c) => (c || "").trim()).filter(Boolean));
      setAllCampaigns([...set].sort());
    });
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportNew = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await API.post("/admin/exports/new-leads", { campaigns: campSel });
      await downloadBatch(res.data.id, `leads_lot_${String(res.data.batch_number).padStart(4, "0")}.csv`);
      const scope = campSel.length > 0 ? ` (campagnes : ${campSel.join(", ")})` : "";
      toast.success(`${res.data.lead_count} lead(s) exporté(s)${scope} et marqués comme récupérés.`);
      setSelected(new Set());
      load();
    } catch (e) {
      if (e?.response?.status === 409) {
        toast.error("Un export est déjà en attente. Téléchargez-le ou annulez-le dans « Historique des exports ».");
      } else {
        toast.error(fmtError(e));
      }
    } finally {
      setExporting(false);
    }
  };

  const exportSelection = async () => {
    if (selected.size === 0) return;
    try {
      const res = await API.post("/admin/exports/custom", { lead_ids: [...selected] });
      await downloadBatch(res.data.id, `leads_selection_lot_${String(res.data.batch_number).padStart(4, "0")}.csv`);
      toast.success(`${res.data.lead_count} lead(s) exporté(s).`);
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const exportFiltered = async () => {
    try {
      const res = await API.post("/admin/exports/custom", {
        filters: { status, campaign: campSel.join(","), date_from: dateFrom, date_to: dateTo },
      });
      await downloadBatch(res.data.id, `leads_filtres_lot_${String(res.data.batch_number).padStart(4, "0")}.csv`);
      toast.success(`${res.data.lead_count} lead(s) exporté(s).`);
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const openDetail = async (id) => {
    try {
      const r = await API.get(`/admin/leads/${id}`);
      setDetail(r.data);
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const setLeadStatus = async (id, newStatus) => {
    try {
      await API.patch(`/admin/leads/${id}/status`, { status: newStatus });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[newStatus]}`);
      setDetail(null);
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  return (
    <div className="space-y-5" data-testid="leads-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">{title}</h1>
        <div className="flex flex-wrap gap-2">
          {status === "nouveau" && (
            <button type="button" data-testid="export-new-leads-btn" onClick={exportNew} disabled={exporting} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
              <Download className="h-4 w-4" /> {exporting ? "EXPORT…" : (campSel.length > 0 ? `EXPORTER ${campSel.length} CAMPAGNE(S) — CSV` : "EXPORTER TOUS LES NOUVEAUX — CSV")}
            </button>
          )}
          {selected.size > 0 && (
            <button type="button" data-testid="export-selection-btn" onClick={exportSelection} className="rounded-xl border border-[#FF683D] px-4 py-2.5 text-sm font-semibold text-[#FF683D] hover:bg-[#FF683D]/5 transition-colors inline-flex items-center gap-2">
              <FileDown className="h-4 w-4" /> Exporter la sélection ({selected.size})
            </button>
          )}
          {selected.size > 0 && (
            <button type="button" data-testid="delete-selection-btn" onClick={() => setConfirmDel({ ids: [...selected], label: `${selected.size} lead(s) sélectionné(s)` })} className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Supprimer la sélection ({selected.size})
            </button>
          )}
          <button type="button" data-testid="export-filtered-btn" onClick={exportFiltered} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
            <FileDown className="h-4 w-4" /> Exporter la vue filtrée
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm" data-testid="leads-filters">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            data-testid="filter-search"
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#FF683D]"
            placeholder="Nom, e-mail ou téléphone…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative" data-testid="filter-campaign-wrap">
          <button type="button" data-testid="filter-campaign-btn" onClick={() => setCampOpen((o) => !o)} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 min-w-[190px]">
            <span className="truncate">{campSel.length === 0 ? "Toutes les campagnes" : `${campSel.length} campagne(s)`}</span>
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          </button>
          {campOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCampOpen(false)} />
              <div className="absolute z-20 mt-1 w-64 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg" data-testid="filter-campaign-panel">
                {allCampaigns.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-gray-400">Aucune campagne connue. Ajoutez des campagnes dans vos Pixels/balises, ou recevez du trafic avec <code>?campaign=…</code>.</p>
                ) : (
                  <>
                    <button type="button" data-testid="campaign-clear-btn" onClick={() => { setCampSel([]); setPage(1); }} className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-[#FF683D] hover:bg-gray-50">
                      Tout désélectionner
                    </button>
                    {allCampaigns.map((c) => {
                      const checked = campSel.includes(c);
                      return (
                        <label key={c} data-testid={`campaign-opt-${c}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => { setCampSel((prev) => (checked ? prev.filter((x) => x !== c) : [...prev, c])); setPage(1); }}
                            className="h-4 w-4 accent-[#FF683D]"
                          />
                          <span className="truncate">{c}</span>
                        </label>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <select data-testid="filter-amount" className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF683D]" value={amount} onChange={(e) => { setAmount(e.target.value); setPage(1); }}>
          <option value="">Tous les montants</option>
          {AMOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input data-testid="filter-date-from" type="date" className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF683D]" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        <input data-testid="filter-date-to" type="date" className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FF683D]" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm" data-testid="leads-table">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="p-3 w-10"></th>
              <th className="p-3">Date</th>
              <th className="p-3">Heure</th>
              <th className="p-3">Prénom</th>
              <th className="p-3">Nom</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Montant envisagé</th>
              <th className="p-3">Campagne</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Récupéré le</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.leads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-50 hover:bg-[#FF683D]/[0.03] transition-colors" data-testid={`lead-row-${lead.id.slice(0, 8)}`}>
                <td className="p-3">
                  <input type="checkbox" data-testid={`select-lead-${lead.id.slice(0, 8)}`} checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="h-4 w-4 accent-[#FF683D]" />
                </td>
                <td className="p-3 whitespace-nowrap">{fmtDateFr(lead.created_at)}</td>
                <td className="p-3">{fmtTimeFr(lead.created_at)}</td>
                <td className="p-3 font-medium text-gray-800">{lead.first_name || "—"}</td>
                <td className="p-3 font-medium text-gray-800">{lead.last_name || "—"}</td>
                <td className="p-3 whitespace-nowrap">{lead.phone_e164 || "—"}</td>
                <td className="p-3">{lead.email_normalized || "—"}</td>
                <td className="p-3">{lead.amount_range || "—"}</td>
                <td className="p-3">{lead.utm_campaign || lead.campaign_id || <span className="text-gray-400">(direct)</span>}</td>
                <td className="p-3"><StatusBadge status={lead.status} /></td>
                <td className="p-3 whitespace-nowrap">{lead.retrieved_at ? `${fmtDateFr(lead.retrieved_at)} ${fmtTimeFr(lead.retrieved_at)}` : "—"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button type="button" data-testid={`view-lead-${lead.id.slice(0, 8)}`} onClick={() => openDetail(lead.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-[#FF683D] transition-colors">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button type="button" data-testid={`delete-lead-${lead.id.slice(0, 8)}`} onClick={() => setConfirmDel({ ids: [lead.id], label: `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.phone_e164 || "ce lead" })} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.leads.length === 0 && (
              <tr><td colSpan={12} className="p-10 text-center text-gray-400" data-testid="leads-empty">Aucun lead ne correspond aux critères.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between" data-testid="leads-pagination">
        <p className="text-sm text-gray-500">{data.total} lead(s) — page {data.page} / {data.pages}</p>
        <div className="flex gap-2">
          <button type="button" data-testid="page-prev" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" data-testid="page-next" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Fiche lead */}
      <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto" data-testid="lead-detail">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-xl">
                  {detail.lead.first_name} {detail.lead.last_name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div className="flex items-center gap-3">
                  <StatusBadge status={detail.lead.status} />
                  <span className="text-xs text-gray-400">{fmtDateFr(detail.lead.created_at)} à {fmtTimeFr(detail.lead.created_at)}</span>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 text-sm space-y-2">
                  <p><span className="font-semibold">Téléphone :</span> {detail.lead.phone_e164 || "—"}</p>
                  <p><span className="font-semibold">E-mail :</span> {detail.lead.email_normalized || "—"}</p>
                  <p><span className="font-semibold">Naissance :</span> {fmtDateFr(detail.lead.birth_date)}</p>
                  <p><span className="font-semibold">Montant :</span> {detail.lead.amount_range || "—"}</p>
                  <p><span className="font-semibold">Consentement :</span> {detail.lead.consent ? `Oui (${fmtDateFr(detail.lead.consent_timestamp)} ${fmtTimeFr(detail.lead.consent_timestamp)} — ${detail.lead.consent_version})` : "Non"}</p>
                  {detail.lead.retrieved_at && <p><span className="font-semibold">Récupéré le :</span> {fmtDateFr(detail.lead.retrieved_at)} {fmtTimeFr(detail.lead.retrieved_at)}</p>}
                  {detail.lead.duplicate_of && <p className="text-amber-600"><span className="font-semibold">Doublon de :</span> {detail.lead.duplicate_of.slice(0, 8)}…</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Toutes les réponses</h3>
                  <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm">
                    {detail.answers.map((a) => (
                      <div key={a.id} className="flex justify-between gap-4 px-4 py-2.5">
                        <span className="text-gray-500">{a.question_label_snapshot}</span>
                        <span className="font-medium text-gray-800 text-right">{typeof a.answer_value === "boolean" ? (a.answer_value ? "Oui" : "Non") : String(a.answer_value ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Campagne Meta</h3>
                  <div className="rounded-xl border border-gray-200 p-4 text-xs space-y-1.5 text-gray-600">
                    <p>utm_source : <b>{detail.lead.utm_source || "—"}</b> · utm_medium : <b>{detail.lead.utm_medium || "—"}</b></p>
                    <p>utm_campaign : <b>{detail.lead.utm_campaign || "—"}</b></p>
                    <p>utm_content : <b>{detail.lead.utm_content || "—"}</b> · utm_term : <b>{detail.lead.utm_term || "—"}</b></p>
                    <p>fbclid : <b className="break-all">{detail.lead.fbclid || "—"}</b></p>
                    <p>campaign_id : <b>{detail.lead.campaign_id || "—"}</b> · adset_id : <b>{detail.lead.adset_id || "—"}</b> · ad_id : <b>{detail.lead.ad_id || "—"}</b></p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.lead.status !== "traite" && (
                    <button type="button" data-testid="lead-mark-traite" onClick={() => setLeadStatus(detail.lead.id, "traite")} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors">Marquer traité</button>
                  )}
                  {detail.lead.status !== "invalide" && (
                    <button type="button" data-testid="lead-mark-invalide" onClick={() => setLeadStatus(detail.lead.id, "invalide")} className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">Marquer invalide</button>
                  )}
                  {detail.lead.status !== "nouveau" && (
                    <button type="button" data-testid="lead-mark-nouveau" onClick={() => setLeadStatus(detail.lead.id, "nouveau")} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Remettre en nouveau</button>
                  )}
                  <button type="button" data-testid="lead-delete-detail" onClick={() => setConfirmDel({ ids: [detail.lead.id], label: `${detail.lead.first_name || ""} ${detail.lead.last_name || ""}`.trim() || "ce lead" })} className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors inline-flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation suppression */}
      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm" data-testid="lead-delete-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Supprimer définitivement ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Vous êtes sur le point de supprimer <b>{confirmDel?.label}</b>. Cette action est irréversible et efface aussi les réponses associées.
          </p>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmDel(null)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="button" data-testid="confirm-delete-lead-btn" onClick={doDelete} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Supprimer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
