import json
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_health():
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_extension_connected_broadcast():
    """Quand l'extension se connecte, les dashboards reçoivent EXTENSION_CONNECTED."""
    client = TestClient(app)
    with client.websocket_connect("/ws/extension") as ws_ext:
        with client.websocket_connect("/ws/dashboard") as ws_dash:
            received = ws_dash.receive_text()
            parsed = json.loads(received)
            assert parsed["type"] == "EXTENSION_CONNECTED"


def test_extension_dashboard_relay():
    """Un message de l'extension est relayé au dashboard."""
    client = TestClient(app)
    with client.websocket_connect("/ws/extension") as ws_ext:
        with client.websocket_connect("/ws/dashboard") as ws_dash:
            ws_dash.receive_text()  # drain EXTENSION_CONNECTED
            ws_ext.send_text(json.dumps({
                "type": "GS_READY",
                "url": "http://example.com",
                "title": "Test",
            }))
            received = ws_dash.receive_text()
            parsed = json.loads(received)
            assert parsed["type"] == "GS_READY"
            assert parsed["url"] == "http://example.com"


def test_dashboard_message_sent_to_extension():
    """Un message du dashboard est relayé à l'extension."""
    client = TestClient(app)
    with client.websocket_connect("/ws/extension") as ws_ext:
        with client.websocket_connect("/ws/dashboard") as ws_dash:
            ws_dash.receive_text()  # drain EXTENSION_CONNECTED
            ws_dash.send_text(json.dumps({
                "type": "TRIGGER_EXTRACTION",
                "modeId": "full-page",
                "options": {},
            }))
            received = ws_ext.receive_text()
            parsed = json.loads(received)
            assert parsed["type"] == "TRIGGER_EXTRACTION"
            assert parsed["modeId"] == "full-page"


def test_ping_pong_filtered():
    """PING/PONG ne doivent pas être relayés aux dashboards."""
    client = TestClient(app)
    with client.websocket_connect("/ws/extension") as ws_ext:
        with client.websocket_connect("/ws/dashboard") as ws_dash:
            ws_dash.receive_text()  # drain EXTENSION_CONNECTED
            ws_ext.send_text(json.dumps({"type": "PING"}))
            ws_ext.send_text(json.dumps({
                "type": "GS_READY",
                "url": "http://example.com",
                "title": "Ping test",
            }))
            received = ws_dash.receive_text()
            parsed = json.loads(received)
            assert parsed["type"] == "GS_READY"


def test_invalid_message_filtered():
    """Un message sans champ 'type' valide ne doit pas être relayé."""
    client = TestClient(app)
    with client.websocket_connect("/ws/extension") as ws_ext:
        with client.websocket_connect("/ws/dashboard") as ws_dash:
            ws_dash.receive_text()  # drain EXTENSION_CONNECTED
            ws_ext.send_text(json.dumps({"foo": "bar"}))
            ws_ext.send_text(json.dumps({
                "type": "GS_READY",
                "url": "http://example.com",
                "title": "After invalid",
            }))
            received = ws_dash.receive_text()
            parsed = json.loads(received)
            assert parsed["type"] == "GS_READY"
            assert parsed["title"] == "After invalid"
