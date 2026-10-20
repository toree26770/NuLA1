"""Seed ISOLÉ « Super Livret — Compte rémunéré » (collections livret_*)."""
import copy

from database import db, new_id, now_iso
from seed_data import DEFAULT_CONTENT

# Le contenu Super Livret réutilise EXACTEMENT le même schéma que la landing 1
# (pour que l'éditeur de contenu de l'admin fonctionne à l'identique),
# avec des valeurs propres au Super Livret.
LIVRET_CONTENT = copy.deepcopy(DEFAULT_CONTENT)
LIVRET_CONTENT["brand"] = {
    "name": "Super Livret",
    "footer_line": "Demande d'informations gratuite et sans engagement.",
}
LIVRET_CONTENT["offer"].update({
    "title": "COMPTE RÉMUNÉRÉ — SUPER LIVRET",
    "product_name": "Super Livret",
    "rate": "5 %",
    "rate_label": "net garanti 12 mois",
    "rate_visible": True,
})
LIVRET_CONTENT["form_texts"].update({
    "title": "Vérifiez votre éligibilité en 1 minute",
    "subtitle": "Répondez à quelques questions rapides pour savoir si ce Livret d'épargne correspond à votre profil d'épargnant.",
    "submit_label": "VÉRIFIER MON ÉLIGIBILITÉ",
    "continue_label": "CONTINUER",
    "consent_text": "J'accepte d'être recontacté(e) et la politique de confidentialité.",
    "confirm_title": "Votre demande a bien été enregistrée",
    "confirm_text": "Merci. Un conseiller pourra vous recontacter afin de vous présenter le Super Livret, ses conditions et ses modalités.",
})


AMOUNT_OPTIONS = ["Moins de 10 000 €", "10 000 € à 30 000 €", "30 000 € à 75 000 €", "Plus de 75 000 €"]
SITUATION_OPTIONS = ["Salarié(e)", "Indépendant(e)", "Retraité(e)", "Sans emploi", "Autre"]

LIVRET_STEPS = [
    {"title": "Votre projet d'épargne", "description": "Quelques informations sur votre profil d'épargnant.", "position": 0},
    {"title": "Vos coordonnées", "description": "Pour créer votre demande et vous recontacter.", "position": 1},
]

LIVRET_QUESTIONS = [
    {"key": "amount", "label": "Montant à placer", "field_type": "select", "required": True, "options": AMOUNT_OPTIONS, "step_index": 0, "position": 0},
    {"key": "situation", "label": "Votre situation", "field_type": "select", "required": True, "options": SITUATION_OPTIONS, "step_index": 0, "position": 1},
    {"key": "last_name", "label": "Nom", "field_type": "name", "required": True, "placeholder": "Votre nom", "step_index": 1, "position": 2},
    {"key": "first_name", "label": "Prénom", "field_type": "firstname", "required": True, "placeholder": "Votre prénom", "step_index": 1, "position": 3},
    {"key": "phone", "label": "Téléphone", "field_type": "phone", "required": True, "placeholder": "6 12 34 56 78", "step_index": 1, "position": 4},
    {"key": "email", "label": "Adresse e-mail", "field_type": "email", "required": True, "placeholder": "vous@exemple.fr", "step_index": 1, "position": 5},
    {"key": "consent", "label": "Consentement", "field_type": "checkbox", "required": True, "step_index": 1, "position": 6},
]


async def seed_livret_content():
    existing = await db.livret_site_content.find_one({"key": "site_content"})
    if not existing:
        await db.livret_site_content.insert_one(dict(LIVRET_CONTENT))


async def seed_livret_form():
    published = await db.livret_form_versions.find_one({"status": "published"})
    if published:
        return
    version_id = new_id()
    await db.livret_form_versions.insert_one({
        "id": version_id, "version_number": 1, "status": "published",
        "created_at": now_iso(), "published_at": now_iso(),
    })
    step_ids = []
    for step in LIVRET_STEPS:
        sid = new_id()
        step_ids.append(sid)
        await db.livret_form_steps.insert_one({
            "id": sid, "form_version_id": version_id, "title": step["title"],
            "description": step.get("description", ""), "position": step["position"],
        })
    for q in LIVRET_QUESTIONS:
        await db.livret_form_questions.insert_one({
            "id": new_id(), "form_version_id": version_id, "step_id": step_ids[q["step_index"]],
            "question_key": q["key"], "label": q["label"], "description": q.get("description", ""),
            "field_type": q["field_type"], "required": q.get("required", False),
            "placeholder": q.get("placeholder", ""), "validation_rules": q.get("validation", {}),
            "options": q.get("options", []), "position": q["position"], "enabled": True,
        })
