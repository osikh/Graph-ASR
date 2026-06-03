"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type SessionResponse } from "@/lib/api";

const STATUS_META: Record<string, { col: string; lbl: string }> = {
  complete: { col: "var(--c-green)",  lbl: "Complete" },
  running:  { col: "var(--c-blue)",   lbl: "Running" },
  failed:   { col: "var(--c-red)",    lbl: "Failed" },
  pending:  { col: "var(--text-3)",   lbl: "Pending" },
};

function confColor(v: number) {
  return v > 85 ? "var(--c-green)" : v > 75 ? "var(--c-blue)" : "var(--c-orange)";
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)  return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function SessionCard({ s, onOpen }: { s: SessionResponse; onOpen: () => void }) {
  const meta = STATUS_META[s.status] ?? STATUS_META.pending;
  const conf = Math.round(s.confidence * (s.confidence > 1 ? 1 : 100));
  const isActive = s.status === "running" || s.status === "complete";

  return (
    <button className={`sess-card ${s.status === "running" ? "active" : ""}`} onClick={isActive ? onOpen : undefined}>
      <div className="sc-top">
        <span className="sc-status" style={{ color: meta.col }}>● {meta.lbl}</span>
        <span className="sc-date mono">{timeAgo(s.created_at)}</span>
      </div>
      <div className="sc-title">{s.question}</div>
      <div className="sc-conf">
        <div className="sc-conf-bar">
          <div style={{ width: conf + "%", background: confColor(conf) }} />
        </div>
        <span className="mono sc-conf-n">{conf}%</span>
      </div>
      <div className="sc-stats">
        <div className="sc-stat"><span className="mono">{s.node_count}</span><span>nodes</span></div>
        <div className="sc-stat"><span className="mono">{s.edge_count}</span><span>edges</span></div>
        <div className="sc-stat">
          <span className="mono" style={{ color: "var(--text-2)" }}>{s.status}</span>
          <span>status</span>
        </div>
      </div>
      {isActive && <div className="sc-open">Open in workspace →</div>}
    </button>
  );
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listSessions()
      .then(setSessions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // poll while any session is running
  useEffect(() => {
    if (!sessions.some(s => s.status === "running")) return;
    const id = setInterval(() =>
      api.listSessions().then(setSessions).catch(() => {}), 3000
    );
    return () => clearInterval(id);
  }, [sessions]);

  return (
    <div className="page spage scroll">
      <div className="page-head">
        <div>
          <div className="kicker">Session Explorer</div>
          <h1 className="page-h1">Reasoning sessions</h1>
        </div>
        <div className="chip">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>
      </div>

      {loading && (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-3)", fontFamily: "var(--mono)", fontSize: 13 }}>
          <div className="pending-dots" style={{ justifyContent: "center", marginBottom: 12 }}><span /><span /><span /></div>
          Loading sessions…
        </div>
      )}

      {error && (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--c-red)", fontFamily: "var(--mono)", fontSize: 13 }}>
          ⚠ Could not reach backend: {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          No sessions yet. Ask a question in the workspace to create one.
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="sess-grid">
          {sessions.map(s => (
            <SessionCard key={s.id} s={s} onOpen={() => router.push("/workspace")} />
          ))}
        </div>
      )}
    </div>
  );
}
