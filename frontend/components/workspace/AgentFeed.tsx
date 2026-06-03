"use client";

import { useRef, useEffect, useState } from "react";
import { useSession } from "@/store/session";
import { AGENT } from "@/lib/data";
import type { AgentEvent } from "@/types";

const KIND_ICON: Record<string, string> = {
  warning: "⚠", success: "✓", answer: "★", debate: "⇄",
  claim: "✶", retrieve: "⤓", plan: "◇", think: "✶",
};

function useEnter() {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id); }, []);
  return on ? " is-in" : "";
}

function AgentCard({ ev }: { ev: AgentEvent }) {
  const ag = AGENT[ev.agent as keyof typeof AGENT];
  const enter = useEnter();
  if (!ag) return null;

  const kindIcon = KIND_ICON[ev.kind] || "•";
  const accent =
    ev.kind === "warning" ? "var(--c-orange)" :
    ev.kind === "success" ? "var(--c-green)"  :
    ev.kind === "answer"  ? "var(--c-green)"  :
    ev.kind === "debate"  ? "var(--c-orange)" : ag.color;

  return (
    <div className={`feed-card k-${ev.kind}${enter}`} style={{ "--ac": accent } as React.CSSProperties}>
      <div className="fc-rail" />
      <div className="fc-head">
        <span className="fc-agent" style={{ color: ag.color }}>
          <span className="fc-glyph" style={{ background: `color-mix(in oklch, ${ag.color} 18%, var(--bg-1))`, color: ag.color }}>{ag.glyph}</span>
          {ag.name}
        </span>
        <span className="fc-kind" style={{ color: accent }}>{kindIcon} {ev.title}</span>
        <span className="fc-time mono">+{Number(ev.t).toFixed(0)}s</span>
      </div>
      <div className="fc-body">
        {ev.lines.map((l, i) => (
          <p key={i} className={/^[•✓⚠]/.test(l) || /[=×·²√]/.test(l) ? "fc-mono" : ""}>{l}</p>
        ))}
      </div>
      {ev.gap && (
        <div className="fc-gap">
          <span className="fc-gap-tag">KNOWLEDGE GAP</span>
          <span className="mono">{ev.gap.a} <span className="gap-arr">↔</span> {ev.gap.b}</span>
          <div className="fc-gap-text">{ev.gap.text}</div>
        </div>
      )}
      {ev.tag && (
        <span className={`fc-badge badge-${ev.tag}`}>
          {ev.tag === "validated" ? "✓ validated" : "claim"}
        </span>
      )}
      {ev.sources && (
        <div className="fc-sources">
          <span className="kicker">Sourced from</span>
          <div className="src-list">{ev.sources.map((s, i) => <span key={i} className="chip">{s}</span>)}</div>
        </div>
      )}
    </div>
  );
}

export default function AgentFeed() {
  const { events, status } = useSession();
  const ref = useRef<HTMLDivElement>(null);
  const lastId = events.length ? events[events.length - 1].id : null;

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lastId]);

  if (status === "idle")
    return (
      <div className="feed-empty" style={{ margin: "auto" }}>
        <div className="pending-dots"><span /><span /><span /></div>
        <p>Ask a question above to start a reasoning session.</p>
      </div>
    );

  return (
    <div className="feed scroll" ref={ref}>
      {events.length === 0 && status === "running" && (
        <div className="feed-empty">
          <div className="pending-dots"><span /><span /><span /></div>
          <p>Agents starting up…</p>
        </div>
      )}
      {events.map(ev => <AgentCard key={ev.id} ev={ev} />)}
      {status === "running" && events.length > 0 && (
        <div className="feed-thinking">
          <span className="dot live" /> agents working
          <span className="tdots"><i /><i /><i /></span>
        </div>
      )}
    </div>
  );
}
