import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, CheckCircle2, XCircle, BadgeInfo } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { API, fmtDateFr, fmtError } from "@/api";

const EMPTY = { name: "", pixel_id: "", enabled: true, is_default: false, campaigns: "", test_event_code: "" };

function eventsManagerUrl(pixelId) {
  return `https://business.facebook.com/events_manager2/list/pixel/${pixelId}`;
}

export default function MetaPixelsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // {mode:'add'|'edit', data}
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    API.get("/admin/pixels")
      .then((r) => setItems(r.data.items || []))
      .catch((e) => toast.error(fmtError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setDialog({ mode: "add" }); };
  const openEdit = (p) => {
    setForm({
      name: p.name || "",
      pixel_id: p.pixel_id || "",
      enabled: !!p.enabled,
      is_default: !!p.is_default,
      campaigns: (p.campaigns || []).join(", "),
      test_event_code: p.test_event_code || "",
    });
    setDialog({ mode: "edit", id: p.id });
  };

  const save = async () => {
    if (!/^\d{8,20}$/.test(form.pixel_id.trim())) {
      toast.error("Identifiant de Pixel invalide : uniquement des chiffres (8 à 20).");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      pixel_id: form.pixel_id.trim(),
      enabled: form.enabled,
      is_default: form.is_default,
      campaigns: form.campaigns.split(",").map((s) => s.trim()).filter(Boolean),
      test_event_code: form.test_event_code,
    };
    try {
      if (dialog.mode === "add") await API.post("/admin/pixels", payload);
      else await API.put(`/admin/pixels/${dialog.id}`, payload);
      toast.success(dialog.mode === "add" ? "Pixel ajouté" : "Pixel mis à jour");
      setDialog(null);
      load();
    } catch (e) {
      toast.error(fmtError(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (p) => {
    try {
      await API.put(`/admin/pixels/${p.id}`, { enabled: !p.enabled });
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const doDelete = async () => {
    try {
      await API.delete(`/admin/pixels/${confirmDelete.id}`);
      toast.success("Pixel supprimé");
      setConfirmDelete(null);
      load();
    } catch (e) {
      toast.error(fmtError(e));
    }
  };

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="meta-pixels-section">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-[#0B111B]">Meta Pixels</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez vos Pixels Meta et associez-les à vos campagnes. Aucune modification de code nécessaire.
          </p>
        </div>
        <button type="button" data-testid="add-pixel-btn" onClick={openAdd} className="btn-primary-orange !py-2.5 !px-5 !text-sm">
          <Plus className="h-4 w-4" /> Ajouter un Pixel
        </button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-800 mb-4 flex gap-2" data-testid="pixels-help">
        <BadgeInfo className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Associez une campagne (ex. <code className="bg-white/60 px-1 rounded">bm1</code>) à un Pixel : le lien devient
          <code className="bg-white/60 px-1 rounded"> ?campaign=bm1</code>. Un Pixel « par défaut » se déclenche pour le trafic sans campagne.
          Un Pixel n'est confirmé fonctionnel qu'après un événement réel vérifié dans Meta Events Manager.
        </p>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-gray-400" data-testid="pixels-empty">Aucun Pixel configuré. Cliquez sur « Ajouter un Pixel ».</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm" data-testid="pixels-table">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="py-2.5 pr-3">Nom</th>
                <th className="py-2.5 pr-3">Identifiant</th>
                <th className="py-2.5 pr-3">Statut</th>
                <th className="py-2.5 pr-3">Campagnes</th>
                <th className="py-2.5 pr-3">Ajouté le</th>
                <th className="py-2.5 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60" data-testid={`pixel-row-${p.id}`}>
                  <td className="py-3 pr-3 font-medium text-gray-800">
                    {p.name}
                    {p.is_default && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">PAR DÉFAUT</span>}
                  </td>
                  <td className="py-3 pr-3 font-mono text-xs text-gray-600">{p.pixel_id}</td>
                  <td className="py-3 pr-3">
                    <button type="button" onClick={() => toggleEnabled(p)} data-testid={`pixel-toggle-${p.id}`} className="inline-flex items-center gap-1.5">
                      {p.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Activé</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-500"><XCircle className="h-3.5 w-3.5" /> Désactivé</span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.campaigns || []).length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        p.campaigns.map((c) => <span key={c} className="rounded-full bg-[#FF683D]/10 px-2 py-0.5 text-xs font-medium text-[#FF683D]">{c}</span>)
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">{fmtDateFr(p.created_at)}</td>
                  <td className="py-3 pr-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <a href={eventsManagerUrl(p.pixel_id)} target="_blank" rel="noreferrer" title="Vérifier dans Events Manager" data-testid={`pixel-verify-${p.id}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#FF683D] hover:border-[#FF683D]/40 transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button type="button" onClick={() => openEdit(p)} data-testid={`pixel-edit-${p.id}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-[#FF683D] hover:border-[#FF683D]/40 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(p)} data-testid={`pixel-delete-${p.id}`} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors">
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
        <DialogContent className="max-w-md" data-testid="pixel-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{dialog?.mode === "add" ? "Ajouter un Pixel" : "Modifier le Pixel"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du Pixel</label>
              <input data-testid="pixel-name-input" className="form-input-premium !p-3 text-sm" placeholder="Meta Pixel 1" value={form.name} onChange={(e) => setF("name", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant du Pixel</label>
              <input data-testid="pixel-id-input" className="form-input-premium !p-3 text-sm" placeholder="1905482920834524" value={form.pixel_id} onChange={(e) => setF("pixel_id", e.target.value.replace(/[^\d]/g, ""))} />
              <p className="mt-1 text-xs text-gray-400">Chiffres uniquement (8 à 20).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campagnes associées</label>
              <input data-testid="pixel-campaigns-input" className="form-input-premium !p-3 text-sm" placeholder="bm1, bm2" value={form.campaigns} onChange={(e) => setF("campaigns", e.target.value)} />
              <p className="mt-1 text-xs text-gray-400">Séparez par des virgules. Le lien de campagne sera <code>?campaign=bm1</code>.</p>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" data-testid="pixel-enabled-input" checked={form.enabled} onChange={(e) => setF("enabled", e.target.checked)} className="h-4 w-4 accent-[#FF683D]" />
              <span className="text-sm text-gray-700">Activé</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" data-testid="pixel-default-input" checked={form.is_default} onChange={(e) => setF("is_default", e.target.checked)} className="h-4 w-4 accent-[#FF683D]" />
              <span className="text-sm text-gray-700">Pixel par défaut (trafic sans campagne)</span>
            </label>
            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer text-sm font-medium text-gray-600">Configuration avancée</summary>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Code d'événement test (facultatif)</label>
                <input data-testid="pixel-testcode-input" className="form-input-premium !p-3 text-sm" placeholder="TEST12345" value={form.test_event_code} onChange={(e) => setF("test_event_code", e.target.value)} />
                <p className="mt-1 text-xs text-gray-400">Fourni par Meta Events Manager pour tester les événements.</p>
              </div>
            </details>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setDialog(null)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="button" data-testid="pixel-save-btn" onClick={save} disabled={saving} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
              {saving ? "ENREGISTREMENT…" : "ENREGISTRER"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm" data-testid="pixel-delete-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Supprimer ce Pixel ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Le Pixel « <b>{confirmDelete?.name}</b> » ({confirmDelete?.pixel_id}) sera définitivement supprimé. Cette action est irréversible.
          </p>
          <DialogFooter>
            <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="button" data-testid="pixel-confirm-delete-btn" onClick={doDelete} className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600">Supprimer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
