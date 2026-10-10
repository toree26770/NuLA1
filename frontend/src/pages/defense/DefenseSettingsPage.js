import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/api";

const FIELDS = [
  { key: "dup_window_days", label: "Fenêtre anti-doublon (jours)", hint: "Un même e-mail/téléphone reçu dans cette fenêtre est marqué « doublon »." },
  { key: "min_submit_seconds", label: "Délai minimum de soumission (secondes)", hint: "Les envois plus rapides sont considérés comme des bots et ignorés." },
  { key: "rate_limit_per_hour", label: "Limite d'envois par IP et par heure", hint: "Au-delà, les demandes sont bloquées (anti-spam)." },
  { key: "retention_days", label: "Durée de conservation (jours)", hint: "Information indicative pour la purge RGPD." },
];

export default function DefenseSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/defense/admin/settings").then((r) => setSettings(r.data)).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/defense/admin/settings", settings);
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#163A63]" /></div>;

  return (
    <div data-testid="defense-settings-page" className="space-y-6 max-w-2xl">
      <h1 className="font-['Bricolage_Grotesque'] text-2xl font-extrabold text-[#071D3A]">Paramètres & sécurité</h1>
      <div className="rounded-xl border border-[#163A63]/10 bg-white p-6 shadow-sm space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-semibold text-[#071D3A]">{f.label}</label>
            <p className="text-xs text-[#071D3A]/50 mb-1.5">{f.hint}</p>
            <input
              type="number"
              data-testid={`defense-setting-${f.key}`}
              value={settings[f.key] ?? 0}
              onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
              className="w-40 rounded-lg border border-[#163A63]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#163A63]"
            />
          </div>
        ))}
        <button type="button" data-testid="defense-settings-save" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A00C24] disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enregistrer
        </button>
      </div>
    </div>
  );
}
