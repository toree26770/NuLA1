import re
from datetime import date, datetime

import phonenumbers
from email_validator import (
    validate_email,
    EmailNotValidError,
    EmailUndeliverableError,
)

DISPOSABLE_DOMAINS = {
    "mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
    "guerrillamail.com", "yopmail.com", "yopmail.fr", "trashmail.com",
    "fakeinbox.com", "sharklasers.com", "getnada.com", "dispostable.com",
    "maildrop.cc", "mintemail.com", "throwawaymail.com", "tempail.com",
    "mohmal.com", "emailondeck.com", "spamgourmet.com", "jetable.org",
}

NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ'’\- ]{2,60}$")


def clean_text(value, max_len=300):
    if value is None:
        return ""
    return str(value).strip()[:max_len]


def normalize_email(raw):
    raw = clean_text(raw, 200).lower()
    if not raw:
        return None, "L'adresse e-mail est requise"
    try:
        normalized = validate_email(raw, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        return None, "Le format de l'adresse e-mail est invalide"
    domain = normalized.split("@")[-1]
    if domain in DISPOSABLE_DOMAINS:
        return None, "Les adresses e-mail temporaires ne sont pas acceptées"
    try:
        validate_email(normalized, check_deliverability=True)
    except EmailUndeliverableError:
        return None, "Le domaine de cette adresse e-mail ne peut pas recevoir de messages"
    except EmailNotValidError:
        return None, "Le format de l'adresse e-mail est invalide"
    except Exception:
        pass  # DNS infrastructure failure: accept the address
    return normalized, None


FRENCH_REGIONS = ["FR", "GP", "MQ", "GF", "RE", "YT", "PM", "WF", "NC", "PF", "BL", "MF"]
FRENCH_CODES = {33, 262, 508, 590, 594, 596, 681, 687, 689}


def normalize_phone_fr(raw):
    raw = clean_text(raw, 30)
    if not raw:
        return None, "Le numéro de téléphone est requis"
    # On teste la métropole puis les territoires français d'outre-mer.
    for region in FRENCH_REGIONS:
        try:
            parsed = phonenumbers.parse(raw, region)
        except phonenumbers.NumberParseException:
            continue
        if parsed.country_code in FRENCH_CODES and phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164), None
    return None, "Le numéro de téléphone est invalide"


def validate_birthdate(value, min_age=18):
    value = clean_text(value, 20)
    try:
        d = datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None, "La date de naissance est invalide"
    today = date.today()
    if d > today:
        return None, "La date de naissance est invalide"
    age = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    if age > 120:
        return None, "La date de naissance est invalide"
    if age < min_age:
        return None, f"Vous devez avoir au moins {min_age} ans"
    return d.isoformat(), None


def validate_name(value, label="Le nom"):
    value = clean_text(value, 60)
    if not value or not NAME_RE.match(value):
        return None, f"{label} est invalide"
    return value, None
