import asyncio
from uuid import uuid4
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import SessionRow, EventRow, SessionLocal
from app.db import neo4j as graph_db
from app.events.emitter import session_started, emit_session_status, emit_sys, pop_event_buffer
from app.models.schemas import SysEvent
from app.models.schemas import SessionResponse
from app.orchestration.graph import run_session
import structlog

log = structlog.get_logger()


async def create_session(question: str, db: AsyncSession) -> SessionRow:
    row = SessionRow(id=str(uuid4()), question=question, status="pending")
    db.add(row)
    await db.commit()
    await db.refresh(row)
    log.info("session.created", id=row.id)
    return row


async def get_session(session_id: str, db: AsyncSession) -> SessionRow | None:
    result = await db.execute(select(SessionRow).where(SessionRow.id == session_id))
    return result.scalar_one_or_none()


async def list_sessions(db: AsyncSession, limit: int = 20) -> list[SessionRow]:
    result = await db.execute(select(SessionRow).order_by(SessionRow.created_at.desc()).limit(limit))
    return list(result.scalars().all())


async def delete_session(session_id: str, db: AsyncSession) -> None:
    row = await get_session(session_id, db)
    if row:
        await db.delete(row)
        await db.commit()
    await graph_db.delete_session_graph(session_id)
    log.info("session.deleted", id=session_id)


async def get_session_events(session_id: str, db: AsyncSession) -> list[EventRow]:
    result = await db.execute(
        select(EventRow).where(EventRow.session_id == session_id).order_by(EventRow.t)
    )
    return list(result.scalars().all())


async def _flush_events(session_id: str, db: AsyncSession) -> None:
    for e in pop_event_buffer(session_id):
        db.add(EventRow(
            id=e["id"], session_id=e["session_id"], t=e["t"],
            agent=e["agent"], kind=e["kind"], title=e["title"], payload=e["payload"],
        ))


async def start_session(session_id: str, db: AsyncSession, disabled_agents: list[str] | None = None, conf_min: float = 40.0, conf_max: float = 90.0) -> None:
    row = await get_session(session_id, db)
    if not row:
        raise ValueError(f"Session {session_id} not found")
    if row.status == "running":
        return

    row.status = "running"
    await db.commit()

    session_started(session_id)
    asyncio.create_task(_run_and_persist(session_id, row.question, disabled_agents or [], conf_min, conf_max))


async def _run_and_persist(session_id: str, question: str, disabled_agents: list[str], conf_min: float = 40.0, conf_max: float = 90.0) -> None:
    async with SessionLocal() as db:
        try:
            final = await run_session(session_id, question, disabled_agents, conf_min, conf_max)

            graph = await graph_db.get_graph_snapshot(session_id)
            row = await get_session(session_id, db)
            if row:
                row.status = "complete"
                row.confidence = final.get("confidence", 0.0)
                row.node_count = len(graph.get("nodes", []))
                row.edge_count = len(graph.get("edges", []))
                row.updated_at = datetime.utcnow()
            await _flush_events(session_id, db)
            await db.commit()

        except Exception as e:
            import traceback
            err = str(e)
            log.error("session.failed", session_id=session_id, error=err, trace=traceback.format_exc())
            await emit_session_status(session_id, "failed")
            await emit_sys(SysEvent(session_id=session_id, t=0, log=f"✕ error: {err[:120]}"))

            try:
                row = await get_session(session_id, db)
                if row:
                    row.status = "failed"
                await _flush_events(session_id, db)
                await db.commit()
            except Exception:
                pass


def to_response(row: SessionRow) -> SessionResponse:
    return SessionResponse(
        id=row.id,
        question=row.question,
        status=row.status,
        confidence=row.confidence,
        node_count=row.node_count,
        edge_count=row.edge_count,
        created_at=row.created_at,
    )
