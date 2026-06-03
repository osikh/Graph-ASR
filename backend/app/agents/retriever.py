import json
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, emit_graph_update, elapsed
from app.models.schemas import AgentEvent
from app.db import neo4j as graph_db
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Retriever agent. Given a list of concepts, retrieve relevant definitions,
facts and evidence for each. Respond with valid JSON only."""

PROMPT = """Concepts to retrieve: {concepts}
Question context: {question}

Return JSON with key "concepts" containing an array:
{{
  "concepts": [
    {{
      "id": "snake_case_id",
      "label": "Display Label",
      "description": "factual description (1-2 sentences)",
      "evidence": ["fact1", "fact2"]
    }}
  ]
}}"""


async def run_retriever(state: ARSState) -> ARSState:
    if "retriever" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    concepts = state["required_concepts"]

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="retriever", kind="retrieve",
        title="Knowledge lookup",
        lines=[f'query graph_store := {json.dumps(concepts[:3])}'],
        log="retrieval initiated",
    ))

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(
                concepts=", ".join(concepts),
                question=state["question"],
            )},
        ],
        temperature=0.2,
    )
    parsed = json.loads(raw)
    retrieved: list[dict] = parsed.get("concepts", [])

    for c in retrieved:
        await graph_db.upsert_node(sid, c["id"], c["label"], "concept", description=c.get("description", ""))
        await emit_graph_update(sid, node={"id": c["id"], "label": c["label"], "type": "concept"})

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="retriever", kind="retrieve",
        title=f"Retrieved {len(retrieved)} concepts",
        lines=[f"✓ {c['label']} — bound" for c in retrieved],
        log=f"graph updated · +{len(retrieved)} nodes",
    ))

    log.info("retriever.done", count=len(retrieved))
    return {**state, "retrieved_concepts": retrieved}
