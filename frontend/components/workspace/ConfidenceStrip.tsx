"use client";

import { CONFIDENCE } from "@/lib/data";
import { confAt } from "@/lib/utils";
import { usePlayback } from "@/store/playback";
import Sparkline from "./Sparkline";

export default function ConfidenceStrip() {
  const { t } = usePlayback();
  const conf = confAt(t);
  const history = CONFIDENCE.filter(c => c.t <= t).map(c => c.v);
  if (history.length === 0 || history[history.length - 1] !== Math.round(conf)) history.push(conf);

  const prev = CONFIDENCE.filter(c => c.t <= t);
  const last = prev[prev.length - 1];
  const delta = prev.length > 1 ? last.v - prev[prev.length - 2].v : 0;
  const col = conf < 55 ? "var(--c-orange)" : conf < 75 ? "var(--c-blue)" : "var(--c-green)";

  return (
    <div className="conf-strip">
      <div className="conf-main">
        <div className="kicker">Confidence</div>
        <div className="conf-num" style={{ color: col }}>
          {Math.round(conf)}<span className="conf-pct">%</span>
          {delta !== 0 && (
            <span className="conf-delta" style={{ color: delta > 0 ? "var(--c-green)" : "var(--c-orange)" }}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </span>
          )}
        </div>
      </div>
      <div className="conf-bar-wrap">
        <div className="conf-bar-track">
          <div className="conf-bar-fill" style={{ width: conf + "%", background: col, boxShadow: `0 0 12px ${col}` }} />
          {CONFIDENCE.map((c, i) => (
            <div key={i} className="conf-tick" style={{ left: c.v + "%", opacity: c.t <= t ? 1 : 0.25 }} />
          ))}
        </div>
        <div className="conf-foot mono">
          <span>uncertainty {Math.max(0, 100 - Math.round(conf))}%</span>
          <span className="cf-steps">{prev.length} milestone{prev.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="conf-spark">
        <Sparkline data={history} color={col} w={132} h={38} />
      </div>
    </div>
  );
}
