"""Tests du module de synchronisation Google Sheet (sheets_sync)."""
import asyncio
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sheets_sync  # noqa: E402


def test_enabled_logic():
    assert sheets_sync.enabled({"sheet_webhook_url": "https://script.google.com/x/exec"}) == "https://script.google.com/x/exec"
    assert sheets_sync.enabled({"sheet_webhook_url": ""}) is None
    assert sheets_sync.enabled({"sheet_webhook_url": "http://insecure"}) is None  # https requis
    assert sheets_sync.enabled({"sheet_webhook_url": "https://x/exec", "sheet_sync_enabled": False}) is None
    assert sheets_sync.enabled({}) is None
    assert sheets_sync.enabled(None) is None


def test_complete_row():
    lead = {
        "id": "L1", "created_at": "2026-10-30T09:05:00+00:00", "first_name": "Jean",
        "last_name": "Dupont", "phone_e164": "+33612345678", "email_normalized": "a@b.fr",
        "amount_range": "10k-50k", "consent": True, "utm_campaign": "bm4", "status": "nouveau",
    }
    row = sheets_sync.complete_row(lead, "Meta")
    assert row["ID"] == "L1"
    assert row["Prénom"] == "Jean"
    assert row["Consentement"] == "Oui"
    assert row["Campagne"] == "bm4"
    assert row["Provenance"] == "Meta"
    assert row["Statut"] == "nouveau"
    assert "/" in row["Date"]  # date FR formatée


def test_incomplete_row_includes_extra_answers():
    doc = {
        "id": "P1", "created_at": "2026-10-30T09:00:00+00:00", "updated_at": "2026-10-30T09:02:00+00:00",
        "step_index": 1, "utm_campaign": "bm5",
        "answers": {"first_name": "Marie", "phone": "+33611", "profession": "Militaire"},
    }
    row = sheets_sync.incomplete_row(doc, "Google")
    assert row["ID"] == "P1"
    assert row["Étape"] == 2
    assert row["Prénom"] == "Marie"
    assert row["Provenance"] == "Google"
    assert row["profession"] == "Militaire"  # réponse supplémentaire incluse


def test_parse_settings():
    out = sheets_sync.parse_settings({"sheet_webhook_url": "  https://x/exec  ", "sheet_sync_enabled": True, "other": 1})
    assert out == {"sheet_webhook_url": "https://x/exec", "sheet_sync_enabled": True}
    assert sheets_sync.parse_settings({}) == {}


def test_post_sends_json():
    captured = {}

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            captured["body"] = json.loads(self.rfile.read(length))
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok":true}')

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    t = threading.Thread(target=server.handle_request)
    t.start()

    payload = {"type": "complete", "row": {"ID": "L1", "Prénom": "Jean"}}
    asyncio.run(sheets_sync._post(f"http://127.0.0.1:{port}", payload))
    t.join(timeout=5)
    server.server_close()

    assert captured["body"]["type"] == "complete"
    assert captured["body"]["row"]["ID"] == "L1"
    assert captured["body"]["row"]["Prénom"] == "Jean"
