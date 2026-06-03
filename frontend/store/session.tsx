"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { AgentEvent } from "@/types";

export interface LiveNode {
  id: string; label: string; sub?: string; type: string;
  x: number; y: number; r: number; t: number;
}

export interface LiveEdge {
  from: string; to: string; type: string; t: number;
}

interface SessionState {
  sessionId: string | null;
  status: "idle" | "running" | "complete" | "failed";
  question: string;
  events: AgentEvent[];
  sysLogs: { t: number; log: string }[];
  confidence: number;
  nodes: LiveNode[];
  edges: LiveEdge[];
  elapsed: number;
  confMin: number;
  confMax: number;
  intervention: boolean;
  disabledAgents: string[];
  setConfRange: (min: number, max: number) => void;
  clearIntervention: () => void;
  stopSession: () => void;
  toggleAgent: (id: string) => void;
  submit: (question: string) => Promise<void>;
}

const SessionCtx = createContext<SessionState | null>(null);

function autoPos(index: number): { x: number; y: number } {
  if (index === 0) return { x: 0.5, y: 0.46 };
  const angle = index * 137.508 * (Math.PI / 180);
  const r = Math.min(Math.sqrt(index) * 0.16, 0.42);
  return {
    x: Math.max(0.06, Math.min(0.94, 0.5 + r * Math.cos(angle))),
    y: Math.max(0.06, Math.min(0.92, 0.5 + r * Math.sin(angle))),
  };
}

const NODE_RADIUS: Record<string, number> = { concept: 20, evidence: 14, claim: 16, gap: 17, answer: 16 };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("idle");
  const [question, setQuestion] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [sysLogs, setSysLogs] = useState<{ t: number; log: string }[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [nodes, setNodes] = useState<LiveNode[]>([]);
  const [edges, setEdges] = useState<LiveEdge[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [confMin, setConfMin] = useState(30);
  const [confMax, setConfMax] = useState(80);
  const [intervention, setIntervention] = useState(false);
  const [disabledAgents, setDisabledAgents] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const nodeIndexRef = useRef(0);
  const startRef = useRef<number>(0);
  const confMinRef = useRef(confMin);
  const confMaxRef = useRef(confMax);
  confMinRef.current = confMin;
  confMaxRef.current = confMax;

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
    return () => clearInterval(id);
  }, [status]);

  const setConfRange = useCallback((min: number, max: number) => {
    setConfMin(Math.min(min, confMax - 5));
    setConfMax(Math.max(max, confMin + 5));
  }, [confMin, confMax]);

  const clearIntervention = useCallback(() => setIntervention(false), []);

  const stopSession = useCallback(() => {
    wsRef.current?.close();
    setStatus("failed");
    setIntervention(false);
  }, []);

  const toggleAgent = useCallback((id: string) => {
    setDisabledAgents(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }, []);

  const connectWs = useCallback((sid: string) => {
    const ws = new WebSocket(api.wsUrl(sid));
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "agent_event") setEvents(prev => [...prev, msg as AgentEvent]);
      if (msg.type === "sys_event") setSysLogs(prev => [...prev, { t: msg.t, log: msg.log }]);
      if (msg.type === "confidence_update") {
        setConfidence(msg.value);
        if (msg.value < confMinRef.current || msg.value > confMaxRef.current) setIntervention(true);
      }
      if (msg.type === "graph_update") {
        if (msg.node) {
          const idx = nodeIndexRef.current++;
          const pos = autoPos(idx);
          setNodes(prev => {
            if (prev.find(n => n.id === msg.node.id)) return prev;
            return [...prev, { id: msg.node.id, label: msg.node.label, sub: msg.node.sub, type: msg.node.type, ...pos, r: NODE_RADIUS[msg.node.type] ?? 16, t: (Date.now() - startRef.current) / 1000 }];
          });
        }
        if (msg.edge) setEdges(prev => [...prev, { from: msg.edge.from_id, to: msg.edge.to_id, type: msg.edge.type, t: (Date.now() - startRef.current) / 1000 }]);
      }
      if (msg.type === "session_status") {
        setStatus(msg.status);
        if (msg.status === "complete" || msg.status === "failed") ws.close();
      }
    };

    ws.onerror = () => setStatus("failed");
    ws.onclose = () => {
      setStatus(prev => {
        if (prev === "running") {
          api.getSession(sid).then(s => setStatus(s.status as SessionState["status"])).catch(() => setStatus("failed"));
        }
        return prev;
      });
    };
  }, []);

  const submit = useCallback(async (q: string) => {
    if (status === "running") return;
    setQuestion(q);
    setEvents([]); setSysLogs([]); setConfidence(0); setNodes([]); setEdges([]);
    setElapsed(0); setIntervention(false);
    nodeIndexRef.current = 0;
    wsRef.current?.close();

    const session = await api.createSession(q);
    setSessionId(session.id);
    setStatus("running");
    startRef.current = Date.now();
    connectWs(session.id);
    await api.runSession(session.id, disabledAgents, confMin, confMax);
  }, [status, connectWs, disabledAgents, confMin, confMax]);

  return (
    <SessionCtx.Provider value={{
      sessionId, status, question, events, sysLogs, confidence, nodes, edges, elapsed,
      confMin, confMax, intervention, disabledAgents,
      setConfRange, clearIntervention, stopSession, toggleAgent, submit,
    }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be inside SessionProvider");
  return ctx;
}
