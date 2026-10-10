"""Authentification admin ISOLÉE de l'application « Livret d'Épargne Défense »."""
import os
from datetime import datetime, timezone, timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from auth import get_jwt_secret, hash_password, verify_password
from database import db, new_id, now_iso

JWT_ALGORITHM = "HS256"
TOKEN_HOURS = 12
COOKIE_NAME = "defense_access_token"

router = APIRouter(prefix="/defense/auth", tags=["defense-auth"])


def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
        "type": "defense_access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_defense_admin(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")
    if payload.get("type") != "defense_access":
        raise HTTPException(status_code=401, detail="Jeton invalide")
    user = await db.defense_admin_users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


class LoginInput(BaseModel):
    email: str
    password: str


@router.post("/login")
async def defense_login(body: LoginInput, request: Request, response: Response):
    email = body.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.defense_login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until", "")
        if locked_until and locked_until > now_iso():
            raise HTTPException(status_code=429, detail="Trop de tentatives. Réessayez dans 15 minutes.")
    user = await db.defense_admin_users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.defense_login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()},
            },
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    await db.defense_login_attempts.delete_one({"identifier": identifier})
    token = create_token(user["id"], email)
    response.set_cookie(
        key=COOKIE_NAME, value=token, httponly=True, secure=True,
        samesite="none", max_age=TOKEN_HOURS * 3600, path="/",
    )
    return {"id": user["id"], "email": email, "role": user.get("role", "admin"), "token": token}


@router.post("/logout")
async def defense_logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
async def defense_me(admin=Depends(get_current_defense_admin)):
    return admin


async def seed_defense_admin():
    email = os.environ.get("DEFENSE_ADMIN_EMAIL", "").strip().lower()
    password = os.environ.get("DEFENSE_ADMIN_PASSWORD", "")
    if not email or not password:
        return
    existing = await db.defense_admin_users.find_one({"email": email})
    if not existing:
        await db.defense_admin_users.insert_one({
            "id": new_id(),
            "email": email,
            "password_hash": hash_password(password),
            "role": "admin",
            "created_at": now_iso(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.defense_admin_users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
