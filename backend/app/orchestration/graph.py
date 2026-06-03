from langgraph.graph import StateGraph, END
from app.orchestration.state import ARSState
from app.agents.planner import run_planner
from app.agents.retriever import run_retriever
from app.agents.thinker import run_thinker
from app.agents.saint import run_saint
from app.agents.dogmatist import run_dogmatist
from app.agents.chronicler import run_chronicler
from app.agents.debater import run_debater
from app.agents.evaluator import run_evaluator
from app.agents.synthesizer import run_synthesizer
from app.events.emitter import emit_session_status, emit_sys, emit_graph_update, elapsed
from app.models.schemas import SysEvent
from app.db import neo4j as graph_db
from app.memory import working
from app.summarization import summarizer
import structlog

log = structlog.get_logger()

MAX_ITERATIONS = 8


def _route_after_eval(state: ARSState) -> str:
    conf_pct = state["confidence"] * 100
    if conf_pct >= state["conf_max"]:
        return "synthesizer"
    if state["iteration"] >= state["max_iterations"]:
        log.warning("graph.max_iterations_reached", session_id=state["session_id"], confidence=conf_pct)
        return "synthesizer"
    return "saint"


def _increment_iteration(state: ARSState) -> ARSState:
    return {**state, "iteration": state["iteration"] + 1}


def _compress_cycle(state: ARSState) -> ARSState:
    entry = summarizer.compress(state["session_id"], state)
    ep = {
        "cycle": entry.cycle,
        "resolved_claims": entry.resolved_claims,
        "open_questions": entry.open_questions,
        "contradictions": entry.contradictions,
        "confidence_at": entry.confidence_at,
    }
    return {**state, "episodic_summary": (state.get("episodic_summary") or []) + [ep]}


def build_graph() -> StateGraph:
    g = StateGraph(ARSState)

    g.add_node("planner",     run_planner)
    g.add_node("retriever",   run_retriever)
    g.add_node("thinker",     run_thinker)
    g.add_node("saint",       run_saint)
    g.add_node("dogmatist",   run_dogmatist)
    g.add_node("chronicler",  run_chronicler)
    g.add_node("debater",     run_debater)
    g.add_node("evaluator",   run_evaluator)
    g.add_node("compress",    _compress_cycle)
    g.add_node("inc_iter",    _increment_iteration)
    g.add_node("synthesizer", run_synthesizer)

    g.set_entry_point("planner")
    g.add_edge("planner",    "retriever")
    g.add_edge("retriever",  "thinker")
    g.add_edge("thinker",    "saint")
    g.add_edge("saint",      "dogmatist")
    g.add_edge("dogmatist",  "chronicler")
    g.add_edge("chronicler", "debater")
    g.add_edge("debater",    "evaluator")
    g.add_edge("evaluator",  "compress")
    g.add_edge("compress",   "inc_iter")

    g.add_conditional_edges("inc_iter", _route_after_eval, {
        "saint":       "saint",
        "synthesizer": "synthesizer",
    })

    g.add_edge("synthesizer", END)
    return g.compile()


# compiled singleton — import and call .ainvoke()
ars_graph = build_graph()


async def run_session(session_id: str, question: str, disabled_agents: list[str] | None = None, conf_min: float = 30.0, conf_max: float = 90.0) -> ARSState:
    await emit_session_status(session_id, "running")
    await emit_sys(SysEvent(session_id=session_id, t=0.0, log="session.init · graph snapshot restored"))

    working.init(session_id, question, [])

    q_node_id = f"q_{session_id[:8]}"
    await graph_db.upsert_node(session_id, q_node_id, question[:80], "question")
    await emit_graph_update(session_id, node={"id": q_node_id, "label": question[:80], "type": "question"})

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
        "episodic_summary":   [],
        "iteration":          0,
        "max_iterations":     MAX_ITERATIONS,
        "disabled_agents":    disabled_agents or [],
        "conf_min":           conf_min,
        "conf_max":           conf_max,
    }

    final: ARSState = await ars_graph.ainvoke(initial)
    working.clear(session_id)

    await emit_session_status(session_id, "complete")
    await emit_sys(SysEvent(
        session_id=session_id,
        t=elapsed(session_id),
        log=f"session.commit · {len(final.get('claims', []))} claims · confidence {int(final['confidence'] * 100)}%",
    ))

    log.info("session.complete", session_id=session_id, confidence=final["confidence"])
    return final
