from typing import TypedDict
from app.models.schemas import Claim, KnowledgeGap


class ARSState(TypedDict):
    session_id: str
    question: str

    # set by planner
    required_concepts: list[str]
    strategy: str

    # built up by retriever + thinker
    retrieved_concepts: list[dict]   # {id, label, description}
    claims: list[Claim]

    # filled by debater
    challenges: list[dict]           # {claim_id, counter, severity}

    # filled by evaluator
    confidence: float
    gaps: list[KnowledgeGap]
    verdict: str                     # proceed | retry | done

    # filled by synthesizer
    final_answer: str
    final_sources: list[str]

    # bookkeeping
    iteration: int
    max_iterations: int
