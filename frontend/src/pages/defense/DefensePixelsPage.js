import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/api";

export default function DefensePixelsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", pixel_id: "", campaigns: "", is_default: false, enabled: true });

  const load = useCallback(() => {
    setLoading(true);
    API.get("/defense/admin/pixels").then((r) => setItems(r.data.items)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await API.post("/defense/admin/pixels", {
        name: form.name,
        pixel_id: form.pixel_id,
        is_default: form.is_default,
        enabled: form.enabled,
        campaigns: form.campaigns.split(",").map((c) => c.trim()).filter(Boolean),
      });
      toast.success("Pixel ajouté");
      setForm({ name: "", pixel_id: "", campaigns: "", is_default: false, enabled: true });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Erreur");
    }
  };

  const toggle = async (p, field) => {
    await API.put(`/defense/admin/pixels/${p.id}`, { [field]: !p[field] });
    load();
  };

  const remove = async (p) => {
    if (!window.confirm("Supprimer ce Pixel ?")) return;
    await API.delete(`/defense/admin/pixels/${p.id}`);
    toast.success("Pixel supprimé");
    load();
  };

  const inputCls = "w-full rounded-lg border border-[#163A63]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#163A63]";

  return (
    <div data-testid="defense-pixels-page" className="space-y-6">
      <h1 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#071D3A]">Meta Pixels</h1>
      <p className="text-sm text-[#071D3A]/55">Chaque Pixel peut être associé à une ou plusieurs campagnes (paramètre <code>?campaign=</code> de l'URL). Le Pixel « par défaut » se déclenche pour le trafic sans campagne.</p>

      <form onSubmit={create} className="rounded-xl border border-[#163A63]/10 bg-white p-5 shadow-sm grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-[#071D3A]/60 mb-1">Nom</label>
          <input data-testid="defense-pixel-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Pixel principal" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#071D3A]/60 mb-1">Identifiant du Pixel</label>
          <input data-testid="defense-pixel-id" required value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} className={inputCls} placeholder="1234567890" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#071D3A]/60 mb-1">Campagnes associées (séparées par des virgules)</label>
          <input data-testid="defense-pixel-campaigns" value={form.campaigns} onChange={(e) => setForm({ ...form, campaigns: e.target.value })} className={inputCls} placeholder="bm1, promo-defense" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Pixel par défaut</label>
        <div className="sm:col-span-2">
          <button type="submit" data-testid="defense-pixel-create" className="inline-flex items-center gap-2 rounded-lg bg-[#071D3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c2a52]"><Plus className="h-4 w-4" /> Ajouter le Pixel</button>
        </div>
      </form>

      <div className="rounded-xl border border-[#163A63]/10 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-[#071D3A]/50"><Target className="mx-auto mb-2 h-6 w-6 text-[#163A63]/40" />Aucun Pixel configuré.</div>
        ) : (
          <div className="divide-y divide-[#163A63]/5">
            {items.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold text-[#071D3A]">{p.name} {p.is_default && <span className="ml-2 rounded bg-[#163A63]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#163A63]">PAR DÉFAUT</span>}</p>
                  <p className="text-xs text-[#071D3A]/55">ID : {p.pixel_id} · Campagnes : {(p.campaigns || []).join(", ") || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggle(p, "enabled")} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${p.enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.enabled ? "Activé" : "Désactivé"}</button>
                  <button type="button" data-testid={`defense-pixel-delete-${p.id}`} onClick={() => remove(p)} className="text-[#071D3A]/40 hover:text-[#C8102E]"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
