import time
from app.websocket.manager import ws_manager
from app.models.schemas import AgentEvent, SysEvent
import structlog

log = structlog.get_logger()

# tracks session start timestamps to compute relative `t`
_start_times: dict[str, float] = {}


def session_started(session_id: str) -> None:
    _start_times[session_id] = time.monotonic()


def elapsed(session_id: str) -> float:
    start = _start_times.get(session_id, time.monotonic())
    return round(time.monotonic() - start, 2)


async def emit(event: AgentEvent) -> None:
    payload = {"type": "agent_event", **event.model_dump()}
    await ws_manager.broadcast(event.session_id, payload)
    log.info("event.emitted", agent=event.agent, kind=event.kind, title=event.title)


async def emit_sys(event: SysEvent) -> None:
    payload = {"type": "sys_event", **event.model_dump()}
    await ws_manager.broadcast(event.session_id, payload)


async def emit_graph_update(session_id: str, node: dict | None = None, edge: dict | None = None) -> None:
    payload = {"type": "graph_update", "session_id": session_id, "node": node, "edge": edge}
    await ws_manager.broadcast(session_id, payload)


async def emit_confidence(session_id: str, value: float) -> None:
    payload = {"type": "confidence_update", "session_id": session_id, "value": value, "t": elapsed(session_id)}
    await ws_manager.broadcast(session_id, payload)


async def emit_session_status(session_id: str, status: str) -> None:
    payload = {"type": "session_status", "session_id": session_id, "status": status}
    await ws_manager.broadcast(session_id, payload)
