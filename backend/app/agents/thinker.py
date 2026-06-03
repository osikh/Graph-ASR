import json
import litellm
from uuid import uuid4
from app.config import cfg
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
    sid = state["session_id"]
    concepts = [c["label"] for c in state.get("retrieved_concepts", [])]

    resp = await litellm.acompletion(
        model=cfg.llm_model,
        api_key=cfg.llm_api_key or None,
        api_base=cfg.llm_api_base or None,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(
                question=state["question"],
                concepts=", ".join(concepts),
            )},
        ],
        response_format={"type": "json_object"},
        temperature=0.5,
    )

    raw = resp.choices[0].message.content
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
            log=f"thinker · hypothesis emitted",
        ))

    log.info("thinker.done", claims=len(claims))
    return {**state, "claims": (state.get("claims") or []) + claims}
