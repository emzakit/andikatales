export type NodeKind = "genesis" | "continuation" | "crossover";
export type LinkType = "continuation" | "crossover";

export interface GraphNode {
  id: string;
  title: string;
  kind: NodeKind;
  score: number;
  childCount: number;
  authorHandle: string;
  createdAt: number;
}

export interface GraphLink {
  childId: string;
  parentId: string;
  type: LinkType;
  ord: number;
}

export interface LineageEntry {
  id: string;
  title: string;
  body: string;
  kind: NodeKind;
  score: number;
  authorHandle: string;
  createdAt: number;
  mergedWith?: { id: string; title: string };
}

export interface Limits {
  title: number;
  bodyMin: number;
  bodyMax: number;
}

export interface GraphPayload {
  nodes: GraphNode[];
  links: GraphLink[];
  config: { staleMs: number; limits: Limits };
  now: number;
}

export interface Identity {
  authorId: string;
  handle: string;
  token: string;
}

export interface MePayload {
  authorId: string;
  handle: string;
  stats: { nodesWritten: number; votesReceived: number };
  votes: string[];
}

export type ServerEvent =
  | { type: "node:new"; node: GraphNode; links: GraphLink[] }
  | { type: "vote"; nodeId: string; score: number };
