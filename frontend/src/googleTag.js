// Gestion des balises Google (gtag.js / Google Ads) côté navigateur :
// multi-comptes, chargement dynamique (jamais codé en dur dans index.html),
// conversions ciblées via send_to. Aucune donnée sensible.

const GTAG_SRC = "https://www.googletagmanager.com/gtag/js";
let loadPromise = null;
const configured = new Set();

export function validTagId(id) {
  return typeof id === "string" && /^(?:AW|G|GT|DC|UA)-[A-Za-z0-9-]{4,30}$/.test(id);
}

function pushToDataLayer() {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

// Charge gtag.js (une seule fois) puis configure chaque balise fournie.
function ensureGtag() {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || pushToDataLayer;
    // Le bandeau cookies est informatif sur ce site : la mesure publicitaire
    // est autorisée par défaut (cohérent avec le Pixel Meta déjà en place).
    window.gtag("consent", "default", {
      ad_storage: "granted",
      analytics_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
    window.gtag("js", new Date());
    const s = document.createElement("script");
    s.async = true;
    s.src = GTAG_SRC;
    s.onload = () => resolve();
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Balise Google : échec de chargement"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function loadGoogleTags(tagIds) {
  const ids = [...new Set((tagIds || []).filter(validTagId))];
  if (!ids.length) return Promise.resolve([]);
  return ensureGtag().then(() => {
    ids.forEach((id) => {
      if (!configured.has(id)) {
        window.gtag("config", id);
        configured.add(id);
      }
    });
    return ids;
  });
}

// Conversion Google Ads ciblée (send_to = AW-XXXX/LIBELLE).
export function trackGoogleConversion(sendTo) {
  if (!window.gtag) return false;
  if (!sendTo || !/^(?:AW|G|GT|DC|UA)-[A-Za-z0-9-]+\/[A-Za-z0-9_-]+$/.test(sendTo)) return false;
  window.gtag("event", "conversion", { send_to: sendTo });
  try {
    window.__googleTagEvents = window.__googleTagEvents || [];
    window.__googleTagEvents.push({ send_to: sendTo, t: Date.now() });
  } catch {
    /* ignore */
  }
  return true;
}
