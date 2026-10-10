"""Backend tests for Meta Pixels, lead deletion, phone validation and regressions."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@claude-offre.fr")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Claude2026!Admin")


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def published_form():
    r = requests.get(f"{API}/form/published")
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="session", autouse=True)
def bump_rate_limit():
    """Raise rate limit during tests to avoid 429s, restore after."""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        yield
        return
    original = s.get(f"{API}/admin/settings").json()
    s.put(f"{API}/admin/settings", json={
        "rate_limit_per_hour": 1000,
        "min_submit_seconds": 0,
        "dup_window_days": original.get("dup_window_days", 30),
    })
    yield
    s.put(f"{API}/admin/settings", json={
        "rate_limit_per_hour": original.get("rate_limit_per_hour", 8),
        "min_submit_seconds": original.get("min_submit_seconds", 3),
        "dup_window_days": original.get("dup_window_days", 30),
    })


def _unique_email():
    return f"test.{uuid.uuid4().hex[:10]}@gmail.com"


def _unique_phone():
    # unique French mobile
    n = int(time.time() * 1000) % 100000000
    return "06" + str(n).zfill(8)


def _build_answers(form, email, phone, amount="Entre 10 000€ et 50 000€", ville="Paris"):
    answers = {}
    for q in form["questions"]:
        k = q["question_key"]
        t = q["field_type"]
        if k == "email":
            answers[k] = email
        elif k == "phone":
            answers[k] = phone
        elif k == "first_name":
            answers[k] = "Jean"
        elif k == "last_name":
            answers[k] = "Dupont"
        elif k == "birth_date":
            answers[k] = "1980-01-15"
        elif k == "amount":
            opts = q.get("options") or []
            answers[k] = amount if amount in opts else (opts[0] if opts else amount)
        elif k == "consent":
            answers[k] = True
        elif t == "cards" or t == "radio" or t == "select":
            opts = q.get("options") or []
            answers[k] = opts[0] if opts else ""
        elif t == "yesno":
            answers[k] = "Oui"
        elif t == "checkbox":
            answers[k] = True
        elif t == "multichoice":
            answers[k] = (q.get("options") or [])[:1]
        elif t == "postal_code":
            answers[k] = "75001"
        elif t == "number" or t == "amount":
            answers[k] = "10000"
        elif t == "date":
            answers[k] = "1980-01-15"
        else:
            answers[k] = ville if "ville" in k.lower() else "Reponse"
    return answers


# ---------- Meta Pixels CRUD ----------

class TestMetaPixels:
    created_ids = []

    def test_list_has_default_seed(self, admin_session):
        r = admin_session.get(f"{API}/admin/pixels")
        assert r.status_code == 200, r.text
        items = r.json()["items"]
        assert any(p["pixel_id"] == "1905482920834524" and p.get("is_default") for p in items), \
            f"Seed pixel not found. Items={items}"

    def test_create_pixel_rejects_non_numeric(self, admin_session):
        r = admin_session.post(f"{API}/admin/pixels", json={
            "name": "TEST_bad", "pixel_id": "abc123xx", "enabled": True
        })
        assert r.status_code == 400, r.text

    def test_create_update_delete_pixel(self, admin_session):
        payload = {"name": "TEST_Pixel", "pixel_id": "9988776655443322",
                   "enabled": True, "is_default": False, "campaigns": ["TEST-camp"]}
        r = admin_session.post(f"{API}/admin/pixels", json=payload)
        assert r.status_code == 200, r.text
        pixel = r.json()["pixel"]
        pid = pixel["id"]
        assert pixel["pixel_id"] == "9988776655443322"
        assert "test-camp" in pixel["campaigns"]  # sanitized lowercase
        TestMetaPixels.created_ids.append(pid)

        # Update - toggle enabled & campaigns
        r = admin_session.put(f"{API}/admin/pixels/{pid}", json={
            "name": "TEST_Pixel_v2", "enabled": False, "campaigns": ["bm2"]
        })
        assert r.status_code == 200, r.text
        r = admin_session.get(f"{API}/admin/pixels")
        found = next(p for p in r.json()["items"] if p["id"] == pid)
        assert found["enabled"] is False
        assert found["name"] == "TEST_Pixel_v2"
        assert found["campaigns"] == ["bm2"]

        # Delete
        r = admin_session.delete(f"{API}/admin/pixels/{pid}")
        assert r.status_code == 200
        r = admin_session.get(f"{API}/admin/pixels")
        assert not any(p["id"] == pid for p in r.json()["items"])


# ---------- Public /pixels/active ----------

class TestActivePixels:
    def test_no_campaign_returns_defaults(self):
        r = requests.get(f"{API}/pixels/active")
        assert r.status_code == 200
        data = r.json()
        assert any(p["pixel_id"] == "1905482920834524" for p in data["pixels"])

    def test_unknown_campaign_returns_empty(self):
        r = requests.get(f"{API}/pixels/active", params={"campaign": "unknown-xyz-nope"})
        assert r.status_code == 200
        assert r.json()["pixels"] == []

    def test_assign_campaign_bm1_to_default_pixel(self, admin_session):
        r = admin_session.get(f"{API}/admin/pixels")
        default_pid = next(p["id"] for p in r.json()["items"] if p["pixel_id"] == "1905482920834524")
        # add bm1 to its campaigns
        current = next(p for p in r.json()["items"] if p["id"] == default_pid)
        new_camps = list(set((current.get("campaigns") or []) + ["bm1"]))
        r = admin_session.put(f"{API}/admin/pixels/{default_pid}", json={"campaigns": new_camps})
        assert r.status_code == 200
        try:
            r = requests.get(f"{API}/pixels/active", params={"campaign": "bm1"})
            assert r.status_code == 200
            pids = [p["pixel_id"] for p in r.json()["pixels"]]
            assert "1905482920834524" in pids
        finally:
            # cleanup: restore campaigns
            admin_session.put(f"{API}/admin/pixels/{default_pid}",
                              json={"campaigns": current.get("campaigns") or []})


# ---------- Phone validation (overseas) ----------

class TestPhoneValidation:
    @pytest.mark.parametrize("phone", [
        "0590690001",   # Guadeloupe
        "0696112233",   # Martinique
        "0694112233",   # Guyane
        "0692001122",   # Reunion
        "0639012345",   # Mayotte
        "0612345678",   # Metropole mobile
        "0145678901",   # Metropole fixe
        "+33612345678", # Metropole international
    ])
    def test_valid_phones(self, published_form, phone):
        email = _unique_email()
        answers = _build_answers(published_form, email, phone)
        r = requests.post(f"{API}/leads", json={
            "form_version_id": published_form["version"]["id"],
            "answers": answers,
            "meta": {"started_at": "2020-01-01T00:00:00+00:00"},
        })
        assert r.status_code == 200, f"Phone {phone} rejected: {r.status_code} {r.text}"
        assert r.json()["ok"] is True

    @pytest.mark.parametrize("phone", ["123", "0000000000"])
    def test_invalid_phones(self, published_form, phone):
        email = _unique_email()
        answers = _build_answers(published_form, email, phone)
        r = requests.post(f"{API}/leads", json={
            "form_version_id": published_form["version"]["id"],
            "answers": answers,
            "meta": {"started_at": "2020-01-01T00:00:00+00:00"},
        })
        assert r.status_code == 422, f"Phone {phone} unexpectedly accepted: {r.status_code} {r.text}"


# ---------- Lead deletion ----------

class TestLeadDeletion:
    def test_delete_single_lead(self, admin_session, published_form):
        email = _unique_email()
        phone = _unique_phone()
        answers = _build_answers(published_form, email, phone)
        r = requests.post(f"{API}/leads", json={
            "form_version_id": published_form["version"]["id"],
            "answers": answers,
            "meta": {"started_at": "2020-01-01T00:00:00+00:00"},
        })
        assert r.status_code == 200, r.text
        lead_id = r.json()["lead_id"]

        r = admin_session.delete(f"{API}/admin/leads/{lead_id}")
        assert r.status_code == 200
        assert r.json()["ok"] is True

        r = admin_session.get(f"{API}/admin/leads/{lead_id}")
        assert r.status_code == 404

    def test_bulk_delete(self, admin_session, published_form):
        ids = []
        for _ in range(3):
            r = requests.post(f"{API}/leads", json={
                "form_version_id": published_form["version"]["id"],
                "answers": _build_answers(published_form, _unique_email(), _unique_phone()),
                "meta": {"started_at": "2020-01-01T00:00:00+00:00"},
            })
            assert r.status_code == 200, r.text
            ids.append(r.json()["lead_id"])

        r = admin_session.post(f"{API}/admin/leads/bulk-delete", json={"lead_ids": ids})
        assert r.status_code == 200
        assert r.json()["deleted"] == 3

        for lid in ids:
            r = admin_session.get(f"{API}/admin/leads/{lid}")
            assert r.status_code == 404

    def test_delete_also_removes_answers(self, admin_session, published_form):
        email = _unique_email()
        phone = _unique_phone()
        r = requests.post(f"{API}/leads", json={
            "form_version_id": published_form["version"]["id"],
            "answers": _build_answers(published_form, email, phone),
            "meta": {"started_at": "2020-01-01T00:00:00+00:00"},
        })
        assert r.status_code == 200
        lead_id = r.json()["lead_id"]
        r = admin_session.get(f"{API}/admin/leads/{lead_id}")
        assert len(r.json()["answers"]) > 0
        admin_session.delete(f"{API}/admin/leads/{lead_id}")
        # answers are detached: lead is 404
        r = admin_session.get(f"{API}/admin/leads/{lead_id}")
        assert r.status_code == 404


# ---------- Regressions ----------

class TestRegressions:
    def test_duplicate_detection(self, published_form):
        email = _unique_email()
        phone = _unique_phone()
        payload = {
            "form_version_id": published_form["version"]["id"],
            "answers": _build_answers(published_form, email, phone),
            "meta": {"started_at": "2020-01-01T00:00:00+00:00"},
        }
        r1 = requests.post(f"{API}/leads", json=payload)
        assert r1.status_code == 200
        assert r1.json().get("duplicate") is False
        # 2nd same phone/email -> duplicate
        payload["answers"] = _build_answers(published_form, email, phone)
        r2 = requests.post(f"{API}/leads", json=payload)
        assert r2.status_code == 200
        assert r2.json().get("duplicate") is True

    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        data = r.json()
        for k in ("total", "today", "last7", "last30", "by_status", "per_day"):
            assert k in data

    def test_admin_analytics(self, admin_session):
        r = admin_session.get(f"{API}/admin/analytics")
        assert r.status_code == 200
        data = r.json()
        for k in ("visits", "unique_visitors", "form_starts", "submissions", "conversion_rate"):
            assert k in data

    def test_admin_partial_leads(self, admin_session):
        r = admin_session.get(f"{API}/admin/partial-leads")
        assert r.status_code == 200
        assert "items" in r.json()

    def test_partial_lead_capture(self):
        sid = f"TEST_sess_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/leads/partial", json={
            "session_id": sid,
            "answers": {"first_name": "Marc", "email": "test@example.com"},
            "step_index": 0,
            "meta": {},
        })
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_admin_leads_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/leads")
        assert r.status_code == 200
        assert "leads" in r.json()
