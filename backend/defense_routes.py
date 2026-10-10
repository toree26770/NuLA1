"""Routes isolées de l'application « Livret d'Épargne Défense » (préfixe defense_)."""
import re
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import db, new_id, now_iso
from validators import clean_text, normalize_email, normalize_phone_fr, validate_name

router = APIRouter(prefix="/defense")


# ---------- Pixels (résolution publique) ----------
@router.get("/pixels/active")
async def defense_active_pixels(campaign: str | None = None):
    camp = re.sub(r"[^a-z0-9_-]", "", (campaign or "").strip().lower())[:64]
    pixels = await db.defense_pixels.find(
        {"enabled": True}, {"_id": 0, "pixel_id": 1, "campaigns": 1, "is_default": 1, "name": 1}
    ).to_list(500)
    specific, defaults = [], []
    for p in pixels:
        if camp and camp in (p.get("campaigns") or []):
            specific.append(p)
        if p.get("is_default"):
            defaults.append(p)
    result = (specific if (camp and specific) else ([] if camp else defaults))
    return {"campaign": camp, "pixels": [{"pixel_id": p["pixel_id"], "name": p.get("name", "")} for p in result]}


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
    meta = body.meta or {}
    if clean_text(meta.get("website")):  # honeypot
        return {"ok": True, "lead_id": None, "duplicate": False}
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
        raise HTTPException(status_code=422, detail=errors)

    duplicate_of = await db.defense_leads.find_one(
        {"$or": [{"phone_e164": phone}, {"email": email}]}, {"_id": 0, "id": 1}
    )
    lead_id = new_id()
    doc = {
        "id": lead_id,
        "first_name": fn,
        "last_name": ln,
        "email": email,
        "phone_e164": phone,
        "situation": clean_text(body.situation, 60),
        "status": "doublon" if duplicate_of else "nouveau",
        "notes": "",
        "campaign": re.sub(r"[^a-z0-9_-]", "", clean_text(meta.get("campaign"), 64).lower()),
        "pixel_ids": [clean_text(str(x), 20) for x in (meta.get("pixel_ids") or []) if clean_text(str(x), 20)][:10],
        "utm_source": clean_text(meta.get("utm_source"), 200),
        "utm_campaign": clean_text(meta.get("utm_campaign"), 200),
        "fbclid": clean_text(meta.get("fbclid"), 300),
        "ip": request.client.host if request.client else "unknown",
        "created_at": now_iso(),
    }
    await db.defense_leads.insert_one(dict(doc))
    return {"ok": True, "lead_id": lead_id, "duplicate": bool(duplicate_of)}
