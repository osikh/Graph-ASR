from dataclasses import dataclass, field

@dataclass
class EpisodicEntry:
    cycle: int
    resolved_claims: list[str] = field(default_factory=list)
    open_questions: list[str] = field(default_factory=list)
    contradictions: list[str] = field(default_factory=list)
    confidence_at: float = 0.0

_store: dict[str, list[EpisodicEntry]] = {}


def append(session_id: str, entry: EpisodicEntry) -> None:
    if session_id not in _store:
        _store[session_id] = []
    _store[session_id].append(entry)


def get_latest(session_id: str, n: int = 2) -> list[EpisodicEntry]:
    return _store.get(session_id, [])[-n:]


def get_all(session_id: str) -> list[EpisodicEntry]:
    return _store.get(session_id, [])


def clear(session_id: str) -> None:
    _store.pop(session_id, None)
