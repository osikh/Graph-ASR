"use client";

import { ANALYTICS, AGENT } from "@/lib/data";
import Sparkline from "@/components/workspace/Sparkline";

function Bars({ data }: { data: { id?: string; calls?: number }[] | number[] }) {
  const vals = (data as { calls?: number }[]).map(d => typeof d === "number" ? d : d.calls ?? 0);
  const max = Math.max(...vals);

  return (
    <div className="bars-chart">
      {(data as { id?: string; calls?: number }[]).map((d, i) => {
        const v = typeof d === "number" ? d : d.calls ?? 0;
        const ag = (d as { id?: string }).id ? AGENT[(d as { id: string }).id as keyof typeof AGENT] : null;
        return (
          <div key={i} className="bar-col">
            <div className="bar-track">
              <div className="bar-fill" style={{ height: (v / max) * 100 + "%", background: ag ? ag.color : "var(--c-blue)" }}>
                <span className="bar-val mono">{v}</span>
              </div>
            </div>
            <div className="bar-label">{ag ? ag.name : i + 1}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const a = ANALYTICS;

  return (
    <div className="page apage scroll">
      <div className="page-head">
        <div>
          <div className="kicker">Agent Analytics</div>
          <h1 className="page-h1">System performance</h1>
        </div>
        <span className="chip">last 14 days · 7 sessions</span>
      </div>
      <div className="metric-grid">
        {a.cards.map((c, i) => (
          <div key={i} className="metric-card">
            <div className="mc-label">{c.label}</div>
            <div className="mc-val">{c.value}</div>
            <div className="mc-foot">
              <span className="mc-delta" style={{ color: c.good ? "var(--c-green)" : "var(--c-orange)" }}>{c.delta}</span>
              <Sparkline data={c.spark} color={c.good ? "var(--c-green)" : "var(--c-orange)"} w={90} h={28} />
            </div>
          </div>
        ))}
      </div>
      <div className="chart-row">
        <div className="chart-card">
          <div className="panel-title" style={{ marginBottom: 14 }}>Agent invocation load · active session</div>
          <Bars data={a.agentLoad} />
        </div>
        <div className="chart-card">
          <div className="panel-title" style={{ marginBottom: 14 }}>Knowledge graph growth · nodes over steps</div>
          <div style={{ padding: "20px 4px 0" }}>
            <Sparkline data={a.graphGrowth} color="var(--c-purple)" w={420} h={150} />
            <div className="growth-x mono"><span>step 1</span><span>4</span><span>8</span></div>
          </div>
        </div>
      </div>
      <div className="chart-card">
        <div className="panel-title" style={{ marginBottom: 14 }}>Confidence trajectory · active session</div>
        <div style={{ padding: "8px 4px" }}>
          <Sparkline data={a.cards[0].spark} color="var(--c-blue)" w={860} h={120} />
        </div>
      </div>
    </div>
  );
}
