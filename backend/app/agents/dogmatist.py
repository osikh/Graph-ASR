import json
from uuid import uuid4
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, elapsed
from app.models.schemas import AgentEvent, Claim
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Dogmatist agent. You represent a single rigid belief system most relevant to the question being asked. You defend your position with specific citations and internal reasoning from within that one tradition. You acknowledge no other frameworks as valid — but every claim you make MUST be supported by evidence or reasoning from your tradition. You do not assert; you argue. Respond with valid JSON only."""

PROMPT = """Question: {question}
Other claims on the table: {context}

Identify the single belief system most relevant to this question, then defend it with cited reasoning. Challenge any existing claims that contradict your position. Return JSON:
{{
  "tradition": "the belief system you represent",
  "claims": [
    {{
      "text": "the claim or counter-claim",
      "evidence": "specific citation or internal logic from the tradition",
      "challenges": "which existing claim this counters, if any"
    }}
  ]
}}"""


async def run_dogmatist(state: ARSState) -> ARSState:
    if "dogmatist" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    context = " | ".join(c.text for c in state.get("claims", [])[:4])

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": PROMPT.format(question=state["question"], context=context or "none yet")},
        ],
        temperature=0.6,
    )
    parsed = json.loads(raw)
    tradition: str = parsed.get("tradition", "unknown tradition")
    raw_claims: list[dict] = parsed.get("claims", [])

    claims: list[Claim] = []
    for rc in raw_claims:
        claim = Claim(id=f"dogma_{str(uuid4())[:6]}", text=rc["text"], confidence=0.7, agent="dogmatist")
        claims.append(claim)
        await emit(AgentEvent(
            session_id=sid, t=elapsed(sid), agent="dogmatist", kind="debate",
            title=f"Dogmatist — {tradition}",
            lines=[claim.text, f"Evidence: {rc.get('evidence', '')}"],
            log=f"dogmatist · defends {tradition}",
        ))

    log.info("dogmatist.done", tradition=tradition, claims=len(claims))
    return {**state, "claims": (state.get("claims") or []) + claims}
