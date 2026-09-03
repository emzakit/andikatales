# Changelog

What changed and why since the previous entry. Git holds the diff; this holds the reasons and the decisions. ISO dates, grouped by module, using only the headings that apply. When this passes ~300 lines, move entries older than the last ten to `docs/archive/CHANGELOG-<yyyy>.md`.

Entry format:

    ## YYYY-MM-DD (<roadmap ids touched>)
    ### <module name>
    **Added:** …
    **Changed:** …
    **Fixed:** …
    **Removed:** …
    **Decided:** <decision> — because <reason>. Alternative considered: <what, and why not>.

## Entries (newest first)

## 2026-09-03 (R-002)

### server
**Fixed:** the API failed to start with `ERR_DLOPEN_FAILED` — "The module `better_sqlite3.node` was compiled against a different Node.js version using NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 137." The local Node runtime had moved from 22 to 24; the installed `better-sqlite3` 11.10.0 predates Node 24 and ships no prebuilt binary for its ABI.

**Changed:** `better-sqlite3` `^11.8.0` to `^13.0.3`, and `@types/better-sqlite3` `^7.6.12` to `^9.6.0`. No call-site changes were needed — the API surface this project uses (`new Database`, `pragma`, `exec`, `prepare().run/get/all`, `transaction`) is unchanged across those majors, and both workspaces typecheck.

**Decided:** upgrade the dependency rather than rebuild the existing one — because `npm rebuild better-sqlite3` on 11.10.0 has no prebuild for ABI 137 and would fall back to compiling from source, which requires MSVC build tools that this Windows machine does not have. Alternatives considered: pinning Node back to 22 (rejected — pins every contributor to an ageing runtime to satisfy one dependency); bumping only to `^12` (the minimum with Node 24 prebuilds, rejected — 13 is current, equally compatible, and avoids a second upgrade later).

## 2026-09-03 (R-001)

### project
**Added:** the initial build of The Story So Far — an Express + WebSocket + SQLite API over a story DAG (genesis, continuation and crossover nodes), and a Vite + React client rendering the graph as a d3-force constellation on canvas, with lineage tracing, red-string crossovers, votes, anonymous identities, and attention pulses on neglected stories.

**Fixed:** the API read `process.env.PORT`, which the preview harness sets to the web server's port, so it tried to bind 5173 and crashed with `EADDRINUSE`. It now reads `API_PORT`.

**Fixed:** the initial camera fit ran once before the force layout had finished expanding, so the view could open off-centre. The camera now eases toward the bounding box of the whole universe each frame until the first user pan or zoom.

**Decided:** SQLite via `better-sqlite3` for the story graph — because the schema is a small DAG with recursive-CTE lineage queries, which SQLite handles natively, and it needs no separate service to run locally. Alternative considered: Postgres (deferred to first public deploy, where concurrent writes and hosting matter).

**Decided:** anonymous identity as a handle plus a secret token in `localStorage` — because signup friction would kill a "write one chapter and go" loop, while still giving each author a stable id for attribution and stats. Alternative considered: OAuth accounts (rejected for the MVP; revisit if cross-device identity is wanted).
