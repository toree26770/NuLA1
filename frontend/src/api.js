import axios from "axios";
import { isDefenseHost } from "@/defenseBase";

// Sur le sous-domaine Défense (ex. militaire.axinvest.app), le site et son
// backend sont servis par la MÊME origine : on appelle donc "/api" sur cette
// origine (même serveur) au lieu du domaine Claude compilé en dur. Partout
// ailleurs (Preview, domaine Claude), on utilise REACT_APP_BACKEND_URL.
const BACKEND_BASE =
  isDefenseHost && typeof window !== "undefined"
    ? window.location.origin
    : process.env.REACT_APP_BACKEND_URL;

export const API = axios.create({
  baseURL: `${BACKEND_BASE}/api`,
  withCredentials: true,
});

// Route automatiquement les appels admin/auth vers l'espace Défense (/defense/...)
// lorsque l'on se trouve sur le sous-domaine Défense ou sous /defense.
API.interceptors.request.use((config) => {
  try {
    const url = config.url || "";
    const inDefense =
      isDefenseHost ||
      (typeof window !== "undefined" && window.location.pathname.startsWith("/defense"));
    if (inDefense && (url.startsWith("/admin") || url.startsWith("/auth"))) {
      config.url = "/defense" + url;
    }
  } catch {
    /* no-op */
  }
  return config;
});

export function getSessionId() {
  try {
    let sid = localStorage.getItem("claude_sid");
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem("claude_sid", sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

export function trackEvent(event, { step_index = null, meta = {} } = {}) {
  try {
    API.post("/track", { session_id: getSessionId(), event, step_index, meta }).catch(() => {});
  } catch {
    /* ne jamais bloquer l'UI pour du suivi */
  }
}

export function trackDefense(event, { step_index = null, meta = {} } = {}) {
  try {
    API.post("/defense/track", { session_id: getSessionId(), event, step_index, meta }).catch(() => {});
  } catch {
    /* ne jamais bloquer l'UI pour du suivi */
  }
}

export function fmtError(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Erreur réseau. Réessayez.";
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((x) => (x && typeof x.msg === "string" ? x.msg : JSON.stringify(x))).join(" ");
  return String(d);
}

export async function downloadBatch(batchId, filename) {
  const res = await API.get(`/admin/exports/${batchId}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "leads.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadCsv(path, filename) {
  const res = await API.get(path, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const STATUS_LABELS = {
  nouveau: "Nouveau",
  recupere: "Récupéré",
  traite: "Traité",
  doublon: "Doublon",
  invalide: "Invalide",
};

export const STATUS_COLORS = {
  nouveau: "bg-[#FF683D]/10 text-[#FF683D] border-[#FF683D]/30",
  recupere: "bg-blue-50 text-blue-700 border-blue-200",
  traite: "bg-emerald-50 text-emerald-700 border-emerald-200",
  doublon: "bg-amber-50 text-amber-700 border-amber-200",
  invalide: "bg-red-50 text-red-700 border-red-200",
};

export function fmtDateFr(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function fmtTimeFr(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
