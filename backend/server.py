from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import logging
import os

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import client, ensure_indexes
from auth import router as auth_router, seed_admin
from public_routes import router as public_router
from admin_routes import router as admin_router
from form_routes import router as form_router
from defense_routes import router as defense_router
from defense_auth import router as defense_auth_router, seed_defense_admin
from defense_admin_routes import router as defense_admin_router
from seed_data import seed_content, seed_form, seed_pixels

app = FastAPI(title="Claude Offre — API")

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(public_router)
api_router.include_router(admin_router)
api_router.include_router(form_router)
api_router.include_router(defense_router)
api_router.include_router(defense_auth_router)
api_router.include_router(defense_admin_router)


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
    await seed_content()
    await seed_form()
    await seed_pixels()
    logger.info("Initialisation terminée : admin, contenu et formulaire prêts")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
