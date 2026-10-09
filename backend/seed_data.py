from database import db, new_id, now_iso

DEFAULT_CONTENT = {
    "key": "site_content",
    "brand": {
        "name": "Claude",
        "footer_line": "Demande d'informations gratuite et sans engagement.",
    },
    "colors": {
        "orange": "#FF683D",
        "orange_light": "#FF914D",
        "navy": "#101722",
        "navy_deep": "#0B111B",
        "offwhite": "#F8F6F2",
    },
    "hero": {
        "eyebrow": "CLAUDE • INTELLIGENCE ARTIFICIELLE • INVESTISSEMENT",
        "title_pre": "Claude — l'",
        "title_highlight": "intelligence artificielle",
        "title_post": " au cœur de nouvelles perspectives.",
        "subtitle": "L'intelligence artificielle transforme notre quotidien et les marchés. Découvrez les informations relatives au Livret Claude présenté dans notre offre et explorez ses caractéristiques, gratuitement et sans engagement.",
        "complement": "Et si votre prochaine décision commençait simplement par une meilleure information ?",
        "cta": "DÉCOUVRIR LE LIVRET CLAUDE",
        "cta_note": "Gratuit • Sans engagement • Aucune obligation de souscription",
    },
    "offer": {
        "accroche": "Une innovation majeure. De nouvelles perspectives à explorer.",
        "accroche_text": "Claude incarne une nouvelle génération de technologies d'intelligence artificielle. Découvrez le produit présenté dans notre communication et prenez connaissance de ses modalités avant d'envisager toute décision.",
        "title": "LIVRET CLAUDE — TAUX FIXE",
        "text": "Découvrez les caractéristiques du livret présenté dans notre communication et obtenez les informations nécessaires pour comprendre son fonctionnement.",
        "product_name": "Livret Claude",
        "rate": "8,10 %",
        "rate_label": "net par an",
        "rate_visible": True,
        "rate_verified": False,
        "nature_taux": "Taux fixe (configuration de travail — à vérifier avant publication)",
        "duree": "À définir selon les documents contractuels",
        "conditions_acces": "À définir selon les documents contractuels",
        "conditions_retrait": "À définir selon les documents contractuels",
        "risques": "Les risques dépendent du produit, de l'émetteur et de ses conditions. Ils doivent être présentés clairement avant toute décision.",
        "garantie": "Aucune garantie ne doit être annoncée sans preuve documentaire.",
        "emetteur": "À compléter après vérification",
        "documents": "À compléter (DICI, conditions générales, etc.)",
        "arguments": [
            {"icon": "shield", "title": "Capital garanti", "text": "Selon les documents contractuels de l'offre"},
            {"icon": "coins", "title": "Épargne disponible", "text": "Selon les conditions de l'offre"},
            {"icon": "refresh", "title": "Retrait possible", "text": "Selon les conditions de l'offre"},
        ],
    },
    "curiosity": {
        "title": "L'intelligence artificielle attire tous les regards. Et le vôtre ?",
        "text1": "Le développement de l'intelligence artificielle ouvre de nombreuses questions sur l'avenir de l'économie et des investissements. Découvrez les caractéristiques de l'offre présentée et faites-vous votre propre opinion.",
        "cta": "JE SOUHAITE EN SAVOIR PLUS",
    },
    "advantages": [
        {"icon": "file", "title": "UNE DEMANDE SIMPLE", "text": "Quelques informations suffisent pour demander une présentation de l'offre."},
        {"icon": "gift", "title": "GRATUIT ET SANS ENGAGEMENT", "text": "Vous pouvez découvrir les informations sans obligation d'investir."},
        {"icon": "clock", "title": "UNE DÉMARCHE À VOTRE RYTHME", "text": "Prenez connaissance des conditions et des risques avant de décider de la suite."},
    ],
    "how": {
        "title": "Découvrez l'offre en trois étapes simples",
        "steps": [
            {"title": "Complétez vos coordonnées", "text": "Renseignez les informations nécessaires pour effectuer votre demande."},
            {"title": "Précisez votre projet", "text": "Sélectionnez la tranche d'investissement que vous envisagez."},
            {"title": "Recevez les informations", "text": "Un conseiller pourra vous recontacter, conformément à votre choix, pour vous présenter les caractéristiques de l'offre."},
        ],
        "cta": "ACCÉDER À LA PRÉSENTATION",
    },
    "reassurance": {
        "title": "Votre curiosité ne vous engage à rien.",
        "text": "Vous souhaitez comprendre comment fonctionne le Livret Claude ? Demandez simplement une présentation de ses caractéristiques, de ses conditions et de ses risques. Vous restez libre de donner suite ou non.",
        "points": [
            "Demande d'informations gratuite.",
            "Aucune obligation de souscription.",
            "Liberté de décision.",
        ],
        "cta": "OBTENIR DES INFORMATIONS GRATUITES",
    },
    "faq": [
        {"q": "La demande est-elle gratuite ?", "a": "Oui, remplir le formulaire est gratuit et ne constitue pas une souscription."},
        {"q": "Suis-je obligé d'investir ?", "a": "Non. Vous restez libre de ne pas donner suite."},
        {"q": "Pourquoi indiquer un montant ?", "a": "Cette information permet de mieux comprendre votre projet."},
        {"q": "Le capital est-il garanti ?", "a": "Cela dépend du produit réellement proposé et de ses documents contractuels. Aucune garantie ne doit être annoncée sans preuve."},
        {"q": "Existe-t-il des risques ?", "a": "Oui. Les risques dépendent du produit, de l'émetteur et de ses conditions. Ils doivent être présentés clairement avant toute décision."},
        {"q": "Quand serai-je contacté ?", "a": "Si vous avez accepté d'être recontacté, un conseiller pourra vous joindre ultérieurement."},
    ],
    "form_texts": {
        "eyebrow": "DEMANDE D'INFORMATIONS",
        "pre_form_title": "Un premier pas pour découvrir l'offre. Aucun engagement pour la suite.",
        "pre_form_text": "Quelques instants suffisent pour transmettre votre demande et préciser votre projet.",
        "title": "Découvrez les informations sur le Livret Claude",
        "subtitle": "Complétez votre demande gratuitement, sans engagement.",
        "step_label": "Étape {current} sur {total}",
        "continue_label": "CONTINUER",
        "back_label": "RETOUR",
        "submit_label": "RECEVOIR LES INFORMATIONS",
        "consent_text": "J'accepte d'être recontacté par un conseiller partenaire afin de recevoir une présentation de l'offre et de ses conditions.",
        "privacy_link_text": "Consulter la politique de confidentialité",
        "confirm_title": "Votre demande a bien été enregistrée !",
        "confirm_text": "Merci pour votre intérêt. Votre demande d'informations a été prise en compte. Si vous avez accepté d'être recontacté, un conseiller pourra revenir vers vous pour vous présenter l'offre et ses conditions.",
    },
    "final_cta": {
        "title": "Les grandes évolutions méritent qu'on s'y intéresse. Les décisions importantes méritent qu'on prenne le temps de s'informer.",
        "text": "Découvrez les informations disponibles sur l'offre présentée, examinez ses conditions et avancez à votre rythme.",
        "cta": "EN SAVOIR PLUS SUR L'OFFRE",
    },
    "legal": {
        "mentions": "Mentions légales : ce site est une page de demande d'informations. Il ne constitue ni une offre de souscription, ni un conseil en investissement. Les caractéristiques, conditions et risques de toute offre sont présentés dans ses documents contractuels.",
        "privacy": "Politique de confidentialité : les informations recueillies via ce formulaire sont utilisées uniquement pour traiter votre demande d'informations et, avec votre consentement, vous recontacter. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données.",
    },
}

AMOUNT_OPTIONS = [
    "500 € à moins de 5 000 €",
    "5 000 € à moins de 10 000 €",
    "10 000 € à moins de 25 000 €",
    "25 000 € à 50 000 €",
    "Plus de 50 000 €",
]

DEFAULT_STEPS = [
    {"title": "Vos coordonnées", "description": "Quelques informations pour créer votre demande.", "position": 0},
    {"title": "Votre projet", "description": "Précisez la tranche d'investissement envisagée.", "position": 1},
]

DEFAULT_QUESTIONS = [
    {"key": "birth_date", "label": "Date de naissance", "field_type": "date", "required": True, "placeholder": "", "step_index": 0, "position": 0, "validation": {"min_age": 18}},
    {"key": "last_name", "label": "Nom", "field_type": "name", "required": True, "placeholder": "Votre nom", "step_index": 0, "position": 1},
    {"key": "first_name", "label": "Prénom", "field_type": "firstname", "required": True, "placeholder": "Votre prénom", "step_index": 0, "position": 2},
    {"key": "email", "label": "Adresse e-mail", "field_type": "email", "required": True, "placeholder": "vous@exemple.fr", "step_index": 0, "position": 3},
    {"key": "phone", "label": "Numéro de téléphone", "field_type": "phone", "required": True, "placeholder": "06 12 34 56 78", "step_index": 0, "position": 4},
    {"key": "amount", "label": "Quel montant envisagez-vous d'investir ?", "description": "Cette information nous aide à mieux comprendre votre projet. Elle ne constitue aucun engagement.", "field_type": "cards", "required": True, "options": AMOUNT_OPTIONS, "step_index": 1, "position": 0},
]


async def seed_content():
    existing = await db.site_content.find_one({"key": "site_content"})
    if not existing:
        await db.site_content.insert_one(dict(DEFAULT_CONTENT))


async def seed_form():
    published = await db.form_versions.find_one({"status": "published"})
    if published:
        return
    version_id = new_id()
    await db.form_versions.insert_one({
        "id": version_id,
        "version_number": 1,
        "status": "published",
        "created_at": now_iso(),
        "published_at": now_iso(),
    })
    step_ids = []
    for step in DEFAULT_STEPS:
        sid = new_id()
        step_ids.append(sid)
        await db.form_steps.insert_one({
            "id": sid,
            "form_version_id": version_id,
            "title": step["title"],
            "description": step.get("description", ""),
            "position": step["position"],
        })
    for q in DEFAULT_QUESTIONS:
        await db.form_questions.insert_one({
            "id": new_id(),
            "form_version_id": version_id,
            "step_id": step_ids[q["step_index"]],
            "question_key": q["key"],
            "label": q["label"],
            "description": q.get("description", ""),
            "field_type": q["field_type"],
            "required": q.get("required", False),
            "placeholder": q.get("placeholder", ""),
            "validation_rules": q.get("validation", {}),
            "options": q.get("options", []),
            "position": q["position"],
            "enabled": True,
        })
