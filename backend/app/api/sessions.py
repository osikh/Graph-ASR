from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import get_db
from app.db import neo4j as graph_db
from app.websocket.manager import ws_manager
from app.models.schemas import RunRequest
from app.services import session_service as svc
from app.models.schemas import SessionCreate, SessionResponse
import structlog

router = APIRouter(prefix="/sessions", tags=["sessions"])
log = structlog.get_logger()


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    row = await svc.create_session(body.question, db)
    return svc.to_response(row)


@router.get("", response_model=list[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    rows = await svc.list_sessions(db)
    return [svc.to_response(r) for r in rows]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    row = await svc.get_session(session_id, db)
    if not row:
        raise HTTPException(404, "Session not found")
    return svc.to_response(row)


@router.post("/{session_id}/run", status_code=202)
async def run_session(session_id: str, body: RunRequest = RunRequest(session_id=""), db: AsyncSession = Depends(get_db)):
    row = await svc.get_session(session_id, db)
    if not row:
        raise HTTPException(404, "Session not found")
    if row.status in ("running", "complete"):
        raise HTTPException(409, f"Session already {row.status}")
    await svc.start_session(session_id, db, body.disabled_agents, body.conf_min, body.conf_max)
    return {"session_id": session_id, "status": "started"}


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    row = await svc.get_session(session_id, db)
    if not row:
        raise HTTPException(404, "Session not found")
    await svc.delete_session(session_id, db)


@router.get("/{session_id}/events")
async def get_events(session_id: str, db: AsyncSession = Depends(get_db)):
    rows = await svc.get_session_events(session_id, db)
    return [row.payload for row in rows]


@router.get("/{session_id}/graph")
async def get_graph(session_id: str):
    return await graph_db.get_graph_snapshot(session_id)


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/{session_id}/ws")
async def session_ws(session_id: str, ws: WebSocket):
    await ws_manager.connect(session_id, ws)
    log.info("ws.session_opened", session_id=session_id)
    try:
        while True:
            await ws.receive_text()   # keep connection alive; client sends heartbeats
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id, ws)
        log.info("ws.session_closed", session_id=session_id)
