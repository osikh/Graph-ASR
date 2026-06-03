import json
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, emit_graph_update, elapsed
from app.models.schemas import AgentEvent
from app.db import neo4j as graph_db
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Synthesizer agent. Compose a final, well-sourced answer from validated
reasoning chains. Be clear, precise, and cite the concepts used. Respond with valid JSON only."""

PROMPT = """Question: {question}
Validated claims: {claims}
Concepts used: {concepts}
Confidence level: {confidence}%

Write the final answer. Return JSON:
{{
  "answer": "full answer (3-5 sentences, precise)",
  "sources": ["concept or evidence name", ...],
  "confidence": 0.0-1.0
}}"""


async def run_synthesizer(state: ARSState) -> ARSState:
    if "synthesizer" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    claims = state.get("claims", [])
    concepts = [c["label"] for c in state.get("retrieved_concepts", [])]
    confidence_pct = int(state.get("confidence", 0.5) * 100)

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(
                question=state["question"],
                claims="\n".join(f"• {c.text}" for c in claims) or "none",
                concepts=", ".join(concepts),
                confidence=confidence_pct,
            )},
        ],
        temperature=0.3,
    )
    parsed = json.loads(raw)
    answer: str = parsed.get("answer", "")
    sources: list[str] = parsed.get("sources", concepts[:3])
    final_conf: float = float(parsed.get("confidence", state.get("confidence", 0.5)))

    sentences = [s.strip() for s in answer.split(".") if s.strip()]
    answer_id = f"ans_{sid[:8]}"
    q_node_id = f"q_{sid[:8]}"

    await graph_db.upsert_node(sid, answer_id, answer[:80], "answer")
    await graph_db.upsert_edge(sid, answer_id, q_node_id, "ANSWERS")
    await emit_graph_update(sid, node={"id": answer_id, "label": answer[:80], "type": "answer"})
    await emit_graph_update(sid, edge={"from_id": answer_id, "to_id": q_node_id, "type": "supports"})

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="synthesizer", kind="answer",
        title="Final answer",
        lines=sentences,
        sources=sources,
        log=f"✓ answer synthesised · confidence {int(final_conf * 100)}%",
    ))

    log.info("synthesizer.done", confidence=final_conf)
    return {**state, "final_answer": answer, "final_sources": sources, "confidence": final_conf}
