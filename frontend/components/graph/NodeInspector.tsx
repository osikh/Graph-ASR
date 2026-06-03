"use client";

import { NODES, EDGES } from "@/lib/data";
import { nodeState } from "@/lib/utils";
import { TYPE_META, EDGE_META } from "./KnowledgeGraph";
import type { LiveNode, LiveEdge } from "@/store/session";

interface Props {
  id: string;
  t: number;
  onClose: () => void;
  // live mode overrides
  liveNodes?: LiveNode[];
  liveEdges?: LiveEdge[];
}

export default function NodeInspector({ id, t, onClose, liveNodes, liveEdges }: Props) {
  const isLive = !!liveNodes;

  const n = isLive
    ? liveNodes!.find(x => x.id === id)
    : NODES.find(x => x.id === id);

  if (!n) return null;

  const st = !isLive ? nodeState(n as never, t) : "normal";
  const meta = TYPE_META[n.type] ?? TYPE_META.concept;
  const col = st === "contradicted" ? "var(--c-red)" : (st === "resolved" || st === "validated") ? "var(--c-green)" : meta.color;

  const ins = isLive
    ? (liveEdges ?? []).filter(e => e.to === id)
    : EDGES.filter(e => e.to === id && e.t <= t);

  const outs = isLive
    ? (liveEdges ?? []).filter(e => e.from === id)
    : EDGES.filter(e => e.from === id && e.t <= t);

  const nm = (x: string) => {
    if (isLive) return liveNodes!.find(nn => nn.id === x)?.label ?? x;
    return NODES.find(nn => nn.id === x)?.label ?? x;
  };

  const typeLabel = st === "gap" ? "Knowledge gap" : st === "contradicted" ? "Contradicted claim" : meta.label;

  return (
    <div className="inspector">
      <div className="insp-head">
        <span className="insp-type" style={{ color: col }}>● {typeLabel}</span>
        <button className="insp-x" onClick={onClose}>✕</button>
      </div>
      <div className="insp-title">{n.label}</div>
      {n.sub && <div className="insp-sub mono">{n.sub}</div>}
      <div className="insp-rels">
        {ins.length > 0 && (
          <div className="rel-grp">
            <span className="kicker">Incoming</span>
            {ins.map((e, i) => (
              <div key={i} className="rel-row">
                <span className="rel-type" style={{ color: (EDGE_META[e.type] ?? EDGE_META.depends).color }}>{(EDGE_META[e.type] ?? EDGE_META.depends).label}</span>
                <span className="rel-node mono">{nm(e.from)}</span>
              </div>
            ))}
          </div>
        )}
        {outs.length > 0 && (
          <div className="rel-grp">
            <span className="kicker">Outgoing</span>
            {outs.map((e, i) => (
              <div key={i} className="rel-row">
                <span className="rel-type" style={{ color: (EDGE_META[e.type] ?? EDGE_META.depends).color }}>{(EDGE_META[e.type] ?? EDGE_META.depends).label}</span>
                <span className="rel-node mono">{nm(e.to)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
