"""Routes publiques isolées de l'application « Livret d'Épargne Défense » (préfixe defense_)."""
from datetime import datetime, timezone, timedelta
import re

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import db, new_id, now_iso
from validators import clean_text, normalize_email, normalize_phone_fr, validate_name

router = APIRouter(prefix="/defense")


async def get_defense_settings():
    settings = await db.defense_settings.find_one({"key": "settings"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "settings",
            "dup_window_days": 30,
            "min_submit_seconds": 3,
            "rate_limit_per_hour": 8,
            "retention_days": 365,
            "consent_version": "v1",
        }
        await db.defense_settings.insert_one(dict(settings))
        settings.pop("_id", None)
    return settings


async def defense_log_security(event_type, metadata=None):
    await db.defense_security_logs.insert_one({
        "id": new_id(),
        "event_type": event_type,
        "created_at": now_iso(),
        "metadata": metadata or {},
    })


# ---------- Pixels (résolution publique) ----------
@router.get("/pixels/active")
async def defense_active_pixels(campaign: str | None = None):
    camp = re.sub(r"[^a-z0-9_-]", "", (campaign or "").strip().lower())[:64]
    pixels = await db.defense_pixels.find(
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


# ---------- Suivi d'audience (analytics) ----------
VALID_EVENTS = {"page_view", "form_start", "step_view", "form_submit"}


class TrackEvent(BaseModel):
    session_id: str
    event: str
    step_index: int | None = None
    meta: dict = {}


@router.post("/track")
async def defense_track_event(body: TrackEvent, request: Request):
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
    await db.defense_analytics_events.insert_one(doc)
    return {"ok": True}


# ---------- Leads incomplets (capture d'abandon) ----------
class PartialLeadBody(BaseModel):
    session_id: str
    answers: dict = {}
    step_index: int | None = None
    meta: dict = {}


@router.post("/leads/partial")
async def defense_save_partial_lead(body: PartialLeadBody, request: Request):
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
        else:
            s = clean_text(str(v), 300)
            if s != "":
                clean_answers[k2] = s
    if not clean_answers:
        return {"ok": True}

    now = now_iso()
    await db.defense_partial_leads.update_one(
        {"session_id": sid},
        {
            "$set": {
                "answers": clean_answers,
                "step_index": body.step_index if isinstance(body.step_index, int) else None,
                "updated_at": now,
                "utm_source": clean_text(meta.get("utm_source"), 200),
                "utm_campaign": clean_text(meta.get("utm_campaign"), 200),
                "campaign": re.sub(r"[^a-z0-9_-]", "", clean_text(meta.get("campaign"), 64).lower()),
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


# ---------- Soumission de prospect ----------
class DefenseLead(BaseModel):
    first_name: str = ""
    last_name: str = ""
    phone: str = ""
    email: str = ""
    situation: str = ""
    consent: bool = False
    meta: dict = {}


@router.post("/leads")
async def defense_submit_lead(body: DefenseLead, request: Request):
    ip = request.client.host if request.client else "unknown"
    meta = body.meta or {}
    settings = await get_defense_settings()

    # Honeypot : un humain ne remplit jamais ce champ invisible
    if clean_text(meta.get("website")):
        await defense_log_security("honeypot", {"ip": ip})
        return {"ok": True, "lead_id": None, "duplicate": False}

    # Soumission anormalement rapide (bot)
    started_at = clean_text(meta.get("started_at"))
    if started_at:
        try:
            elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(started_at.replace("Z", "+00:00"))).total_seconds()
            if elapsed < settings.get("min_submit_seconds", 3):
                await defense_log_security("fast_submit", {"ip": ip, "elapsed": elapsed})
                return {"ok": True, "lead_id": None, "duplicate": False}
        except Exception:
            pass

    # Limitation par IP
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    recent = await db.defense_leads.count_documents({"ip": ip, "created_at": {"$gte": one_hour_ago}})
    if recent >= settings.get("rate_limit_per_hour", 8):
        await defense_log_security("rate_limit", {"ip": ip})
        raise HTTPException(status_code=429, detail="Trop de demandes. Réessayez plus tard.")

    if not body.consent:
        raise HTTPException(status_code=400, detail={"consent": "Votre consentement est requis pour être recontacté."})

    errors = {}
    fn, e = validate_name(body.first_name, "Le prénom")
    if e:
        errors["first_name"] = e
    ln, e = validate_name(body.last_name, "Le nom")
    if e:
        errors["last_name"] = e
    email, e = normalize_email(body.email)
    if e:
        errors["email"] = e
    phone, e = normalize_phone_fr(body.phone)
    if e:
        errors["phone"] = e
    if errors:
        await defense_log_security("invalid_data", {"ip": ip, "errors": errors})
        raise HTTPException(status_code=422, detail=errors)

    # Doublons dans la fenêtre configurée
    window_start = (datetime.now(timezone.utc) - timedelta(days=settings.get("dup_window_days", 30))).isoformat()
    duplicate_of = await db.defense_leads.find_one(
        {"$or": [{"phone_e164": phone}, {"email": email}], "created_at": {"$gte": window_start}},
        {"_id": 0, "id": 1},
    )
    if duplicate_of:
        await defense_log_security("duplicate", {"ip": ip, "duplicate_of": duplicate_of["id"]})

    lead_id = new_id()
    consent = bool(body.consent)
    doc = {
        "id": lead_id,
        "first_name": fn,
        "last_name": ln,
        "email": email,
        "email_normalized": email,
        "phone_e164": phone,
        "situation": clean_text(body.situation, 60),
        "status": "doublon" if duplicate_of else "nouveau",
        "notes": "",
        "consent": consent,
        "consent_timestamp": now_iso() if consent else "",
        "consent_version": settings.get("consent_version", "v1") if consent else "",
        "campaign": re.sub(r"[^a-z0-9_-]", "", clean_text(meta.get("campaign"), 64).lower()),
        "pixel_ids": [clean_text(str(x), 20) for x in (meta.get("pixel_ids") or []) if clean_text(str(x), 20)][:10],
        "utm_source": clean_text(meta.get("utm_source"), 200),
        "utm_medium": clean_text(meta.get("utm_medium"), 200),
        "utm_campaign": clean_text(meta.get("utm_campaign"), 200),
        "fbclid": clean_text(meta.get("fbclid"), 300),
        "ip": ip,
        "retrieved_at": "",
        "export_batch_id": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.defense_leads.insert_one(dict(doc))

    # Marque la capture partielle comme complétée
    sid = clean_text(meta.get("session_id"), 80)
    if sid:
        await db.defense_partial_leads.update_one(
            {"session_id": sid},
            {"$set": {"completed": True, "completed_lead_id": lead_id, "updated_at": now_iso()}},
        )

    return {"ok": True, "lead_id": lead_id, "duplicate": bool(duplicate_of)}
