from langgraph.graph import StateGraph, END
from app.orchestration.state import ARSState
from app.agents.planner import run_planner
from app.agents.retriever import run_retriever
from app.agents.thinker import run_thinker
from app.agents.debater import run_debater
from app.agents.evaluator import run_evaluator
from app.agents.synthesizer import run_synthesizer
from app.events.emitter import emit_session_status, emit_sys, elapsed
from app.models.schemas import SysEvent
import structlog

log = structlog.get_logger()

MAX_ITERATIONS = 2


def _route_after_eval(state: ARSState) -> str:
    """Re-run thinker→debater→evaluator if gaps found and under iteration limit."""
    if state["verdict"] == "done":
        return "synthesizer"
    if state["iteration"] >= state["max_iterations"]:
        log.warning("graph.max_iterations_reached", session_id=state["session_id"])
        return "synthesizer"
    return "thinker"


def _increment_iteration(state: ARSState) -> ARSState:
    return {**state, "iteration": state["iteration"] + 1}


def build_graph() -> StateGraph:
    g = StateGraph(ARSState)

    g.add_node("planner",     run_planner)
    g.add_node("retriever",   run_retriever)
    g.add_node("thinker",     run_thinker)
    g.add_node("debater",     run_debater)
    g.add_node("evaluator",   run_evaluator)
    g.add_node("inc_iter",    _increment_iteration)
    g.add_node("synthesizer", run_synthesizer)

    g.set_entry_point("planner")
    g.add_edge("planner",   "retriever")
    g.add_edge("retriever", "thinker")
    g.add_edge("thinker",   "debater")
    g.add_edge("debater",   "evaluator")
    g.add_edge("evaluator", "inc_iter")

    g.add_conditional_edges("inc_iter", _route_after_eval, {
        "thinker":     "thinker",
        "synthesizer": "synthesizer",
    })

    g.add_edge("synthesizer", END)
    return g.compile()


# compiled singleton — import and call .ainvoke()
ars_graph = build_graph()


async def run_session(session_id: str, question: str, disabled_agents: list[str] | None = None) -> ARSState:
    await emit_session_status(session_id, "running")
    await emit_sys(SysEvent(session_id=session_id, t=0.0, log="session.init · graph snapshot restored"))

    initial: ARSState = {
        "session_id":         session_id,
        "question":           question,
        "required_concepts":  [],
        "strategy":           "",
        "retrieved_concepts": [],
        "claims":             [],
        "challenges":         [],
        "confidence":         0.0,
        "gaps":               [],
        "verdict":            "proceed",
        "final_answer":       "",
        "final_sources":      [],
        "iteration":          0,
        "max_iterations":     MAX_ITERATIONS,
        "disabled_agents":    disabled_agents or [],
    }

    final: ARSState = await ars_graph.ainvoke(initial)

    await emit_session_status(session_id, "complete")
    await emit_sys(SysEvent(
        session_id=session_id,
        t=elapsed(session_id),
        log=f"session.commit · {len(final.get('claims', []))} claims · confidence {int(final['confidence'] * 100)}%",
    ))

    log.info("session.complete", session_id=session_id, confidence=final["confidence"])
    return final
