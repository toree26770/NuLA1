import { useEffect, useState } from "react";
import { Download, Inbox, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { API, downloadCsv, fmtDateFr, fmtTimeFr, fmtError } from "@/api";
import { SourceBadge } from "@/components/SourceBadge";

function displayValue(key, val) {
  if (val === true) return "Oui";
  if (val === false) return "Non";
  if (Array.isArray(val)) return val.join(", ");
  if (key === "birth_date" && val) return fmtDateFr(val);
  return val || "—";
}

export default function PartialLeadsPage() {
  const [view, setView] = useState("pending"); // "pending" | "recovered"
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [recoveredTotal, setRecoveredTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    const rec = view === "recovered" ? "1" : "";
    API.get(`/admin/partial-leads?page=${page}&limit=25&recovered=${rec}`)
      .then((r) => {
        setItems(r.data.items || []);
        setTotal(r.data.total || 0);
        setPendingTotal(r.data.pending_total || 0);
        setRecoveredTotal(r.data.recovered_total || 0);
        setPages(r.data.pages || 1);
      })
      .catch(() => toast.error("Impossible de charger les leads incomplets"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, view]);

  const switchView = (v) => {
    if (v === view) return;
    setPage(1);
    setView(v);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadCsv("/admin/partial-leads/export.csv", "leads_incomplets.csv");
      toast.success("Export téléchargé — ces leads sont passés dans « Récupérés ».");
      setPage(1);
      load();
    } catch (e) {
      toast.error(fmtError(e));
    } finally {
      setExporting(false);
    }
  };

  const isRecoveredView = view === "recovered";

  return (
    <div className="space-y-6" data-testid="partial-leads-page">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Leads incomplets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Prospects qui ont commencé le formulaire sans l'envoyer. Exportez-les en CSV pour les recontacter : ils passent alors dans « Récupérés ».
          </p>
        </div>
        {!isRecoveredView && (
          <button
            type="button"
            data-testid="export-partial-btn"
            onClick={exportCsv}
            disabled={exporting || pendingTotal === 0}
            className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exporter &amp; marquer récupérés
          </button>
        )}
      </div>

      {/* Onglets À traiter / Récupérés */}
      <div className="flex gap-2" data-testid="partial-tabs">
        <button
          type="button"
          data-testid="partial-tab-pending"
          onClick={() => switchView("pending")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
            !isRecoveredView
              ? "bg-[#FF683D] text-white border-[#FF683D]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          À traiter <span className="ml-1 opacity-80">({pendingTotal})</span>
        </button>
        <button
          type="button"
          data-testid="partial-tab-recovered"
          onClick={() => switchView("recovered")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
            isRecoveredView
              ? "bg-[#FF683D] text-white border-[#FF683D]"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          Récupérés <span className="ml-1 opacity-80">({recoveredTotal})</span>
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {total} lead{total > 1 ? "s" : ""} {isRecoveredView ? "récupéré" : "incomplet"}{total > 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center" data-testid="partial-empty">
            {isRecoveredView ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucun lead récupéré pour le moment.</p>
                <p className="text-sm text-gray-400 mt-1">Les leads incomplets que vous exportez apparaîtront ici.</p>
              </>
            ) : (
              <>
                <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucun lead incomplet à traiter.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Dès qu'un visiteur commencera à remplir le formulaire sans le terminer, il apparaîtra ici.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="partial-table">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Dernière activité</th>
                  <th className="px-5 py-3 font-semibold">Nom</th>
                  <th className="px-5 py-3 font-semibold">Téléphone</th>
                  <th className="px-5 py-3 font-semibold">E-mail</th>
                  <th className="px-5 py-3 font-semibold">Étape</th>
                  {isRecoveredView ? (
                    <th className="px-5 py-3 font-semibold">Récupéré le</th>
                  ) : (
                    <th className="px-5 py-3 font-semibold">Source</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const a = it.answers || {};
                  const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || "—";
                  const step = typeof it.step_index === "number" ? `Étape ${it.step_index + 1}` : "—";
                  return (
                    <tr key={it.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors" data-testid={`partial-row-${it.id}`}>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {fmtDateFr(it.updated_at)} <span className="text-gray-400">{fmtTimeFr(it.updated_at)}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-800">{name}</td>
                      <td className="px-5 py-3.5 text-gray-700">{displayValue("phone", a.phone)}</td>
                      <td className="px-5 py-3.5 text-gray-700">{displayValue("email", a.email)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">{step}</span>
                      </td>
                      {isRecoveredView ? (
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                          {it.recovered_at ? `${fmtDateFr(it.recovered_at)} ${fmtTimeFr(it.recovered_at)}` : "—"}
                        </td>
                      ) : (
                        <td className="px-5 py-3.5" data-testid={`partial-source-${it.id}`}>
                          <SourceBadge label={it.source_label} fallback={it.utm_source} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="partial-prev" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              Précédent
            </button>
            <span className="text-sm text-gray-500">Page {page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} data-testid="partial-next" className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
