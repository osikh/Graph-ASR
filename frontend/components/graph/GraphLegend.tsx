import { TYPE_META } from "./KnowledgeGraph";

export default function GraphLegend() {
  return (
    <div className="legend">
      {Object.entries(TYPE_META).map(([k, m]) => (
        <span key={k} className="leg-item">
          <span className="leg-dot" style={{ background: m.color }} />
          {m.label}
        </span>
      ))}
    </div>
  );
}
