from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.postgres import SessionRow, EventRow

ALL_AGENTS = ["planner", "retriever", "thinker", "saint", "dogmatist",
              "chronicler", "debater", "evaluator", "synthesizer"]


async def get_analytics(db: AsyncSession) -> dict:
    sessions_result = await db.execute(
        select(SessionRow).order_by(SessionRow.created_at.asc())
    )
    sessions = list(sessions_result.scalars().all())

    completed = [s for s in sessions if s.status == "complete"]
    total = len(sessions)

    avg_conf = (sum(s.confidence for s in completed) / len(completed) * 100) if completed else 0

    recent = completed[-3:]
    recent_avg = (sum(s.confidence for s in recent) / len(recent) * 100) if recent else avg_conf
    conf_delta = round(recent_avg - avg_conf, 1)

    conf_trend = [round(s.confidence * 100, 1) for s in completed] or [0]

    cumulative_nodes, cumulative_edges = 0, 0
    graph_growth, edge_growth = [], []
    for s in sessions:
        cumulative_nodes += s.node_count
        cumulative_edges += s.edge_count
        graph_growth.append(cumulative_nodes)
        edge_growth.append(cumulative_edges)

    agent_result = await db.execute(
        select(EventRow.agent, func.count(EventRow.id).label("calls"))
        .group_by(EventRow.agent)
    )
    agent_map = {r.agent: r.calls for r in agent_result.all()}
    agent_load = [{"id": a, "calls": agent_map.get(a, 0)} for a in ALL_AGENTS]

    last_session = sessions[-1] if sessions else None

    return {
        "total_sessions": total,
        "completed_sessions": len(completed),
        "cards": [
            {
                "label": "Avg confidence",
                "value": f"{round(avg_conf, 1)}%",
                "delta": f"{'+' if conf_delta >= 0 else ''}{conf_delta}",
                "good": conf_delta >= 0,
                "spark": conf_trend,
            },
            {
                "label": "Sessions run",
                "value": str(total),
                "delta": f"{len(completed)} complete",
                "good": True,
                "spark": list(range(1, total + 1)) or [0],
            },
            {
                "label": "Knowledge nodes",
                "value": str(cumulative_nodes),
                "delta": f"+{last_session.node_count if last_session else 0} last session",
                "good": True,
                "spark": graph_growth or [0],
            },
            {
                "label": "Graph edges",
                "value": str(cumulative_edges),
                "delta": f"+{last_session.edge_count if last_session else 0} last session",
                "good": True,
                "spark": edge_growth or [0],
            },
        ],
        "agent_load": agent_load,
        "graph_growth": graph_growth or [0],
        "conf_trend": conf_trend,
    }
