"use client";

import { useState } from "react";
import { NODES, EDGES } from "@/lib/data";
import { usePlayback } from "@/store/playback";
import KnowledgeGraph from "@/components/graph/KnowledgeGraph";
import NodeInspector from "@/components/graph/NodeInspector";
import GraphLegend from "@/components/graph/GraphLegend";

export default function RightPanel() {
  const { t } = usePlayback();
  const [selected, setSelected] = useState<string | null>(null);
  const nodeCount = NODES.filter(n => t >= n.t).length;
  const edgeCount = EDGES.filter(e => t >= e.t).length;

  return (
    <aside className="right-panel" onClick={() => setSelected(null)}>
      <div className="panel-head">
        <div className="panel-title"><span style={{ color: "var(--c-purple)" }}>◈</span> Knowledge Graph</div>
        <div style={{ display: "flex", gap: 6 }}>
          <span className="chip">{nodeCount} nodes</span>
          <span className="chip">{edgeCount} edges</span>
        </div>
      </div>
      <div className="graph-stage" onClick={e => e.stopPropagation()}>
        <KnowledgeGraph t={t} selected={selected} onSelect={setSelected} />
        {selected && <NodeInspector id={selected} t={t} onClose={() => setSelected(null)} />}
      </div>
      <GraphLegend />
    </aside>
  );
}
