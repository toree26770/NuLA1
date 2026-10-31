import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ShieldAlert, Sheet, Copy, Check } from "lucide-react";
import { API, fmtDateFr, fmtTimeFr, fmtError } from "@/api";
import MetaPixelsManager from "@/pages/admin/MetaPixelsManager";
import GoogleTagsManager from "@/pages/admin/GoogleTagsManager";
import { siteScope } from "@/defenseBase";

const APPS_SCRIPT = `// Colle ce script dans ton Google Sheet : menu Extensions > Apps Script.
// Il crée/actualise une ligne dans l'onglet voulu (upsert par colonne "ID").
const TAB_COMPLETE = "Leads complets";
const TAB_INCOMPLETE = "Leads incomplets";

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var tab = body.type === "incomplete" ? TAB_INCOMPLETE : TAB_COMPLETE;
    var row = body.row || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);

    var keys = Object.keys(row);
    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    if (headers.join("") === "") {
      headers = keys.slice();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      keys.forEach(function (k) {
        if (headers.indexOf(k) === -1) {
          headers.push(k);
          sheet.getRange(1, headers.length, 1, 1).setValue(k);
        }
      });
    }

    var values = headers.map(function (h) { return row[h] !== undefined ? row[h] : ""; });

    // upsert : cherche une ligne avec le même ID
    var idCol = headers.indexOf("ID");
    var rowIndex = -1;
    if (idCol !== -1 && row["ID"]) {
      var last = sheet.getLastRow();
      if (last >= 2) {
        var ids = sheet.getRange(2, idCol + 1, last - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === String(row["ID"])) { rowIndex = i + 2; break; }
        }
      }
    }
    if (rowIndex === -1) {
      sheet.appendRow(values);
    } else {
      sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

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
  const [copied, setCopied] = useState(false);

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

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5" data-testid="sheet-sync-section">
        <div>
          <h2 className="font-semibold text-[#0B111B] flex items-center gap-2"><Sheet className="h-5 w-5 text-[#16A34A]" /> Sauvegarde Google Sheet</h2>
          <p className="mt-1 text-sm text-gray-500">Chaque lead (complet ou incomplet) est copié en temps réel dans votre Google Sheet. Sécurité : si le serveur a un souci, vos leads restent sauvegardés dans le Sheet.</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer" data-testid="sheet-sync-enabled-label">
          <input
            type="checkbox"
            data-testid="sheet-sync-enabled"
            className="h-4 w-4 accent-[#16A34A]"
            checked={settings.sheet_sync_enabled !== false && !!settings.sheet_webhook_url}
            onChange={(e) => set("sheet_sync_enabled", e.target.checked)}
          />
          <span className="text-sm font-medium text-gray-700">Activer la copie des leads vers le Sheet</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lien du script Google (Web App)</label>
          <input
            data-testid="sheet-webhook-url"
            className="form-input-premium !p-3 text-sm font-mono"
            placeholder="https://script.google.com/macros/s/…/exec"
            value={settings.sheet_webhook_url || ""}
            onChange={(e) => set("sheet_webhook_url", e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">Collez ici l'URL « /exec » générée après avoir déployé le script ci-dessous en « Application Web ».</p>
        </div>

        <details className="rounded-xl border border-gray-100 bg-gray-50 p-4" data-testid="sheet-setup-help">
          <summary className="cursor-pointer text-sm font-semibold text-gray-700">Comment obtenir ce lien ? (étapes, ~2 min)</summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
            <li>Créez un Google Sheet avec 2 onglets nommés exactement <b>Leads complets</b> et <b>Leads incomplets</b> (ils se créent automatiquement si absents).</li>
            <li>Dans le Sheet : menu <b>Extensions → Apps Script</b>.</li>
            <li>Supprimez le code présent, collez le script ci-dessous, puis <b>Enregistrer</b>.</li>
            <li>Cliquez sur <b>Déployer → Nouveau déploiement → Type : Application Web</b>.</li>
            <li>« Qui a accès » = <b>Tout le monde</b>, puis <b>Déployer</b> et autorisez l'accès.</li>
            <li>Copiez l'<b>URL de l'application Web</b> (se termine par <code>/exec</code>) et collez-la ci-dessus, puis <b>Enregistrer</b>.</li>
          </ol>
          <div className="mt-3">
            <button
              type="button"
              data-testid="copy-script-btn"
              onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0B111B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
            >
              {copied ? <><Check className="h-3.5 w-3.5" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier le script</>}
            </button>
            <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-[#0B111B] p-3 text-[11px] leading-relaxed text-gray-100" data-testid="apps-script-code">{APPS_SCRIPT}</pre>
          </div>
        </details>

        <button type="button" data-testid="save-sheet-settings-btn" onClick={save} disabled={saving} className="btn-primary-orange !py-2.5 !px-5 !text-sm disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "ENREGISTREMENT…" : "ENREGISTRER"}
        </button>
      </div>

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
