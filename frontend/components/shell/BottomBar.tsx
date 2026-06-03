"use client";

import { useRef, useEffect } from "react";
import { EVENTS, SYS_LOGS, AGENT, DURATION } from "@/lib/data";
import { usePlayback } from "@/store/playback";
import { clock } from "@/lib/utils";

function PlaybackBar() {
  const { t, playing, speed, onPlay, onSeek, onRestart, setSpeed } = usePlayback();
  const pct = (t / DURATION) * 100;

  return (
    <div className="playbar">
      <button className="pb-btn restart" onClick={onRestart} title="Restart">⟲</button>
      <button className="pb-btn play" onClick={onPlay} title={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "►"}
      </button>
      <div className="pb-time mono">
        {t.toFixed(1)}<span className="pb-sep">/</span>{DURATION}s
      </div>
      <div className="pb-track-wrap">
        <div className="pb-markers">
          {EVENTS.map(e => (
            <span
              key={e.id}
              className="pb-mark"
              style={{ left: (e.t / DURATION) * 100 + "%", background: AGENT[e.agent].color, opacity: t >= e.t ? 1 : 0.3 }}
              title={e.title}
            />
          ))}
        </div>
        <input
          className="pb-range"
          type="range"
          min="0" max={DURATION} step="0.1"
          value={t}
          onChange={e => onSeek(parseFloat(e.target.value))}
          style={{ "--pct": pct + "%" } as React.CSSProperties}
        />
      </div>
      <div className="pb-speed">
        {[0.5, 1, 2, 4].map(s => (
          <button key={s} className={`spd ${speed === s ? "active" : ""}`} onClick={() => setSpeed(s)}>{s}×</button>
        ))}
      </div>
    </div>
  );
}

function EventLog() {
  const { t } = usePlayback();
  const ref = useRef<HTMLDivElement>(null);

  const logs = [
    ...EVENTS.map(e => ({ t: e.t, agent: e.agent as string, log: e.log, kind: e.kind })),
    ...SYS_LOGS.map(s => ({ t: s.t, agent: s.agent as string, log: s.log, kind: "sys" })),
  ].filter(l => l.t <= t).sort((a, b) => a.t - b.t);

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
      <PlaybackBar />
      <EventLog />
    </div>
  );
}
