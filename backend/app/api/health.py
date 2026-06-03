from fastapi import APIRouter
from app.db.postgres import engine
from app.db.neo4j import get_driver
import structlog

router = APIRouter(prefix="/health", tags=["health"])
log = structlog.get_logger()


@router.get("")
async def health() -> dict:
    status = {"api": "ok", "postgres": "unknown", "neo4j": "unknown"}

    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        status["postgres"] = "ok"
    except Exception as e:
        status["postgres"] = f"error: {e}"

    try:
        await get_driver().verify_connectivity()
        status["neo4j"] = "ok"
    except Exception as e:
        status["neo4j"] = f"error: {e}"

    return status
