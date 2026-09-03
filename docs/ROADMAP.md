# Roadmap

One living file. Every feature has a stable id (`R-001`, `R-002`, …) that changelog entries, handover entries and commit messages point at. Rows move between sections and are never deleted: Parked and Dropped are the record of what was left behind and why. When a phase or milestone completes, add a line to History — that section is "how far we've come".

## In progress
| ID | Feature | Started | Notes |
|---|---|---|---|

## Planned
| ID | Feature | Why it matters | Depends on |
|---|---|---|---|
| R-003 | Push to GitHub | The repo exists locally only; no backup and no way to collaborate | `gh` auth (currently returns HTTP 401) |
| R-004 | Moderation: report and hide a node | An open write surface with no moderation cannot be opened to the public | R-003 |
| R-005 | Discovery feeds (hottest threads, loneliest stars) | Once the graph is large, the constellation alone stops surfacing where to write next | — |
| R-006 | Constellation minimap | Panning a universe of thousands of stars gets lost without an overview | — |
| R-007 | Postgres instead of SQLite | SQLite serialises writers; a public deploy needs real concurrency and managed hosting | R-004 |
| R-008 | Declare a supported Node version (`engines` + `.nvmrc`) | Node 22 to 24 silently broke the native SQLite binary (see R-002); this makes the requirement explicit at install time | — |

## Done
| ID | Feature | Finished | Notes |
|---|---|---|---|
| R-001 | Initial multiplayer MVP: story DAG API, constellation client, crossovers, votes, live updates | 2026-09-03 | Seeded demo universe of 12 nodes across 3 stories with 1 crossover |
| R-002 | Fix `better-sqlite3` ABI mismatch after the Node 22 to 24 upgrade | 2026-09-03 | Upgraded to 13.0.3; verified typecheck, build, seed, API and WebSocket |

## Parked
| ID | Feature | Parked on | Why | Revisit when |
|---|---|---|---|---|

## Dropped
| ID | Feature | Dropped on | Why |
|---|---|---|---|

## History
- **2026-09-03** — First working build. The full loop runs end to end: begin a story, continue someone else's, weave a crossover between two universes, vote, and watch it all appear live for every connected player.
