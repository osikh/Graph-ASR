import json
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, emit_graph_update, elapsed
from app.models.schemas import AgentEvent
from app.db import neo4j as graph_db
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Retriever agent. Given a list of concepts, retrieve relevant definitions, facts and evidence for each, and identify how they relate to each other. Respond with valid JSON only."""

PROMPT = """Concepts to retrieve: {concepts}
Question context: {question}

Return JSON:
{{
  "concepts": [
    {{
      "id": "snake_case_id",
      "label": "Display Label",
      "description": "factual description (1-2 sentences)",
      "evidence": ["fact1", "fact2"]
    }}
  ],
  "relationships": [
    {{
      "from": "concept_id",
      "to": "concept_id",
      "type": "DEPENDS_ON"
    }}
  ]
}}
Allowed relationship types: DEPENDS_ON, SUPPORTS, RELATED_TO, PART_OF"""


def _is_covered(concept: str, hits: list[dict]) -> bool:
    c = concept.lower()
    return any(c in h["label"].lower() or h["label"].lower() in c for h in hits)


async def run_retriever(state: ARSState) -> ARSState:
    if "retriever" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    concepts = state["required_concepts"][:3]
    q_node_id = f"q_{sid[:8]}"

    graph_hits = await graph_db.get_cross_session_concepts(concepts, exclude_session=sid, limit=5)
    missing = [c for c in concepts if not _is_covered(c, graph_hits)]

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="retriever", kind="retrieve",
        title="Knowledge lookup",
        lines=[
            f"graph memory: {len(graph_hits)} hit(s) · llm fetch: {len(missing)} missing",
            f'concepts: {json.dumps(concepts[:3])}',
        ],
        log="retrieval initiated",
    ))

    llm_retrieved: list[dict] = []
    relationships: list[dict] = []

    if missing:
        raw = await llm.complete(
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": PROMPT.format(
                    concepts=", ".join(missing),
                    question=state["question"],
                )},
            ],
            temperature=0.2,
        )
        parsed = json.loads(raw)
        llm_retrieved = parsed.get("concepts", [])
        relationships = parsed.get("relationships", [])

    for c in llm_retrieved:
        await graph_db.upsert_node(sid, c["id"], c["label"], "concept", description=c.get("description", ""))
        await graph_db.upsert_edge(sid, c["id"], q_node_id, "REQUIRED_FOR")
        await emit_graph_update(sid, node={"id": c["id"], "label": c["label"], "type": "concept"})
        await emit_graph_update(sid, edge={"from_id": c["id"], "to_id": q_node_id, "type": "required_for"})

    for h in graph_hits:
        await graph_db.upsert_node(sid, h["id"], h["label"], "concept", description=h.get("description", ""))
        await graph_db.upsert_edge(sid, h["id"], q_node_id, "REQUIRED_FOR")
        await emit_graph_update(sid, node={"id": h["id"], "label": h["label"], "type": "concept"})
        await emit_graph_update(sid, edge={"from_id": h["id"], "to_id": q_node_id, "type": "required_for"})

    for r in relationships:
        if r.get("from") and r.get("to"):
            await graph_db.upsert_edge(sid, r["from"], r["to"], r.get("type", "RELATED_TO"))
            await emit_graph_update(sid, edge={"from_id": r["from"], "to_id": r["to"], "type": r.get("type", "RELATED_TO").lower()})

    all_retrieved = list(graph_hits) + llm_retrieved

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="retriever", kind="retrieve",
        title=f"Retrieved {len(all_retrieved)} concepts ({len(graph_hits)} from graph)",
        lines=[f"✓ {c['label']}" for c in all_retrieved],
        log=f"graph: +{len(graph_hits)} memory · llm: +{len(llm_retrieved)} new · +{len(relationships)} edges",
    ))

    log.info("retriever.done", graph_hits=len(graph_hits), llm_hits=len(llm_retrieved), edges=len(relationships))
    return {**state, "retrieved_concepts": all_retrieved}
