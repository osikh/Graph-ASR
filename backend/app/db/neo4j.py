from neo4j import AsyncGraphDatabase, AsyncDriver
from app.config import cfg

_driver: AsyncDriver | None = None

NODE_LABELS = {
    "concept":      "Concept",
    "evidence":     "Evidence",
    "claim":        "Claim",
    "gap":          "KnowledgeGap",
    "answer":       "Answer",
    "question":     "Question",
}


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
        for label in NODE_LABELS.values():
            await s.run(f"CREATE CONSTRAINT {label.lower()}_id IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE")


async def upsert_node(session_id: str, node_id: str, label: str, node_type: str, **props) -> None:
    neo_label = NODE_LABELS.get(node_type, "Node")
    q = f"""
    MERGE (n:{neo_label} {{id: $id, session_id: $session_id}})
    ON CREATE SET n += $props, n.type = $type, n.label = $label, n.created_at = timestamp()
    ON MATCH  SET n += $props
    """
    async with get_driver().session() as s:
        await s.run(q, id=node_id, session_id=session_id, type=node_type, label=label, props=props)


async def upsert_edge(session_id: str, from_id: str, to_id: str, rel_type: str) -> None:
    safe_rel = rel_type.upper().replace(" ", "_")
    q = f"""
    MATCH (a {{id: $from_id, session_id: $session_id}})
    MATCH (b {{id: $to_id,   session_id: $session_id}})
    MERGE (a)-[r:{safe_rel}]->(b)
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


async def get_neighbors(session_id: str, concept_labels: list[str], limit: int = 5) -> list[dict]:
    q = """
    MATCH (n {session_id: $session_id})-[r]-(m {session_id: $session_id})
    WHERE any(lbl IN $labels WHERE toLower(n.label) CONTAINS toLower(lbl))
    RETURN DISTINCT m.id AS id, m.label AS label, m.type AS type, type(r) AS rel
    LIMIT $limit
    """
    async with get_driver().session() as s:
        result = await s.run(q, session_id=session_id, labels=concept_labels, limit=limit)
        return await result.data()


async def get_dependencies(session_id: str, concept_labels: list[str], limit: int = 5) -> list[dict]:
    q = """
    MATCH (n {session_id: $session_id})-[:DEPENDS_ON]->(m)
    WHERE any(lbl IN $labels WHERE toLower(n.label) CONTAINS toLower(lbl))
    RETURN m.id AS id, m.label AS label, m.type AS type, coalesce(m.description, '') AS description
    LIMIT $limit
    """
    async with get_driver().session() as s:
        result = await s.run(q, session_id=session_id, labels=concept_labels, limit=limit)
        return await result.data()


async def get_contradictions(session_id: str, limit: int = 3) -> list[dict]:
    q = """
    MATCH (a:Claim {session_id: $session_id})-[:CONTRADICTS]-(b:Claim {session_id: $session_id})
    WHERE id(a) < id(b)
    RETURN a.label AS claim_a, b.label AS claim_b
    LIMIT $limit
    """
    async with get_driver().session() as s:
        result = await s.run(q, session_id=session_id, limit=limit)
        return await result.data()


async def get_prior_claims(session_id: str, limit: int = 4) -> list[str]:
    q = """
    MATCH (n:Claim {session_id: $session_id})
    RETURN n.label AS label
    ORDER BY n.created_at DESC
    LIMIT $limit
    """
    async with get_driver().session() as s:
        result = await s.run(q, session_id=session_id, limit=limit)
        return [r["label"] for r in await result.data()]


async def get_cross_session_concepts(labels: list[str], exclude_session: str, limit: int = 3) -> list[dict]:
    q = """
    MATCH (n:Concept)
    WHERE n.session_id <> $exclude_session
      AND any(lbl IN $labels WHERE toLower(n.label) CONTAINS toLower(lbl))
    RETURN n.id AS id, n.label AS label, coalesce(n.description, '') AS description
    ORDER BY n.created_at DESC
    LIMIT $limit
    """
    async with get_driver().session() as s:
        result = await s.run(q, exclude_session=exclude_session, labels=labels, limit=limit)
        return await result.data()


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
