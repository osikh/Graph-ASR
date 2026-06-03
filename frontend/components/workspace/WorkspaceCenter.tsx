"use client";

import { useState } from "react";
import { useSession } from "@/store/session";
import ConfidenceStrip from "./ConfidenceStrip";
import AgentFeed from "./AgentFeed";
import DebateView from "./DebateView";
import ReasoningTree from "./ReasoningTree";

const VIEWS = [
  { id: "stream", label: "Stream",         icon: "≡" },
  { id: "debate", label: "Debate",         icon: "⇄" },
  { id: "tree",   label: "Reasoning Tree", icon: "⌥" },
] as const;

type ViewId = typeof VIEWS[number]["id"];

function InterventionOverlay() {
  const { confidence, confMin, confMax, clearIntervention, stopSession } = useSession();
  return (
    <div style={{
      position: "absolute", inset: 0, background: "oklch(0 0 0 / 0.65)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 10,
    }}>
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--c-orange)",
        borderRadius: "var(--radius-lg)", padding: 24, maxWidth: 340, width: "90%",
      }}>
        <div style={{ fontSize: 11, color: "var(--c-orange)", fontFamily: "var(--mono)", marginBottom: 10 }}>
          ⚠ CONFIDENCE OUTSIDE THRESHOLD
        </div>
        <div style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.6, marginBottom: 18 }}>
          Current: <strong style={{ fontFamily: "var(--mono)" }}>{Math.round(confidence)}%</strong>
          &nbsp;— threshold <span style={{ fontFamily: "var(--mono)" }}>{confMin}%–{confMax}%</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" style={{ flex: 1, padding: "8px 0", fontSize: 13 }} onClick={clearIntervention}>
            Continue
          </button>
          <button onClick={stopSession} style={{
            flex: 1, padding: "8px 0", fontSize: 13, background: "color-mix(in oklch, var(--c-red) 80%, var(--bg-1))",
            color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontFamily: "inherit",
          }}>
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceCenter() {
  const [view, setView] = useState<ViewId>("stream");
  const { intervention } = useSession();

  return (
    <section className="workspace" style={{ position: "relative" }}>
      <div className="panel-head ws-head">
        <div className="panel-title">
          <span className="dot live" style={{ background: "var(--c-blue)", boxShadow: "0 0 8px var(--c-blue)" }} />
          Live Reasoning
        </div>
        <div className="seg">
          {VIEWS.map(v => (
            <button key={v.id} className={`seg-btn ${view === v.id ? "active" : ""}`} onClick={() => setView(v.id)}>
              <span className="seg-ic">{v.icon}</span>{v.label}
            </button>
          ))}
        </div>
      </div>
      <ConfidenceStrip />
      <div className="ws-body">
        {view === "stream" && <AgentFeed />}
        {view === "debate" && <DebateView />}
        {view === "tree"   && <ReasoningTree />}
      </div>
      {intervention && <InterventionOverlay />}
    </section>
  );
}
