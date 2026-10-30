// Détermine si l'application doit se comporter comme le site « Livret Défense »
// en fonction du nom de domaine (sous-domaine dédié) ou du chemin /defense.
//
// - Sur le sous-domaine Défense (ex. militaire.axinvest.app) : la landing est à la
//   racine "/" et l'admin à "/admin".
// - Partout ailleurs (domaine Claude, Preview) : la landing est à "/defense" et
//   l'admin à "/defense/admin".
const DEFENSE_HOSTS = (process.env.REACT_APP_DEFENSE_HOST || "militaire.axinvest.app")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const isDefenseHost =
  typeof window !== "undefined" && DEFENSE_HOSTS.includes(window.location.hostname.toLowerCase());

export const DEFENSE_BASE = isDefenseHost ? "" : "/defense";
export const DEFENSE_LANDING_PATH = isDefenseHost ? "/" : "/defense";
export const DEFENSE_ADMIN_BASE = `${DEFENSE_BASE}/admin`;

// Favicon drapeau tricolore (bleu-blanc-rouge) pour le site Défense.
const DEFENSE_FAVICON =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Cdefs%3E%3CclipPath%20id='r'%3E%3Crect%20width='64'%20height='64'%20rx='14'/%3E%3C/clipPath%3E%3C/defs%3E%3Cg%20clip-path='url(%23r)'%3E%3Crect%20width='21.33'%20height='64'%20fill='%230055A4'/%3E%3Crect%20x='21.33'%20width='21.33'%20height='64'%20fill='%23FFFFFF'/%3E%3Crect%20x='42.66'%20width='21.34'%20height='64'%20fill='%23EF4135'/%3E%3C/g%3E%3C/svg%3E";

// Met à jour (ou crée) une balise meta dans le <head>.
function upsertMeta(selector, attr, key, content) {
  if (typeof document === "undefined" || !content) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

// Applique titre + description + Open Graph + Twitter propres au site courant.
// (Utile pour les analyseurs qui exécutent le JS : Google, ChatGPT browse, etc.)
function applySiteMeta({ title, description, siteName }) {
  if (typeof document === "undefined") return;
  document.title = title;
  upsertMeta('meta[name="description"]', "name", "description", description);
  upsertMeta('meta[property="og:title"]', "property", "og:title", title);
  upsertMeta('meta[property="og:description"]', "property", "og:description", description);
  upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", siteName);
  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
}

// Applique le titre d'onglet et le favicon du site Défense (sans toucher Claude).
export function applyDefenseBranding(title = "Livret d'Épargne Défense — Vérifiez votre éligibilité") {
  if (typeof document === "undefined") return;
  applySiteMeta({
    title,
    description: "Vérifiez gratuitement votre éligibilité au Livret d'Épargne Défense. Épargne patrimoniale française, accessible aux civils comme aux militaires. Sans engagement.",
    siteName: "Livret d'Épargne Défense",
  });
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.setAttribute("href", DEFENSE_FAVICON);
  let apple = document.querySelector("link[rel='apple-touch-icon']");
  if (apple) apple.setAttribute("href", DEFENSE_FAVICON);
}

// ---------------------------------------------------------------------------
// Site « Super Livret — Compte rémunéré » (3ᵉ site, sous-domaine livret.axinvest.app)
// ---------------------------------------------------------------------------
const LIVRET_HOSTS = (process.env.REACT_APP_LIVRET_HOST || "livret.axinvest.app")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const isLivretHost =
  typeof window !== "undefined" && LIVRET_HOSTS.includes(window.location.hostname.toLowerCase());

export const LIVRET_BASE = isLivretHost ? "" : "/livret";
export const LIVRET_LANDING_PATH = isLivretHost ? "/" : "/livret";
export const LIVRET_ADMIN_BASE = `${LIVRET_BASE}/admin`;

// Favicon « SL » (bleu marine + pastille orange) pour le site Super Livret.
const LIVRET_FAVICON =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='14'%20fill='%230B1B3A'/%3E%3Ccircle%20cx='50'%20cy='16'%20r='7'%20fill='%23FF6B3D'/%3E%3Ctext%20x='30'%20y='47'%20font-family='Arial,sans-serif'%20font-size='30'%20font-weight='bold'%20fill='%23FFFFFF'%20text-anchor='middle'%3ESL%3C/text%3E%3C/svg%3E";

export function applyLivretBranding(title = "Super Livret — Compte rémunéré à 5 % net garanti") {
  if (typeof document === "undefined") return;
  applySiteMeta({
    title,
    description: "Super Livret — compte rémunéré. Vérifiez gratuitement votre éligibilité en ligne, sans engagement.",
    siteName: "Super Livret",
  });
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.setAttribute("href", LIVRET_FAVICON);
  let apple = document.querySelector("link[rel='apple-touch-icon']");
  if (apple) apple.setAttribute("href", LIVRET_FAVICON);
}

// ---------------------------------------------------------------------------
// Résolution générique du « site » courant (claude / defense / livret)
// ---------------------------------------------------------------------------
export function siteScope() {
  if (isDefenseHost) return "defense";
  if (isLivretHost) return "livret";
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    if (p.startsWith("/defense")) return "defense";
    if (p.startsWith("/livret")) return "livret";
  }
  return "claude";
}

// Préfixe d'API à appliquer aux appels admin/auth selon le site courant.
export function scopeApiPrefix() {
  const s = siteScope();
  return s === "defense" ? "/defense" : s === "livret" ? "/livret" : "";
}

// Base de route de l'admin selon le site courant.
export function scopeAdminBase() {
  const s = siteScope();
  return s === "defense" ? DEFENSE_ADMIN_BASE : s === "livret" ? LIVRET_ADMIN_BASE : "/admin";
}

// Nom de marque affiché dans l'admin selon le site courant.
export function scopeBrandName() {
  const s = siteScope();
  return s === "defense" ? "Défense" : s === "livret" ? "Super Livret" : "Claude";
}
