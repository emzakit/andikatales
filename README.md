# The Story So Far ✦

A massively multiplayer collaborative storytelling platform. Every prompt is a star,
every continuation is a branch, and crossovers pull separate stories into one
shared universe with a glowing red string.

## Run it

```bash
npm install
npm run seed   # optional: seed a small demo universe (wipes existing data)
npm run dev    # starts API (:3001) + web client (:5173)
```

Open http://localhost:5173. Other devices on your LAN can join via your machine's IP.

## How it works

- **Nodes** are chapters: a title, a block of story text, and an anonymous author.
  A node with no parents is a **genesis** (new story), one parent is a
  **continuation**, two parents is a **crossover** — the red string that merges
  two timelines into one universe. The graph is a DAG stored in SQLite.
- **Constellation view**: canvas + d3-force. Click a star to read its full lineage
  (the tracing tool highlights the path back to genesis). Scroll to zoom, drag to pan.
- **Identity**: an anonymous handle + secret token is minted on first visit and kept
  in `localStorage` — no signup.
- **Live**: node creation and votes broadcast over WebSocket to everyone.
- **Neglected stories** (leaves with no continuation for `STALE_MS`, default 3 days)
  pulse amber, begging to be continued.

## Layout

- `server/` — Express + `ws` + better-sqlite3. Schema in `src/db.ts`, seed in `src/seed.ts`.
- `client/` — Vite + React. Constellation renderer in `src/graph/ConstellationCanvas.tsx`.
