import json
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, emit_confidence, emit_graph_update, elapsed
from app.models.schemas import AgentEvent, KnowledgeGap
from app.db import neo4j as graph_db
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Evaluator agent. Score reasoning quality, detect knowledge gaps,
and decide whether to proceed, retry, or synthesise. Respond with valid JSON only."""

PROMPT = """Question: {question}
Claims: {claims}
Challenges: {challenges}

Evaluate the current reasoning state. Return JSON:
{{
  "confidence": 0.0-1.0,
  "verdict": "proceed|retry|done",
  "gaps": [
    {{
      "concept_a": "first concept",
      "concept_b": "second concept",
      "description": "what relationship is missing"
    }}
  ],
  "reasoning": "why this score and verdict"
}}"""


async def run_evaluator(state: ARSState) -> ARSState:
    if "evaluator" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    claims = state.get("claims", [])[-4:]
    challenges = state.get("challenges", [])[-4:]

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(
                question=state["question"],
                claims="\n".join(f"• {c.text}" for c in claims) or "none",
                challenges="\n".join(f"• {ch.get('counter', '')}" for ch in challenges) or "none",
            )},
        ],
        temperature=0.2,
    )
    parsed = json.loads(raw)
    confidence: float = float(parsed.get("confidence", 0.5))
    verdict: str = parsed.get("verdict", "proceed")
    raw_gaps: list[dict] = parsed.get("gaps", [])

    gaps: list[KnowledgeGap] = []
    for g in raw_gaps:
        gap = KnowledgeGap(
            concept_a=g["concept_a"],
            concept_b=g["concept_b"],
            description=g["description"],
        )
        gaps.append(gap)
        await graph_db.upsert_node(sid, gap.id, f"{gap.concept_a} ↔ {gap.concept_b}", "gap")
        await emit_graph_update(sid, node={"id": gap.id, "label": f"{gap.concept_a} ↔ {gap.concept_b}", "type": "gap"})
        await emit(AgentEvent(
            session_id=sid, t=elapsed(sid), agent="evaluator", kind="warning",
            title="Knowledge gap detected",
            lines=[f"No relation found between {gap.concept_a} ↔ {gap.concept_b}", gap.description],
            gap={"a": gap.concept_a, "b": gap.concept_b, "text": gap.description},
            log=f"⚠ knowledge gap: {gap.concept_a} ↔ {gap.concept_b}",
        ))

    if not gaps:
        await emit(AgentEvent(
            session_id=sid, t=elapsed(sid), agent="evaluator", kind="success",
            title="Reasoning validated" if verdict == "done" else "Cross-check passed",
            lines=[parsed.get("reasoning", "Reasoning chain is coherent.")],
            log=f"✓ evaluator · confidence {int(confidence * 100)}%",
        ))

    await emit_confidence(sid, round(confidence * 100, 1))
    log.info("evaluator.done", confidence=confidence, verdict=verdict, gaps=len(gaps))
    return {**state, "confidence": confidence, "verdict": verdict, "gaps": gaps}
