import json
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, elapsed
from app.models.schemas import AgentEvent
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Debater agent. Stress-test reasoning claims by finding counter-arguments,
edge cases, and missing variables. Be rigorous. Respond with valid JSON only."""

PROMPT = """Question: {question}
Claims to challenge:
{claims}

For each claim find the strongest counter-argument. Return JSON:
{{
  "challenges": [
    {{
      "claim_id": "...",
      "claim_text": "...",
      "counter": "the counter-argument",
      "severity": "low|medium|high",
      "missing_variable": "what variable or concept is being ignored"
    }}
  ]
}}"""


async def run_debater(state: ARSState) -> ARSState:
    sid = state["session_id"]
    claims = state.get("claims", [])
    if not claims:
        return state

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user",   "content": PROMPT.format(
                question=state["question"],
                claims="\n".join(f"[{c.id}] {c.text}" for c in claims),
            )},
        ],
        temperature=0.6,
    )
    parsed = json.loads(raw)
    challenges: list[dict] = parsed.get("challenges", [])

    for ch in challenges:
        if ch.get("severity") in ("medium", "high"):
            await emit(AgentEvent(
                session_id=sid, t=elapsed(sid), agent="debater", kind="debate",
                title="Counter-argument",
                lines=[ch["counter"], f"Missing: {ch.get('missing_variable', '?')}"],
                log=f"debater · challenges claim {ch.get('claim_id', '?')}",
            ))

    log.info("debater.done", challenges=len(challenges))
    return {**state, "challenges": challenges}
