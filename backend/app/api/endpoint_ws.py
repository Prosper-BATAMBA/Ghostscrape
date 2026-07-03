import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ValidationError


class WSMessage(BaseModel):
    type: str

    class Config:
        extra = "allow"

router = APIRouter(tags=["ws"])

extension_ws: WebSocket | None = None
dashboard_connections: set[WebSocket] = set()
extension_connected = False


@router.websocket("/ws/extension")
async def ws_extension(websocket: WebSocket):
    global extension_ws, extension_connected
    await websocket.accept()
    print(f"[WS] Extension connected (existing: {extension_connected})")
    extension_ws = websocket
    extension_connected = True

    count = 0
    for dc in list(dashboard_connections):
        try:
            await dc.send_text(json.dumps({"type": "EXTENSION_CONNECTED"}))
            count += 1
        except Exception:
            dashboard_connections.discard(dc)
    print(f"[WS] EXTENSION_CONNECTED broadcast to {count} dashboard(s)")

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                parsed = json.loads(raw)
                msg_type = parsed.get("type", "")
                if msg_type in ("PING", "PONG"):
                    continue
                if not isinstance(msg_type, str) or not msg_type.strip():
                    print(f"[WS] Dropped message with invalid type: {msg_type}")
                    continue
                validated = WSMessage(**parsed)
            except json.JSONDecodeError:
                print("[WS] Dropped invalid JSON")
                continue
            except ValidationError as e:
                print(f"[WS] Dropped message validation failed: {e}")
                continue
            for dc in list(dashboard_connections):
                try:
                    await dc.send_text(raw)
                except Exception:
                    dashboard_connections.discard(dc)
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if extension_ws is websocket:
            extension_ws = None
            extension_connected = False
            dead: set[WebSocket] = set()
            for dc in list(dashboard_connections):
                try:
                    await dc.send_text(json.dumps({"type": "EXTENSION_DISCONNECTED"}))
                except Exception:
                    dead.add(dc)
            dashboard_connections.difference_update(dead)
            print(f"[WS] Extension disconnected, EXTENSION_DISCONNECTED broadcast ({len(dead)} stale removed)")


@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket):
    await websocket.accept()
    dashboard_connections.add(websocket)
    print(f"[WS] Dashboard connected (ext_connected={extension_connected}), total dashboards: {len(dashboard_connections)}")

    try:
        if extension_connected:
            await websocket.send_text(json.dumps({"type": "EXTENSION_CONNECTED"}))
            print(f"[WS]  -> sent EXTENSION_CONNECTED to new dashboard")
        else:
            await websocket.send_text(json.dumps({"type": "EXTENSION_DISCONNECTED"}))
            print(f"[WS]  -> sent EXTENSION_DISCONNECTED to new dashboard")
    except Exception:
        dashboard_connections.discard(websocket)
        print(f"[WS]  -> init send failed, dashboard discarded immediately")
        return

    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                msg_type = parsed.get("type", "")
                if msg_type in ("PING", "PONG"):
                    continue
                if not isinstance(msg_type, str) or not msg_type.strip():
                    print(f"[WS] Dropped dashboard message with invalid type: {msg_type}")
                    continue
                validated = WSMessage(**parsed)
            except json.JSONDecodeError:
                print("[WS] Dropped invalid JSON from dashboard")
                continue
            except ValidationError as e:
                print(f"[WS] Dropped dashboard message validation failed: {e}")
                continue
            if extension_ws:
                try:
                    await extension_ws.send_text(data)
                except Exception:
                    pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        dashboard_connections.discard(websocket)
        print(f"[WS] Dashboard disconnected, remaining dashboards: {len(dashboard_connections)}")
