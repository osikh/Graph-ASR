import asyncio
from app.db import neo4j as graph_db
from app.memory import working, episodic
from app.orchestration.state import ARSState


async def build(session_id: str, agent_role: str, state: ARSState) -> dict:
    wm = working.get(session_id)
    concepts = wm.active_concepts if wm else state.get("required_concepts", [])[:3]
    conflicts = list(wm.active_conflicts[:2]) if wm else []
    goal = state["question"]

    neighbors, deps, contras, prior_claims, cross = await asyncio.gather(
        graph_db.get_neighbors(session_id, concepts, limit=4),
        graph_db.get_dependencies(session_id, concepts, limit=3),
        graph_db.get_contradictions(session_id, limit=3),
        graph_db.get_prior_claims(session_id, limit=4),
        graph_db.get_cross_session_concepts(concepts, exclude_session=session_id, limit=2),
    )

    retrieved_evidence: list[str] = []
    for n in neighbors[:3]:
        if n.get("label"):
            retrieved_evidence.append(n["label"])
    for d in deps[:2]:
        if d.get("label"):
            retrieved_evidence.append(d["label"])
    for c in cross[:2]:
        retrieved_evidence.append(c.get("description") or c.get("label", ""))

    for ct in contras[:2]:
        conflicts.append(f"{ct['claim_a']} ↔ {ct['claim_b']}")

    episodes = episodic.get_latest(session_id, n=2)
    episodic_summary = None
    if episodes:
        last = episodes[-1]
        episodic_summary = {
            "resolved": last.resolved_claims[:2],
            "open": last.open_questions[:2],
            "confidence_at": last.confidence_at,
        }

    return {
        "agent_role": agent_role,
        "goal": goal,
        "active_concepts": concepts[:3],
        "relevant_claims": prior_claims[:3],
        "open_conflicts": [c for c in conflicts if c][:3],
        "retrieved_evidence": [e for e in retrieved_evidence if e][:5],
        "episodic_summary": episodic_summary,
    }


def format_for_prompt(ctx: dict) -> str:
    lines = [
        f"Goal: {ctx['goal']}",
        f"Active concepts: {', '.join(ctx['active_concepts'])}",
    ]
    if ctx.get("relevant_claims"):
        lines.append("Prior claims:\n" + "\n".join(f"• {c}" for c in ctx["relevant_claims"]))
    if ctx.get("open_conflicts"):
        lines.append("Open conflicts:\n" + "\n".join(f"⚡ {c}" for c in ctx["open_conflicts"]))
    if ctx.get("retrieved_evidence"):
        lines.append("Retrieved knowledge:\n" + "\n".join(f"• {e}" for e in ctx["retrieved_evidence"]))
    if ctx.get("episodic_summary"):
        ep = ctx["episodic_summary"]
        if ep.get("resolved"):
            lines.append("Resolved: " + "; ".join(ep["resolved"]))
        if ep.get("open"):
            lines.append("Still open: " + "; ".join(ep["open"]))
    return "\n".join(lines)
