"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/store/session";
import { AGENT } from "@/lib/data";
import type { AgentEvent } from "@/types";

function useEnter() {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id); }, []);
  return on ? " is-in" : "";
}

function DebateThread({ d, byId }: { d: AgentEvent; byId: Record<string, AgentEvent> }) {
  const enter = useEnter();
  const src = d.against ? byId[d.against] : null;
  const srcAg = src ? AGENT[src.agent as keyof typeof AGENT] : null;
  const dAg = AGENT[d.agent as keyof typeof AGENT];
  if (!dAg) return null;
  const conceded = /concession|conceded/i.test(d.title);

  return (
    <div className="debate-thread">
      {src && srcAg && (
        <div className={`debate-msg${enter}`} style={{ "--ac": srcAg.color } as React.CSSProperties}>
          <div className="dm-head" style={{ color: srcAg.color }}>
            {srcAg.glyph} {srcAg.name}<span className="chip">{src.tag || "claim"}</span>
          </div>
          <div className="dm-body">{src.lines[0]}</div>
        </div>
      )}
      <div className="debate-link">
        <span className={`link-label ${conceded ? "ok" : "vs"}`}>{conceded ? "resolves ↘" : "challenges ↘"}</span>
      </div>
      <div className={`debate-msg reply${enter}`} style={{ "--ac": dAg.color } as React.CSSProperties}>
        <div className="dm-head" style={{ color: dAg.color }}>
          {dAg.glyph} {dAg.name}<span className="chip">{conceded ? "concession" : "counter"}</span>
        </div>
        <div className="dm-body">{d.lines.map((l, i) => <p key={i}>{l}</p>)}</div>
      </div>
    </div>
  );
}

export default function DebateView() {
  const { events } = useSession();
  const byId = Object.fromEntries(events.map(e => [e.id, e]));
  const debates = events.filter(e => e.kind === "debate");

  if (!debates.length)
    return <div className="feed-empty"><p>No disagreements yet. The Debater engages once a claim is on the table.</p></div>;

  return (
    <div className="debate scroll">
      {debates.map(d => <DebateThread key={d.id} d={d} byId={byId} />)}
    </div>
  );
}
