"use client";

import { NODES, EDGES } from "@/lib/data";
import { nodeState } from "@/lib/utils";
import { TYPE_META, EDGE_META } from "./KnowledgeGraph";

interface Props {
  id: string;
  t: number;
  onClose: () => void;
}

export default function NodeInspector({ id, t, onClose }: Props) {
  const n = NODES.find(x => x.id === id);
  if (!n) return null;

  const st = nodeState(n, t);
  const meta = TYPE_META[n.type];
  const ins = EDGES.filter(e => e.to === id && e.t <= t);
  const outs = EDGES.filter(e => e.from === id && e.t <= t);
  const col = st === "contradicted" ? "var(--c-red)" : (st === "resolved" || st === "validated") ? "var(--c-green)" : meta.color;
  const nm = (x: string) => NODES.find(nn => nn.id === x)?.label || x;
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
                <span className="rel-type" style={{ color: EDGE_META[e.type].color }}>{EDGE_META[e.type].label}</span>
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
                <span className="rel-type" style={{ color: EDGE_META[e.type].color }}>{EDGE_META[e.type].label}</span>
                <span className="rel-node mono">{nm(e.to)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
