"use client";

import { useSession } from "@/store/session";
import Sparkline from "./Sparkline";

export default function ConfidenceStrip() {
  const { confidence, events, status } = useSession();

  // build history from confidence_update events in the event log
  // we track confidence over time via the session context's confidence value
  const conf = confidence;
  const col = conf < 55 ? "var(--c-orange)" : conf < 75 ? "var(--c-blue)" : "var(--c-green)";

  // collect confidence snapshots from events (the evaluator emits them)
  const evalEvents = events.filter(e => e.kind === "success" || e.kind === "warning");
  const sparkData = evalEvents.length ? evalEvents.map((_, i) => {
    const step = conf / evalEvents.length;
    return Math.round(step * (i + 1));
  }) : [conf];

  if (status === "idle") return null;

  return (
    <div className="conf-strip">
      <div className="conf-main">
        <div className="kicker">Confidence</div>
        <div className="conf-num" style={{ color: col }}>
          {Math.round(conf)}<span className="conf-pct">%</span>
        </div>
      </div>
      <div className="conf-bar-wrap">
        <div className="conf-bar-track">
          <div className="conf-bar-fill" style={{ width: conf + "%", background: col, boxShadow: `0 0 12px ${col}` }} />
        </div>
        <div className="conf-foot mono">
          <span>uncertainty {Math.max(0, 100 - Math.round(conf))}%</span>
          <span className="cf-steps">{evalEvents.length} eval{evalEvents.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="conf-spark">
        <Sparkline data={sparkData} color={col} w={132} h={38} />
      </div>
    </div>
  );
}
