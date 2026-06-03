"use client";

import { useState } from "react";
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

export default function WorkspaceCenter() {
  const [view, setView] = useState<ViewId>("stream");

  return (
    <section className="workspace">
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
    </section>
  );
}
