"use client";

import { useRouter } from "next/navigation";
import { AGENTS, EVENTS, NODES, SESSIONS } from "@/lib/data";
import { usePlayback } from "@/store/playback";

function activeAgent(t: number): string | null {
  const past = EVENTS.filter(e => e.t <= t);
  if (!past.length) return null;
  const last = past[past.length - 1];
  return (t - last.t < 2.6) ? last.agent : null;
}

export default function LeftPanel() {
  const { t } = usePlayback();
  const router = useRouter();
  const act = activeAgent(t);
  const gapsOpen = NODES.filter(n => n.type === "gap" && t >= n.t && !(n.resolvedAt && t >= n.resolvedAt)).length;

  return (
    <aside className="left-panel">
      <div className="lp-section">
        <div className="kicker">Active task</div>
        <div className="task-box">
          <div className="task-q">Why is gravity different on Earth and the Moon?</div>
          <div className="task-meta mono">
            <span className={gapsOpen ? "tm-warn" : "tm-ok"}>{gapsOpen ? `${gapsOpen} open gap` : "no open gaps"}</span>
            <span>·</span>
            <span>{EVENTS.filter(e => e.t <= t).length}/{EVENTS.length} steps</span>
          </div>
        </div>
        <div className="prompt-row">
          <input className="prompt-input" placeholder="Ask a new question…" disabled />
          <button className="prompt-go" title="Run">↵</button>
        </div>
      </div>

      <div className="lp-section grow">
        <div className="kicker" style={{ marginBottom: 8 }}>Agents</div>
        <div className="agent-list">
          {AGENTS.map(a => {
            const on = act === a.id;
            const used = EVENTS.some(e => e.agent === a.id && e.t <= t);
            return (
              <div key={a.id} className={`agent-row ${on ? "on" : ""}`} title={a.role}>
                <span className="ag-glyph" style={{ color: a.color, background: `color-mix(in oklch, ${a.color} ${on ? 22 : 12}%, var(--bg-1))` }}>
                  {a.glyph}
                </span>
                <span className="ag-name">{a.name}</span>
                <span className={`ag-status ${on ? "active" : used ? "idle" : "wait"}`} style={on ? { color: a.color } : {}}>
                  {on ? (
                    <>
                      <span className="bars">
                        <i style={{ background: a.color }} />
                        <i style={{ background: a.color }} />
                        <i style={{ background: a.color }} />
                      </span>
                      active
                    </>
                  ) : used ? "idle" : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lp-section">
        <div className="lp-head-row">
          <div className="kicker">Recent sessions</div>
          <button className="lp-link" onClick={() => router.push("/sessions")}>All</button>
        </div>
        <div className="sess-mini">
          {SESSIONS.slice(0, 4).map(s => (
            <button
              key={s.id}
              className={`sess-mini-row ${s.active ? "active" : ""}`}
              onClick={() => router.push("/sessions")}
            >
              <span className={`sess-status s-${s.status}`} />
              <span className="sm-title">{s.title}</span>
              <span className="sm-conf mono">{s.confidence}%</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
