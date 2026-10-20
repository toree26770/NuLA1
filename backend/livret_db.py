"""Helpers base de données ISOLÉS pour « Livret Défense » (collections livret_*)."""
from database import db, new_id, now_iso


async def log_security(event_type, metadata=None):
    await db.livret_security_logs.insert_one({
        "id": new_id(),
        "event_type": event_type,
        "created_at": now_iso(),
        "metadata": metadata or {},
    })


async def get_settings():
    settings = await db.livret_settings.find_one({"key": "settings"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "settings",
            "dup_window_days": 30,
            "min_submit_seconds": 3,
            "rate_limit_per_hour": 8,
            "retention_days": 365,
            "consent_version": "v1",
        }
        await db.livret_settings.insert_one(dict(settings))
        settings.pop("_id", None)
    return settings
