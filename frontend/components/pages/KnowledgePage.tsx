"use client";

import { useState } from "react";
import { NODES, EDGES, DURATION } from "@/lib/data";
import KnowledgeGraph, { TYPE_META } from "@/components/graph/KnowledgeGraph";
import NodeInspector from "@/components/graph/NodeInspector";
import GraphLegend from "@/components/graph/GraphLegend";
import type { NodeType } from "@/types";

export default function KnowledgePage() {
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | NodeType>("all");

  const grouped = NODES.reduce<Record<string, typeof NODES>>((acc, n) => {
    if (!acc[n.type]) acc[n.type] = [];
    acc[n.type].push(n);
    return acc;
  }, {});

  return (
    <div className="page kpage">
      <div className="kx-side scroll">
        <div className="kx-search">
          <span className="kx-ic">⌕</span>
          <input placeholder="Search concepts…" />
        </div>
        <div className="kx-filters">
          <button className={`kxf ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</button>
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button
              key={k}
              className={`kxf ${filter === k ? "on" : ""}`}
              onClick={() => setFilter(k as NodeType)}
              style={filter === k ? { borderColor: m.color, color: m.color } : {}}
            >
              <span className="leg-dot" style={{ background: m.color }} />{m.label}
            </button>
          ))}
        </div>
        <div className="kx-list">
          {Object.entries(grouped)
            .filter(([k]) => filter === "all" || filter === k)
            .map(([type, ns]) => (
              <div key={type} className="kx-grp">
                <div className="kicker" style={{ color: TYPE_META[type].color, marginBottom: 6 }}>
                  {TYPE_META[type].label} · {ns.length}
                </div>
                {ns.map(n => (
                  <button key={n.id} className={`kx-node ${sel === n.id ? "on" : ""}`} onClick={() => setSel(n.id)}>
                    <span className="leg-dot" style={{ background: TYPE_META[n.type].color }} />
                    <span className="kxn-label">{n.label}</span>
                    {n.sub && <span className="kxn-sub mono">{n.sub}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      </div>
      <div className="kx-canvas">
        <div className="kx-canvas-head">
          <div className="panel-title"><span style={{ color: "var(--c-purple)" }}>◈</span> Knowledge Explorer</div>
          <div style={{ display: "flex", gap: 6 }}>
            <span className="chip">{NODES.length} nodes</span>
            <span className="chip">{EDGES.length} edges</span>
            <span className="chip">1 resolved gap</span>
          </div>
        </div>
        <div className="kx-graph-area" onClick={() => setSel(null)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", inset: 0 }}>
            <KnowledgeGraph t={DURATION} selected={sel} onSelect={setSel} />
          </div>
          {sel && <NodeInspector id={sel} t={DURATION} onClose={() => setSel(null)} />}
          <div className="kx-legend"><GraphLegend /></div>
        </div>
      </div>
    </div>
  );
}
