"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/store/session";
import { AGENTS } from "@/lib/data";

const STATUS_COLOR: Record<string, string> = {
  running: "var(--c-blue)", complete: "var(--c-green)", failed: "var(--c-red)",
};
const STATUS_LABEL: Record<string, string> = {
  running: "Running…", complete: "Complete", failed: "Failed",
};

export default function LeftPanel() {
  const { status, question, events, nodes, confMin, confMax, disabledAgents, setConfRange, toggleAgent, submit } = useSession();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeAgentId = status === "running" && events.length ? events[events.length - 1].agent : null;
  const gapsOpen = nodes.filter(n => n.type === "gap").length;
  const isActive = status !== "idle";
  const isDone = status === "complete" || status === "failed";

  async function handleSubmit() {
    const q = input.trim();
    if (!q || loading || status === "running") return;
    setLoading(true);
    setInput("");
    try { await submit(q); } finally { setLoading(false); }
  }

  async function handleRestart() {
    if (!question || status === "running") return;
    setLoading(true);
    try { await submit(question); } finally { setLoading(false); }
  }

  return (
    <aside className="left-panel">
      <div className="lp-section">
        <div className="kicker">Active task</div>

        <div style={{ margin: "9px 0 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
            <span style={{ fontSize: 10.5, color: "var(--text-3)", fontFamily: "var(--mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>stop threshold</span>
            <span style={{ fontSize: 10.5, color: "var(--text-2)", fontFamily: "var(--mono)" }}>{confMin}% – {confMax}%</span>
          </div>
          <input type="range" className="pb-range" min="0" max="100" value={confMin}
            onChange={e => setConfRange(Number(e.target.value), confMax)}
            style={{ "--pct": confMin + "%" } as React.CSSProperties} />
          <input type="range" className="pb-range" min="0" max="100" value={confMax}
            onChange={e => setConfRange(confMin, Number(e.target.value))}
            style={{ "--pct": confMax + "%" } as React.CSSProperties} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
            <span>min</span><span>max</span>
          </div>
        </div>

        {question ? (
          <div className="task-box">
            <div className="task-q">{question}</div>
            <div className="task-meta mono">
              <span className={gapsOpen ? "tm-warn" : "tm-ok"}>
                {gapsOpen ? `${gapsOpen} gap${gapsOpen > 1 ? "s" : ""}` : "no gaps"}
              </span>
              <span>·</span>
              <span>{events.length} events</span>
            </div>
          </div>
        ) : (
          <div className="task-box" style={{ color: "var(--text-3)", fontSize: 13 }}>No active session.</div>
        )}

        {!isActive && (
          <div className="prompt-row">
            <input className="prompt-input" placeholder="Ask a question…" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <button className="prompt-go" title="Run" onClick={handleSubmit} disabled={!input.trim() || loading}>
              {loading ? "…" : "↵"}
            </button>
          </div>
        )}

        {isActive && (
          <div className="prompt-row">
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg-2)", border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)", padding: "9px 11px",
              fontSize: 12, fontFamily: "var(--mono)", color: STATUS_COLOR[status] ?? "var(--text-3)",
            }}>
              {status === "running" && <span className="dot live" style={{ background: "var(--c-blue)", boxShadow: "0 0 8px var(--c-blue)", flexShrink: 0 }} />}
              {status === "complete" && <span>✓</span>}
              {status === "failed" && <span>✕</span>}
              {STATUS_LABEL[status]}
            </div>
            {isDone && (
              <button className="prompt-go" title="Run again" onClick={handleRestart} disabled={loading} style={{ fontSize: 16 }}>↺</button>
            )}
          </div>
        )}
      </div>

      <div className="lp-section grow">
        <div className="kicker" style={{ marginBottom: 8 }}>Agents <span style={{ color: "var(--text-3)", fontWeight: 400 }}>— click to toggle</span></div>
        <div className="agent-list">
          {AGENTS.map(a => {
            const on = activeAgentId === a.id;
            const used = events.some(e => e.agent === a.id);
            const disabled = disabledAgents.includes(a.id);
            return (
              <div key={a.id} className={`agent-row ${on && !disabled ? "on" : ""}`}
                title={a.role} onClick={() => toggleAgent(a.id)}
                style={{ cursor: "pointer", opacity: disabled ? 0.38 : 1 }}>
                <span className="ag-glyph" style={{ color: a.color, background: `color-mix(in oklch, ${a.color} ${on ? 22 : 12}%, var(--bg-1))` }}>
                  {a.glyph}
                </span>
                <span className="ag-name" style={{ textDecoration: disabled ? "line-through" : "none" }}>{a.name}</span>
                <span className={`ag-status ${!disabled && on ? "active" : !disabled && used ? "idle" : "wait"}`} style={on && !disabled ? { color: a.color } : {}}>
                  {disabled ? "off" : on ? (
                    <><span className="bars"><i style={{ background: a.color }} /><i style={{ background: a.color }} /><i style={{ background: a.color }} /></span>active</>
                  ) : used ? "idle" : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lp-section">
        <div className="lp-head-row">
          <div className="kicker">Sessions</div>
          <button className="lp-link" onClick={() => router.push("/sessions")}>All</button>
        </div>
      </div>
    </aside>
  );
}
