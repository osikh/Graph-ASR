"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/store/session";

const NAV = [
  { id: "workspace", label: "Workspace", icon: "▦", href: "/workspace" },
  { id: "knowledge", label: "Knowledge", icon: "◈", href: "/knowledge" },
  { id: "sessions",  label: "Sessions",  icon: "≣", href: "/sessions" },
  { id: "analytics", label: "Analytics", icon: "◴", href: "/analytics" },
  { id: "home",      label: "Overview",  icon: "⌂", href: "/" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { nodes, status, elapsed } = useSession();
  const elapsedSec = (elapsed / 1000).toFixed(0).padStart(2, "0");

  return (
    <header className="topnav">
      <div className="brand">
        <div className="logo" />
        <div>
          Graph<span style={{ color: "var(--text-3)", fontWeight: 400 }}>·</span>ARS
          <div className="sub">adaptive reasoning system</div>
        </div>
      </div>

      <nav className="nav-tabs">
        {NAV.map(n => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link key={n.id} href={n.href} className={`nav-tab ${active ? "active" : ""}`}>
              <span style={{ fontSize: 13 }}>{n.icon}</span>{n.label}
            </Link>
          );
        })}
      </nav>

      <div className="nav-right">
        <div className="sys-stat"><span style={{ color: "var(--c-blue)" }}>◈</span> {nodes.length} nodes</div>
        <div className="sys-stat">
          <span className="dot live" style={{ background: status === "running" ? "var(--c-blue)" : "var(--c-green)" }} />
          {status === "running" ? `${elapsedSec}s` : status}
        </div>
        <div className="avatar">RA</div>
      </div>
    </header>
  );
}
