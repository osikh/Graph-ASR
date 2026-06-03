from __future__ import annotations
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


# ── Events ────────────────────────────────────────────────────────────────────

class AgentEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4())[:8])
    session_id: str
    t: float                        # seconds since session start
    agent: str
    kind: str                       # think | plan | retrieve | claim | warning | success | debate | answer
    title: str
    lines: list[str]
    log: str
    gap: dict[str, str] | None = None
    tag: str | None = None          # validated | claim
    sources: list[str] | None = None
    against: str | None = None      # id of the event this debates

class SysEvent(BaseModel):
    session_id: str
    t: float
    log: str


# ── Graph nodes / edges ───────────────────────────────────────────────────────

class GraphNodeCreate(BaseModel):
    node_id: str
    label: str
    sub: str | None = None
    type: str                       # concept | evidence | claim | gap | answer
    x: float = 0.5
    y: float = 0.5
    r: int = 16

class GraphEdgeCreate(BaseModel):
    from_id: str
    to_id: str
    type: str                       # depends | supports | evidence | gap | resolves | contradicts


# ── Sessions ─────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    question: str

class SessionResponse(BaseModel):
    id: str
    question: str
    status: str                     # pending | running | complete | failed
    confidence: float
    node_count: int
    edge_count: int
    created_at: datetime

class RunRequest(BaseModel):
    session_id: str
    disabled_agents: list[str] = []


# ── LLM / reasoning ──────────────────────────────────────────────────────────

class PlannerOutput(BaseModel):
    required_concepts: list[str]
    strategy: str

class Claim(BaseModel):
    id: str = Field(default_factory=lambda: f"c{str(uuid4())[:6]}")
    text: str
    confidence: float = 0.5
    agent: str
    tag: str | None = None          # validated | contradicted

class KnowledgeGap(BaseModel):
    id: str = Field(default_factory=lambda: f"g{str(uuid4())[:6]}")
    concept_a: str
    concept_b: str
    description: str
    resolved: bool = False

class EvaluatorOutput(BaseModel):
    confidence: float
    gaps: list[KnowledgeGap]
    verdict: str                    # proceed | retry | done

class SynthesizerOutput(BaseModel):
    answer: str
    sources: list[str]
    confidence: float
