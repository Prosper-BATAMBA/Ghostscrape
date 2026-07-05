import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel, ValidationError


class WSMessage(BaseModel):
    type: str

    class Config:
        extra = "allow"


router = APIRouter(tags=["ws"])

extension_ws: WebSocket | None = None
extension_connected = False
# session_id -> set of dashboard WebSockets
sessions: dict[str, set[WebSocket]] = {}


def _clean_empty_sessions():
    empty = [sid for sid, sset in sessions.items() if not sset]
    for sid in empty:
        del sessions[sid]


async def _broadcast_to_session(session_id: str, message: str):
    sset = sessions.get(session_id)
    if not sset:
        return
    dead = set()
    for dc in sset:
        try:
            await dc.send_text(message)
        except Exception:
            dead.add(dc)
    if dead:
        sset.difference_update(dead)
        _clean_empty_sessions()


async def _broadcast_all(message: str):
    for sid in list(sessions.keys()):
        await _broadcast_to_session(sid, message)


@router.websocket("/ws/extension")
async def ws_extension(websocket: WebSocket):
    global extension_ws, extension_connected
    await websocket.accept()
    print(f"[WS] Extension connected (existing: {extension_connected})")
    extension_ws = websocket
    extension_connected = True

    await _broadcast_all(json.dumps({"type": "EXTENSION_CONNECTED"}))

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
                WSMessage(**parsed)
            except json.JSONDecodeError:
                print("[WS] Dropped invalid JSON")
                continue
            except ValidationError as e:
                print(f"[WS] Dropped message validation failed: {e}")
                continue

            source_session = parsed.get("_session_id")
            if source_session and source_session in sessions:
                await _broadcast_to_session(source_session, raw)
            else:
                await _broadcast_all(raw)
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if extension_ws is websocket:
            extension_ws = None
            extension_connected = False
            await _broadcast_all(json.dumps({"type": "EXTENSION_DISCONNECTED"}))
            print("[WS] Extension disconnected")


@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket, session_id: str = Query(default="")):
    await websocket.accept()

    if not session_id:
        session_id = "default"
    if session_id not in sessions:
        sessions[session_id] = set()
    sessions[session_id].add(websocket)
    print(f"[WS] Dashboard connected (session={session_id}, ext={extension_connected})")

    try:
        if extension_connected:
            await websocket.send_text(json.dumps({"type": "EXTENSION_CONNECTED"}))
        else:
            await websocket.send_text(json.dumps({"type": "EXTENSION_DISCONNECTED"}))
    except Exception:
        sessions[session_id].discard(websocket)
        if not sessions[session_id]:
            del sessions[session_id]
        print(f"[WS] Dashboard init send failed, discarded (session={session_id})")
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
                WSMessage(**parsed)
            except json.JSONDecodeError:
                print("[WS] Dropped invalid JSON from dashboard")
                continue
            except ValidationError as e:
                print(f"[WS] Dropped dashboard message validation failed: {e}")
                continue

            parsed["_session_id"] = session_id
            if extension_ws:
                try:
                    await extension_ws.send_text(json.dumps(parsed))
                except Exception:
                    pass
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        sset = sessions.get(session_id)
        if sset:
            sset.discard(websocket)
            if not sset:
                del sessions[session_id]
        print(f"[WS] Dashboard disconnected (session={session_id})")
