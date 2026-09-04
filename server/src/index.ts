import express from "express";
import cors from "cors";
import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  Author,
  DomainError,
  LIMITS,
  authorByToken,
  authorStats,
  createAuthor,
  createNode,
  graphSnapshot,
  graphNode,
  lineageOf,
  toggleVote,
  votedNodeIds,
} from "./db.js";

const PORT = Number(process.env.API_PORT ?? 3001);
const STALE_MS = Number(process.env.STALE_MS ?? 3 * 24 * 60 * 60 * 1000);

const app = express();
app.use(cors());
app.use(express.json());

// ---------- websocket fan-out ----------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(event: object) {
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

// ---------- auth ----------

interface AuthedRequest extends express.Request {
  author?: Author;
}

app.use((req: AuthedRequest, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    req.author = authorByToken(header.slice(7));
  }
  next();
});

function requireAuthor(req: AuthedRequest, res: express.Response): Author | undefined {
  if (!req.author) {
    res.status(401).json({ error: "Unknown identity — refresh the page to get a new one." });
    return undefined;
  }
  return req.author;
}

// ---------- routes ----------

app.post("/api/identity", (_req, res) => {
  const author = createAuthor();
  res.status(201).json({ authorId: author.id, handle: author.handle, token: author.token });
});

app.get("/api/me", (req: AuthedRequest, res) => {
  const author = requireAuthor(req, res);
  if (!author) return;
  res.json({
    authorId: author.id,
    handle: author.handle,
    stats: authorStats(author.id),
    votes: votedNodeIds(author.id),
  });
});

app.get("/api/graph", (_req, res) => {
  const { nodes, links } = graphSnapshot();
  res.json({ nodes, links, config: { staleMs: STALE_MS, limits: LIMITS }, now: Date.now() });
});

app.get("/api/nodes/:id", (req, res) => {
  const node = graphNode(req.params.id);
  if (!node) return res.status(404).json({ error: "Node not found." });
  res.json({ node, lineage: lineageOf(node.id) });
});

app.post("/api/nodes", (req: AuthedRequest, res) => {
  const author = requireAuthor(req, res);
  if (!author) return;
  const { title, body, parentIds } = req.body ?? {};
  if (typeof title !== "string" || typeof body !== "string" || !Array.isArray(parentIds)) {
    return res.status(400).json({ error: "title, body and parentIds are required." });
  }
  try {
    const created = createNode({
      title,
      body,
      authorId: author.id,
      parentIds: parentIds.map(String),
    });
    broadcast({ type: "node:new", node: created.node, links: created.links });
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof DomainError) return res.status(422).json({ error: err.message });
    throw err;
  }
});

app.post("/api/nodes/:id/vote", (req: AuthedRequest, res) => {
  const author = requireAuthor(req, res);
  if (!author) return;
  try {
    const result = toggleVote(req.params.id, author.id);
    broadcast({ type: "vote", nodeId: req.params.id, score: result.score });
    res.json(result);
  } catch (err) {
    if (err instanceof DomainError) return res.status(422).json({ error: err.message });
    throw err;
  }
});

server.listen(PORT, () => {
  console.log(`Andika Tales — API listening on http://localhost:${PORT}`);
});
