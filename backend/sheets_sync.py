"""Synchronisation des leads vers un Google Sheet appartenant à l'utilisateur.

Méthode : l'utilisateur déploie un petit Google Apps Script (Web App) lié à son
Sheet, puis colle l'URL générée dans l'admin (Paramètres). À chaque nouveau lead
(complet ou incomplet), le backend envoie une requête POST JSON à cette URL.
Le script ajoute/actualise une ligne dans l'onglet « Leads complets » ou
« Leads incomplets » (upsert par colonne « ID »).

L'envoi est « fire-and-forget » : une panne du Sheet ne doit JAMAIS bloquer ni
faire échouer l'enregistrement du lead en base.
"""
import asyncio
import logging

import httpx

from csv_utils import fmt_date_fr, fmt_time_fr

log = logging.getLogger("sheets_sync")


def enabled(settings):
    """Retourne l'URL du webhook si la synchro est active et valide, sinon None."""
    s = settings or {}
    url = str(s.get("sheet_webhook_url") or "").strip()
    if not url.startswith("https://"):
        return None
    if s.get("sheet_sync_enabled") is False:
        return None
    return url


async def _post(url, payload):
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            await client.post(url, json=payload)
    except Exception as e:  # noqa: BLE001 - backup ne doit jamais casser le flux
        log.warning("Sheet sync failed: %s", e)


def fire(settings, kind, row):
    """Envoie une ligne au Sheet sans bloquer. kind = 'complete' | 'incomplete'."""
    url = enabled(settings)
    if not url:
        return
    payload = {"type": kind, "row": row}
    try:
        asyncio.create_task(_post(url, payload))
    except RuntimeError:
        # Pas de boucle asyncio active (contexte non-async) : on ignore.
        pass


def _dt(iso):
    d = fmt_date_fr(iso)
    t = fmt_time_fr(iso)
    return (d + " " + t).strip()


def complete_row(lead, source_label=""):
    return {
        "ID": lead.get("id", ""),
        "Date": _dt(lead.get("created_at")),
        "Prénom": lead.get("first_name", ""),
        "Nom": lead.get("last_name", ""),
        "Téléphone": lead.get("phone_e164", ""),
        "Email": lead.get("email_normalized", ""),
        "Date de naissance": fmt_date_fr(lead.get("birth_date")) if lead.get("birth_date") else "",
        "Montant envisagé": lead.get("amount_range", ""),
        "Consentement": "Oui" if lead.get("consent") else "Non",
        "Campagne": lead.get("utm_campaign") or lead.get("campaign") or "",
        "Provenance": source_label or "",
        "Statut": lead.get("status", ""),
    }


def incomplete_row(doc, source_label=""):
    a = doc.get("answers") or {}
    step = doc.get("step_index")
    row = {
        "ID": doc.get("id", ""),
        "Date": _dt(doc.get("created_at")),
        "Dernière activité": _dt(doc.get("updated_at")),
        "Étape": (step + 1) if isinstance(step, int) else "",
        "Prénom": a.get("first_name", ""),
        "Nom": a.get("last_name", ""),
        "Téléphone": a.get("phone", ""),
        "Email": a.get("email", ""),
        "Campagne": doc.get("utm_campaign") or "",
        "Provenance": source_label or "",
    }
    for k, v in a.items():
        if k not in ("first_name", "last_name", "phone", "email"):
            row[k] = v if isinstance(v, (str, int, float)) else ", ".join(str(x) for x in v) if isinstance(v, list) else str(v)
    return row


def parse_settings(body):
    """Extrait et valide les champs de configuration du Sheet depuis un payload admin."""
    out = {}
    if "sheet_webhook_url" in body:
        out["sheet_webhook_url"] = str(body.get("sheet_webhook_url") or "").strip()[:500]
    if "sheet_sync_enabled" in body:
        out["sheet_sync_enabled"] = bool(body.get("sheet_sync_enabled"))
    return out
