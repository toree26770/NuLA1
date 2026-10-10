from datetime import datetime, timezone, timedelta
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import db, get_settings, log_security, new_id, now_iso
from validators import (
    clean_text,
    normalize_email,
    normalize_phone_fr,
    validate_birthdate,
    validate_name,
)

router = APIRouter(tags=["public"])


@router.get("/content")
async def get_content():
    content = await db.site_content.find_one({"key": "site_content"}, {"_id": 0, "key": 0})
    if not content:
        raise HTTPException(status_code=404, detail="Contenu introuvable")
    return content


@router.get("/pixels/active")
async def active_pixels(campaign: str | None = None):
    """Retourne les Pixels Meta à déclencher pour ce visiteur (résolution côté serveur)."""
    camp = re.sub(r"[^a-z0-9_-]", "", (campaign or "").strip().lower())[:64]
    pixels = await db.meta_pixels.find(
        {"enabled": True}, {"_id": 0, "pixel_id": 1, "campaigns": 1, "is_default": 1, "name": 1}
    ).to_list(500)
    result = []
    for p in pixels:
        camps = p.get("campaigns") or []
        if camp:
            if camp in camps:
                result.append(p)
        elif p.get("is_default"):
            result.append(p)
    return {"campaign": camp, "pixels": [{"pixel_id": p["pixel_id"], "name": p.get("name", "")} for p in result]}


@router.get("/form/published")
async def get_published_form():
    version = await db.form_versions.find_one({"status": "published"}, {"_id": 0})
    if not version:
        raise HTTPException(status_code=404, detail="Aucun formulaire publié")
    steps = await db.form_steps.find(
        {"form_version_id": version["id"]}, {"_id": 0}
    ).sort("position", 1).to_list(100)
    questions = await db.form_questions.find(
        {"form_version_id": version["id"], "enabled": True}, {"_id": 0}
    ).sort("position", 1).to_list(500)
    return {"version": version, "steps": steps, "questions": questions}


# ---------- Suivi d'audience (analytics) ----------

VALID_EVENTS = {"page_view", "form_start", "step_view", "form_submit"}


class TrackEvent(BaseModel):
    session_id: str
    event: str
    step_index: int | None = None
    meta: dict = {}


@router.post("/track")
async def track_event(body: TrackEvent, request: Request):
    """Enregistre un évènement d'audience (public, sans authentification)."""
    if body.event not in VALID_EVENTS:
        return {"ok": True}
    sid = clean_text(body.session_id, 80)
    if not sid:
        return {"ok": True}
    now = datetime.now(timezone.utc)
    meta = body.meta or {}
    doc = {
        "id": new_id(),
        "session_id": sid,
        "type": body.event,
        "step_index": body.step_index if isinstance(body.step_index, int) else None,
        "created_at": now.isoformat(),
        "day": now.strftime("%Y-%m-%d"),
        "ip": request.client.host if request.client else "unknown",
        "utm_source": clean_text(meta.get("utm_source"), 120) or "",
        "utm_medium": clean_text(meta.get("utm_medium"), 120) or "",
        "utm_campaign": clean_text(meta.get("utm_campaign"), 120) or "",
        "fbclid": clean_text(meta.get("fbclid"), 200) or "",
        "user_agent": clean_text(request.headers.get("user-agent") or "", 300),
    }
    await db.analytics_events.insert_one(doc)
    return {"ok": True}


class PartialLeadBody(BaseModel):
    session_id: str
    answers: dict = {}
    step_index: int | None = None
    meta: dict = {}


@router.post("/leads/partial")
async def save_partial_lead(body: PartialLeadBody, request: Request):
    """Enregistre les réponses partielles d'un prospect (capture d'abandon)."""
    sid = clean_text(body.session_id, 80)
    if not sid:
        return {"ok": True}
    meta = body.meta or {}
    if clean_text(meta.get("website")):  # honeypot : bot, on ignore
        return {"ok": True}

    raw = body.answers or {}
    clean_answers = {}
    for k, v in raw.items():
        k2 = clean_text(k, 80)
        if not k2 or k2 == "website":
            continue
        if isinstance(v, bool):
            clean_answers[k2] = v
        elif isinstance(v, list):
            clean_answers[k2] = [clean_text(str(x), 200) for x in v][:20]
        else:
            s = clean_text(str(v), 300)
            if s != "":
                clean_answers[k2] = s
    if not clean_answers:
        return {"ok": True}

    now = now_iso()
    await db.partial_leads.update_one(
        {"session_id": sid},
        {
            "$set": {
                "answers": clean_answers,
                "step_index": body.step_index if isinstance(body.step_index, int) else None,
                "updated_at": now,
                "utm_source": clean_text(meta.get("utm_source"), 200),
                "utm_medium": clean_text(meta.get("utm_medium"), 200),
                "utm_campaign": clean_text(meta.get("utm_campaign"), 200),
                "fbclid": clean_text(meta.get("fbclid"), 300),
            },
            "$setOnInsert": {
                "id": new_id(),
                "session_id": sid,
                "created_at": now,
                "completed": False,
                "ip": request.client.host if request.client else "unknown",
            },
        },
        upsert=True,
    )
    return {"ok": True}


class LeadSubmit(BaseModel):
    form_version_id: str
    answers: dict
    meta: dict = {}


def _validate_answer(question, value):
    """Returns (cleaned_value, error_message)."""
    qtype = question["field_type"]
    key = question["question_key"]
    label = question["label"]
    rules = question.get("validation_rules") or {}

    if qtype == "checkbox":
        checked = value is True or value == "true" or value == "on"
        if question.get("required") and not checked:
            return None, "Votre consentement est nécessaire pour être recontacté"
        return checked, None

    if qtype == "multichoice":
        values = value if isinstance(value, list) else []
        if question.get("required") and not values:
            return None, f"« {label} » est requis"
        allowed = set(question.get("options") or [])
        values = [clean_text(v, 200) for v in values if v in allowed]
        return values, None

    if qtype in ("cards", "radio", "select", "yesno"):
        value = clean_text(value, 200)
        if not value:
            if question.get("required"):
                return None, f"« {label} » est requis"
            return "", None
        options = question.get("options") or (["Oui", "Non"] if qtype == "yesno" else [])
        if options and value not in options:
            return None, f"Choix invalide pour « {label} »"
        return value, None

    value = clean_text(value)
    if not value:
        if question.get("required"):
            return None, f"« {label} » est requis"
        return "", None

    if qtype == "email":
        return normalize_email(value)
    if qtype == "phone":
        return normalize_phone_fr(value)
    if qtype == "date":
        min_age = rules.get("min_age")
        if min_age:
            return validate_birthdate(value, int(min_age))
        try:
            datetime.strptime(value, "%Y-%m-%d")
            return value, None
        except ValueError:
            return None, "Date invalide"
    if qtype == "name":
        return validate_name(value, "Le nom")
    if qtype == "firstname":
        return validate_name(value, "Le prénom")
    if qtype == "number" or qtype == "amount":
        try:
            return str(float(value.replace(",", ".").replace(" ", "").replace("€", ""))), None
        except (ValueError, AttributeError):
            return None, f"« {label} » doit être un nombre"
    if qtype == "postal_code":
        if not value.isdigit() or len(value) != 5:
            return None, "Code postal invalide (5 chiffres)"
        return value, None
    return value, None


@router.post("/leads")
async def submit_lead(body: LeadSubmit, request: Request):
    ip = request.client.host if request.client else "unknown"
    meta = body.meta or {}
    settings = await get_settings()

    # Honeypot : un humain ne remplit jamais ce champ invisible
    if clean_text(meta.get("website")):
        await log_security("honeypot", {"ip": ip})
        return {"ok": True}

    # Soumission anormalement rapide
    started_at = clean_text(meta.get("started_at"))
    if started_at:
        try:
            elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(started_at.replace("Z", "+00:00"))).total_seconds()
            if elapsed < settings.get("min_submit_seconds", 3):
                await log_security("fast_submit", {"ip": ip, "elapsed": elapsed})
                return {"ok": True}
        except Exception:
            pass

    # Limitation par IP
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = await db.leads.count_documents({"ip": ip, "created_at": {"$gte": one_hour_ago}})
    if recent >= settings.get("rate_limit_per_hour", 8):
        await log_security("rate_limit", {"ip": ip})
        raise HTTPException(status_code=429, detail="Trop de demandes. Réessayez plus tard.")

    version = await db.form_versions.find_one({"id": body.form_version_id}, {"_id": 0})
    if not version:
        raise HTTPException(status_code=400, detail="Version de formulaire invalide")
    questions = await db.form_questions.find(
        {"form_version_id": version["id"], "enabled": True}, {"_id": 0}
    ).to_list(500)

    answers = body.answers or {}
    cleaned = {}
    errors = {}
    for q in questions:
        value, error = _validate_answer(q, answers.get(q["question_key"]))
        if error:
            errors[q["question_key"]] = error
        else:
            cleaned[q["question_key"]] = value
    if errors:
        await log_security("invalid_data", {"ip": ip, "errors": errors})
        raise HTTPException(status_code=422, detail=errors)

    email_normalized = cleaned.get("email") or ""
    phone_e164 = cleaned.get("phone") or ""

    # Détection des doublons (téléphone ou e-mail déjà enregistrés dans la fenêtre configurée)
    window_start = (datetime.now(timezone.utc) - timedelta(days=settings.get("dup_window_days", 30))).isoformat()
    duplicate_of = None
    if email_normalized or phone_e164:
        conditions = []
        if email_normalized:
            conditions.append({"email_normalized": email_normalized})
        if phone_e164:
            conditions.append({"phone_e164": phone_e164})
        existing = await db.leads.find_one(
            {
                "$or": conditions,
                "created_at": {"$gte": window_start},
                "status": {"$ne": "invalide"},
            },
            {"_id": 0, "id": 1},
        )
        if existing:
            duplicate_of = existing["id"]
            await log_security("duplicate", {"ip": ip, "duplicate_of": duplicate_of})

    lead_id = new_id()
    consent = bool(cleaned.get("consent"))
    lead_doc = {
        "id": lead_id,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status": "doublon" if duplicate_of else "nouveau",
        "duplicate_of": duplicate_of,
        "email_normalized": email_normalized,
        "phone_e164": phone_e164,
        "first_name": cleaned.get("first_name", ""),
        "last_name": cleaned.get("last_name", ""),
        "birth_date": cleaned.get("birth_date", ""),
        "amount_range": cleaned.get("amount", ""),
        "consent": consent,
        "consent_timestamp": now_iso() if consent else "",
        "consent_version": settings.get("consent_version", "v1") if consent else "",
        "phone_verified": False,
        "email_verified": False,
        "form_version_id": version["id"],
        "utm_source": clean_text(meta.get("utm_source"), 200),
        "utm_medium": clean_text(meta.get("utm_medium"), 200),
        "utm_campaign": clean_text(meta.get("utm_campaign"), 200),
        "utm_content": clean_text(meta.get("utm_content"), 200),
        "utm_term": clean_text(meta.get("utm_term"), 200),
        "fbclid": clean_text(meta.get("fbclid"), 300),
        "campaign_id": clean_text(meta.get("campaign_id"), 200),
        "adset_id": clean_text(meta.get("adset_id"), 200),
        "ad_id": clean_text(meta.get("ad_id"), 200),
        "campaign": re.sub(r"[^a-z0-9_-]", "", clean_text(meta.get("campaign"), 64).lower()),
        "pixel_ids": [clean_text(str(x), 20) for x in (meta.get("pixel_ids") or []) if clean_text(str(x), 20)][:10],
        "ip": ip,
        "retrieved_at": "",
        "export_batch_id": "",
    }
    await db.leads.insert_one(lead_doc)

    answer_docs = []
    for q in questions:
        key = q["question_key"]
        if key in cleaned:
            value = cleaned[key]
            answer_docs.append({
                "id": new_id(),
                "lead_id": lead_id,
                "question_id": q["id"],
                "question_key": key,
                "question_label_snapshot": q["label"],
                "answer_value": value if isinstance(value, (str, bool)) else ", ".join(str(v) for v in value),
            })
    if answer_docs:
        await db.lead_answers.insert_many(answer_docs)

    # Marque la capture partielle comme complétée (retirée des leads incomplets)
    sid = clean_text(meta.get("session_id"), 80)
    if sid:
        await db.partial_leads.update_one(
            {"session_id": sid},
            {"$set": {"completed": True, "completed_lead_id": lead_id, "updated_at": now_iso()}},
        )

    return {"ok": True, "lead_id": lead_id, "duplicate": bool(duplicate_of)}
