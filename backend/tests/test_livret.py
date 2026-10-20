"""Backend tests for the NEW 'Super Livret — Compte rémunéré' site.
Covers:
  - Public endpoints (content, form, pixels, track, partial, leads)
  - Validation (missing consent, invalid phone/email, honeypot)
  - Auth (login/me/logout, cookie isolation)
  - Admin endpoints (stats, analytics, leads CRUD, settings, pixels, exports, form builder)
  - Isolation vs Claude & Défense
  - Non-regression on Claude & Défense public endpoints
"""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://claude-ia-offre.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

LIVRET_ADMIN_EMAIL = "admin-livret@preview.local"
LIVRET_ADMIN_PASSWORD = "LivretPreview1!"
CLAUDE_ADMIN_EMAIL = "admin@claude-offre.fr"
CLAUDE_ADMIN_PASSWORD = "Claude2026!Admin"
DEFENSE_ADMIN_EMAIL = "admin@livret-defense.fr"
DEFENSE_ADMIN_PASSWORD = "Defense2026!Admin"


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def livret_form(session):
    r = session.get(f"{API}/livret/form/published")
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/livret/auth/login",
               json={"email": LIVRET_ADMIN_EMAIL, "password": LIVRET_ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    # Bump rate limit so the suite can run without 429s
    s.put(f"{API}/livret/admin/settings",
          json={"rate_limit_per_hour": 10000, "min_submit_seconds": 0})
    return s


def _old_started_at():
    return (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()


def _lead(form_version_id, **answer_overrides):
    uniq = uuid.uuid4().hex[:8]
    answers = {
        "amount": "10 000 € à 30 000 €",
        "situation": "Salarié(e)",
        "last_name": "Dupont",
        "first_name": "Jean",
        "phone": "0612345678",
        "email": f"TEST_livret_{uniq}@gmail.com",
        "consent": True,
    }
    answers.update(answer_overrides)
    return {
        "form_version_id": form_version_id,
        "answers": answers,
        "meta": {
            "session_id": f"test_livret_{uniq}",
            "started_at": _old_started_at(),
            "campaign": "",
            "pixel_ids": [],
        },
    }


# ---------- Public : content & form ----------

def test_livret_content(session):
    r = session.get(f"{API}/livret/content")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["brand"]["name"] == "Super Livret"
    assert body["offer"]["rate"] == "5 %"
    assert body["form_texts"]["submit_label"] == "VÉRIFIER MON ÉLIGIBILITÉ"


def test_livret_form_published_schema(livret_form):
    assert livret_form["version"]["status"] == "published"
    assert livret_form["version"]["version_number"] == 1
    titles = [s["title"] for s in livret_form["steps"]]
    assert titles == ["Votre projet d'épargne", "Vos coordonnées"]
    keys = sorted(q["question_key"] for q in livret_form["questions"])
    assert keys == sorted(["amount", "situation", "last_name", "first_name",
                           "phone", "email", "consent"])
    assert len(livret_form["questions"]) == 7


def test_livret_pixels_active(session):
    r = session.get(f"{API}/livret/pixels/active")
    assert r.status_code == 200
    assert "pixels" in r.json()
    r2 = session.get(f"{API}/livret/pixels/active?campaign=test_campaign")
    assert r2.status_code == 200


# ---------- Public : analytics ----------

def test_livret_track(session):
    sid = f"test_livret_track_{uuid.uuid4().hex[:8]}"
    for ev, idx in [("page_view", None), ("form_start", None),
                    ("step_view", 0), ("step_view", 1), ("form_submit", None)]:
        r = session.post(f"{API}/livret/track",
                         json={"session_id": sid, "event": ev, "step_index": idx, "meta": {}})
        assert r.status_code == 200


def test_livret_partial_lead(session):
    sid = f"test_livret_partial_{uuid.uuid4().hex[:8]}"
    r = session.post(f"{API}/livret/leads/partial", json={
        "session_id": sid,
        "step_index": 0,
        "answers": {"amount": "10 000 € à 30 000 €", "first_name": "Marie"},
        "meta": {},
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True


# ---------- Public : lead submission ----------

@pytest.fixture(scope="module")
def form_version_id(livret_form):
    return livret_form["version"]["id"]


@pytest.fixture(scope="module")
def _prime_admin_settings(admin_session):
    # Simply forces admin_session fixture (and the rate-limit bump) to run first
    return True


def test_livret_lead_success(session, form_version_id, _prime_admin_settings):
    r = session.post(f"{API}/livret/leads", json=_lead(form_version_id))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["lead_id"]


def test_livret_lead_invalid_email(session, form_version_id, _prime_admin_settings):
    r = session.post(f"{API}/livret/leads", json=_lead(form_version_id, email="not-an-email"))
    assert r.status_code == 422
    assert "email" in r.json().get("detail", {})


def test_livret_lead_missing_consent(session, form_version_id, _prime_admin_settings):
    r = session.post(f"{API}/livret/leads", json=_lead(form_version_id, consent=False))
    assert r.status_code == 422
    assert "consent" in r.json().get("detail", {})


def test_livret_lead_invalid_phone(session, form_version_id, _prime_admin_settings):
    r = session.post(f"{API}/livret/leads", json=_lead(form_version_id, phone="12"))
    assert r.status_code == 422
    assert "phone" in r.json().get("detail", {})


def test_livret_lead_honeypot(session, form_version_id, _prime_admin_settings):
    payload = _lead(form_version_id)
    payload["meta"]["website"] = "http://spam.example.com"
    r = session.post(f"{API}/livret/leads", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body.get("lead_id") is None


def test_livret_lead_fast_submit(session, form_version_id, admin_session):
    # Temporarily force min_submit_seconds=5 to test fast-submit rejection
    admin_session.put(f"{API}/livret/admin/settings", json={"min_submit_seconds": 5})
    try:
        payload = _lead(form_version_id)
        payload["meta"]["started_at"] = datetime.now(timezone.utc).isoformat()  # just now
        r = session.post(f"{API}/livret/leads", json=payload)
        assert r.status_code == 200
        # fast_submit → silently discarded, no lead_id
        assert r.json().get("lead_id") is None
    finally:
        admin_session.put(f"{API}/livret/admin/settings", json={"min_submit_seconds": 0})


# ---------- Auth ----------

def test_livret_login_wrong_password(session):
    r = session.post(f"{API}/livret/auth/login",
                     json={"email": LIVRET_ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code in (401, 429)


def test_livret_login_and_me(admin_session):
    r = admin_session.get(f"{API}/livret/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == LIVRET_ADMIN_EMAIL
    # Cookie must be set
    cookies = admin_session.cookies.get_dict()
    assert "livret_access_token" in cookies


def test_livret_admin_requires_auth(session):
    for path in ("/livret/admin/stats", "/livret/admin/leads",
                 "/livret/admin/pixels", "/livret/admin/content"):
        r = requests.get(f"{API}{path}")
        assert r.status_code == 401, f"{path} did not require auth"


# ---------- Admin : stats, analytics, leads ----------

def test_livret_admin_stats(admin_session):
    r = admin_session.get(f"{API}/livret/admin/stats")
    assert r.status_code == 200
    body = r.json()
    for key in ("total", "today", "last7", "last30", "by_status", "per_day"):
        assert key in body


def test_livret_admin_analytics(admin_session):
    r = admin_session.get(f"{API}/livret/admin/analytics?days=30")
    assert r.status_code == 200
    assert "visits" in r.json()


def test_livret_admin_leads_crud(admin_session, session, form_version_id):
    # Create a lead first
    r = session.post(f"{API}/livret/leads", json=_lead(form_version_id))
    assert r.status_code == 200
    lead_id = r.json()["lead_id"]

    # LIST
    r = admin_session.get(f"{API}/livret/admin/leads")
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    # GET single
    r = admin_session.get(f"{API}/livret/admin/leads/{lead_id}")
    assert r.status_code == 200
    assert r.json()["lead"]["id"] == lead_id

    # PATCH status
    r = admin_session.patch(f"{API}/livret/admin/leads/{lead_id}/status",
                            json={"status": "traite"})
    assert r.status_code == 200
    r = admin_session.get(f"{API}/livret/admin/leads/{lead_id}")
    assert r.json()["lead"]["status"] == "traite"

    # DELETE
    r = admin_session.delete(f"{API}/livret/admin/leads/{lead_id}")
    assert r.status_code == 200
    r = admin_session.get(f"{API}/livret/admin/leads/{lead_id}")
    assert r.status_code == 404


def test_livret_admin_partial_leads(admin_session):
    r = admin_session.get(f"{API}/livret/admin/partial-leads")
    assert r.status_code == 200
    assert "items" in r.json()


def test_livret_admin_campaigns(admin_session):
    r = admin_session.get(f"{API}/livret/admin/campaigns")
    assert r.status_code == 200
    assert "campaigns" in r.json()


def test_livret_admin_security_logs(admin_session):
    r = admin_session.get(f"{API}/livret/admin/security-logs")
    assert r.status_code == 200
    assert "logs" in r.json()


def test_livret_admin_content_rw(admin_session):
    r = admin_session.get(f"{API}/livret/admin/content")
    assert r.status_code == 200
    content = r.json()
    assert content["brand"]["name"] == "Super Livret"
    # Put back as-is
    r = admin_session.put(f"{API}/livret/admin/content", json=content)
    assert r.status_code == 200


def test_livret_admin_settings_rw(admin_session):
    r = admin_session.get(f"{API}/livret/admin/settings")
    assert r.status_code == 200


def test_livret_admin_pixels_crud(admin_session):
    # CREATE
    r = admin_session.post(f"{API}/livret/admin/pixels",
                           json={"name": "TEST pixel", "pixel_id": "1234567890",
                                 "enabled": True, "is_default": False, "campaigns": ["test_campaign"]})
    assert r.status_code == 200, r.text
    pid = r.json()["pixel"]["id"]
    # LIST
    r = admin_session.get(f"{API}/livret/admin/pixels")
    assert any(p["id"] == pid for p in r.json()["items"])
    # UPDATE
    r = admin_session.put(f"{API}/livret/admin/pixels/{pid}", json={"enabled": False})
    assert r.status_code == 200
    # DELETE
    r = admin_session.delete(f"{API}/livret/admin/pixels/{pid}")
    assert r.status_code == 200


# ---------- Admin : form builder ----------

def test_livret_form_builder(admin_session, form_version_id):
    # LIST versions
    r = admin_session.get(f"{API}/livret/admin/form/versions")
    assert r.status_code == 200
    assert len(r.json()["versions"]) >= 1

    # CREATE draft from current
    r = admin_session.post(f"{API}/livret/admin/form/versions",
                           json={"from_version_id": form_version_id})
    assert r.status_code == 200, r.text
    draft = r.json()
    draft_id = draft["version"]["id"]
    assert draft["version"]["status"] == "draft"

    # SAVE (keep same structure)
    steps = draft["steps"]
    questions = draft["questions"]
    r = admin_session.put(f"{API}/livret/admin/form/versions/{draft_id}",
                          json={"steps": steps, "questions": questions})
    assert r.status_code == 200, r.text

    # DELETE the draft to avoid leaving test versions behind
    r = admin_session.delete(f"{API}/livret/admin/form/versions/{draft_id}")
    assert r.status_code == 200


# ---------- Admin : exports ----------

def test_livret_admin_exports(admin_session, session, form_version_id):
    # Create a lead with status nouveau
    r = session.post(f"{API}/livret/leads", json=_lead(form_version_id))
    assert r.status_code == 200
    lead_id = r.json()["lead_id"]
    try:
        # List exports
        r = admin_session.get(f"{API}/livret/admin/exports")
        assert r.status_code == 200
        # Custom export of this lead
        r = admin_session.post(f"{API}/livret/admin/exports/custom",
                               json={"lead_ids": [lead_id]})
        assert r.status_code == 200, r.text
        batch_id = r.json()["id"]
        # Download
        r = admin_session.get(f"{API}/livret/admin/exports/{batch_id}/download")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
    finally:
        admin_session.delete(f"{API}/livret/admin/leads/{lead_id}")


# ---------- ISOLATION ----------

@pytest.fixture(scope="module")
def claude_admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login",
               json={"email": CLAUDE_ADMIN_EMAIL, "password": CLAUDE_ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Claude login failed: {r.status_code}")
    return s


@pytest.fixture(scope="module")
def defense_admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/defense/auth/login",
               json={"email": DEFENSE_ADMIN_EMAIL, "password": DEFENSE_ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Defense login failed: {r.status_code}")
    return s


def test_livret_isolation_lead_not_in_claude_or_defense(
        session, admin_session, claude_admin_session, defense_admin_session, form_version_id):
    uniq = uuid.uuid4().hex[:8]
    marker_email = f"TEST_isolation_{uniq}@gmail.com"
    r = session.post(f"{API}/livret/leads",
                     json=_lead(form_version_id, email=marker_email))
    assert r.status_code == 200
    lead_id = r.json()["lead_id"]
    try:
        # Should NOT appear in Claude admin leads
        r = claude_admin_session.get(f"{API}/admin/leads?q={marker_email}")
        assert r.status_code == 200
        assert r.json()["total"] == 0, "Livret lead leaked into Claude admin!"

        # Should NOT appear in Défense admin leads
        r = defense_admin_session.get(f"{API}/defense/admin/leads?q={marker_email}")
        assert r.status_code == 200
        assert r.json()["total"] == 0, "Livret lead leaked into Défense admin!"

        # SHOULD appear in Livret admin
        r = admin_session.get(f"{API}/livret/admin/leads?q={marker_email}")
        assert r.status_code == 200
        assert r.json()["total"] == 1
    finally:
        admin_session.delete(f"{API}/livret/admin/leads/{lead_id}")


def test_livret_isolation_content_distinct(session):
    rl = session.get(f"{API}/livret/content").json()
    rc = session.get(f"{API}/content").json()
    rd = session.get(f"{API}/defense/content").json()
    assert rl["brand"]["name"] == "Super Livret"
    # Claude/Défense should NOT be branded "Super Livret"
    assert rc.get("brand", {}).get("name") != "Super Livret"
    assert rd.get("brand", {}).get("name") != "Super Livret"


def test_livret_cross_session_cannot_access(claude_admin_session, defense_admin_session):
    # Claude cookie must NOT grant access to Livret admin
    r = claude_admin_session.get(f"{API}/livret/admin/stats")
    assert r.status_code == 401
    # Défense cookie must NOT grant access to Livret admin
    r = defense_admin_session.get(f"{API}/livret/admin/stats")
    assert r.status_code == 401


# ---------- NON-REGRESSION Claude ----------

def test_claude_content_still_works(session):
    r = session.get(f"{API}/content")
    assert r.status_code == 200


def test_claude_form_still_works(session):
    r = session.get(f"{API}/form/published")
    assert r.status_code == 200
    assert r.json()["version"]["status"] == "published"


def test_claude_login_still_works():
    r = requests.post(f"{API}/auth/login",
                      json={"email": CLAUDE_ADMIN_EMAIL, "password": CLAUDE_ADMIN_PASSWORD})
    assert r.status_code == 200


# ---------- NON-REGRESSION Défense ----------

def test_defense_content_still_works(session):
    r = session.get(f"{API}/defense/content")
    assert r.status_code == 200


def test_defense_form_still_works(session):
    r = session.get(f"{API}/defense/form/published")
    assert r.status_code == 200
    body = r.json()
    assert body["version"]["status"] == "published"
    assert len(body["steps"]) == 2
    assert len(body["questions"]) >= 6


def test_defense_login_still_works():
    r = requests.post(f"{API}/defense/auth/login",
                      json={"email": DEFENSE_ADMIN_EMAIL, "password": DEFENSE_ADMIN_PASSWORD})
    assert r.status_code == 200
