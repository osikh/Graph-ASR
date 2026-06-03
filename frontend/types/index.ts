export type AgentId = "planner" | "retriever" | "thinker" | "debater" | "evaluator" | "synthesizer";

export type NodeType = "concept" | "evidence" | "claim" | "gap" | "answer";
export type EdgeType = "depends" | "supports" | "evidence" | "gap" | "resolves" | "contradicts";
export type EventKind = "think" | "plan" | "retrieve" | "claim" | "warning" | "success" | "debate" | "answer";

export interface Agent {
  id: AgentId;
  name: string;
  color: string;
  glyph: string;
  role: string;
}

export interface GraphNode {
  id: string;
  label: string;
  sub?: string;
  type: NodeType;
  x: number;
  y: number;
  t: number;
  r?: number;
  contradictedAt?: number;
  validatedAt?: number;
  resolvedAt?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
  t: number;
}

export interface ConfidencePoint {
  t: number;
  v: number;
}

export interface GapRef {
  a: string;
  b: string;
  text: string;
}

export interface AgentEvent {
  id: string;
  t: number;
  agent: AgentId;
  kind: EventKind;
  title: string;
  lines: string[];
  log: string;
  gap?: GapRef;
  tag?: "validated" | "claim";
  sources?: string[];
  against?: string;
  confidenceNote?: string;
}

export interface SysLog {
  t: number;
  agent: "system";
  log: string;
}

export interface Session {
  id: string;
  title: string;
  query: string;
  date: string;
  confidence: number;
  nodes: number;
  edges: number;
  gaps: [number, number];
  agents: number;
  duration: string;
  status: "complete" | "gap";
  active?: boolean;
}

export interface AnalyticsCard {
  label: string;
  value: string;
  delta: string;
  good: boolean;
  spark: number[];
}

export interface Analytics {
  cards: AnalyticsCard[];
  graphGrowth: number[];
  agentLoad: { id: AgentId; calls: number }[];
}

export type PageId = "workspace" | "knowledge" | "sessions" | "analytics" | "home";

export type NodeState = "normal" | "gap" | "resolved" | "contradicted" | "validated";
