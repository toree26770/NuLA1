import csv
import io
from datetime import datetime, timezone, timedelta

FIXED_KEYS = {"first_name", "last_name", "birth_date", "email", "phone", "amount"}

DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        value = "Oui" if value else "Non"
    elif isinstance(value, list):
        value = ", ".join(str(v) for v in value)
    s = str(value).replace("\r", " ").replace("\n", " ").strip()
    if s and s[0] in DANGEROUS_PREFIXES:
        s = "'" + s
    return s


def fmt_date_fr(iso_str):
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(str(iso_str).replace("Z", "+00:00"))
        dt = dt.astimezone(timezone(timedelta(hours=1)))
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(iso_str)


def fmt_time_fr(iso_str):
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(str(iso_str).replace("Z", "+00:00"))
        dt = dt.astimezone(timezone(timedelta(hours=1)))
        return dt.strftime("%H:%M")
    except Exception:
        return ""


STATUS_LABELS = {
    "nouveau": "Nouveau",
    "recupere": "Récupéré",
    "traite": "Traité",
    "doublon": "Doublon",
    "invalide": "Invalide",
}


def build_leads_csv(leads, answers_by_lead, extra_labels):
    """French-Excel-compatible CSV: UTF-8 BOM, semicolon separator."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    header = [
        "ID", "Date", "Heure", "Prénom", "Nom", "Date de naissance",
        "Téléphone", "E-mail", "Montant envisagé", "Consentement",
        "Campagne", "Provenance", "Source", "Support", "Contenu", "Terme", "FBCLID",
        "Statut", "Date de récupération",
    ] + list(extra_labels)
    writer.writerow(header)
    for lead in leads:
        answers = answers_by_lead.get(lead["id"], {})
        row = [
            lead["id"],
            fmt_date_fr(lead.get("created_at")),
            fmt_time_fr(lead.get("created_at")),
            csv_safe(lead.get("first_name")),
            csv_safe(lead.get("last_name")),
            fmt_date_fr(lead.get("birth_date")),
            csv_safe(lead.get("phone_e164")),
            csv_safe(lead.get("email_normalized")),
            csv_safe(lead.get("amount_range")),
            "Oui" if lead.get("consent") else "Non",
            csv_safe(lead.get("utm_campaign") or lead.get("campaign_id")),
            csv_safe(lead.get("source_label")),
            csv_safe(lead.get("utm_source")),
            csv_safe(lead.get("utm_medium")),
            csv_safe(lead.get("utm_content")),
            csv_safe(lead.get("utm_term")),
            csv_safe(lead.get("fbclid")),
            STATUS_LABELS.get(lead.get("status"), lead.get("status", "")),
            fmt_date_fr(lead.get("retrieved_at")) + (" " + fmt_time_fr(lead.get("retrieved_at")) if lead.get("retrieved_at") else ""),
        ]
        for label in extra_labels:
            row.append(csv_safe(answers.get(label, "")))
        writer.writerow(row)
    return output.getvalue().encode("utf-8-sig")


PARTIAL_KNOWN = [
    ("first_name", "Prénom"),
    ("last_name", "Nom"),
    ("birth_date", "Date de naissance"),
    ("phone", "Téléphone"),
    ("email", "E-mail"),
    ("amount", "Montant envisagé"),
]


def build_partial_leads_csv(items):
    """CSV des leads incomplets (prospects n'ayant pas tout rempli)."""
    known = {k for k, _ in PARTIAL_KNOWN}
    extra_keys = []
    for it in items:
        for k in (it.get("answers") or {}):
            if k not in known and k not in extra_keys:
                extra_keys.append(k)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    header = (
        ["ID", "Première visite", "Heure", "Dernière activité", "Étape atteinte"]
        + [lbl for _, lbl in PARTIAL_KNOWN]
        + extra_keys
        + ["Provenance", "Source", "Campagne"]
    )
    writer.writerow(header)
    for it in items:
        a = it.get("answers") or {}
        step = it.get("step_index")
        row = [
            csv_safe(it.get("id")),
            fmt_date_fr(it.get("created_at")),
            fmt_time_fr(it.get("created_at")),
            (fmt_date_fr(it.get("updated_at")) + " " + fmt_time_fr(it.get("updated_at"))).strip(),
            ("Étape " + str(step + 1)) if isinstance(step, int) else "",
        ]
        for k, _ in PARTIAL_KNOWN:
            v = a.get(k, "")
            if k == "birth_date" and v:
                v = fmt_date_fr(v)
            row.append(csv_safe(v))
        for k in extra_keys:
            row.append(csv_safe(a.get(k, "")))
        row.append(csv_safe(it.get("source_label")))
        row.append(csv_safe(it.get("utm_source")))
        row.append(csv_safe(it.get("utm_campaign")))
        writer.writerow(row)
    return output.getvalue().encode("utf-8-sig")



def build_defense_leads_csv(leads):
    """CSV des prospects « Livret Défense » (formulaire statique, sans réponses dynamiques)."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL, lineterminator="\r\n")
    header = [
        "ID", "Date", "Heure", "Prénom", "Nom", "Téléphone", "E-mail",
        "Situation", "Consentement", "Campagne", "Source", "FBCLID",
        "Statut", "Date de récupération", "Notes",
    ]
    writer.writerow(header)
    for lead in leads:
        writer.writerow([
            lead.get("id", ""),
            fmt_date_fr(lead.get("created_at")),
            fmt_time_fr(lead.get("created_at")),
            csv_safe(lead.get("first_name")),
            csv_safe(lead.get("last_name")),
            csv_safe(lead.get("phone_e164")),
            csv_safe(lead.get("email")),
            csv_safe(lead.get("situation")),
            "Oui" if lead.get("consent") else "Non",
            csv_safe(lead.get("campaign") or lead.get("utm_campaign")),
            csv_safe(lead.get("utm_source")),
            csv_safe(lead.get("fbclid")),
            STATUS_LABELS.get(lead.get("status"), lead.get("status", "")),
            fmt_date_fr(lead.get("retrieved_at")) + (" " + fmt_time_fr(lead.get("retrieved_at")) if lead.get("retrieved_at") else ""),
            csv_safe(lead.get("notes")),
        ])
    return output.getvalue().encode("utf-8-sig")
