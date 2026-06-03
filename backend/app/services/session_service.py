import asyncio
from uuid import uuid4
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import SessionRow
from app.db import neo4j as graph_db
from app.events.emitter import session_started
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


async def start_session(session_id: str, db: AsyncSession) -> None:
    """Kick off the reasoning pipeline in the background."""
    row = await get_session(session_id, db)
    if not row:
        raise ValueError(f"Session {session_id} not found")
    if row.status == "running":
        return

    row.status = "running"
    await db.commit()

    session_started(session_id)
    asyncio.create_task(_run_and_persist(session_id, row.question, db))


async def _run_and_persist(session_id: str, question: str, db: AsyncSession) -> None:
    try:
        final = await run_session(session_id, question)

        # update session row with final stats
        graph = await graph_db.get_graph_snapshot(session_id)
        row = await get_session(session_id, db)
        if row:
            row.status = "complete"
            row.confidence = final.get("confidence", 0.0)
            row.node_count = len(graph.get("nodes", []))
            row.edge_count = len(graph.get("edges", []))
            row.updated_at = datetime.utcnow()
            await db.commit()

    except Exception as e:
        log.error("session.failed", session_id=session_id, error=str(e))
        row = await get_session(session_id, db)
        if row:
            row.status = "failed"
            await db.commit()


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
