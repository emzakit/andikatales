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

## 2026-09-03 — Fix native-module load failure after Node upgrade (R-002)
**Done:** `better-sqlite3` upgraded 11.10.0 to 13.0.3 (and `@types/better-sqlite3` 7.6 to 9.6), which restores a prebuilt binary matching Node 24's ABI. Verified: both workspaces typecheck, client production build succeeds, seed runs, the API boots and serves identity/graph/node-create/vote/lineage correctly, the ancestor-merge guard still rejects invalid crossovers, and a new node fans out over the WebSocket to a connected client.
**Half-done:** none.
**Blocked:** nothing.
**Next:** push the repo to GitHub. `gh repo create story-so-far --private --source . --push` currently fails with `HTTP 401: Bad credentials`; run `gh auth refresh -h github.com` first, or add the remote manually and `git push -u origin main`.
**Open questions:** none.
**Not in scope, noticed:** the repo declares no supported Node version. An `engines` field in the root `package.json` (`"node": ">=20"`) plus an `.nvmrc` would make this class of ABI break obvious at install time rather than at first run. Also worth considering before any public deploy: moderation tooling (report/hide a node), and swapping SQLite for Postgres.
