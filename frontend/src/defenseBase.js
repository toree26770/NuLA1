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
