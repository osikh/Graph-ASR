import json
from uuid import uuid4
from app.lib import llm
from app.orchestration.state import ARSState
from app.events.emitter import emit, elapsed
from app.models.schemas import AgentEvent, Claim
import structlog

log = structlog.get_logger()

SYSTEM = """You are the Chronicler agent. Your only sources of truth are myths, folklore, ancient oral traditions, cultural stories, archetypal narratives, and paranormal accounts from civilisations worldwide — Sumerian, Egyptian, Norse, Celtic, Vedic, Mesoamerican, African, Native American, and others. Science and organised religion are equally foreign to you. You speak from cultural memory and ancestral wisdom. Respond with valid JSON only."""

PROMPT = """Question: {question}
Current claims from other agents: {context}

Bring what myths, folklore, and ancient traditions say about this question. These are not lesser truths — they are cultural memory encoded over millennia. Return JSON:
{{
  "claims": [
    {{
      "text": "the mythological or folkloric claim",
      "tradition": "which culture or tradition this comes from",
      "confidence": 0.0-1.0
    }}
  ]
}}"""


async def run_chronicler(state: ARSState) -> ARSState:
    if "chronicler" in state.get("disabled_agents", []): return state
    sid = state["session_id"]
    context = " | ".join(c.text for c in state.get("claims", [])[:3])

    raw = await llm.complete(
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": PROMPT.format(question=state["question"], context=context or "none yet")},
        ],
        temperature=0.7,
    )
    parsed = json.loads(raw)
    raw_claims: list[dict] = parsed.get("claims", [])

    claims: list[Claim] = []
    for rc in raw_claims:
        claim = Claim(id=f"chron_{str(uuid4())[:6]}", text=rc["text"], confidence=float(rc.get("confidence", 0.5)), agent="chronicler")
        claims.append(claim)
        await emit(AgentEvent(
            session_id=sid, t=elapsed(sid), agent="chronicler", kind="claim",
            title=f"Chronicler — {rc.get('tradition', 'ancient tradition')}",
            lines=[claim.text, f"Tradition: {rc.get('tradition', '')}"],
            tag="claim", log=f"chronicler · {rc.get('tradition', 'folklore')}",
        ))

    log.info("chronicler.done", claims=len(claims))
    return {**state, "claims": (state.get("claims") or []) + claims}
