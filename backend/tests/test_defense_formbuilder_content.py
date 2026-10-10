"""Tests for Défense FormBuilder + Content editor + dynamic form sync with landing."""
import os
import time
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://claude-ia-offre.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEFENSE_EMAIL = "admin@livret-defense.fr"
DEFENSE_PASSWORD = "Defense2026!Admin"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/defense/auth/login",
               json={"email": DEFENSE_EMAIL, "password": DEFENSE_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


# -------- Public endpoints already exist --------
def test_public_form_published_available():
    r = requests.get(f"{API}/defense/form/published")
    assert r.status_code == 200
    data = r.json()
    assert data["version"]["status"] == "published"
    assert data["steps"], "Published form must have steps"
    assert data["questions"], "Published form must have questions"
    keys = {q["question_key"] for q in data["questions"]}
    # Minimal keys required by landing
    for k in ["first_name", "last_name", "phone", "email", "consent"]:
        assert k in keys, f"Missing question_key {k} in published form"


def test_public_content_available():
    r = requests.get(f"{API}/defense/content")
    assert r.status_code == 200
    data = r.json()
    assert "offer" in data
    assert "rate" in data["offer"]


# -------- FormBuilder --------
def test_formbuilder_list_versions(admin):
    r = admin.get(f"{API}/defense/admin/form/versions")
    assert r.status_code == 200
    body = r.json()
    assert "versions" in body
    assert any(v["status"] == "published" for v in body["versions"]), \
        "At least one version should be published"


def test_formbuilder_full_flow_publish_updates_public(admin):
    # 1. find published version
    pub = requests.get(f"{API}/defense/form/published").json()
    pub_version_id = pub["version"]["id"]

    # 2. create draft from published
    r = admin.post(f"{API}/defense/admin/form/versions",
                   json={"from_version_id": pub_version_id})
    assert r.status_code == 200, r.text
    draft = r.json()
    draft_id = draft["version"]["id"]
    assert draft["version"]["status"] == "draft"
    assert len(draft["steps"]) == len(pub["steps"])

    # 3. Modify situation question: add a NEW option
    situation_q = next((q for q in draft["questions"] if q["question_key"] == "situation"), None)
    assert situation_q, "Draft should contain the 'situation' question"
    marker = f"OPT-{int(time.time())}"
    situation_q["options"] = list(situation_q.get("options") or []) + [marker]

    save = admin.put(
        f"{API}/defense/admin/form/versions/{draft_id}",
        json={"steps": draft["steps"], "questions": draft["questions"]},
    )
    assert save.status_code == 200, save.text
    saved = save.json()
    sit_saved = next(q for q in saved["questions"] if q["question_key"] == "situation")
    assert marker in sit_saved["options"]

    # 4. Publish the draft
    pub2 = admin.post(f"{API}/defense/admin/form/versions/{draft_id}/publish")
    assert pub2.status_code == 200, pub2.text

    # 5. Public /form/published should now expose the new option
    r = requests.get(f"{API}/defense/form/published")
    assert r.status_code == 200
    now_pub = r.json()
    assert now_pub["version"]["id"] == draft_id
    sit_now = next(q for q in now_pub["questions"] if q["question_key"] == "situation")
    assert marker in sit_now["options"], "Published form must reflect the new option added in draft"


# -------- Content editor --------
def test_content_editor_updates_public_content(admin):
    # get current
    r = admin.get(f"{API}/defense/admin/content")
    assert r.status_code == 200
    body = r.json()
    body.pop("_id", None)
    assert "offer" in body
    original_rate = body["offer"].get("rate")
    new_rate = f"7,{int(time.time()) % 100:02d} %"
    body["offer"]["rate"] = new_rate

    put = admin.put(f"{API}/defense/admin/content", json=body)
    assert put.status_code == 200, put.text

    # verify public endpoint reflects
    r = requests.get(f"{API}/defense/content")
    assert r.status_code == 200
    assert r.json()["offer"]["rate"] == new_rate

    # restore
    body["offer"]["rate"] = original_rate or "7,10 %"
    admin.put(f"{API}/defense/admin/content", json=body)


# -------- Isolation reminders (quick smoke, in case the shared tests dropped) --------
def test_defense_endpoint_unauth():
    r = requests.get(f"{API}/defense/admin/form/versions")
    assert r.status_code == 401
