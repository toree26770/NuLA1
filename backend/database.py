import os
import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def new_id():
    return str(uuid.uuid4())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def ensure_indexes():
    await db.admin_users.create_index("email", unique=True)
    await db.leads.create_index("email_normalized")
    await db.leads.create_index("phone_e164")
    await db.leads.create_index("status")
    await db.leads.create_index("created_at")
    await db.leads.create_index("utm_campaign")
    await db.lead_answers.create_index("lead_id")
    await db.export_batches.create_index("created_at")
    await db.security_logs.create_index("created_at")
    await db.login_attempts.create_index("identifier")
    await db.form_versions.create_index("status")


async def log_security(event_type, metadata=None):
    await db.security_logs.insert_one({
        "id": new_id(),
        "event_type": event_type,
        "created_at": now_iso(),
        "metadata": metadata or {},
    })


async def get_settings():
    settings = await db.settings.find_one({"key": "settings"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "settings",
            "dup_window_days": 30,
            "min_submit_seconds": 3,
            "rate_limit_per_hour": 8,
            "retention_days": 365,
            "consent_version": "v1",
        }
        await db.settings.insert_one(settings)
        settings.pop("_id", None)
    return settings
