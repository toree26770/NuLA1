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

// Favicon « LD » (bleu marine + liseré tricolore) pour le site Défense.
const DEFENSE_FAVICON =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='14'%20fill='%23071D3A'/%3E%3Crect%20width='21.3'%20height='8'%20fill='%230055A4'/%3E%3Crect%20x='21.3'%20width='21.3'%20height='8'%20fill='%23FFFFFF'/%3E%3Crect%20x='42.6'%20width='21.4'%20height='8'%20fill='%23EF4135'/%3E%3Ctext%20x='32'%20y='47'%20font-family='Georgia,serif'%20font-size='30'%20font-weight='bold'%20fill='%23FFFFFF'%20text-anchor='middle'%3ELD%3C/text%3E%3C/svg%3E";

// Applique le titre d'onglet et le favicon du site Défense (sans toucher Claude).
export function applyDefenseBranding(title = "Livret d'Épargne Défense — Vérifiez votre éligibilité") {
  if (typeof document === "undefined") return;
  document.title = title;
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
