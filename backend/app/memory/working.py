from dataclasses import dataclass, field

@dataclass
class WorkingMemory:
    current_goal: str
    active_concepts: list[str] = field(default_factory=list)
    active_conflicts: list[str] = field(default_factory=list)
    current_iteration: int = 0
    confidence: float = 0.0

_store: dict[str, WorkingMemory] = {}


def init(session_id: str, goal: str, concepts: list[str]) -> None:
    _store[session_id] = WorkingMemory(
        current_goal=goal,
        active_concepts=concepts[:3],
    )


def update(session_id: str, **kwargs) -> None:
    wm = _store.get(session_id)
    if wm is None:
        return
    for k, v in kwargs.items():
        if hasattr(wm, k):
            setattr(wm, k, v)


def get(session_id: str) -> WorkingMemory | None:
    return _store.get(session_id)


def clear(session_id: str) -> None:
    _store.pop(session_id, None)
