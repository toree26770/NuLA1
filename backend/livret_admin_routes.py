from datetime import datetime, timezone, timedelta
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel

from livret_auth import get_current_livret_admin as get_current_admin
from csv_utils import FIXED_KEYS, build_leads_csv, build_partial_leads_csv
from database import db, new_id, now_iso
from livret_db import get_settings

router = APIRouter(prefix="/livret/admin", tags=["livret-admin"], dependencies=[Depends(get_current_admin)])

LEAD_STATUSES = ["nouveau", "recupere", "traite", "doublon", "invalide"]

# Normalise la campagne pour les regroupements : null, champ absent OU chaîne vide -> "(direct)".
CAMPAIGN_LABEL = {
    "$let": {
        "vars": {"c": {"$ifNull": ["$utm_campaign", ""]}},
        "in": {"$cond": [{"$eq": ["$$c", ""]}, "(direct)", "$$c"]},
    }
}


# ---------- Statistiques ----------

@router.get("/stats")
async def get_stats():
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    d7 = (now - timedelta(days=7)).isoformat()
    d30 = (now - timedelta(days=30)).isoformat()

    total = await db.livret_leads.count_documents({})
    today = await db.livret_leads.count_documents({"created_at": {"$gte": today_start}})
    last7 = await db.livret_leads.count_documents({"created_at": {"$gte": d7}})
    last30 = await db.livret_leads.count_documents({"created_at": {"$gte": d30}})

    by_status = {}
    for s in LEAD_STATUSES:
        by_status[s] = await db.livret_leads.count_documents({"status": s})

    per_day = await db.livret_leads.aggregate([
        {"$match": {"created_at": {"$gte": d30}}},
        {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(40)

    by_campaign = await db.livret_leads.aggregate([
        {"$group": {"_id": CAMPAIGN_LABEL, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(10)

    by_amount = await db.livret_leads.aggregate([
        {"$match": {"amount_range": {"$ne": ""}}},
        {"$group": {"_id": "$amount_range", "count": {"$sum": 1}}},
    ]).to_list(10)

    return {
        "total": total, "today": today, "last7": last7, "last30": last30,
        "by_status": by_status,
        "per_day": [{"date": d["_id"], "count": d["count"]} for d in per_day],
        "by_campaign": [{"campaign": c["_id"], "count": c["count"]} for c in by_campaign],
        "by_amount": [{"amount": a["_id"], "count": a["count"]} for a in by_amount],
    }


@router.get("/analytics")
async def get_analytics(days: int = Query(30, ge=1, le=365), campaign: str = Query("")):
    """Statistiques d'audience : visites, formulaires commencés, envoyés, abandons, entonnoir.
    Si `campaign` est fourni, les statistiques sont filtrées sur cette campagne."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()
    ev = db.livret_analytics_events
    base = {"created_at": {"$gte": start}}
    leads_q = {"created_at": {"$gte": start}, "status": {"$ne": "doublon"}}
    camp = (campaign or "").strip()
    if camp == "(direct)":
        base["utm_campaign"] = {"$in": ["", None]}
        leads_q["utm_campaign"] = {"$in": ["", None]}
    elif camp:
        base["utm_campaign"] = camp
        leads_q["utm_campaign"] = camp

    async def distinct_sessions(match):
        res = await ev.aggregate([
            {"$match": match},
            {"$group": {"_id": "$session_id"}},
            {"$count": "n"},
        ]).to_list(1)
        return res[0]["n"] if res else 0

    visits = await ev.count_documents({**base, "type": "page_view"})
    unique_visitors = await distinct_sessions({**base, "type": "page_view"})
    form_starts = await distinct_sessions({**base, "type": "form_start"})
    submissions = await distinct_sessions({**base, "type": "form_submit"})
    leads_count = await db.livret_leads.count_documents(leads_q)

    abandons = max(form_starts - submissions, 0)
    conversion_rate = round(submissions / unique_visitors * 100, 1) if unique_visitors else 0.0
    completion_rate = round(submissions / form_starts * 100, 1) if form_starts else 0.0
    abandon_rate = round(abandons / form_starts * 100, 1) if form_starts else 0.0

    step_rows = await ev.aggregate([
        {"$match": {**base, "type": "step_view", "step_index": {"$ne": None}}},
        {"$group": {"_id": {"step": "$step_index", "s": "$session_id"}}},
        {"$group": {"_id": "$_id.step", "sessions": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(50)
    steps_reached = [{"step_index": r["_id"], "sessions": r["sessions"]} for r in step_rows]

    async def day_series(type_):
        return await ev.aggregate([
            {"$match": {**base, "type": type_}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]).to_list(400)

    visits_day = await day_series("page_view")
    submit_day = await day_series("form_submit")
    days_map = {}
    for d in visits_day:
        days_map.setdefault(d["_id"], {"date": d["_id"], "visites": 0, "envois": 0})["visites"] = d["count"]
    for d in submit_day:
        days_map.setdefault(d["_id"], {"date": d["_id"], "visites": 0, "envois": 0})["envois"] = d["count"]
    per_day = [days_map[k] for k in sorted(days_map.keys())]

    src_rows = await ev.aggregate([
        {"$match": {**base, "type": "page_view"}},
        {"$group": {"_id": {"src": {"$ifNull": ["$utm_source", ""]}, "s": "$session_id"}}},
        {"$group": {"_id": "$_id.src", "sessions": {"$sum": 1}}},
        {"$sort": {"sessions": -1}},
        {"$limit": 8},
    ]).to_list(8)
    by_source = [{"source": (r["_id"] or "(direct / inconnu)"), "sessions": r["sessions"]} for r in src_rows]

    return {
        "days": days,
        "visits": visits,
        "unique_visitors": unique_visitors,
        "form_starts": form_starts,
        "submissions": submissions,
        "leads_count": leads_count,
        "abandons": abandons,
        "conversion_rate": conversion_rate,
        "completion_rate": completion_rate,
        "abandon_rate": abandon_rate,
        "steps_reached": steps_reached,
        "per_day": per_day,
        "by_source": by_source,
    }


# ---------- Leads ----------

@router.get("/leads")
async def list_leads(
    status: str = Query(""),
    q: str = Query(""),
    campaign: str = Query(""),
    amount: str = Query(""),
    date_from: str = Query(""),
    date_to: str = Query(""),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
):
    query = {}
    if status in LEAD_STATUSES:
        query["status"] = status
    if campaign:
        query["$or"] = [{"utm_campaign": campaign}, {"campaign_id": campaign}]
    if amount:
        query["amount_range"] = amount
    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to + "T23:59:59"
    if q:
        q = q.strip()
        query["$or"] = [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
            {"email_normalized": {"$regex": q, "$options": "i"}},
            {"phone_e164": {"$regex": q.replace(" ", "")}},
        ]
    total = await db.livret_leads.count_documents(query)
    leads = await db.livret_leads.find(query, {"_id": 0}).sort("created_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"leads": leads, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/partial-leads")
async def list_partial_leads(page: int = Query(1, ge=1), limit: int = Query(25, ge=1, le=200)):
    """Leads incomplets : prospects ayant commencé mais pas envoyé le formulaire."""
    query = {"completed": {"$ne": True}}
    total = await db.livret_partial_leads.count_documents(query)
    items = await db.livret_partial_leads.find(query, {"_id": 0}).sort("updated_at", -1).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "pages": max(1, (total + limit - 1) // limit)}


@router.get("/partial-leads/export.csv")
async def export_partial_leads():
    query = {"completed": {"$ne": True}}
    items = await db.livret_partial_leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100000)
    csv_bytes = build_partial_leads_csv(items)
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="leads_incomplets.csv"'},
    )


@router.get("/leads/{lead_id}")
async def get_lead(lead_id: str):
    lead = await db.livret_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    answers = await db.livret_lead_answers.find({"lead_id": lead_id}, {"_id": 0}).to_list(200)
    return {"lead": lead, "answers": answers}


class StatusUpdate(BaseModel):
    status: str


@router.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, body: StatusUpdate):
    if body.status not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    result = await db.livret_leads.update_one(
        {"id": lead_id},
        {"$set": {"status": body.status, "updated_at": now_iso()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    return {"ok": True}


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    res = await db.livret_leads.delete_one({"id": lead_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead introuvable")
    await db.livret_lead_answers.delete_many({"lead_id": lead_id})
    return {"ok": True}


class BulkDelete(BaseModel):
    lead_ids: list[str] = []


@router.post("/leads/bulk-delete")
async def bulk_delete_leads(body: BulkDelete):
    ids = [str(x) for x in (body.lead_ids or [])][:1000]
    if not ids:
        return {"ok": True, "deleted": 0}
    res = await db.livret_leads.delete_many({"id": {"$in": ids}})
    await db.livret_lead_answers.delete_many({"lead_id": {"$in": ids}})
    return {"ok": True, "deleted": res.deleted_count}


@router.get("/campaigns")
async def get_campaigns():
    rows = await db.livret_leads.aggregate([
        {"$group": {
            "_id": CAMPAIGN_LABEL,
            "total": {"$sum": 1},
            "nouveau": {"$sum": {"$cond": [{"$eq": ["$status", "nouveau"]}, 1, 0]}},
            "recupere": {"$sum": {"$cond": [{"$eq": ["$status", "recupere"]}, 1, 0]}},
            "traite": {"$sum": {"$cond": [{"$eq": ["$status", "traite"]}, 1, 0]}},
            "doublon": {"$sum": {"$cond": [{"$eq": ["$status", "doublon"]}, 1, 0]}},
        }},
        {"$sort": {"total": -1}},
        {"$limit": 100},
    ]).to_list(100)
    amounts = await db.livret_leads.aggregate([
        {"$match": {"amount_range": {"$ne": ""}}},
        {"$group": {"_id": {"campaign": CAMPAIGN_LABEL, "amount": "$amount_range"}, "count": {"$sum": 1}}},
    ]).to_list(500)
    amount_map = {}
    for a in amounts:
        amount_map.setdefault(a["_id"]["campaign"], {})[a["_id"]["amount"]] = a["count"]
    return {
        "campaigns": [
            {
                "campaign": r["_id"], "total": r["total"], "nouveau": r["nouveau"],
                "recupere": r["recupere"], "traite": r["traite"], "doublon": r["doublon"],
                "amounts": amount_map.get(r["_id"], {}),
            }
            for r in rows
        ]
    }


@router.get("/security-logs")
async def get_security_logs():
    logs = await db.livret_security_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    counts = {}
    for row in await db.livret_security_logs.aggregate([{"$group": {"_id": "$event_type", "count": {"$sum": 1}}}]).to_list(20):
        counts[row["_id"]] = row["count"]
    return {"logs": logs, "counts": counts}


# ---------- Contenu & paramètres ----------

@router.get("/content")
async def admin_get_content():
    return await db.livret_site_content.find_one({"key": "site_content"}, {"_id": 0})


@router.put("/content")
async def admin_put_content(body: dict):
    body.pop("_id", None)
    body["key"] = "site_content"
    await db.livret_site_content.replace_one({"key": "site_content"}, body, upsert=True)
    return {"ok": True}


@router.get("/settings")
async def admin_get_settings():
    return await get_settings()


@router.put("/settings")
async def admin_put_settings(body: dict):
    allowed = {}
    for key in ("dup_window_days", "min_submit_seconds", "rate_limit_per_hour", "retention_days"):
        if key in body:
            try:
                allowed[key] = max(0, int(body[key]))
            except (ValueError, TypeError):
                raise HTTPException(status_code=400, detail=f"Valeur invalide pour {key}")
    if "consent_version" in body:
        allowed["consent_version"] = str(body["consent_version"])[:50]
    await db.livret_settings.update_one({"key": "settings"}, {"$set": allowed}, upsert=True)
    return {"ok": True}


# ---------- Meta Pixels ----------

PIXEL_ID_RE = re.compile(r"^\d{8,20}$")


def _clean_campaigns(raw):
    out = []
    if isinstance(raw, list):
        for c in raw:
            s = re.sub(r"[^a-z0-9_-]", "", str(c).strip().lower())[:64]
            if s and s not in out:
                out.append(s)
    return out


@router.get("/pixels")
async def list_pixels():
    items = await db.livret_meta_pixels.find({}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"items": items}


@router.post("/pixels")
async def create_pixel(body: dict):
    pixel_id = str(body.get("pixel_id", "")).strip()
    if not PIXEL_ID_RE.match(pixel_id):
        raise HTTPException(status_code=400, detail="Identifiant de Pixel invalide : uniquement des chiffres (8 à 20).")
    doc = {
        "id": new_id(),
        "name": (str(body.get("name", "")).strip()[:120]) or f"Pixel {pixel_id[-4:]}",
        "pixel_id": pixel_id,
        "enabled": bool(body.get("enabled", True)),
        "is_default": bool(body.get("is_default", False)),
        "campaigns": _clean_campaigns(body.get("campaigns")),
        "test_event_code": str(body.get("test_event_code", "")).strip()[:50],
        "created_at": now_iso(),
    }
    await db.livret_meta_pixels.insert_one(dict(doc))
    return {"ok": True, "pixel": doc}


@router.put("/pixels/{pixel_doc_id}")
async def update_pixel(pixel_doc_id: str, body: dict):
    update = {}
    if "name" in body:
        update["name"] = str(body["name"]).strip()[:120]
    if "pixel_id" in body:
        pid = str(body["pixel_id"]).strip()
        if not PIXEL_ID_RE.match(pid):
            raise HTTPException(status_code=400, detail="Identifiant de Pixel invalide : uniquement des chiffres (8 à 20).")
        update["pixel_id"] = pid
    if "enabled" in body:
        update["enabled"] = bool(body["enabled"])
    if "is_default" in body:
        update["is_default"] = bool(body["is_default"])
    if "campaigns" in body:
        update["campaigns"] = _clean_campaigns(body["campaigns"])
    if "test_event_code" in body:
        update["test_event_code"] = str(body["test_event_code"]).strip()[:50]
    if update:
        res = await db.livret_meta_pixels.update_one({"id": pixel_doc_id}, {"$set": update})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Pixel introuvable")
    return {"ok": True}


@router.delete("/pixels/{pixel_doc_id}")
async def delete_pixel(pixel_doc_id: str):
    await db.livret_meta_pixels.delete_one({"id": pixel_doc_id})
    return {"ok": True}


# ---------- Exports CSV ----------

async def _collect_extra_labels(lead_ids):
    answers = await db.livret_lead_answers.find(
        {"lead_id": {"$in": lead_ids}}, {"_id": 0}
    ).to_list(100000)
    labels = []
    answers_by_lead = {}
    for a in answers:
        label = a["question_label_snapshot"]
        if a.get("question_key") in FIXED_KEYS or label in ("Consentement",):
            continue
        if label not in labels:
            labels.append(label)
        answers_by_lead.setdefault(a["lead_id"], {})[label] = a.get("answer_value", "")
    return labels, answers_by_lead


async def _render_batch_csv(batch):
    leads = await db.livret_leads.find({"id": {"$in": batch["lead_ids"]}}, {"_id": 0}).sort("created_at", 1).to_list(len(batch["lead_ids"]))
    labels, answers_by_lead = await _collect_extra_labels(batch["lead_ids"])
    return build_leads_csv(leads, answers_by_lead, labels)


@router.post("/exports/new-leads")
async def export_new_leads(admin=Depends(get_current_admin)):
    pending = await db.livret_export_batches.find_one({"status": "pending"})
    if pending:
        raise HTTPException(status_code=409, detail="Un export est déjà en attente de téléchargement", headers={"X-Batch-Id": pending["id"]})
    leads = await db.livret_leads.find({"status": "nouveau"}, {"_id": 0, "id": 1}).sort("created_at", 1).to_list(5000)
    if not leads:
        raise HTTPException(status_code=400, detail="Aucun nouveau lead à exporter")
    count = await db.livret_export_batches.count_documents({})
    batch = {
        "id": new_id(),
        "batch_number": count + 1,
        "kind": "new",
        "created_at": now_iso(),
        "created_by": admin["email"],
        "status": "pending",
        "lead_count": len(leads),
        "lead_ids": [l["id"] for l in leads],
    }
    await db.livret_export_batches.insert_one(batch)
    batch.pop("_id", None)
    batch.pop("lead_ids", None)
    return batch


class CustomExport(BaseModel):
    lead_ids: list = []
    filters: dict = {}


@router.post("/exports/custom")
async def export_custom(body: CustomExport, admin=Depends(get_current_admin)):
    if body.lead_ids:
        leads = await db.livret_leads.find({"id": {"$in": body.lead_ids}}, {"_id": 0, "id": 1}).to_list(10000)
    else:
        query = {}
        f = body.filters or {}
        if f.get("status") in LEAD_STATUSES:
            query["status"] = f["status"]
        if f.get("campaign"):
            query["$or"] = [{"utm_campaign": f["campaign"]}, {"campaign_id": f["campaign"]}]
        if f.get("date_from"):
            query.setdefault("created_at", {})["$gte"] = f["date_from"]
        if f.get("date_to"):
            query.setdefault("created_at", {})["$lte"] = f["date_to"] + "T23:59:59"
        leads = await db.livret_leads.find(query, {"_id": 0, "id": 1}).sort("created_at", 1).to_list(10000)
    if not leads:
        raise HTTPException(status_code=400, detail="Aucun lead correspondant")
    count = await db.livret_export_batches.count_documents({})
    batch = {
        "id": new_id(),
        "batch_number": count + 1,
        "kind": "custom",
        "created_at": now_iso(),
        "created_by": admin["email"],
        "status": "downloaded",
        "lead_count": len(leads),
        "lead_ids": [l["id"] for l in leads],
        "filters": body.filters or {},
    }
    await db.livret_export_batches.insert_one(batch)
    return {"id": batch["id"], "batch_number": batch["batch_number"], "lead_count": batch["lead_count"]}


@router.get("/exports")
async def list_exports():
    batches = await db.livret_export_batches.find({}, {"_id": 0, "lead_ids": 0}).sort("created_at", -1).limit(200).to_list(200)
    return {"exports": batches}


@router.get("/exports/{batch_id}/download")
async def download_export(batch_id: str):
    batch = await db.livret_export_batches.find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    csv_bytes = await _render_batch_csv(batch)
    if batch["status"] == "pending" and batch.get("kind") == "new":
        # Le téléchargement confirme la récupération : les leads passent en RÉCUPÉRÉ
        await db.livret_leads.update_many(
            {"id": {"$in": batch["lead_ids"]}, "status": "nouveau"},
            {"$set": {"status": "recupere", "retrieved_at": now_iso(), "export_batch_id": batch_id, "updated_at": now_iso()}},
        )
        await db.livret_export_batches.update_one({"id": batch_id}, {"$set": {"status": "downloaded"}})
    filename = f"leads_lot_{batch['batch_number']:04d}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/exports/{batch_id}/cancel")
async def cancel_export(batch_id: str):
    batch = await db.livret_export_batches.find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    if batch["status"] != "pending":
        raise HTTPException(status_code=400, detail="Ce lot n'est plus en attente")
    await db.livret_export_batches.delete_one({"id": batch_id})
    return {"ok": True}
