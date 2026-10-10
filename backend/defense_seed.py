"""Seed ISOLÉ « Livret Défense » (collections defense_*)."""
import copy

from database import db, new_id, now_iso
from seed_data import DEFAULT_CONTENT

# Le contenu Défense réutilise EXACTEMENT le même schéma que la landing 1
# (pour que l'éditeur de contenu de l'admin fonctionne à l'identique),
# avec des valeurs propres au Livret Défense.
DEFENSE_CONTENT = copy.deepcopy(DEFAULT_CONTENT)
DEFENSE_CONTENT["brand"] = {
    "name": "Défense",
    "footer_line": "Demande d'informations gratuite et sans engagement.",
}
DEFENSE_CONTENT["offer"].update({
    "title": "LIVRET D'ÉPARGNE DÉFENSE",
    "product_name": "Livret d'Épargne Défense",
    "rate": "7,10 %",
    "rate_label": "net par an",
    "rate_visible": True,
})
DEFENSE_CONTENT["form_texts"].update({
    "title": "Vérifiez votre éligibilité au Livret Défense",
    "subtitle": "Complétez votre demande gratuitement, sans engagement.",
    "submit_label": "VALIDER MA DEMANDE",
    "continue_label": "CONTINUER",
    "consent_text": "J'accepte d'être recontacté(e) et la politique de confidentialité.",
    "confirm_title": "Votre demande a bien été enregistrée",
    "confirm_text": "Merci. Un conseiller pourra vous recontacter afin de vous présenter le Livret d'Épargne Défense, ses conditions et ses modalités.",
})


SITUATION_OPTIONS = ["Militaire d'active", "Réserviste", "Ancien militaire", "Civil de la Défense", "Civil", "Autre"]

DEFENSE_STEPS = [
    {"title": "Vos coordonnées", "description": "Quelques informations pour créer votre demande.", "position": 0},
    {"title": "Votre situation", "description": "Précisez votre situation et votre accord.", "position": 1},
]

DEFENSE_QUESTIONS = [
    {"key": "last_name", "label": "Nom", "field_type": "name", "required": True, "placeholder": "Votre nom", "step_index": 0, "position": 0},
    {"key": "first_name", "label": "Prénom", "field_type": "firstname", "required": True, "placeholder": "Votre prénom", "step_index": 0, "position": 1},
    {"key": "phone", "label": "Téléphone", "field_type": "phone", "required": True, "placeholder": "6 12 34 56 78", "step_index": 0, "position": 2},
    {"key": "email", "label": "Adresse e-mail", "field_type": "email", "required": True, "placeholder": "vous@exemple.fr", "step_index": 0, "position": 3},
    {"key": "situation", "label": "Votre situation", "field_type": "select", "required": True, "options": SITUATION_OPTIONS, "step_index": 1, "position": 0},
    {"key": "consent", "label": "Consentement", "field_type": "checkbox", "required": True, "step_index": 1, "position": 1},
]


async def seed_defense_content():
    existing = await db.defense_site_content.find_one({"key": "site_content"})
    if not existing:
        await db.defense_site_content.insert_one(dict(DEFENSE_CONTENT))


async def seed_defense_form():
    published = await db.defense_form_versions.find_one({"status": "published"})
    if published:
        return
    version_id = new_id()
    await db.defense_form_versions.insert_one({
        "id": version_id, "version_number": 1, "status": "published",
        "created_at": now_iso(), "published_at": now_iso(),
    })
    step_ids = []
    for step in DEFENSE_STEPS:
        sid = new_id()
        step_ids.append(sid)
        await db.defense_form_steps.insert_one({
            "id": sid, "form_version_id": version_id, "title": step["title"],
            "description": step.get("description", ""), "position": step["position"],
        })
    for q in DEFENSE_QUESTIONS:
        await db.defense_form_questions.insert_one({
            "id": new_id(), "form_version_id": version_id, "step_id": step_ids[q["step_index"]],
            "question_key": q["key"], "label": q["label"], "description": q.get("description", ""),
            "field_type": q["field_type"], "required": q.get("required", False),
            "placeholder": q.get("placeholder", ""), "validation_rules": q.get("validation", {}),
            "options": q.get("options", []), "position": q["position"], "enabled": True,
        })
