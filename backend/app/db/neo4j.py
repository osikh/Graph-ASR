from neo4j import AsyncGraphDatabase, AsyncDriver
from app.config import cfg

_driver: AsyncDriver | None = None


def get_driver() -> AsyncDriver:
    if _driver is None:
        raise RuntimeError("Neo4j driver not initialised")
    return _driver


async def init_neo4j() -> None:
    global _driver
    _driver = AsyncGraphDatabase.driver(cfg.neo4j_uri, auth=(cfg.neo4j_user, cfg.neo4j_password))
    await _driver.verify_connectivity()
    await _create_constraints()


async def close_neo4j() -> None:
    if _driver:
        await _driver.close()


async def _create_constraints() -> None:
    async with _driver.session() as s:
        await s.run("CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (n:Concept) REQUIRE n.id IS UNIQUE")
        await s.run("CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (n:Claim) REQUIRE n.id IS UNIQUE")
        await s.run("CREATE CONSTRAINT gap_id IF NOT EXISTS FOR (n:KnowledgeGap) REQUIRE n.id IS UNIQUE")


# ── Node / edge helpers ───────────────────────────────────────────────────────

async def upsert_node(session_id: str, node_id: str, label: str, node_type: str, **props) -> None:
    q = """
    MERGE (n {id: $id, session_id: $session_id})
    ON CREATE SET n += $props, n.type = $type, n.label = $label, n.created_at = timestamp()
    ON MATCH  SET n += $props
    """
    async with get_driver().session() as s:
        await s.run(q, id=node_id, session_id=session_id, type=node_type, label=label, props=props)


async def upsert_edge(session_id: str, from_id: str, to_id: str, rel_type: str) -> None:
    q = f"""
    MATCH (a {{id: $from_id, session_id: $session_id}})
    MATCH (b {{id: $to_id,   session_id: $session_id}})
    MERGE (a)-[r:{rel_type.upper()}]->(b)
    ON CREATE SET r.created_at = timestamp()
    """
    async with get_driver().session() as s:
        await s.run(q, from_id=from_id, to_id=to_id, session_id=session_id)


async def get_concept(session_id: str, concept_id: str) -> dict | None:
    q = "MATCH (n {id: $id, session_id: $session_id}) RETURN properties(n) AS props"
    async with get_driver().session() as s:
        result = await s.run(q, id=concept_id, session_id=session_id)
        record = await result.single()
        return record["props"] if record else None


async def get_graph_snapshot(session_id: str) -> dict:
    q = """
    MATCH (n {session_id: $session_id})
    OPTIONAL MATCH (n)-[r]->(m {session_id: $session_id})
    RETURN collect(DISTINCT {id: n.id, label: n.label, type: n.type}) AS nodes,
           collect(DISTINCT {from: startNode(r).id, to: endNode(r).id, type: type(r)}) AS edges
    """
    async with get_driver().session() as s:
        result = await s.run(q, session_id=session_id)
        record = await result.single()
        if not record:
            return {"nodes": [], "edges": []}
        return {"nodes": record["nodes"], "edges": [e for e in record["edges"] if e["from"]]}
