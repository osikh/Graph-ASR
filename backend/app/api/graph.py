from fastapi import APIRouter
from app.db import neo4j as graph_db

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("")
async def get_knowledge_graph():
    return await graph_db.get_full_graph()
