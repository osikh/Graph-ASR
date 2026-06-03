"use client";

import { useState, useEffect } from "react";
import { EVENTS, AGENT } from "@/lib/data";
import { usePlayback } from "@/store/playback";
import type { AgentEvent } from "@/types";

const RT_META: Record<string, { c: string; k: string }> = {
  claim:   { c: "var(--c-purple)", k: "CLAIM" },
  warning: { c: "var(--c-orange)", k: "GAP" },
  success: { c: "var(--c-green)",  k: "RESOLVED" },
  debate:  { c: "var(--c-orange)", k: "CONTESTED" },
  answer:  { c: "var(--c-green)",  k: "ANSWER" },
};

function useEnter() {
  const [on, setOn] = useState(false);
  useEffect(() => { const id = setTimeout(() => setOn(true), 16); return () => clearTimeout(id); }, []);
  return on ? " is-in" : "";
}

function RTNode({ s, last }: { s: AgentEvent; last: boolean }) {
  const enter = useEnter();
  const m = RT_META[s.kind];
  return (
    <div className="rt-node" style={{ "--ac": m.c } as React.CSSProperties}>
      {!last && <div className="rt-connector" />}
      <div className="rt-dot" style={{ background: m.c, boxShadow: `0 0 10px ${m.c}` }} />
      <div className={`rt-card${enter}`}>
        <div className="rt-tag" style={{ color: m.c }}>
          {m.k}<span className="rt-by">{AGENT[s.agent].name}</span>
        </div>
        <div className="rt-text">{s.lines[0]}</div>
      </div>
    </div>
  );
}

export default function ReasoningTree() {
  const { t } = usePlayback();
  const steps = EVENTS.filter(e => e.t <= t && ["claim", "warning", "success", "debate", "answer"].includes(e.kind));

  if (!steps.length)
    return <div className="feed-empty"><p>The reasoning map builds as claims, evidence and contradictions accumulate.</p></div>;

  return (
    <div className="rtree scroll">
      {steps.map((s, i) => <RTNode key={s.id} s={s} last={i === steps.length - 1} />)}
    </div>
  );
}
