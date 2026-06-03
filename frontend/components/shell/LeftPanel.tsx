"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/store/session";
import { AGENTS } from "@/lib/data";
import { api } from "@/lib/api";

export default function LeftPanel() {
  const { status, question, events, nodes, submit } = useSession();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeAgentId = (() => {
    if (status !== "running" || !events.length) return null;
    const last = events[events.length - 1];
    return last.agent;
  })();

  const gapsOpen = nodes.filter(n => n.type === "gap").length;

  async function handleSubmit() {
    const q = input.trim();
    if (!q || loading || status === "running") return;
    setLoading(true);
    setInput("");
    try {
      await submit(q);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="left-panel">
      <div className="lp-section">
        <div className="kicker">Active task</div>
        {question ? (
          <div className="task-box">
            <div className="task-q">{question}</div>
            <div className="task-meta mono">
              <span className={gapsOpen ? "tm-warn" : "tm-ok"}>
                {gapsOpen ? `${gapsOpen} open gap${gapsOpen > 1 ? "s" : ""}` : "no open gaps"}
              </span>
              <span>·</span>
              <span>{events.length} events</span>
              <span>·</span>
              <span className={`tm-${status === "complete" ? "ok" : status === "failed" ? "warn" : ""}`}>{status}</span>
            </div>
          </div>
        ) : (
          <div className="task-box" style={{ color: "var(--text-3)", fontSize: 13 }}>
            No active session — ask a question below.
          </div>
        )}
        <div className="prompt-row">
          <input
            className="prompt-input"
            placeholder="Ask a question…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            disabled={status === "running" || loading}
          />
          <button
            className="prompt-go"
            title="Run"
            onClick={handleSubmit}
            disabled={!input.trim() || status === "running" || loading}
          >
            {loading ? "…" : "↵"}
          </button>
        </div>
      </div>

      <div className="lp-section grow">
        <div className="kicker" style={{ marginBottom: 8 }}>Agents</div>
        <div className="agent-list">
          {AGENTS.map(a => {
            const on = activeAgentId === a.id;
            const used = events.some(e => e.agent === a.id);
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
          <div className="kicker">Sessions</div>
          <button className="lp-link" onClick={() => router.push("/sessions")}>All</button>
        </div>
      </div>
    </aside>
  );
}
