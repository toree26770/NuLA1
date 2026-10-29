import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ShieldAlert } from "lucide-react";
import { API, fmtDateFr, fmtTimeFr, fmtError } from "@/api";
import MetaPixelsManager from "@/pages/admin/MetaPixelsManager";
import GoogleTagsManager from "@/pages/admin/GoogleTagsManager";
import { siteScope } from "@/defenseBase";

const EVENT_LABELS = {
  honeypot: "Piège anti-bot (honeypot)",
  fast_submit: "Soumission trop rapide",
  rate_limit: "Limite par IP atteinte",
  duplicate: "Doublon détecté",
  invalid_data: "Données invalides",
  failed_login: "Échec de connexion admin",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get("/admin/settings").then((r) => setSettings(r.data)).catch((e) => toast.error(fmtError(e)));
    API.get("/admin/security-logs").then((r) => setLogs(r.data)).catch(() => {});
  }, []);

  if (!settings) return <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="settings-loading" />;

  const set = (k, v) => setSettings((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await API.put("/admin/settings", settings);
      toast.success("Paramètres enregistrés.");
    } catch (e) {
      toast.error(fmtError(e));
    } finally {
      setSaving(false);
    }
  };

  const numField = (key, label, hint, testid) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number" min="0" data-testid={testid}
        className="form-input-premium !p-3 text-sm"
        value={settings[key]}
        onChange={(e) => set(key, e.target.value)}
      />
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="settings-page">
      <h1 className="font-display text-2xl md:text-3xl font-bold text-[#0B111B]">Paramètres</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5" data-testid="settings-form">
        <h2 className="font-semibold text-[#0B111B]">Protection contre les faux leads</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {numField("dup_window_days", "Période de réinscription (jours)", "Un même téléphone ou e-mail ne peut pas créer de nouveau lead pendant cette durée (il est marqué « doublon »).", "set-dup-window")}
          {numField("rate_limit_per_hour", "Demandes maximum par IP et par heure", "Au-delà, la soumission est refusée et journalisée.", "set-rate-limit")}
          {numField("min_submit_seconds", "Délai minimum de remplissage (secondes)", "Une soumission plus rapide est ignorée silencieusement (bot).", "set-min-seconds")}
          {numField("retention_days", "Durée de conservation des leads (jours)", "Repère RGPD pour vos purges périodiques.", "set-retention")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Version du consentement</label>
          <input data-testid="set-consent-version" className="form-input-premium !p-3 text-sm max-w-xs" value={settings.consent_version} onChange={(e) => set("consent_version", e.target.value)} />
          <p className="mt-1 text-xs text-gray-400">Enregistrée avec l'horodatage de chaque consentement (preuve RGPD).</p>
        </div>
        <button type="button" data-testid="save-settings-btn" onClick={save} disabled={saving} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "ENREGISTREMENT…" : "ENREGISTRER"}
        </button>
      </div>

      <MetaPixelsManager />

      {siteScope() === "defense" && <GoogleTagsManager />}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" data-testid="security-section">
        <h2 className="font-semibold text-[#0B111B] mb-4 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-[#FF683D]" /> Journal de sécurité</h2>
        {logs && (
          <>
            <div className="flex flex-wrap gap-2 mb-5" data-testid="security-counts">
              {Object.entries(logs.counts).map(([k, v]) => (
                <span key={k} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {EVENT_LABELS[k] || k} : <b>{v}</b>
                </span>
              ))}
              {Object.keys(logs.counts).length === 0 && <span className="text-sm text-gray-400">Aucun événement suspect détecté.</span>}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-gray-500">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Événement</th>
                    <th className="p-2.5">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.logs.map((l) => (
                    <tr key={l.id} className="border-t border-gray-50">
                      <td className="p-2.5 whitespace-nowrap">{fmtDateFr(l.created_at)} {fmtTimeFr(l.created_at)}</td>
                      <td className="p-2.5 font-medium">{EVENT_LABELS[l.event_type] || l.event_type}</td>
                      <td className="p-2.5 text-gray-500 break-all">{JSON.stringify(l.metadata)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
