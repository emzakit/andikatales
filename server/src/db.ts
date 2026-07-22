import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { randomHandle } from "./handles.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "story.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS authors (
  id         TEXT PRIMARY KEY,
  handle     TEXT NOT NULL UNIQUE,
  token      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('genesis','continuation','crossover')),
  author_id  TEXT NOT NULL REFERENCES authors(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS links (
  child_id  TEXT NOT NULL REFERENCES nodes(id),
  parent_id TEXT NOT NULL REFERENCES nodes(id),
  link_type TEXT NOT NULL CHECK (link_type IN ('continuation','crossover')),
  ord       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (child_id, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_links_parent ON links(parent_id);

CREATE TABLE IF NOT EXISTS votes (
  node_id    TEXT NOT NULL REFERENCES nodes(id),
  author_id  TEXT NOT NULL REFERENCES authors(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (node_id, author_id)
);
`);

export interface Author {
  id: string;
  handle: string;
  token: string;
}

export interface GraphNode {
  id: string;
  title: string;
  kind: "genesis" | "continuation" | "crossover";
  score: number;
  childCount: number;
  authorHandle: string;
  createdAt: number;
}

export interface GraphLink {
  childId: string;
  parentId: string;
  type: "continuation" | "crossover";
  ord: number;
}

export interface LineageEntry {
  id: string;
  title: string;
  body: string;
  kind: GraphNode["kind"];
  score: number;
  authorHandle: string;
  createdAt: number;
  mergedWith?: { id: string; title: string };
}

export const LIMITS = { title: 90, bodyMin: 10, bodyMax: 4000 };

// ---------- authors ----------

export function createAuthor(): Author {
  const insert = db.prepare(
    "INSERT INTO authors (id, handle, token, created_at) VALUES (?, ?, ?, ?)"
  );
  for (let attempt = 0; attempt < 20; attempt++) {
    const author: Author = { id: nanoid(12), handle: randomHandle(), token: nanoid(32) };
    try {
      insert.run(author.id, author.handle, author.token, Date.now());
      return author;
    } catch {
      // handle collision — roll a new one
    }
  }
  throw new Error("could not generate a unique handle");
}

export function authorByToken(token: string): Author | undefined {
  return db
    .prepare("SELECT id, handle, token FROM authors WHERE token = ?")
    .get(token) as Author | undefined;
}

export function authorStats(authorId: string): { nodesWritten: number; votesReceived: number } {
  const nodesWritten = (
    db.prepare("SELECT COUNT(*) AS c FROM nodes WHERE author_id = ?").get(authorId) as { c: number }
  ).c;
  const votesReceived = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM votes v JOIN nodes n ON n.id = v.node_id WHERE n.author_id = ?"
      )
      .get(authorId) as { c: number }
  ).c;
  return { nodesWritten, votesReceived };
}

export function votedNodeIds(authorId: string): string[] {
  return (db.prepare("SELECT node_id FROM votes WHERE author_id = ?").all(authorId) as {
    node_id: string;
  }[]).map((r) => r.node_id);
}

// ---------- graph reads ----------

const graphNodeSelect = `
  SELECT n.id, n.title, n.kind, n.created_at AS createdAt, a.handle AS authorHandle,
    (SELECT COUNT(*) FROM votes v WHERE v.node_id = n.id) AS score,
    (SELECT COUNT(*) FROM links l WHERE l.parent_id = n.id) AS childCount
  FROM nodes n JOIN authors a ON a.id = n.author_id
`;

export function graphSnapshot(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes = db.prepare(graphNodeSelect).all() as GraphNode[];
  const links = db
    .prepare(
      "SELECT child_id AS childId, parent_id AS parentId, link_type AS type, ord FROM links"
    )
    .all() as GraphLink[];
  return { nodes, links };
}

export function graphNode(id: string): GraphNode | undefined {
  return db.prepare(`${graphNodeSelect} WHERE n.id = ?`).get(id) as GraphNode | undefined;
}

export function linksOf(childId: string): GraphLink[] {
  return db
    .prepare(
      "SELECT child_id AS childId, parent_id AS parentId, link_type AS type, ord FROM links WHERE child_id = ?"
    )
    .all(childId) as GraphLink[];
}

/** All ancestor ids of a node (both continuation and crossover edges). */
export function ancestorsOf(id: string): Set<string> {
  const rows = db
    .prepare(
      `WITH RECURSIVE anc(id) AS (
         SELECT parent_id FROM links WHERE child_id = ?
         UNION
         SELECT l.parent_id FROM links l JOIN anc ON l.child_id = anc.id
       ) SELECT id FROM anc`
    )
    .all(id) as { id: string }[];
  return new Set(rows.map((r) => r.id));
}

/** Chapter chain from genesis to the node, following each node's primary (ord 0) parent. */
export function lineageOf(id: string): LineageEntry[] {
  const rows = db
    .prepare(
      `WITH RECURSIVE chain(id, depth) AS (
         SELECT ?, 0
         UNION ALL
         SELECT l.parent_id, chain.depth + 1
         FROM links l JOIN chain ON l.child_id = chain.id AND l.ord = 0
       )
       SELECT n.id, n.title, n.body, n.kind, n.created_at AS createdAt, a.handle AS authorHandle,
         (SELECT COUNT(*) FROM votes v WHERE v.node_id = n.id) AS score
       FROM chain JOIN nodes n ON n.id = chain.id JOIN authors a ON a.id = n.author_id
       ORDER BY chain.depth DESC`
    )
    .all(id) as LineageEntry[];

  const mergedWith = db.prepare(
    "SELECT n.id, n.title FROM links l JOIN nodes n ON n.id = l.parent_id WHERE l.child_id = ? AND l.ord = 1"
  );
  for (const entry of rows) {
    if (entry.kind === "crossover") {
      entry.mergedWith = mergedWith.get(entry.id) as { id: string; title: string } | undefined;
    }
  }
  return rows;
}

// ---------- writes ----------

export class DomainError extends Error {}

export function createNode(input: {
  title: string;
  body: string;
  authorId: string;
  parentIds: string[];
  createdAt?: number;
  id?: string;
}): { node: GraphNode; links: GraphLink[] } {
  const title = input.title.trim();
  const body = input.body.trim();
  const parentIds = input.parentIds;

  if (!title || title.length > LIMITS.title) {
    throw new DomainError(`Title must be 1–${LIMITS.title} characters.`);
  }
  if (body.length < LIMITS.bodyMin || body.length > LIMITS.bodyMax) {
    throw new DomainError(`Story text must be ${LIMITS.bodyMin}–${LIMITS.bodyMax} characters.`);
  }
  if (parentIds.length > 2) throw new DomainError("A node can have at most two parents.");
  if (new Set(parentIds).size !== parentIds.length) {
    throw new DomainError("Parent nodes must be distinct.");
  }
  for (const pid of parentIds) {
    if (!graphNode(pid)) throw new DomainError("Parent node does not exist.");
  }
  if (parentIds.length === 2) {
    const [a, b] = parentIds;
    if (ancestorsOf(a).has(b) || ancestorsOf(b).has(a)) {
      throw new DomainError(
        "Those two nodes are already part of the same timeline — write a continuation instead."
      );
    }
  }

  const kind =
    parentIds.length === 0 ? "genesis" : parentIds.length === 1 ? "continuation" : "crossover";
  const linkType = kind === "crossover" ? "crossover" : "continuation";
  const id = input.id ?? nanoid(12);
  const createdAt = input.createdAt ?? Date.now();

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO nodes (id, title, body, kind, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, title, body, kind, input.authorId, createdAt);
    const insertLink = db.prepare(
      "INSERT INTO links (child_id, parent_id, link_type, ord) VALUES (?, ?, ?, ?)"
    );
    parentIds.forEach((pid, ord) => insertLink.run(id, pid, linkType, ord));
  });
  tx();

  return { node: graphNode(id)!, links: linksOf(id) };
}

export function toggleVote(nodeId: string, authorId: string): { score: number; voted: boolean } {
  if (!graphNode(nodeId)) throw new DomainError("Node does not exist.");
  const existing = db
    .prepare("SELECT 1 FROM votes WHERE node_id = ? AND author_id = ?")
    .get(nodeId, authorId);
  if (existing) {
    db.prepare("DELETE FROM votes WHERE node_id = ? AND author_id = ?").run(nodeId, authorId);
  } else {
    db.prepare("INSERT INTO votes (node_id, author_id, created_at) VALUES (?, ?, ?)").run(
      nodeId,
      authorId,
      Date.now()
    );
  }
  const score = (
    db.prepare("SELECT COUNT(*) AS c FROM votes WHERE node_id = ?").get(nodeId) as { c: number }
  ).c;
  return { score, voted: !existing };
}
