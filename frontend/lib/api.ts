const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

export interface SessionResponse {
  id: string;
  question: string;
  status: string;
  confidence: number;
  node_count: number;
  edge_count: number;
  created_at: string;
}

export const api = {
  createSession: (question: string) =>
    post<SessionResponse>("/api/sessions", { question }),

  runSession: (id: string) =>
    post<{ session_id: string; status: string }>(`/api/sessions/${id}/run`),

  getSession: (id: string) =>
    get<SessionResponse>(`/api/sessions/${id}`),

  listSessions: () =>
    get<SessionResponse[]>("/api/sessions"),

  getGraph: (id: string) =>
    get<{ nodes: unknown[]; edges: unknown[] }>(`/api/sessions/${id}/graph`),

  wsUrl: (id: string) =>
    `${BASE.replace("http", "ws")}/api/sessions/${id}/ws`,
};
