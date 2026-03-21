from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.auth.dependencies import require_admin_or_doctor
from app.domain_types import User
from app.fs_client import get_store
from app.firestore_store import Store

router = APIRouter(prefix="/api/v1/queue", tags=["queue"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, doctor_id: str, websocket: WebSocket):
        await websocket.accept()
        if doctor_id not in self.active_connections:
            self.active_connections[doctor_id] = []
        self.active_connections[doctor_id].append(websocket)

    def disconnect(self, doctor_id: str, websocket: WebSocket):
        if doctor_id in self.active_connections:
            self.active_connections[doctor_id] = [
                ws for ws in self.active_connections[doctor_id] if ws != websocket
            ]

    async def broadcast(self, doctor_id: str, message: dict):
        if doctor_id in self.active_connections:
            for ws in self.active_connections[doctor_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    self.disconnect(doctor_id, ws)


manager = ConnectionManager()


@router.get("/{doctor_id}/today", response_model=dict)
def get_queue_today(doctor_id: UUID, store: Store = Depends(get_store)):
    today = date.today()
    queue = store.queue_get(str(doctor_id), today)
    return {
        "success": True,
        "data": {
            "current_token": queue.get("current_token", 0) if queue else 0,
            "last_token_issued": queue.get("last_token_issued", 0) if queue else 0,
        },
        "message": "Queue state fetched",
    }


@router.put("/{doctor_id}/next", response_model=dict)
async def advance_token(
    doctor_id: UUID,
    store: Store = Depends(get_store),
    _current_user: User = Depends(require_admin_or_doctor),
):
    today = date.today()
    store.queue_ensure(str(doctor_id), today)
    q = store.queue_get(str(doctor_id), today) or {}
    nxt = int(q.get("current_token") or 0) + 1
    store.queue_set(str(doctor_id), today, {"current_token": nxt})
    await manager.broadcast(
        str(doctor_id),
        {"current_token": nxt, "doctor_id": str(doctor_id)},
    )
    return {"success": True, "data": {"current_token": nxt}, "message": "Token advanced"}


@router.websocket("/ws/{doctor_id}")
async def websocket_queue(websocket: WebSocket, doctor_id: str):
    await manager.connect(doctor_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(doctor_id, websocket)
