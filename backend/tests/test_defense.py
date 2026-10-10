"""Backend tests for Défense (Livret d'Épargne Défense) public endpoints.
Note: the submission schema uses the generic dynamic form:
POST /api/defense/leads  { form_version_id, answers:{...}, meta:{...} }
Validation errors return detail keyed by question_key (e.g. 'phone', 'email', 'consent').
"""
import os
import uuid
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://claude-ia-offre.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def form_version_id(session):
    r = session.get(f"{API}/defense/form/published")
    assert r.status_code == 200, r.text
    return r.json()["version"]["id"]


def _lead(form_version_id, **answer_overrides):
    uniq = uuid.uuid4().hex[:8]
    answers = {
        "first_name": "Jean",
        "last_name": "Dupont",
        "phone": "0612345678",
        "email": f"test_defense_{uniq}@gmail.com",
        "situation": "Civil",
        "consent": True,
    }
    answers.update(answer_overrides)
    return {
        "form_version_id": form_version_id,
        "answers": answers,
        "meta": {"session_id": f"test_{uniq}", "campaign": "", "pixel_ids": []},
    }


# ---- Pixels endpoint ----
def test_defense_pixels_active(session):
    r = session.get(f"{API}/defense/pixels/active")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "pixels" in body and isinstance(body["pixels"], list)


# ---- Leads submission ----
def test_defense_lead_success(session, form_version_id):
    r = session.post(f"{API}/defense/leads", json=_lead(form_version_id))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["lead_id"]


def test_defense_lead_missing_consent(session, form_version_id):
    r = session.post(f"{API}/defense/leads", json=_lead(form_version_id, consent=False))
    assert r.status_code == 422
    detail = r.json().get("detail", {})
    assert "consent" in detail


def test_defense_lead_invalid_phone(session, form_version_id):
    r = session.post(f"{API}/defense/leads", json=_lead(form_version_id, phone="12345"))
    assert r.status_code == 422
    detail = r.json().get("detail", {})
    assert "phone" in detail


def test_defense_lead_invalid_email(session, form_version_id):
    r = session.post(f"{API}/defense/leads", json=_lead(form_version_id, email="not-an-email"))
    assert r.status_code == 422
    detail = r.json().get("detail", {})
    assert "email" in detail


def test_defense_lead_duplicate(session, form_version_id):
    payload = _lead(form_version_id)
    r1 = session.post(f"{API}/defense/leads", json=payload)
    assert r1.status_code == 200
    r2 = session.post(f"{API}/defense/leads", json=payload)
    assert r2.status_code == 200
    assert r2.json().get("duplicate") is True


def test_defense_lead_honeypot(session, form_version_id):
    payload = _lead(form_version_id)
    payload["meta"]["website"] = "spam"
    r = session.post(f"{API}/defense/leads", json=payload)
    # Honeypot returns ok with no lead_id
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body.get("lead_id") is None
