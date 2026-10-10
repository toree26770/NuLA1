"""Backend tests for Défense ADMIN (isolated admin for Livret d'Épargne Défense)."""
import os
import uuid
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://claude-ia-offre.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEFENSE_ADMIN_EMAIL = "admin@livret-defense.fr"
DEFENSE_ADMIN_PASSWORD = "Defense2026!Admin"
CLAUDE_ADMIN_EMAIL = "admin@claude-offre.fr"
CLAUDE_ADMIN_PASSWORD = "Claude2026!Admin"


@pytest.fixture(scope="module")
def defense_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/defense/auth/login",
               json={"email": DEFENSE_ADMIN_EMAIL, "password": DEFENSE_ADMIN_PASSWORD})
    assert r.status_code == 200, f"Defense login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def claude_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login",
               json={"email": CLAUDE_ADMIN_EMAIL, "password": CLAUDE_ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Claude admin login failed: {r.status_code}")
    return s


# ---------- AUTH ----------
def test_defense_login_wrong_password():
    r = requests.post(f"{API}/defense/auth/login",
                      json={"email": DEFENSE_ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code in (401, 429)


def test_defense_admin_requires_auth():
    r = requests.get(f"{API}/defense/admin/stats")
    assert r.status_code == 401


def test_defense_me(defense_session):
    r = defense_session.get(f"{API}/defense/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == DEFENSE_ADMIN_EMAIL


# ---------- STATS / ANALYTICS ----------
def test_defense_stats(defense_session):
    r = defense_session.get(f"{API}/defense/admin/stats")
    assert r.status_code == 200
    data = r.json()
    for k in ("total", "today", "last7", "last30", "by_status"):
        assert k in data
    assert isinstance(data["by_status"], dict)
    assert "nouveau" in data["by_status"]


def test_defense_analytics(defense_session):
    r = defense_session.get(f"{API}/defense/admin/analytics?days=30")
    assert r.status_code == 200
    d = r.json()
    for k in ("visits", "unique_visitors", "form_starts", "submissions",
              "conversion_rate", "steps_reached", "per_day", "by_source"):
        assert k in d


# ---------- LEADS CRUD ----------
def _create_lead():
    uniq = uuid.uuid4().hex[:8]
    payload = {
        "first_name": "Jean",
        "last_name": "Dupont",
        "phone": "0612345678",
        "email": f"test_adm_{uniq}@gmail.com",
        "situation": "Salarié(e)",
        "consent": True,
        "meta": {"session_id": f"test_{uniq}", "campaign": "campagne_defense"},
    }
    r = requests.post(f"{API}/defense/leads", json=payload)
    assert r.status_code == 200, r.text
    return r.json()["lead_id"]


def test_leads_list(defense_session):
    lead_id = _create_lead()
    r = defense_session.get(f"{API}/defense/admin/leads?limit=50")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1
    assert any(l["id"] == lead_id for l in data["leads"])


def test_leads_search_and_filter(defense_session):
    lead_id = _create_lead()
    r = defense_session.get(f"{API}/defense/admin/leads?q=Dupont")
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    r2 = defense_session.get(f"{API}/defense/admin/leads?status=nouveau")
    assert r2.status_code == 200
    r3 = defense_session.get(f"{API}/defense/admin/leads?status=invalid_status_xxx")
    assert r3.status_code == 200  # ignored


def test_lead_get_detail(defense_session):
    lead_id = _create_lead()
    r = defense_session.get(f"{API}/defense/admin/leads/{lead_id}")
    assert r.status_code == 200
    assert r.json()["lead"]["id"] == lead_id


def test_lead_update_status(defense_session):
    lead_id = _create_lead()
    r = defense_session.patch(f"{API}/defense/admin/leads/{lead_id}/status",
                              json={"status": "traite"})
    assert r.status_code == 200
    g = defense_session.get(f"{API}/defense/admin/leads/{lead_id}")
    assert g.json()["lead"]["status"] == "traite"


def test_lead_update_notes(defense_session):
    lead_id = _create_lead()
    r = defense_session.patch(f"{API}/defense/admin/leads/{lead_id}/notes",
                              json={"notes": "Note test automatique"})
    assert r.status_code == 200
    g = defense_session.get(f"{API}/defense/admin/leads/{lead_id}")
    assert g.json()["lead"]["notes"] == "Note test automatique"


def test_lead_delete(defense_session):
    lead_id = _create_lead()
    r = defense_session.delete(f"{API}/defense/admin/leads/{lead_id}")
    assert r.status_code == 200
    g = defense_session.get(f"{API}/defense/admin/leads/{lead_id}")
    assert g.status_code == 404


def test_lead_bulk_delete(defense_session):
    ids = [_create_lead() for _ in range(2)]
    r = defense_session.post(f"{API}/defense/admin/leads/bulk-delete",
                             json={"lead_ids": ids})
    assert r.status_code == 200
    assert r.json()["deleted"] == 2


# ---------- EXPORTS ----------
def test_exports_list(defense_session):
    r = defense_session.get(f"{API}/defense/admin/exports")
    assert r.status_code == 200
    assert "exports" in r.json()


def test_export_new_leads_and_download(defense_session):
    # Ensure there's at least one "nouveau" lead
    _create_lead()
    # Clear any pending batch first
    exports = defense_session.get(f"{API}/defense/admin/exports").json()["exports"]
    for b in exports:
        if b["status"] == "pending":
            defense_session.post(f"{API}/defense/admin/exports/{b['id']}/cancel")
    r = defense_session.post(f"{API}/defense/admin/exports/new-leads")
    assert r.status_code == 200, r.text
    batch_id = r.json()["id"]
    # Download converts nouveau->recupere
    d = defense_session.get(f"{API}/defense/admin/exports/{batch_id}/download")
    assert d.status_code == 200
    assert "text/csv" in d.headers.get("content-type", "")


def test_export_custom(defense_session):
    lead_id = _create_lead()
    r = defense_session.post(f"{API}/defense/admin/exports/custom",
                             json={"lead_ids": [lead_id]})
    assert r.status_code == 200
    assert r.json()["lead_count"] == 1


# ---------- PARTIAL LEADS ----------
def test_partial_leads_list_and_export(defense_session):
    # Create a partial lead first
    sid = f"partial_{uuid.uuid4().hex[:8]}"
    requests.post(f"{API}/defense/leads/partial",
                  json={"session_id": sid,
                        "answers": {"first_name": "Partial"},
                        "step_index": 0})
    r = defense_session.get(f"{API}/defense/admin/partial-leads")
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    e = defense_session.get(f"{API}/defense/admin/partial-leads/export.csv")
    assert e.status_code == 200
    assert "text/csv" in e.headers.get("content-type", "")


# ---------- PIXELS ----------
def test_pixels_crud(defense_session):
    # Create
    r = defense_session.post(f"{API}/defense/admin/pixels",
                             json={"name": "TEST_PIXEL",
                                   "pixel_id": "123456789012",
                                   "campaigns": ["campagne_defense"]})
    assert r.status_code == 200, r.text
    pid = r.json()["pixel"]["id"]
    # List
    lst = defense_session.get(f"{API}/defense/admin/pixels")
    assert any(x["id"] == pid for x in lst.json()["items"])
    # Update (disable)
    u = defense_session.put(f"{API}/defense/admin/pixels/{pid}",
                            json={"enabled": False})
    assert u.status_code == 200
    # Delete
    d = defense_session.delete(f"{API}/defense/admin/pixels/{pid}")
    assert d.status_code == 200


def test_pixels_create_invalid_id(defense_session):
    r = defense_session.post(f"{API}/defense/admin/pixels",
                             json={"pixel_id": "abc"})
    assert r.status_code == 400


# ---------- SETTINGS ----------
def test_settings_get_and_update(defense_session):
    r = defense_session.get(f"{API}/defense/admin/settings")
    assert r.status_code == 200
    original = r.json()
    u = defense_session.put(f"{API}/defense/admin/settings",
                            json={"dup_window_days": 45,
                                  "min_submit_seconds": original.get("min_submit_seconds", 3),
                                  "rate_limit_per_hour": original.get("rate_limit_per_hour", 8),
                                  "retention_days": original.get("retention_days", 365)})
    assert u.status_code == 200
    verify = defense_session.get(f"{API}/defense/admin/settings").json()
    assert verify["dup_window_days"] == 45
    # restore
    defense_session.put(f"{API}/defense/admin/settings",
                        json={"dup_window_days": original.get("dup_window_days", 30)})


# ---------- ISOLATION ----------
def test_isolation_claude_cannot_access_defense_admin(claude_session):
    """A logged-in Claude admin must NOT be allowed to call /api/defense/admin/*."""
    r = claude_session.get(f"{API}/defense/admin/stats")
    assert r.status_code == 401


def test_isolation_defense_cannot_access_claude_admin(defense_session):
    """A logged-in Defense admin must NOT be allowed to call Claude admin endpoints."""
    # Claude admin uses /api/admin or /api/leads (depending on prefix). Try common ones.
    r = defense_session.get(f"{API}/admin/stats")
    # Must be 401/403 (not 200)
    assert r.status_code in (401, 403, 404), f"Got {r.status_code}: {r.text[:200]}"


def test_isolation_defense_lead_not_in_claude_db(defense_session, claude_session):
    """A lead created via /api/defense/leads must not show up in /api/admin/leads (Claude)."""
    lead_id = _create_lead()
    # Try the Claude admin leads endpoint
    r = claude_session.get(f"{API}/admin/leads?limit=200")
    if r.status_code == 200:
        leads = r.json().get("leads", [])
        assert not any(l.get("id") == lead_id for l in leads), "Isolation breached!"
