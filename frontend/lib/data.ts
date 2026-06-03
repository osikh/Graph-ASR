import type { Agent, AgentId, GraphNode, GraphEdge, ConfidencePoint, AgentEvent, SysLog, Session, Analytics } from "@/types";

export const DURATION = 46;

export const AGENTS: Agent[] = [
  { id: "planner",     name: "Planner",     color: "var(--c-blue)",   glyph: "◇", role: "Decomposes the query into required concepts and a retrieval plan." },
  { id: "retriever",   name: "Retriever",   color: "var(--c-cyan)",   glyph: "⤓", role: "Pulls concepts & evidence from the knowledge graph and external sources." },
  { id: "thinker",     name: "Thinker",     color: "var(--c-purple)", glyph: "✶", role: "Forms hypotheses and chains of reasoning over retrieved knowledge." },
  { id: "debater",     name: "Debater",     color: "var(--c-orange)", glyph: "⇄", role: "Stress-tests claims, surfaces counter-arguments and edge cases." },
  { id: "evaluator",   name: "Evaluator",   color: "var(--c-green)",  glyph: "✓", role: "Scores reasoning, detects gaps & contradictions, gates the answer." },
  { id: "synthesizer", name: "Synthesizer", color: "var(--c-pink)",   glyph: "❖", role: "Composes the final, sourced answer from validated reasoning." },
];

export const AGENT: Record<AgentId, Agent> = Object.fromEntries(AGENTS.map(a => [a.id, a])) as Record<AgentId, Agent>;

export const NODES: GraphNode[] = [
  { id: "gravity", label: "Surface Gravity", sub: "g",              type: "concept",   x: 0.50, y: 0.46, t: 2,  r: 26 },
  { id: "G",       label: "Grav. Constant",  sub: "G = 6.674e-11", type: "concept",   x: 0.50, y: 0.16, t: 8,  r: 18 },
  { id: "mass",    label: "Mass",            sub: "M",              type: "concept",   x: 0.24, y: 0.34, t: 6,  r: 20 },
  { id: "law",     label: "Newton's Law",    sub: "F = GMm/r²",    type: "concept",   x: 0.34, y: 0.78, t: 11, r: 18 },
  { id: "earthM",  label: "Earth mass",      sub: "5.97e24 kg",    type: "evidence",  x: 0.085,y: 0.18, t: 12, r: 14 },
  { id: "moonM",   label: "Moon mass",       sub: "7.35e22 kg",    type: "evidence",  x: 0.075,y: 0.50, t: 13, r: 14 },
  { id: "claim1",  label: "g depends on mass only", sub: "hypothesis", type: "claim", x: 0.27, y: 0.60, t: 14, r: 16, contradictedAt: 31 },
  { id: "gap",     label: "radius ↔ gravity", sub: "missing relation", type: "gap",  x: 0.78, y: 0.62, t: 15, r: 17, resolvedAt: 24 },
  { id: "radius",  label: "Radius",          sub: "r",              type: "concept",   x: 0.74, y: 0.34, t: 19, r: 20 },
  { id: "earthR",  label: "Earth radius",    sub: "6,371 km",      type: "evidence",  x: 0.92, y: 0.17, t: 22, r: 14 },
  { id: "moonR",   label: "Moon radius",     sub: "1,737 km",      type: "evidence",  x: 0.93, y: 0.45, t: 23, r: 14 },
  { id: "formula", label: "g = G·M / r²",   sub: "validated",     type: "claim",     x: 0.62, y: 0.78, t: 30, r: 19, validatedAt: 31 },
  { id: "answer",  label: "Moon g ≈ 1.62 m/s²", sub: "≈ 1/6 of Earth", type: "answer", x: 0.66, y: 0.9, t: 42, r: 16 },
];

export const EDGES: GraphEdge[] = [
  { from: "mass",    to: "gravity", type: "depends",    t: 7  },
  { from: "G",       to: "gravity", type: "depends",    t: 9  },
  { from: "law",     to: "gravity", type: "supports",   t: 11 },
  { from: "earthM",  to: "mass",    type: "evidence",   t: 12 },
  { from: "moonM",   to: "mass",    type: "evidence",   t: 13 },
  { from: "claim1",  to: "gravity", type: "supports",   t: 14 },
  { from: "gap",     to: "gravity", type: "gap",        t: 15 },
  { from: "radius",  to: "gravity", type: "depends",    t: 19 },
  { from: "radius",  to: "gap",     type: "resolves",   t: 24 },
  { from: "earthR",  to: "radius",  type: "evidence",   t: 22 },
  { from: "moonR",   to: "radius",  type: "evidence",   t: 23 },
  { from: "mass",    to: "formula", type: "depends",    t: 30 },
  { from: "radius",  to: "formula", type: "depends",    t: 30 },
  { from: "G",       to: "formula", type: "depends",    t: 30 },
  { from: "formula", to: "claim1",  type: "contradicts",t: 31 },
  { from: "formula", to: "answer",  type: "supports",   t: 42 },
];

export const CONFIDENCE: ConfidencePoint[] = [
  { t: 1, v: 42 }, { t: 9, v: 49 }, { t: 14, v: 53 },
  { t: 15, v: 46 }, { t: 24, v: 63 }, { t: 27, v: 69 },
  { t: 31, v: 79 }, { t: 38, v: 86 }, { t: 42, v: 91 },
];

export const EVENTS: AgentEvent[] = [
  { id: "e1", t: 1, agent: "planner", kind: "think", title: "Decomposing query",
    lines: ["Goal → explain the difference in gravity between Earth and the Moon.", "Strategy: identify governing relation, then required quantities."],
    log: "planner.start · query decomposed" },
  { id: "e2", t: 4, agent: "planner", kind: "plan", title: "Concept requirements",
    lines: ["Required concepts:", "• surface gravity (g)", "• mass (M)", "• radius (r)", "• gravitational constant (G)"],
    log: "planner · 4 concept slots opened" },
  { id: "e3", t: 6, agent: "retriever", kind: "retrieve", title: "Knowledge lookup",
    lines: ['query graph_store := ["mass", "Newton\'s law of gravitation"]'],
    log: "retrieval initiated" },
  { id: "e4", t: 9, agent: "retriever", kind: "retrieve", title: "Retrieved 2 concepts",
    lines: ["✓ Mass (M) — bound", "✓ Newton's Law of Gravitation — bound", "Gravitational constant G resolved from constants table."],
    log: "graph updated · +3 nodes" },
  { id: "e5", t: 12, agent: "retriever", kind: "retrieve", title: "Evidence bound to Mass",
    lines: ["Earth → 5.97 × 10²⁴ kg", "Moon  → 7.35 × 10²² kg", "Earth is ≈ 81× more massive."],
    log: "graph updated · evidence linked" },
  { id: "e6", t: 14, agent: "thinker", kind: "claim", title: "Initial hypothesis",
    lines: ["The Moon is far less massive than Earth, therefore its gravity is weaker."],
    tag: "claim", log: "thinker · hypothesis emitted" },
  { id: "e7", t: 15, agent: "evaluator", kind: "warning", title: "Reasoning incomplete",
    lines: ["Claim accounts for mass but ignores radius.", "Surface gravity g = G·M / r² — the r term is unaccounted for."],
    gap: { a: "radius", b: "gravity", text: "No relation found between radius ↔ gravity strength." },
    log: "⚠ knowledge gap detected: radius ↔ gravity" },
  { id: "e8", t: 18, agent: "debater", kind: "debate", title: "Counter-argument",
    against: "e6",
    lines: ["Radius also changes field strength — g ∝ 1/r².", "A smaller body can have *higher* surface gravity. Mass alone is not decisive."],
    log: "debater · challenges claim #1" },
  { id: "e9", t: 20, agent: "planner", kind: "plan", title: "Re-planning",
    lines: ["Hypothesis insufficient. Retrieve radii and recompute with the full relation."],
    log: "planner · re-plan triggered" },
  { id: "e10", t: 22, agent: "retriever", kind: "retrieve", title: "Retrieving radii",
    lines: ["Earth → 6,371 km", "Moon  → 1,737 km", "Earth radius ≈ 3.7× larger."],
    log: "graph updated · radius branch expanded" },
  { id: "e11", t: 24, agent: "evaluator", kind: "success", title: "Knowledge gap resolved",
    lines: ["radius ↔ gravity relationship established via g = G·M/r².", "Gap closed; reasoning can proceed."],
    log: "✓ gap resolved · radius ↔ gravity" },
  { id: "e12", t: 27, agent: "thinker", kind: "think", title: "Synthesising the relation",
    lines: ["g = G · M / r²", "Substitute both bodies and compare ratios."],
    log: "thinker · combining mass + radius" },
  { id: "e13", t: 30, agent: "thinker", kind: "claim", title: "Computation",
    lines: ["Earth: g = 6.674e-11 · 5.97e24 / (6.371e6)² ≈ 9.81 m/s²", "Moon:  g = 6.674e-11 · 7.35e22 / (1.737e6)² ≈ 1.62 m/s²"],
    tag: "validated", log: "thinker · result computed" },
  { id: "e14", t: 31, agent: "evaluator", kind: "success", title: "Contradiction resolved",
    lines: ['Claim #1 ("mass only") is contradicted by g = G·M/r².', "Validated relation supersedes the naive hypothesis."],
    log: "✓ contradiction resolved" },
  { id: "e15", t: 34, agent: "debater", kind: "debate", title: "Concession",
    against: "e8",
    lines: ["Conceded. Here mass dominates: 81× mass vs (3.7×)² ≈ 13.7× radius penalty.", "Net advantage ≈ 6× for Earth."],
    log: "debater · concedes · net ≈ 6×" },
  { id: "e16", t: 38, agent: "evaluator", kind: "success", title: "Cross-check",
    lines: ["g_Earth / g_Moon = 9.81 / 1.62 ≈ 6.05", "Matches the known result: Moon gravity ≈ 1/6 g."],
    log: "✓ cross-check passed · ratio 6.05" },
  { id: "e17", t: 42, agent: "synthesizer", kind: "answer", title: "Final answer",
    lines: ["Gravity differs because surface gravity depends on BOTH mass and radius: g = G·M / r².",
            "Earth is ~81× more massive than the Moon — alone that makes Earth's gravity 81× stronger.",
            "But Earth's radius is ~3.7× larger, which alone weakens its surface gravity ~13.7×.",
            "Net effect: Earth's surface gravity (9.81 m/s²) is ≈ 6× the Moon's (1.62 m/s²)."],
    sources: ["Newton's Law of Gravitation", "Mass · Earth/Moon", "Radius · Earth/Moon"],
    log: "✓ answer synthesised · confidence 91%" },
];

export const SYS_LOGS: SysLog[] = [
  { t: 0.2,  agent: "system", log: "session.init · graph snapshot restored" },
  { t: 2.0,  agent: "system", log: "graph · root concept anchored" },
  { t: 16.5, agent: "system", log: "graph · gap node flagged (orange)" },
  { t: 41,   agent: "system", log: "evaluator · answer gate OPEN" },
  { t: 45,   agent: "system", log: "session.commit · 13 nodes · 16 edges" },
];

export const SESSIONS: Session[] = [
  { id: "s-active", title: "Why is gravity different on Earth and the Moon?", query: "Why is gravity different on Earth and the Moon?",
    date: "Now", confidence: 91, nodes: 13, edges: 16, gaps: [1, 1], agents: 6, duration: "46s", status: "complete", active: true },
  { id: "s2", title: "Does adding salt make water boil faster?", query: "Does adding salt to water make it boil faster?",
    date: "2h ago", confidence: 88, nodes: 11, edges: 14, gaps: [2, 2], agents: 5, duration: "39s", status: "complete" },
  { id: "s3", title: "Why do leaves change colour in autumn?", query: "Why do leaves change colour in autumn?",
    date: "Yesterday", confidence: 84, nodes: 15, edges: 19, gaps: [3, 2], agents: 6, duration: "61s", status: "gap" },
  { id: "s4", title: "Can a plane fly faster than its own sound?", query: "How does a plane break the sound barrier?",
    date: "Yesterday", confidence: 79, nodes: 12, edges: 15, gaps: [2, 2], agents: 5, duration: "44s", status: "complete" },
  { id: "s5", title: "Is the spiciness of a chilli measurable?", query: "How is the spiciness of chilli peppers measured?",
    date: "2 days ago", confidence: 93, nodes: 9, edges: 11, gaps: [1, 1], agents: 4, duration: "28s", status: "complete" },
  { id: "s6", title: "Why is the sky blue but sunsets red?", query: "Why is the sky blue but sunsets red?",
    date: "3 days ago", confidence: 72, nodes: 14, edges: 17, gaps: [4, 2], agents: 6, duration: "57s", status: "gap" },
  { id: "s7", title: "What makes superglue bond instantly?", query: "What makes superglue bond so quickly?",
    date: "5 days ago", confidence: 90, nodes: 10, edges: 12, gaps: [1, 1], agents: 5, duration: "33s", status: "complete" },
];

export const ANALYTICS: Analytics = {
  cards: [
    { label: "Avg. confidence", value: "85.3%", delta: "+4.1", good: true, spark: [42, 49, 53, 46, 63, 69, 79, 86, 91] },
    { label: "Hallucination rate", value: "1.8%", delta: "-0.6", good: true, spark: [4.1, 3.6, 3.2, 2.9, 2.4, 2.1, 1.9, 1.8] },
    { label: "Retrievals / session", value: "7.4", delta: "+1.2", good: true, spark: [5, 6, 5, 7, 6, 8, 7, 7] },
    { label: "Gap resolution", value: "78%", delta: "+9", good: true, spark: [55, 60, 58, 66, 70, 72, 75, 78] },
  ],
  graphGrowth: [4, 5, 7, 8, 9, 11, 12, 13],
  agentLoad: [
    { id: "planner", calls: 3 }, { id: "retriever", calls: 4 }, { id: "thinker", calls: 4 },
    { id: "debater", calls: 2 }, { id: "evaluator", calls: 5 }, { id: "synthesizer", calls: 1 },
  ],
};
