"use client";

import { useRef, useEffect } from "react";
import { useSession } from "@/store/session";
import { AGENT } from "@/lib/data";
import { clock } from "@/lib/utils";

function StatusBar() {
  const { status, elapsed, events, confidence } = useSession();

  const statusColor =
    status === "running"  ? "var(--c-blue)"   :
    status === "complete" ? "var(--c-green)"  :
    status === "failed"   ? "var(--c-red)"    : "var(--text-3)";

  const elapsedSec = (elapsed / 1000).toFixed(1);

  return (
    <div className="playbar">
      <span className="dot live" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
      <span style={{ fontSize: 12, color: statusColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>
        {status}
      </span>
      {status !== "idle" && (
        <>
          <span className="pb-time mono">{elapsedSec}s</span>
          <span className="chip">{events.length} events</span>
          {confidence > 0 && (
            <span className="chip" style={{ color: "var(--c-green)" }}>{Math.round(confidence)}% confidence</span>
          )}
        </>
      )}
    </div>
  );
}

function EventLog() {
  const { events, sysLogs, status } = useSession();
  const ref = useRef<HTMLDivElement>(null);

  const logs = [
    ...events.map(e => ({ t: e.t, agent: e.agent, log: e.log, kind: e.kind })),
    ...sysLogs.map(s => ({ t: s.t, agent: "system", log: s.log, kind: "sys" })),
  ].sort((a, b) => a.t - b.t);

  const lastKey = logs.length ? logs[logs.length - 1].log : "";
  useEffect(() => { if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth; }, [lastKey]);

  return (
    <div className="evlog">
      <div className="evlog-label kicker">Event stream</div>
      <div className="evlog-track scroll" ref={ref}>
        {logs.length === 0 && <span className="evlog-idle mono">— idle —</span>}
        {logs.map((l, i) => {
          const ag = l.agent === "system" ? null : AGENT[l.agent as keyof typeof AGENT];
          const col = l.kind === "warning" ? "var(--c-orange)" : l.kind === "success" ? "var(--c-green)" : ag ? ag.color : "var(--text-3)";
          const isLast = i === logs.length - 1;
          return (
            <span key={i} className={`evlog-entry${isLast ? " new" : ""}`}>
              <span className="ev-clock mono">{clock(l.t)}</span>
              <span className="ev-dot" style={{ background: col }} />
              <span className="ev-text mono" style={isLast ? { color: "var(--text)" } : {}}>{l.log}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function BottomBar() {
  return (
    <div className="bottombar">
      <StatusBar />
      <EventLog />
    </div>
  );
}
