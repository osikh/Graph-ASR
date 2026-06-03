"use client";

import { useRouter } from "next/navigation";
import { AGENTS, DURATION } from "@/lib/data";
import KnowledgeGraph from "@/components/graph/KnowledgeGraph";

const FEATURES: [string, string, string, string][] = [
  ["What agents are doing",   "Six specialised agents stream every thought, retrieval and verdict in real time.", "var(--c-blue)",   "◇"],
  ["What knowledge is missing","Gaps surface as first-class nodes — the system shows you what it doesn't know.",  "var(--c-orange)", "!"],
  ["How reasoning evolved",   "Scrub the full trace: claims, contradictions and the graph growing step by step.", "var(--c-purple)", "✶"],
  ["Why the answer is trusted","Every conclusion is sourced back to concepts, evidence and validated relations.",  "var(--c-green)",  "✓"],
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="page home scroll">
      <div className="home-hero">
        <div className="home-left">
          <span className="home-badge mono"><span className="dot live" /> reasoning engine · live</span>
          <h1 className="home-title">See the machine <span className="hl">think.</span></h1>
          <p className="home-lede">
            A graph-augmented reasoning system you can <em>watch</em> — agents debate, knowledge gaps appear,
            the graph grows, and confidence climbs until an answer is earned. Not a chatbot. An observable cognitive workflow.
          </p>
          <div className="home-cta">
            <button className="btn-primary" onClick={() => router.push("/workspace")}>Open workspace →</button>
            <button className="btn-ghost"   onClick={() => router.push("/knowledge")}>Explore the graph</button>
          </div>
          <div className="pipeline">
            {AGENTS.map((a, i) => (
              <>
                <div key={a.id} className="pipe-node" title={a.role}>
                  <span className="pipe-glyph" style={{ color: a.color, background: `color-mix(in oklch, ${a.color} 16%, var(--bg-1))` }}>{a.glyph}</span>
                  <span className="pipe-name">{a.name}</span>
                </div>
                {i < AGENTS.length - 1 && <span key={`arr-${i}`} className="pipe-arr">→</span>}
              </>
            ))}
          </div>
        </div>
        <div className="home-preview" onClick={() => router.push("/workspace")}>
          <div className="hp-head"><span className="dot live" /> <span className="mono">gravity-session.trace</span></div>
          <div className="hp-graph">
            <KnowledgeGraph t={DURATION} mini selected={null} onSelect={() => {}} />
          </div>
          <div className="hp-foot mono">
            <span style={{ color: "var(--c-green)" }}>91% confidence</span> · 13 nodes · 1 gap resolved
          </div>
        </div>
      </div>
      <div className="home-features">
        {FEATURES.map(([title, text, color, icon]) => (
          <div key={title} className="feat-card">
            <span className="feat-ic" style={{ color, background: `color-mix(in oklch, ${color} 14%, var(--bg-1))` }}>{icon}</span>
            <div className="feat-title">{title}</div>
            <div className="feat-text">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
