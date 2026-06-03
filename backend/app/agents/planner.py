import json
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, elapsed
from app.models.schemas import AgentEvent
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Planner agent in a multi-agent reasoning system.
Given a question, identify the key concepts required to answer it and outline a retrieval strategy.
Always respond with valid JSON only."""

PROMPT = """Question: {question}

Return JSON:
{{
  "required_concepts": ["concept1", "concept2", ...],
  "strategy": "one sentence describing the reasoning approach"
}}"""


async def run_planner(state: ARSState) -> ARSState:
    if "planner" in state.get("disabled_agents", []): return state
    sid = state["session_id"]

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="planner", kind="think",
        title="Decomposing query",
        lines=[f"Goal → {state['question']}", "Strategy: identify governing relation, then required quantities."],
        log=f"planner.start · decomposing: {state['question'][:60]}",
    ))

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(question=state["question"])},
        ],
        temperature=0.3,
    )
    parsed = json.loads(raw)
    concepts: list[str] = parsed.get("required_concepts", [])
    strategy: str = parsed.get("strategy", "")

    await emit(AgentEvent(
        session_id=sid, t=elapsed(sid), agent="planner", kind="plan",
        title="Concept requirements",
        lines=["Required concepts:"] + [f"• {c}" for c in concepts],
        log=f"planner · {len(concepts)} concept slots opened",
    ))

    log.info("planner.done", concepts=concepts)
    return {**state, "required_concepts": concepts, "strategy": strategy}
