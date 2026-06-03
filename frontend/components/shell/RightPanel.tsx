"use client";

import { useState } from "react";
import { useSession } from "@/store/session";
import KnowledgeGraph from "@/components/graph/KnowledgeGraph";
import NodeInspector from "@/components/graph/NodeInspector";
import GraphLegend from "@/components/graph/GraphLegend";

export default function RightPanel() {
  const { nodes, edges, status } = useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const isLive = status !== "idle";

  return (
    <aside className="right-panel" onClick={() => setSelected(null)}>
      <div className="panel-head">
        <div className="panel-title"><span style={{ color: "var(--c-purple)" }}>◈</span> Knowledge Graph</div>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="chip">{isLive ? nodes.length : 0} nodes</span>
          <span className="chip">{isLive ? edges.length : 0} edges</span>
        </div>
      </div>
      <div className="graph-stage" onClick={e => e.stopPropagation()}>
        {isLive ? (
          <KnowledgeGraph
            liveNodes={nodes}
            liveEdges={edges}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-3)", fontSize: 13 }}>
            Graph builds as agents reason
          </div>
        )}
        {selected && isLive && (
          <NodeInspector id={selected} t={0} onClose={() => setSelected(null)} liveNodes={nodes} liveEdges={edges} />
        )}
      </div>
      <GraphLegend />
    </aside>
  );
}
