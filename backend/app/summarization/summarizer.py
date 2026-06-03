from app.memory import episodic, working
from app.memory.episodic import EpisodicEntry
from app.orchestration.state import ARSState


def compress(session_id: str, state: ARSState) -> EpisodicEntry:
    claims = state.get("claims", [])
    challenges = state.get("challenges", [])
    gaps = state.get("gaps", [])
    confidence = state.get("confidence", 0.0)
    iteration = state.get("iteration", 0)

    challenged_ids = {
        ch["claim_id"]
        for ch in challenges
        if ch.get("severity") in ("medium", "high") and ch.get("claim_id")
    }

    resolved_claims = [
        c.text for c in claims
        if c.id not in challenged_ids
    ][:3]

    open_questions = [g.description for g in gaps][:3]

    contradictions = [
        ch["counter"]
        for ch in challenges
        if ch.get("severity") == "high" and ch.get("counter")
    ][:2]

    entry = EpisodicEntry(
        cycle=iteration,
        resolved_claims=resolved_claims,
        open_questions=open_questions,
        contradictions=contradictions,
        confidence_at=round(confidence, 3),
    )
    episodic.append(session_id, entry)

    working.update(
        session_id,
        active_conflicts=contradictions[:2],
        current_iteration=iteration,
        confidence=confidence,
    )

    return entry
