"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AGENT } from "@/lib/data";
import Sparkline from "@/components/workspace/Sparkline";

type AnalyticsData = Awaited<ReturnType<typeof api.getAnalytics>>;

function Bars({ data }: { data: { id: string; calls: number }[] }) {
  const max = Math.max(...data.map(d => d.calls), 1);
  return (
    <div className="bars-chart">
      {data.map((d, i) => {
        const ag = AGENT[d.id as keyof typeof AGENT];
        const color = ag?.color ?? "var(--c-blue)";
        return (
          <div key={i} className="bar-col">
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ height: `${(d.calls / max) * 100}%`, background: color }}
              >
                {d.calls > 0 && <span className="bar-val mono">{d.calls}</span>}
              </div>
            </div>
            <div className="bar-label">{ag?.name ?? d.id}</div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "64px 40px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
      <div className="pending-dots" style={{ justifyContent: "center", marginBottom: 14 }}><span /><span /><span /></div>
      No sessions yet — run a few sessions to see analytics here.
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page apage scroll">
      <div className="page-head">
        <div><div className="kicker">Agent Analytics</div><h1 className="page-h1">System performance</h1></div>
      </div>
      <EmptyState />
    </div>
  );

  if (error) return (
    <div className="page apage scroll">
      <div className="page-head">
        <div><div className="kicker">Agent Analytics</div><h1 className="page-h1">System performance</h1></div>
      </div>
      <div style={{ padding: "48px 40px", color: "var(--c-red)", fontFamily: "var(--mono)", fontSize: 13 }}>
        ⚠ Could not reach backend: {error}
      </div>
    </div>
  );

  if (!data || data.total_sessions === 0) return (
    <div className="page apage scroll">
      <div className="page-head">
        <div><div className="kicker">Agent Analytics</div><h1 className="page-h1">System performance</h1></div>
        <span className="chip">0 sessions</span>
      </div>
      <EmptyState />
    </div>
  );

  const hasEvents = data.agent_load.some(a => a.calls > 0);

  return (
    <div className="page apage scroll">
      <div className="page-head">
        <div>
          <div className="kicker">Agent Analytics</div>
          <h1 className="page-h1">System performance</h1>
        </div>
        <span className="chip">{data.total_sessions} session{data.total_sessions !== 1 ? "s" : ""} · {data.completed_sessions} complete</span>
      </div>

      <div className="metric-grid">
        {data.cards.map((c, i) => (
          <div key={i} className="metric-card">
            <div className="mc-label">{c.label}</div>
            <div className="mc-val">{c.value}</div>
            <div className="mc-foot">
              <span className="mc-delta" style={{ color: c.good ? "var(--c-green)" : "var(--c-orange)" }}>{c.delta}</span>
              {c.spark.length > 1 && (
                <Sparkline data={c.spark} color={c.good ? "var(--c-green)" : "var(--c-orange)"} w={90} h={28} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-row">
        <div className="chart-card">
          <div className="panel-title" style={{ marginBottom: 14 }}>
            Agent invocation load · all sessions
          </div>
          {hasEvents ? (
            <Bars data={data.agent_load} />
          ) : (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>
              No event data yet — events persist after session completes
            </div>
          )}
        </div>

        <div className="chart-card">
          <div className="panel-title" style={{ marginBottom: 14 }}>
            Knowledge graph growth · cumulative nodes
          </div>
          <div style={{ padding: "20px 4px 0" }}>
            {data.graph_growth.length > 1 ? (
              <>
                <Sparkline data={data.graph_growth} color="var(--c-purple)" w={420} h={150} />
                <div className="growth-x mono">
                  <span>session 1</span>
                  {data.graph_growth.length > 2 && <span>{Math.round(data.graph_growth.length / 2)}</span>}
                  <span>{data.graph_growth.length}</span>
                </div>
              </>
            ) : (
              <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>
                Run more sessions to see growth
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="panel-title" style={{ marginBottom: 14 }}>
          Confidence trajectory · per session
        </div>
        <div style={{ padding: "8px 4px" }}>
          {data.conf_trend.length > 1 ? (
            <>
              <Sparkline data={data.conf_trend} color="var(--c-blue)" w={860} h={120} />
              <div className="growth-x mono" style={{ marginTop: 8 }}>
                <span>oldest</span>
                <span style={{ color: "var(--text-2)" }}>
                  {data.conf_trend.length} sessions · avg {data.cards[0].value}
                </span>
                <span>latest</span>
              </div>
            </>
          ) : (
            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 12 }}>
              Run more sessions to see confidence evolution
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
