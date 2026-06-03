"use client";

import { useRouter } from "next/navigation";
import { SESSIONS } from "@/lib/data";

const STATUS_META = {
  complete: { col: "var(--c-green)",  lbl: "Complete" },
  gap:      { col: "var(--c-orange)", lbl: "Open gaps" },
};

export default function SessionsPage() {
  const router = useRouter();

  return (
    <div className="page spage scroll">
      <div className="page-head">
        <div>
          <div className="kicker">Session Explorer</div>
          <h1 className="page-h1">Reasoning sessions</h1>
        </div>
        <div className="chip">{SESSIONS.length} sessions · 14-day window</div>
      </div>
      <div className="sess-grid">
        {SESSIONS.map(s => {
          const { col, lbl } = STATUS_META[s.status];
          const confColor = s.confidence > 85 ? "var(--c-green)" : s.confidence > 75 ? "var(--c-blue)" : "var(--c-orange)";
          const gapColor = s.gaps[1] === s.gaps[0] ? "var(--c-green)" : "var(--c-orange)";
          return (
            <button
              key={s.id}
              className={`sess-card ${s.active ? "active" : ""}`}
              onClick={() => s.active && router.push("/workspace")}
            >
              <div className="sc-top">
                <span className="sc-status" style={{ color: col }}>● {lbl}</span>
                <span className="sc-date mono">{s.date}</span>
              </div>
              <div className="sc-title">{s.title}</div>
              <div className="sc-conf">
                <div className="sc-conf-bar">
                  <div style={{ width: s.confidence + "%", background: confColor }} />
                </div>
                <span className="mono sc-conf-n">{s.confidence}%</span>
              </div>
              <div className="sc-stats">
                <div className="sc-stat"><span className="mono">{s.nodes}</span><span>nodes</span></div>
                <div className="sc-stat"><span className="mono">{s.edges}</span><span>edges</span></div>
                <div className="sc-stat"><span className="mono" style={{ color: gapColor }}>{s.gaps[1]}/{s.gaps[0]}</span><span>gaps</span></div>
                <div className="sc-stat"><span className="mono">{s.duration}</span><span>runtime</span></div>
              </div>
              {s.active && <div className="sc-open">Open in workspace →</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
