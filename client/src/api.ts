import type { GraphLink, GraphNode, GraphPayload, Identity, LineageEntry, MePayload } from "./types";

const STORAGE_KEY = "ssf.identity.v1";
let identity: Identity | null = null;

export function currentIdentity(): Identity | null {
  return identity;
}

export async function bootstrapIdentity(): Promise<Identity> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      identity = JSON.parse(stored) as Identity;
      return identity;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  const res = await fetch("/api/identity", { method: "POST" });
  if (!res.ok) throw new Error("Could not create an identity.");
  identity = (await res.json()) as Identity;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (identity) headers.Authorization = `Bearer ${identity.token}`;
  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    // Server no longer knows this identity (e.g. reseeded database) — mint a fresh one.
    localStorage.removeItem(STORAGE_KEY);
    identity = null;
    await bootstrapIdentity();
    return request<T>(path, init);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  graph: () => request<GraphPayload>("/api/graph"),
  me: () => request<MePayload>("/api/me"),
  node: (id: string) =>
    request<{ node: GraphNode; lineage: LineageEntry[] }>(`/api/nodes/${id}`),
  createNode: (input: { title: string; body: string; parentIds: string[] }) =>
    request<{ node: GraphNode; links: GraphLink[] }>("/api/nodes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  vote: (nodeId: string) =>
    request<{ score: number; voted: boolean }>(`/api/nodes/${nodeId}/vote`, { method: "POST" }),
};

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
