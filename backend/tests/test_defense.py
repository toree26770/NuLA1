"""Backend tests for Défense (Livret d'Épargne Défense) endpoints."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://claude-ia-offre.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _lead(**overrides):
    uniq = uuid.uuid4().hex[:8]
    data = {
        "first_name": "Jean",
        "last_name": "Dupont",
        "phone": "0612345678",
        "email": f"test_defense_{uniq}@gmail.com",
        "situation": "Salarié(e)",
        "consent": True,
        "meta": {"session_id": f"test_{uniq}", "campaign": "", "pixel_ids": []},
    }
    data.update(overrides)
    return data


# ---- Pixels endpoint ----
def test_defense_pixels_active(session):
    r = session.get(f"{API}/defense/pixels/active")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "pixels" in body and isinstance(body["pixels"], list)


# ---- Leads submission ----
def test_defense_lead_success(session):
    r = session.post(f"{API}/defense/leads", json=_lead())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["lead_id"]


def test_defense_lead_missing_consent(session):
    r = session.post(f"{API}/defense/leads", json=_lead(consent=False))
    assert r.status_code == 400
    detail = r.json().get("detail", {})
    assert "consent" in detail


def test_defense_lead_invalid_phone(session):
    r = session.post(f"{API}/defense/leads", json=_lead(phone="12345"))
    assert r.status_code == 422
    detail = r.json().get("detail", {})
    assert "phone" in detail


def test_defense_lead_invalid_email(session):
    r = session.post(f"{API}/defense/leads", json=_lead(email="not-an-email"))
    assert r.status_code == 422
    detail = r.json().get("detail", {})
    assert "email" in detail


def test_defense_lead_duplicate(session):
    payload = _lead()
    r1 = session.post(f"{API}/defense/leads", json=payload)
    assert r1.status_code == 200
    r2 = session.post(f"{API}/defense/leads", json=payload)
    assert r2.status_code == 200
    assert r2.json().get("duplicate") is True


def test_defense_lead_honeypot(session):
    payload = _lead()
    payload["meta"]["website"] = "spam"
    r = session.post(f"{API}/defense/leads", json=payload)
    # Honeypot returns ok with no lead_id
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body.get("lead_id") is None
