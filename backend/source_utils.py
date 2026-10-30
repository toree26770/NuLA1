"""Déduction de la provenance d'un lead (Meta / Google).

La provenance n'est pas toujours transmise dans l'URL (les pubs utilisent souvent
seulement `?campaign=bmX`). On la déduit donc de plusieurs signaux, par ordre de
fiabilité :
  1. identifiants de clic : `fbclid` (Meta) / `gclid` (Google) ;
  2. `utm_source` (facebook / instagram / google / youtube…) ;
  3. association de la campagne à un Pixel Meta et/ou une balise Google configurés.
"""
import re

META_SOURCE_HINTS = ("facebook", "fb", "meta", "instagram", "insta", "ig", "fbads", "messenger", "audience")
GOOGLE_SOURCE_HINTS = ("google", "adwords", "gad", "gads", "googleads", "youtube", "yt", "dv360")


def _norm_campaign(value):
    return re.sub(r"[^a-z0-9_-]", "", str(value or "").strip().lower())[:64]


def campaign_sets(pixels, tags):
    """Construit les ensembles de campagnes associées aux Pixels Meta actifs et
    aux balises Google actives. `pixels`/`tags` = listes de documents (dict)."""
    meta = set()
    for p in pixels or []:
        if p.get("enabled") is False:
            continue
        for c in p.get("campaigns") or []:
            n = _norm_campaign(c)
            if n:
                meta.add(n)
    google = set()
    for t in tags or []:
        if t.get("enabled") is False:
            continue
        for c in t.get("campaigns") or []:
            n = _norm_campaign(c)
            if n:
                google.add(n)
    return meta, google


def source_label(item, meta_campaigns=None, google_campaigns=None):
    """Retourne 'Meta', 'Google', 'Meta + Google' ou '' (inconnu)."""
    meta_campaigns = meta_campaigns or set()
    google_campaigns = google_campaigns or set()
    src = str(item.get("utm_source") or "").lower()
    fbclid = str(item.get("fbclid") or "").strip()
    gclid = str(item.get("gclid") or "").strip()
    camp = _norm_campaign(item.get("utm_campaign") or item.get("campaign_id"))

    is_meta = bool(fbclid) or any(h in src for h in META_SOURCE_HINTS) or (camp and camp in meta_campaigns)
    is_google = bool(gclid) or any(h in src for h in GOOGLE_SOURCE_HINTS) or (camp and camp in google_campaigns)

    if is_meta and is_google:
        return "Meta + Google"
    if is_meta:
        return "Meta"
    if is_google:
        return "Google"
    return ""
