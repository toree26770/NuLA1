from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from livret_auth import get_current_livret_admin as get_current_admin
from database import db, new_id, now_iso

router = APIRouter(prefix="/livret/admin/form", tags=["livret-form-builder"], dependencies=[Depends(get_current_admin)])

FIELD_TYPES = [
    "text", "textarea", "name", "firstname", "email", "phone", "date",
    "number", "amount", "select", "radio", "multichoice", "cards",
    "checkbox", "yesno", "address", "postal_code", "city", "custom",
]


async def _full_version(version_id: str):
    version = await db.livret_form_versions.find_one({"id": version_id}, {"_id": 0})
    if not version:
        raise HTTPException(status_code=404, detail="Version introuvable")
    steps = await db.livret_form_steps.find({"form_version_id": version_id}, {"_id": 0}).sort("position", 1).to_list(100)
    questions = await db.livret_form_questions.find({"form_version_id": version_id}, {"_id": 0}).sort("position", 1).to_list(500)
    return {"version": version, "steps": steps, "questions": questions}


@router.get("/versions")
async def list_versions():
    versions = await db.livret_form_versions.find({}, {"_id": 0}).sort("version_number", -1).to_list(100)
    return {"versions": versions}


@router.get("/versions/{version_id}")
async def get_version(version_id: str):
    return await _full_version(version_id)


class CreateVersion(BaseModel):
    from_version_id: str = ""


@router.post("/versions")
async def create_version(body: CreateVersion):
    latest = await db.livret_form_versions.find_one({}, sort=[("version_number", -1)])
    number = (latest["version_number"] + 1) if latest else 1
    vid = new_id()
    await db.livret_form_versions.insert_one({
        "id": vid, "version_number": number, "status": "draft",
        "created_at": now_iso(), "published_at": "",
    })
    if body.from_version_id:
        source = await _full_version(body.from_version_id)
        step_map = {}
        for step in source["steps"]:
            sid = new_id()
            step_map[step["id"]] = sid
            step.pop("_id", None)
            step.update({"id": sid, "form_version_id": vid})
            await db.livret_form_steps.insert_one(step)
        for q in source["questions"]:
            q.pop("_id", None)
            q.update({"id": new_id(), "form_version_id": vid, "step_id": step_map.get(q["step_id"], "")})
            await db.livret_form_questions.insert_one(q)
    return await _full_version(vid)


@router.delete("/versions/{version_id}")
async def delete_version(version_id: str):
    version = await db.livret_form_versions.find_one({"id": version_id})
    if not version:
        raise HTTPException(status_code=404, detail="Version introuvable")
    if version["status"] != "draft":
        raise HTTPException(status_code=400, detail="Seuls les brouillons peuvent être supprimés")
    await db.livret_form_versions.delete_one({"id": version_id})
    await db.livret_form_steps.delete_many({"form_version_id": version_id})
    await db.livret_form_questions.delete_many({"form_version_id": version_id})
    return {"ok": True}


class SaveVersion(BaseModel):
    steps: list
    questions: list


@router.put("/versions/{version_id}")
async def save_version(version_id: str, body: SaveVersion):
    version = await db.livret_form_versions.find_one({"id": version_id})
    if not version:
        raise HTTPException(status_code=404, detail="Version introuvable")
    if version["status"] == "published":
        raise HTTPException(status_code=400, detail="Créez un brouillon pour modifier un formulaire publié")

    if not body.steps:
        raise HTTPException(status_code=400, detail="Le formulaire doit contenir au moins une étape")

    step_id_map = {}
    new_steps = []
    for i, s in enumerate(body.steps):
        sid = s.get("id") or new_id()
        if s.get("id") and str(s["id"]).startswith("temp-"):
            sid = new_id()
        step_id_map[str(s.get("id"))] = sid
        title = str(s.get("title") or f"Étape {i + 1}").strip()[:200]
        new_steps.append({
            "id": sid,
            "form_version_id": version_id,
            "title": title,
            "description": str(s.get("description") or "")[:500],
            "position": i,
        })

    new_questions = []
    used_keys = set()
    for i, q in enumerate(body.questions):
        ftype = q.get("field_type", "text")
        if ftype not in FIELD_TYPES:
            raise HTTPException(status_code=400, detail=f"Type de champ invalide : {ftype}")
        step_id = step_id_map.get(str(q.get("step_id")))
        if not step_id:
            raise HTTPException(status_code=400, detail="Une question n'est rattachée à aucune étape")
        key = str(q.get("question_key") or "").strip()[:80] or f"question_{i + 1}"
        if key in used_keys:
            key = f"{key}_{i + 1}"
        used_keys.add(key)
        label = str(q.get("label") or key).strip()[:300]
        qid = q.get("id") or new_id()
        if str(qid).startswith("temp-"):
            qid = new_id()
        options = [str(o)[:200] for o in (q.get("options") or []) if str(o).strip()]
        if ftype in ("select", "radio", "multichoice", "cards") and not options:
            raise HTTPException(status_code=400, detail=f"La question « {label} » nécessite des options")
        new_questions.append({
            "id": qid,
            "form_version_id": version_id,
            "step_id": step_id,
            "question_key": key,
            "label": label,
            "description": str(q.get("description") or "")[:500],
            "field_type": ftype,
            "required": bool(q.get("required")),
            "placeholder": str(q.get("placeholder") or "")[:200],
            "validation_rules": q.get("validation_rules") or {},
            "options": options,
            "position": i,
            "enabled": bool(q.get("enabled", True)),
        })

    await db.livret_form_steps.delete_many({"form_version_id": version_id})
    await db.livret_form_questions.delete_many({"form_version_id": version_id})
    if new_steps:
        await db.livret_form_steps.insert_many(new_steps)
    if new_questions:
        await db.livret_form_questions.insert_many(new_questions)
    return await _full_version(version_id)


@router.post("/versions/{version_id}/publish")
async def publish_version(version_id: str):
    version = await db.livret_form_versions.find_one({"id": version_id})
    if not version:
        raise HTTPException(status_code=404, detail="Version introuvable")
    steps = await db.livret_form_steps.count_documents({"form_version_id": version_id})
    questions = await db.livret_form_questions.count_documents({"form_version_id": version_id, "enabled": True})
    if steps == 0 or questions == 0:
        raise HTTPException(status_code=400, detail="Le formulaire doit contenir au moins une étape et une question active")
    await db.livret_form_versions.update_many({"status": "published"}, {"$set": {"status": "archived"}})
    await db.livret_form_versions.update_one({"id": version_id}, {"$set": {"status": "published", "published_at": now_iso()}})
    return {"ok": True}
