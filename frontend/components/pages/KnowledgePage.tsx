"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import KnowledgeGraph, { TYPE_META } from "@/components/graph/KnowledgeGraph";
import NodeInspector from "@/components/graph/NodeInspector";
import GraphLegend from "@/components/graph/GraphLegend";
import type { LiveNode, LiveEdge } from "@/store/session";
import type { NodeType } from "@/types";

const NODE_RADIUS: Record<string, number> = {
  concept: 20, evidence: 14, claim: 16, gap: 17, answer: 16, question: 18,
};

function autoPos(index: number): { x: number; y: number } {
  if (index === 0) return { x: 0.5, y: 0.46 };
  const angle = index * 137.508 * (Math.PI / 180);
  const r = Math.min(Math.sqrt(index) * 0.16, 0.42);
  return {
    x: Math.max(0.06, Math.min(0.94, 0.5 + r * Math.cos(angle))),
    y: Math.max(0.06, Math.min(0.92, 0.5 + r * Math.sin(angle))),
  };
}

function mapEdgeType(neo4jType: string): string {
  const t = (neo4jType ?? "").toLowerCase();
  if (t.includes("depend") || t.includes("required")) return "depends";
  if (t.includes("contradict")) return "contradicts";
  if (t.includes("supported_by") || t.includes("evidence")) return "evidence";
  if (t.includes("support")) return "supports";
  if (t.includes("resolv")) return "resolves";
  return "depends";
}

interface RawNode { id: string; label: string; type: string; session_id: string }

export default function KnowledgePage() {
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [liveNodes, setLiveNodes] = useState<LiveNode[]>([]);
  const [liveEdges, setLiveEdges] = useState<LiveEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | NodeType>("all");

  useEffect(() => {
    api.getKnowledgeGraph()
      .then(data => {
        setRawNodes(data.nodes);
        setLiveNodes(data.nodes.map((n, i) => ({
          id: n.id, label: n.label, type: n.type ?? "concept",
          ...autoPos(i), r: NODE_RADIUS[n.type] ?? 16, t: 0,
        })));
        setLiveEdges(data.edges.map(e => ({
          from: e.from, to: e.to, type: mapEdgeType(e.type), t: 0,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const listNodes = useMemo(() => {
    return rawNodes.filter(n => {
      const matchType = filter === "all" || n.type === filter;
      const matchSearch = !search.trim() || n.label.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [rawNodes, filter, search]);

  const grouped = useMemo(() => {
    return listNodes.reduce<Record<string, RawNode[]>>((acc, n) => {
      const key = n.type in TYPE_META ? n.type : "concept";
      if (!acc[key]) acc[key] = [];
      acc[key].push(n);
      return acc;
    }, {});
  }, [listNodes]);

  const gapCount = rawNodes.filter(n => n.type === "gap").length;

  return (
    <div className="page kpage">
      <div className="kx-side scroll">
        <div className="kx-search">
          <span className="kx-ic">⌕</span>
          <input
            placeholder="Search concepts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="kx-filters">
          <button className={`kxf ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</button>
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button key={k} className={`kxf ${filter === k ? "on" : ""}`}
              onClick={() => setFilter(k as NodeType)}
              style={filter === k ? { borderColor: m.color, color: m.color } : {}}>
              <span className="leg-dot" style={{ background: m.color }} />{m.label}
            </button>
          ))}
        </div>

        <div className="kx-list">
          {loading && (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, padding: "32px 0" }}>
              <div className="pending-dots" style={{ justifyContent: "center", marginBottom: 10 }}><span /><span /><span /></div>
              Loading graph…
            </div>
          )}

          {!loading && rawNodes.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, padding: "32px 16px", lineHeight: 1.6 }}>
              No knowledge yet.<br />Run a session to build the graph.
            </div>
          )}

          {!loading && rawNodes.length > 0 && listNodes.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, padding: "24px 16px" }}>
              No results for "{search}"
            </div>
          )}

          {Object.entries(grouped).map(([type, ns]) => (
            <div key={type} className="kx-grp">
              <div className="kicker" style={{ color: (TYPE_META[type] ?? TYPE_META.concept).color, marginBottom: 6 }}>
                {(TYPE_META[type] ?? TYPE_META.concept).label} · {ns.length}
              </div>
              {ns.map(n => (
                <button key={n.id} className={`kx-node ${sel === n.id ? "on" : ""}`} onClick={() => setSel(n.id)}>
                  <span className="leg-dot" style={{ background: (TYPE_META[n.type] ?? TYPE_META.concept).color }} />
                  <span className="kxn-label">{n.label}</span>
                  {n.session_id && <span className="kxn-sub mono">{n.session_id.slice(0, 8)}</span>}
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
            <span className="chip">{liveNodes.length} nodes</span>
            <span className="chip">{liveEdges.length} edges</span>
            {gapCount > 0 && (
              <span className="chip" style={{ color: "var(--c-orange)", borderColor: "oklch(0.74 0.15 65 / 0.4)" }}>
                {gapCount} gap{gapCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="kx-graph-area" onClick={() => setSel(null)}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-3)", fontSize: 13 }}>
              Building graph view…
            </div>
          ) : liveNodes.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-3)", fontSize: 13 }}>
              Graph builds as agents reason
            </div>
          ) : (
            <>
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", inset: 0 }}>
                <KnowledgeGraph
                  liveNodes={liveNodes}
                  liveEdges={liveEdges}
                  selected={sel}
                  onSelect={setSel}
                />
              </div>
              {sel && (
                <NodeInspector
                  id={sel}
                  t={0}
                  onClose={() => setSel(null)}
                  liveNodes={liveNodes}
                  liveEdges={liveEdges}
                />
              )}
            </>
          )}
          <div className="kx-legend"><GraphLegend /></div>
        </div>
      </div>
    </div>
  );
}
