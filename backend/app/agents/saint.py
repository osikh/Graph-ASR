import json
from uuid import uuid4
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, elapsed
from app.models.schemas import AgentEvent, Claim
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Saint agent. You reason ONLY from peaceful spiritual and religious texts that promote universal compassion, truth, and unity — Bhagavad Gita, Quran, Bible, Torah, Upanishads, Dhammapada, Tao Te Ching, Guru Granth Sahib, and similar. Never cite any text that promotes violence, division, or the superiority of one tradition over another. Respond with valid JSON only."""

PROMPT = """Question: {question}
Existing reasoning: {context}

Provide spiritual claims about this question using only peaceful, universally compassionate religious sources. Return JSON:
{{
  "claims": [
    {{
      "text": "the spiritual claim",
      "source": "scripture or tradition cited",
      "confidence": 0.0-1.0
    }}
  ]
}}"""


async def run_saint(state: ARSState) -> ARSState:
    if "saint" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    context = " | ".join(c.text for c in state.get("claims", [])[:3])

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": PROMPT.format(question=state["question"], context=context or "none yet")},
        ],
        temperature=0.5,
    )
    parsed = json.loads(raw)
    raw_claims: list[dict] = parsed.get("claims", [])

    claims: list[Claim] = []
    for rc in raw_claims:
        claim = Claim(id=f"saint_{str(uuid4())[:6]}", text=rc["text"], confidence=float(rc.get("confidence", 0.6)), agent="saint")
        claims.append(claim)
        await emit(AgentEvent(
            session_id=sid, t=elapsed(sid), agent="saint", kind="claim",
            title=f"Spiritual perspective — {rc.get('source', 'scripture')}",
            lines=[claim.text, f"Source: {rc.get('source', '')}"],
            tag="claim", log=f"saint · spiritual claim from {rc.get('source', 'text')}",
        ))

    log.info("saint.done", claims=len(claims))
    return {**state, "claims": (state.get("claims") or []) + claims}
