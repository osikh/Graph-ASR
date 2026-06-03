<img src="sample_imgs/1.png" alt="Graph-ARS — Graph-Augmented Adaptive Reasoning System" width="100%" />

# Graph-Augmented Adaptive Reasoning System (Graph-ARS)

Multi-agent reasoning platform where a 9-agent LangGraph pipeline debates a question across multiple cycles, accumulates structured knowledge in Neo4j, and produces a confidence-weighted synthesised answer. Every agent call receives a token-budgeted context compiled from live graph traversal + compressed episodic memory — not raw conversation history.

> Most AI systems store memory as conversation history. Graph-ARS stores memory as evolving conceptual relationships.

---

## Why Graph-ARS Exists

Traditional LLM-based reasoning systems scale poorly with long reasoning chains. As context grows, they replay entire conversation histories into every prompt — causing token explosion, degraded reasoning quality, and hallucination amplification. The longer the chain, the worse the output.

Graph-ARS explores a different architecture: **persistent graph-based cognition** where context is dynamically reconstructed from structured memory instead of replayed from conversation logs.

The graph is not a side-effect of the reasoning. It **is** the memory system. Every concept, claim, contradiction, and knowledge gap is a node. Every relationship between them is an edge. When an agent needs context, it traverses the graph — it does not re-read a transcript.

This means:
- Reasoning quality does not degrade with session length
- Knowledge accumulates across sessions — later sessions bootstrap from prior ones
- Every inference is traceable to a graph path, not a buried prompt position

---

## Screenshots

<div align="center">
  <img src="sample_imgs/2.png" width="49%" />
  <img src="sample_imgs/3.png" width="49%" />
</div>

<div align="center">
  <img src="sample_imgs/4.png" width="98%" />
</div>


## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2, React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Orchestration | LangGraph 0.2, Pydantic 2 |
| Relational DB | PostgreSQL 16 (async via asyncpg + SQLAlchemy 2) |
| Graph DB | Neo4j 5.x |
| LLM | OpenAI-compatible API — LM Studio / llama.cpp / OpenRouter |
| Real-time | WebSocket (per-session event stream) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Frontend                                               │
│  ┌──────────┐  ┌─────────────────────────┐  ┌───────────────┐ │
│  │ LeftPanel│  │   WorkspaceCenter        │  │  RightPanel   │ │
│  │ (task,   │  │   AgentFeed / DebateView │  │  KnowledgeGraph│ │
│  │  agents) │  │   ReasoningTree          │  │  (SVG / live) │ │
│  └──────────┘  └─────────────────────────┘  └───────────────┘ │
│                       WebSocket  ↕  REST                        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI  /api/*                                                │
│  sessions · graph · analytics · health                          │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│  LangGraph Pipeline                                             │
│                                                                 │
│  planner → retriever → thinker → saint → dogmatist →           │
│  chronicler → debater → evaluator → compress → inc_iter         │
│       ↑                                           │             │
│       └── (confidence < conf_max, iter < 8) ─────┘             │
│                           ↓                                     │
│                       synthesizer                               │
└──────────────┬──────────────────────────────────────────────────┘
               │
     ┌─────────┴──────────┐
     ▼                    ▼
 PostgreSQL            Neo4j
 sessions              :Concept :Claim
 events                :Evidence :KnowledgeGap
                       :Answer :Question
```

---

## Agent Pipeline

| # | Agent | Role | Temperature |
|---|---|---|---|
| 1 | **Planner** | Decomposes question into ≤3 required concepts + strategy | 0.3 |
| 2 | **Retriever** | Graph-first concept lookup; LLM only for concepts absent from Neo4j | 0.2 |
| 3 | **Thinker** | Generates reasoning claims from compiled context | 0.5 |
| 4 | **Saint** | *Epistemic perspective:* ethical and spiritual reasoning framework — draws from cross-tradition peaceful texts (Gita, Quran, Bible, Tao Te Ching, Dhammapada) | 0.5 |
| 5 | **Dogmatist** | *Epistemic perspective:* internally consistent single-framework reasoning — identifies the most applicable tradition and argues strictly within it with cited logic | 0.6 |
| 6 | **Chronicler** | *Epistemic perspective:* cultural-memory and mythological narrative reasoning — Sumerian, Norse, Vedic, Mesoamerican, African, Celtic oral traditions | 0.7 |
| 7 | **Debater** | Stress-tests all claims across all perspectives; produces severity-ranked counter-arguments | 0.6 |
| 8 | **Evaluator** | Scores confidence (0–1), detects knowledge gaps, issues verdict | 0.2 |
| 9 | **Synthesizer** | Produces final answer from compiled reasoning chain | 0.4 |

Saint, Dogmatist, and Chronicler are **epistemic perspective agents** — each applies a distinct reasoning framework to the same question, creating productive adversarial tension. All three are individually toggleable per session; disabled agents are no-op pass-throughs in the graph.

The loop exits when `confidence × 100 ≥ conf_max` **or** `iteration ≥ 8`.

---

## Context Management Architecture

### The Core Innovation — Context Compiler

Most multi-agent systems pass the full state — every prior claim, every debate turn, every previous answer — into each agent's prompt. This is the same mistake as conversation replay, just inside an agent loop.

Graph-ARS solves this with a dedicated **Context Compiler** (`app/context_compiler/compiler.py`): a service that fires before every agent execution, traverses the knowledge graph, and assembles a compact, token-budgeted context object specific to that agent's role. Agents receive **only what is relevant to their next reasoning step** — nothing more.

This is not a summarisation trick. It is a retrieval architecture: the graph is the index, the compiler is the query engine.

```
agent is about to run
        ↓
Context Compiler fires
        ↓
5 parallel Neo4j queries (neighbors, dependencies, contradictions,
                          prior claims, cross-session concepts)
        ↓
merge + rank + budget (25% working mem / 40% graph / 20% episodic)
        ↓
agent receives compiled context dict — not history
        ↓
agent reasons, emits structured output
        ↓
Rolling Summarizer compresses cycle → EpisodicEntry
        ↓
verbose output discarded from active context
```

Agents never receive raw conversation history. The Compiler assembles a token-budgeted context object from four memory layers:

### Memory Layers

```
Layer 1 — Working Memory      (in-process, per-session dict)
  current_goal, active_concepts[:3], active_conflicts, iteration, confidence

Layer 2 — Episodic Memory     (in-process, per-session list)
  After each Evaluator pass → compress() extracts:
  resolved_claims, open_questions, contradictions, confidence_at

Layer 3 — Semantic Graph      (Neo4j — persistent across sessions)
  Nodes: :Concept :Claim :Evidence :KnowledgeGap :Answer :Question
  Edges: DEPENDS_ON SUPPORTS CONTRADICTS REQUIRED_FOR SUPPORTED_BY PART_OF

Layer 4 — Retrieval Memory    (dynamic, assembled per-call)
  5 parallel Cypher queries → merged into compiled context
```

### Context Compiler (`app/context_compiler/compiler.py`)

```python
async def build(session_id, agent_role, state) -> dict:
    # fires all 5 queries in parallel
    neighbors, deps, contras, prior_claims, cross = await asyncio.gather(
        get_neighbors(session_id, concepts, limit=4),
        get_dependencies(session_id, concepts, limit=3),
        get_contradictions(session_id, limit=3),
        get_prior_claims(session_id, limit=4),
        get_cross_session_concepts(concepts, exclude_session=session_id, limit=2),
    )
    # returns:
    # { agent_role, goal, active_concepts[:3], relevant_claims[:3],
    #   open_conflicts[:3], retrieved_evidence[:5], episodic_summary }
```

**Token budget per agent call:**
- 15% system prompt
- 25% working memory
- 40% retrieved knowledge (graph)
- 20% episodic summary

### Retriever — Graph-First Strategy

```
1. get_cross_session_concepts(concepts) → check long-term Neo4j memory
2. missing = [c for c in concepts if not covered by graph hits]
3. LLM called ONLY for missing concepts
4. All graph hits are upserted into current session (composite constraint)
5. Edges created within session — upsert_edge always uses same session_id
```

Neo4j uses **composite uniqueness** `REQUIRE (n.id, n.session_id) IS UNIQUE` so the same concept can exist across multiple sessions.

### Rolling Summarizer (`app/summarization/summarizer.py`)

Fires after every Evaluator pass via a dedicated `compress` node in the LangGraph graph:

```
claims with no medium/high challenge → resolved_claims
knowledge gaps from state            → open_questions
high-severity challenge counters     → contradictions
```

Output is an `EpisodicEntry` appended to in-memory episodic store AND serialised into `state["episodic_summary"]` for the Synthesizer.

---

## Neo4j Schema

```cypher
-- Node types
(:Question  {id, session_id, label})
(:Concept   {id, session_id, label, description})
(:Claim     {id, session_id, label})
(:Evidence  {id, session_id, label})
(:KnowledgeGap {id, session_id, label})
(:Answer    {id, session_id, label})

-- Relationships
(:Concept)-[:DEPENDS_ON]->(:Concept)
(:Concept)-[:REQUIRED_FOR]->(:Question)
(:Claim)-[:DEPENDS_ON]->(:Concept)
(:Claim)-[:CONTRADICTS]->(:Claim)
(:Claim)-[:SUPPORTED_BY]->(:Evidence)
(:Concept)-[:RELATED_TO|SUPPORTS|PART_OF]->(:Concept)
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create session `{ question }` |
| `GET` | `/api/sessions` | List sessions (latest 20) |
| `GET` | `/api/sessions/{id}` | Session metadata |
| `POST` | `/api/sessions/{id}/run` | Start reasoning `{ disabled_agents, conf_min, conf_max }` |
| `DELETE` | `/api/sessions/{id}` | Delete session + Neo4j graph |
| `GET` | `/api/sessions/{id}/events` | Persisted agent events (post-session) |
| `GET` | `/api/sessions/{id}/graph` | Session-scoped Neo4j snapshot |
| `WS` | `/api/sessions/{id}/ws` | Real-time event stream |
| `GET` | `/api/graph` | Full cross-session knowledge graph |
| `GET` | `/api/analytics` | Aggregated stats (confidence trend, agent load, graph growth) |

### WebSocket event types

```
agent_event       → AgentEvent (agent, kind, title, lines, t)
sys_event         → { log, t }
confidence_update → { value: 0–100, t }
graph_update      → { node? { id, label, type }, edge? { from_id, to_id, type } }
session_status    → { status: running | complete | failed }
```

### RunRequest body

```json
{
  "disabled_agents": ["saint", "dogmatist"],
  "conf_min": 30.0,
  "conf_max": 85.0
}
```

---

## Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 16
- Neo4j 5.x (Desktop or server)
- One of: LM Studio, llama.cpp server, or OpenRouter API key

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env   # then fill in credentials
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

---

## Configuration (`backend/.env`)

```env
# LLM provider: lmstudio | llamacpp | openrouter
LLM_PROVIDER=lmstudio
LLM_MODEL=local-model          # model name as the provider reports it
LLM_API_KEY=                   # required for openrouter; ignored for local providers
LLM_API_BASE=                  # override default provider URL if needed

# PostgreSQL
POSTGRES_URL=postgresql+asyncpg://user:pass@localhost:5432/arsdb

# Neo4j
NEO4J_URI=neo4j://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# App
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

**Provider base URLs (defaults):**
- LM Studio → `http://localhost:1234/v1`
- llama.cpp → `http://localhost:8080/v1`
- OpenRouter → `https://openrouter.ai/api/v1`

Only OpenRouter supports `response_format: json_object`. Local providers receive plain-text prompts with explicit JSON instructions.

---

## Session Lifecycle

```
createSession()           → POST /api/sessions        → Postgres row (pending)
connectWs(id)             → WS /api/sessions/{id}/ws  → event stream open
runSession(id, ...)       → POST /api/sessions/{id}/run → background task starts
  working.init()
  LangGraph pipeline runs
  Each agent emits → WebSocket broadcast + _event_buffer append
  compress node → EpisodicEntry + state update
  session complete/failed → _flush_events() → EventRow batch insert → db.commit()
```

On page refresh, `SessionProvider` calls `listSessions()` on mount, detects any `running` session, reconnects the WebSocket, and loads the partial Neo4j graph.

---