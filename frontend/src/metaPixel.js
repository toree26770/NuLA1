// Gestion du Meta Pixel côté navigateur — chargement UNIQUEMENT après consentement,
// multi-pixels, appels ciblés trackSingle (jamais de track global), aucune donnée sensible.

const PIXEL_SRC = "https://connect.facebook.net/en_US/fbevents.js";
let loadPromise = null;
const initialized = new Set();

export function validPixelId(id) {
  return typeof id === "string" && /^\d{8,20}$/.test(id);
}

function initIds(ids) {
  ids.forEach((id) => {
    if (!initialized.has(id)) {
      window.fbq("init", id);
      initialized.add(id);
    }
  });
}

// Charge le script fbevents.js (une seule fois) et initialise les pixels fournis.
export function loadPixels(pixelIds) {
  const ids = [...new Set((pixelIds || []).filter(validPixelId))];
  if (!ids.length) return Promise.resolve([]);

  if (loadPromise) {
    return loadPromise.then(() => {
      initIds(ids);
      return ids;
    });
  }

  loadPromise = new Promise((resolve, reject) => {
    window.fbq =
      window.fbq ||
      function () {
        window.fbq.callMethod
          ? window.fbq.callMethod.apply(window.fbq, arguments)
          : window.fbq.queue.push(arguments);
      };
    window.fbq.queue = window.fbq.queue || [];
    window.fbq.loaded = true;
    window.fbq.version = "2.0";
    if (!window._fbq) window._fbq = window.fbq;
    window.fbq("consent", "revoke");

    const script = document.createElement("script");
    script.async = true;
    script.src = PIXEL_SRC;
    script.onload = () => {
      initIds(ids);
      window.fbq("consent", "grant");
      resolve(ids);
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Meta Pixel : échec de chargement"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

// Appel ciblé vers UN pixel précis (jamais de diffusion globale).
export function trackSingle(pixelId, eventName) {
  if (!validPixelId(pixelId) || !window.fbq) return false;
  window.fbq("trackSingle", pixelId, eventName);
  // Journal de diagnostic consultable dans la console : window.__metaPixelEvents
  try {
    window.__metaPixelEvents = window.__metaPixelEvents || [];
    window.__metaPixelEvents.push({ pixel_id: pixelId, event: eventName, t: Date.now() });
  } catch {
    /* ignore */
  }
  return true;
}
