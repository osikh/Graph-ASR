import json
from uuid import uuid4
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, emit_graph_update, elapsed
from app.models.schemas import AgentEvent, Claim
from app.db import neo4j as graph_db
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Thinker agent. Form clear reasoning chains and hypotheses from provided concepts.
Respond with valid JSON only."""

PROMPT = """Question: {question}
Concepts available: {concepts}

Generate reasoning claims. Return JSON:
{{
  "claims": [
    {{
      "text": "the claim statement",
      "confidence": 0.0-1.0,
      "reasoning": "why this claim follows from the concepts"
    }}
  ]
}}"""


async def run_thinker(state: ARSState) -> ARSState:
    if "thinker" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    concepts = [c["label"] for c in state.get("retrieved_concepts", [])]

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(
                question=state["question"],
                concepts=", ".join(concepts),
            )},
        ],
        temperature=0.5,
    )
    parsed = json.loads(raw)
    raw_claims: list[dict] = parsed.get("claims", [])

    claims: list[Claim] = []
    for rc in raw_claims:
        claim = Claim(
            id=f"claim_{str(uuid4())[:6]}",
            text=rc["text"],
            confidence=float(rc.get("confidence", 0.5)),
            agent="thinker",
        )
        claims.append(claim)

        await graph_db.upsert_node(sid, claim.id, claim.text[:60], "claim")
        await emit_graph_update(sid, node={"id": claim.id, "label": claim.text[:60], "type": "claim"})
        await emit(AgentEvent(
            session_id=sid, t=elapsed(sid), agent="thinker", kind="claim",
            title="Hypothesis",
            lines=[claim.text, rc.get("reasoning", "")],
            tag="claim",
            log="thinker · hypothesis emitted",
        ))

    log.info("thinker.done", claims=len(claims))
    return {**state, "claims": (state.get("claims") or []) + claims}
