import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, CheckCircle2, XCircle, BadgeInfo } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { API, fmtDateFr, fmtError } from "@/api";

const EMPTY = { name: "", tag_id: "", conversion_label: "", enabled: true, is_default: false, campaigns: "" };
const TAG_RE = /^(?:AW|G|GT|DC|UA)-[A-Za-z0-9-]{4,30}$/;

export default function GoogleTagsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    API.get("/admin/google-tags")
      .then((r) => setItems(r.data.items || []))
      .catch((e) => toast.error(fmtError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setDialog({ mode: "add" }); };
  const openEdit = (t) => {
    setForm({
      name: t.name || "",
      tag_id: t.tag_id || "",
      conversion_label: t.conversion_label || "",
      enabled: !!t.enabled,
      is_default: !!t.is_default,
      campaigns: (t.campaigns || []).join(", "),
    });
    setDialog({ mode: "edit", id: t.id });
  };

  const save = async () => {
    if (!TAG_RE.test(form.tag_id.trim())) {
      toast.error("Identifiant Google invalide (ex. AW-123456789 ou G-XXXXXXXX).");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      tag_id: form.tag_id.trim(),
      conversion_label: form.conversion_label.trim(),
      enabled: form.enabled,
      is_default: form.is_default,
      campaigns: form.campaigns.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (dialog.mode === "add") await API.post("/admin/google-tags", payload);
      else await API.put(`/admin/google-tags/${dialog.id}`, payload);
      toast.success(dialog.mode === "add" ? "Balise ajoutée" : "Balise mise à jour");
      setDialog(null);
      load();
    } catch (e) {
      toast.error(fmtError(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (t) => {
    try {
      await API.put(`/admin/google-tags/${t.id}`, { enabled: !t.enabled });
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const doDelete = async () => {
    try {
      await API.delete(`/admin/google-tags/${confirmDelete.id}`);
      toast.success("Balise supprimée");
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="google-tags-section">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-[#0B111B]">Balises Google (Google Ads)</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez vos balises Google et associez-les à vos campagnes. Aucune modification de code nécessaire.
          </p>
        </div>
        <button type="button" data-testid="add-gtag-btn" onClick={openAdd} className="btn-primary-orange !py-2.5 !px-5 !text-sm">
          <Plus className="h-4 w-4" /> Ajouter une balise
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-800 mb-4 flex gap-2" data-testid="gtag-help">
        <BadgeInfo className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Collez votre identifiant Google (ex. <code className="bg-white/60 px-1 rounded">AW-18544084405</code>) — pas le code complet.
          Associez une campagne (ex. <code className="bg-white/60 px-1 rounded">bm1</code>) pour la cibler via <code className="bg-white/60 px-1 rounded">?campaign=bm1</code>, ou cochez « par défaut » pour le trafic sans campagne.
          Pour compter une conversion à l'envoi du formulaire, renseignez le <b>libellé de conversion</b> fourni par Google Ads.
        </p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-gray-400" data-testid="gtag-empty">Aucune balise configurée. Cliquez sur « Ajouter une balise ».</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm" data-testid="gtag-table">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="py-2.5 pr-3">Nom</th>
                <th className="py-2.5 pr-3">Identifiant</th>
                <th className="py-2.5 pr-3">Conversion</th>
                <th className="py-2.5 pr-3">Statut</th>
                <th className="py-2.5 pr-3">Campagnes</th>
                <th className="py-2.5 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/60" data-testid={`gtag-row-${t.id}`}>
                  <td className="py-3 pr-3 font-medium text-gray-800">
                    {t.name}
                    {t.is_default && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">PAR DÉFAUT</span>}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">{t.tag_id}</td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-500">{t.conversion_label ? t.conversion_label : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 pr-3">
                    <button type="button" onClick={() => toggleEnabled(t)} data-testid={`gtag-toggle-${t.id}`} className="inline-flex items-center gap-1.5">
                      {t.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Activé</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500"><XCircle className="h-3.5 w-3.5" /> Désactivé</span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {(t.campaigns || []).length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        t.campaigns.map((c) => <span key={c} className="rounded-full bg-[#FF683D]/10 px-2 py-0.5 text-xs font-medium text-[#FF683D]">{c}</span>)
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <a href="https://ads.google.com/aw/conversions" target="_blank" rel="noreferrer" title="Ouvrir Google Ads" data-testid={`gtag-verify-${t.id}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#FF683D] hover:border-[#FF683D]/40 transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button type="button" onClick={() => openEdit(t)} data-testid={`gtag-edit-${t.id}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#FF683D] hover:border-[#FF683D]/40 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(t)} data-testid={`gtag-delete-${t.id}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogue Ajouter / Modifier */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md" data-testid="gtag-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{dialog?.mode === "add" ? "Ajouter une balise Google" : "Modifier la balise"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la balise</label>
              <input data-testid="gtag-name-input" className="form-input-premium !p-3 text-sm" placeholder="Google Ads — Compte 1" value={form.name} onChange={(e) => setF("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant Google</label>
              <input data-testid="gtag-id-input" className="form-input-premium !p-3 text-sm" placeholder="AW-18544084405" value={form.tag_id} onChange={(e) => setF("tag_id", e.target.value.trim())} />
              <p className="mt-1 text-xs text-gray-400">Commence par AW-, G-, GT-… (ne collez pas le script complet).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Libellé de conversion (facultatif)</label>
              <input data-testid="gtag-label-input" className="form-input-premium !p-3 text-sm" placeholder="AbC-D_efGhIjk" value={form.conversion_label} onChange={(e) => setF("conversion_label", e.target.value.trim())} />
              <p className="mt-1 text-xs text-gray-400">Fourni par Google Ads (après le « / »). Si rempli, une conversion est envoyée à chaque formulaire envoyé.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campagnes associées</label>
              <input data-testid="gtag-campaigns-input" className="form-input-premium !p-3 text-sm" placeholder="bm1, bm2" value={form.campaigns} onChange={(e) => setF("campaigns", e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">Séparez par des virgules. Le lien de campagne sera <code>?campaign=bm1</code>.</p>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" data-testid="gtag-enabled-input" checked={form.enabled} onChange={(e) => setF("enabled", e.target.checked)} className="h-4 w-4 accent-[#FF683D]" />
              <span className="text-sm text-gray-700">Activé</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" data-testid="gtag-default-input" checked={form.is_default} onChange={(e) => setF("is_default", e.target.checked)} className="h-4 w-4 accent-[#FF683D]" />
              <span className="text-sm text-gray-700">Balise par défaut (trafic sans campagne)</span>
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setDialog(null)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="button" data-testid="gtag-save-btn" onClick={save} disabled={saving} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
              {saving ? "ENREGISTREMENT…" : "ENREGISTRER"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm" data-testid="gtag-delete-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Supprimer cette balise ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            La balise « <b>{confirmDelete?.name}</b> » ({confirmDelete?.tag_id}) sera définitivement supprimée. Cette action est irréversible.
          </p>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="button" data-testid="gtag-confirm-delete-btn" onClick={doDelete} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Supprimer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
