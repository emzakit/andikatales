# Handover

The note on the desk for the next session, human or agent. Read the top entry before starting any task; add one before finishing. Short — what someone needs to pick up, not a diary. When this passes ~300 lines, move entries older than the last five to `docs/archive/HANDOVER-<yyyy-mm>.md`.

Entry format:

    ## YYYY-MM-DD — <task or feature> (<roadmap id>)
    **Done:** what is finished and verified
    **Half-done:** what exists but isn't finished, and exactly where it stops
    **Blocked:** what is stuck, and on what
    **Next:** the single most useful next step
    **Open questions:** decisions that need the human
    **Not in scope, noticed:** things spotted and deliberately not touched

## Entries (newest first)

## 2026-09-04 — Rename to Andika Tales, MIT license, roadmap removed
**Done:** the app is now **Andika Tales** everywhere it is user-visible or published: browser title, the HUD heading, the API startup log, and the npm package names (`andika-tales`, `@andika/client`, `@andika/server`) with the lockfile regenerated. The reader panel kicker read "The story so far", which was the literal old app name, so it is now "The thread so far" — same meaning, no stale branding. All five screenshots were recaptured against the running app so none of them show the old name. Added an MIT `LICENSE` (Copyright 2026 Mundhir Werner, confirmed with the human) and a `license` field in the root manifest, with a License section in the README. Verified: both workspaces typecheck, the client production build succeeds, and both servers come up under the new name.
**Half-done:** none.
**Blocked:** nothing.
**Next:** push to GitHub. `gh` still returns `HTTP 401: Bad credentials` — run `gh auth refresh -h github.com`, then `gh repo create andika-tales --public --source . --push`.
**Open questions:** the working directory and git repo folder are still named `story-so-far`. Nothing depends on that name, so it is cosmetic, but the GitHub repo name is worth deciding deliberately when pushing.
**Not in scope, noticed:** `docs/ROADMAP.md` was removed at the human's request, so the roadmap-id tags were stripped from the remaining entries. Commit messages from before the removal still cite R-002 and R-009; those are historical and were left alone. Still open: `engines` / `.nvmrc` for the Node 20+ requirement.

## 2026-09-04 — README with captured screenshots
**Done:** README rewritten as a proper front door — what the game is, the three node kinds, lineage tracing, crossovers, the composer, quickstart, architecture notes and code layout. Five screenshots captured from the running app against the seeded demo universe and committed to `docs/screenshots/`: the constellation, a traced five-chapter lineage, weaving a crossover, a crossover chapter in the reader, and the composer. All image paths verified to resolve.
**Half-done:** none.
**Blocked:** nothing.
**Next:** push to GitHub. `gh` still returns `HTTP 401: Bad credentials` — run `gh auth refresh -h github.com` first, then `gh repo create story-so-far --public --source . --push`.
**Open questions:** the repo has no LICENSE. GitHub treats that as all-rights-reserved by default, which may not match the intent of a collaborative writing project — worth deciding before making it public.
**Not in scope, noticed:** screenshots were captured with a throwaway playwright-core script run from the scratchpad against the system Edge install, deliberately not added as a project dependency. If they need regular refreshing, that script is worth keeping as a devDependency-backed `npm run shots`. Also still open: `engines` / `.nvmrc`.

## 2026-09-04 — Fix native-module load failure after Node upgrade
**Done:** `better-sqlite3` upgraded 11.10.0 to 13.0.3 (and `@types/better-sqlite3` 7.6 to 9.6), which restores a prebuilt binary matching Node 24's ABI. Verified: both workspaces typecheck, client production build succeeds, seed runs, the API boots and serves identity/graph/node-create/vote/lineage correctly, the ancestor-merge guard still rejects invalid crossovers, and a new node fans out over the WebSocket to a connected client.
**Half-done:** none.
**Blocked:** nothing.
**Next:** push the repo to GitHub. `gh repo create story-so-far --private --source . --push` currently fails with `HTTP 401: Bad credentials`; run `gh auth refresh -h github.com` first, or add the remote manually and `git push -u origin main`.
**Open questions:** none.
**Not in scope, noticed:** the repo declares no supported Node version. An `engines` field in the root `package.json` (`"node": ">=20"`) plus an `.nvmrc` would make this class of ABI break obvious at install time rather than at first run. Also worth considering before any public deploy: moderation tooling (report/hide a node), and swapping SQLite for Postgres.
