"""Helpers base de données ISOLÉS pour « Livret Défense » (collections defense_*)."""
from database import db, new_id, now_iso


async def log_security(event_type, metadata=None):
    await db.defense_security_logs.insert_one({
        "id": new_id(),
        "event_type": event_type,
        "created_at": now_iso(),
        "metadata": metadata or {},
    })


async def get_settings():
    settings = await db.defense_settings.find_one({"key": "settings"}, {"_id": 0})
    if not settings:
        settings = {
            "key": "settings",
            "dup_window_days": 30,
            "min_submit_seconds": 3,
            "rate_limit_per_hour": 8,
            "retention_days": 365,
            "consent_version": "v1",
        }
        await db.defense_settings.insert_one(dict(settings))
        settings.pop("_id", None)
    return settings
