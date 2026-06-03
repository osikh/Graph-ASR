"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { NODES, EDGES } from "@/lib/data";
import { nodeState } from "@/lib/utils";
import type { GraphNode, NodeState } from "@/types";

export const TYPE_META: Record<string, { color: string; label: string }> = {
  concept:  { color: "var(--c-blue)",   label: "Concept" },
  evidence: { color: "var(--c-cyan)",   label: "Evidence" },
  claim:    { color: "var(--c-purple)", label: "Claim" },
  gap:      { color: "var(--c-orange)", label: "Knowledge gap" },
  answer:   { color: "var(--c-green)",  label: "Answer" },
};

export const EDGE_META: Record<string, { color: string; dash: string; label: string }> = {
  depends:     { color: "var(--c-blue)",   dash: "0",   label: "depends on" },
  supports:    { color: "var(--c-green)",  dash: "0",   label: "supports" },
  evidence:    { color: "var(--c-cyan)",   dash: "0",   label: "evidence" },
  gap:         { color: "var(--c-orange)", dash: "5 5", label: "missing" },
  resolves:    { color: "var(--c-green)",  dash: "0",   label: "resolves" },
  contradicts: { color: "var(--c-red)",    dash: "5 4", label: "contradicts" },
};

interface Props {
  t: number;
  selected: string | null;
  onSelect: (id: string | null) => void;
  mini?: boolean;
}

function nodeColor(n: GraphNode, st: NodeState): string {
  if (st === "contradicted") return "var(--c-red)";
  if (st === "resolved" || st === "validated") return "var(--c-green)";
  return TYPE_META[n.type].color;
}

function nodeGlyph(n: GraphNode, st: NodeState): string {
  if (n.type === "gap" && st === "gap") return "!";
  if (n.type === "answer") return "★";
  if (n.type === "evidence") return "·";
  if (st === "contradicted") return "✕";
  if (st === "validated") return "✓";
  return "";
}

export default function KnowledgeGraph({ t, selected, onSelect, mini = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 600, h: 420 });

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setDim({ w: Math.max(220, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const pad = mini ? 30 : 46;
  const { w, h } = dim;

  const pos = useMemo(() => {
    const m: Record<string, { x: number; y: number }> = {};
    NODES.forEach(n => { m[n.id] = { x: pad + n.x * (w - 2 * pad), y: pad + n.y * (h - 2 * pad) }; });
    return m;
  }, [w, h, pad]);

  const visNodes = NODES.filter(n => t >= n.t);
  const visEdges = EDGES.filter(e => t >= e.t && pos[e.from] && pos[e.to]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0 }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        <defs>
          <filter id="kg-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g>
          {visEdges.map((e, i) => {
            const a = pos[e.from], b = pos[e.to];
            const meta = EDGE_META[e.type];
            const solid = meta.dash === "0";
            const draw = solid ? Math.min(1, Math.max(0, (t - e.t) / 0.7)) : 1;
            const hi = selected === e.from || selected === e.to;
            return (
              <line
                key={`${e.from}-${e.to}-${i}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={meta.color}
                strokeWidth={hi ? 2 : 1.2}
                pathLength="1"
                strokeDasharray={solid ? "1" : meta.dash}
                strokeDashoffset={solid ? String(1 - draw) : "0"}
                style={{ opacity: hi ? 0.95 : (selected ? 0.18 : (solid ? 0.5 : 0.6)) }}
              />
            );
          })}
        </g>

        <g>
          {visNodes.map(n => {
            const p = pos[n.id];
            const st = nodeState(n, t);
            const color = nodeColor(n, st);
            const fresh = t - n.t < 1.3;
            const grow = Math.min(1, Math.max(0, (t - n.t) / 0.4));
            const r = (n.r || 16) * (mini ? 0.82 : 1);
            const isSel = selected === n.id;
            const dashed = st === "gap" || st === "contradicted";
            const isPulse = fresh || st === "gap";
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y}) scale(${(0.45 + 0.55 * grow).toFixed(3)})`}
                style={{ cursor: "pointer", opacity: grow }}
                onClick={ev => { ev.stopPropagation(); onSelect(isSel ? null : n.id); }}
              >
                {isPulse && (
                  <circle r={r} fill="none" stroke={color} strokeWidth="1.5"
                    style={{
                      transformOrigin: "center",
                      animation: `kg-pulse ${st === "gap" ? "2s" : "1.3s"} ease-out ${st === "gap" ? "infinite" : "1"}`,
                    }}
                  />
                )}
                {isSel && <circle r={r + 7} fill="none" stroke={color} strokeWidth="1" opacity="0.6" />}
                <circle
                  r={r}
                  fill={`color-mix(in oklch, ${color} ${n.type === "evidence" ? 16 : 24}%, var(--bg-1))`}
                  stroke={color}
                  strokeWidth={isSel ? 2.4 : 1.6}
                  strokeDasharray={dashed ? "4 3" : undefined}
                  opacity={st === "contradicted" ? 0.55 : 1}
                  filter={(n.type === "concept" || n.type === "answer") ? "url(#kg-glow)" : undefined}
                />
                <text textAnchor="middle" dy="0.34em" fontSize={r * 0.7}
                  fill={color} fontFamily="var(--mono)" style={{ pointerEvents: "none" }}>
                  {nodeGlyph(n, st)}
                </text>
                {!mini && (
                  <text textAnchor="middle" y={r + 14} fontSize="11" fontWeight="600"
                    fill="var(--text-1)" style={{ pointerEvents: "none" }}
                    textDecoration={st === "contradicted" ? "line-through" : "none"}>
                    {n.label}
                  </text>
                )}
                {!mini && n.sub && (
                  <text textAnchor="middle" y={r + 27} fontSize="9.5"
                    fill="var(--text-3)" fontFamily="var(--mono)" style={{ pointerEvents: "none" }}>
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
