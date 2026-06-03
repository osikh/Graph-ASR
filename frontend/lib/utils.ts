import { CONFIDENCE, EVENTS, NODES } from "@/lib/data";
import type { GraphNode, NodeState } from "@/types";

export function clock(t: number): string {
  const base = 12 * 3600 + 3 * 60;
  const s = Math.floor(base + t);
  const hh = String(Math.floor(s / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor(s / 60) % 60).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function confAt(t: number): number {
  const C = CONFIDENCE;
  if (t <= C[0].t) return C[0].v;
  for (let i = 0; i < C.length - 1; i++) {
    if (t >= C[i].t && t <= C[i + 1].t) {
      const f = (t - C[i].t) / (C[i + 1].t - C[i].t);
      return C[i].v + f * (C[i + 1].v - C[i].v);
    }
  }
  return C[C.length - 1].v;
}

export function nodeState(n: GraphNode, t: number): NodeState {
  if (n.type === "gap") return (n.resolvedAt && t >= n.resolvedAt) ? "resolved" : "gap";
  if (n.contradictedAt && t >= n.contradictedAt) return "contradicted";
  if (n.validatedAt && t >= n.validatedAt) return "validated";
  return "normal";
}

export function activeAgent(t: number): string | null {
  const past = EVENTS.filter(e => e.t <= t);
  if (!past.length) return null;
  const last = past[past.length - 1];
  return (t - last.t < 2.6) ? last.agent : null;
}

export function visibleNodeCount(t: number): number {
  return NODES.filter(n => t >= n.t).length;
}
