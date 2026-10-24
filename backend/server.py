from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import os

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import client, db, ensure_indexes
from auth import router as auth_router, seed_admin
from public_routes import router as public_router
from admin_routes import router as admin_router
from form_routes import router as form_router
from defense_public_routes import router as defense_public_router
from defense_auth import router as defense_auth_router, seed_defense_admin
from defense_admin_routes import router as defense_admin_router
from defense_form_routes import router as defense_form_router
from defense_seed import seed_defense_content, seed_defense_form
from livret_public_routes import router as livret_public_router
from livret_auth import router as livret_auth_router, seed_livret_admin
from livret_admin_routes import router as livret_admin_router
from livret_form_routes import router as livret_form_router
from livret_seed import seed_livret_content, seed_livret_form
from seed_data import seed_content, seed_form, seed_pixels

app = FastAPI(title="Claude Offre — API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(public_router)
api_router.include_router(admin_router)
api_router.include_router(form_router)
api_router.include_router(defense_public_router)
api_router.include_router(defense_auth_router)
api_router.include_router(defense_admin_router)
api_router.include_router(defense_form_router)
api_router.include_router(livret_public_router)
api_router.include_router(livret_auth_router)
api_router.include_router(livret_admin_router)
api_router.include_router(livret_form_router)


@api_router.get("/")
async def root():
    return {"message": "API Claude Offre — opérationnelle"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await seed_admin()
    await seed_defense_admin()
    await seed_defense_content()
    await seed_defense_form()
    await seed_livret_admin()
    await seed_livret_content()
    await seed_livret_form()
    await seed_content()
    await seed_form()
    await seed_pixels()
    # Migration ponctuelle : réparer les leads historiques dont la campagne
    # (?campaign=) était stockée dans "campaign" mais pas dans "utm_campaign".
    for coll in ("defense_leads", "livret_leads"):
        try:
            await db[coll].update_many(
                {"campaign": {"$nin": ["", None]},
                 "$or": [{"utm_campaign": ""}, {"utm_campaign": {"$exists": False}}, {"utm_campaign": None}]},
                [{"$set": {"utm_campaign": "$campaign"}}],
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Backfill utm_campaign %s: %s", coll, exc)
    # Migration ponctuelle : rattacher la campagne aux événements d'audience
    # (form_start/step_view/form_submit) enregistrés sans campagne, en se basant
    # sur la visite (page_view) de la MÊME session. Purement additif et idempotent :
    # ne remplit que les campagnes vides, ne supprime/écrase jamais de donnée existante.
    for coll in ("analytics_events", "defense_analytics_events", "livret_analytics_events"):
        try:
            pipeline = [
                {"$match": {"type": "page_view", "utm_campaign": {"$nin": ["", None]}}},
                {"$group": {"_id": "$session_id", "campaign": {"$first": "$utm_campaign"}}},
            ]
            async for row in db[coll].aggregate(pipeline):
                sid, camp = row.get("_id"), row.get("campaign")
                if not sid or not camp:
                    continue
                await db[coll].update_many(
                    {"session_id": sid,
                     "type": {"$in": ["form_start", "step_view", "form_submit"]},
                     "$or": [{"utm_campaign": ""}, {"utm_campaign": {"$exists": False}}, {"utm_campaign": None}]},
                    {"$set": {"utm_campaign": camp}},
                )
        except Exception as exc:  # pragma: no cover
            logger.warning("Backfill analytics campaign %s: %s", coll, exc)
    logger.info("Initialisation terminée : admin, contenu et formulaire prêts")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
