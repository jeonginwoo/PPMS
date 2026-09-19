---
description: Prototype step — build or revise the plain-HTML prototype for the current unit
---

Build the planning prototype for the current unit.

1. **Plain HTML only** — no build step, no `npm install`, no framework. One file
   per screen under `prototype/`, shared styles in `prototype/assets/base.css`,
   mock data inline or in `prototype/assets/*.js`. It must open by double-click.
2. Make it walkable: the screens of this unit link to each other so the user can
   click through the flow. Link every new screen from `prototype/index.html`.
3. Fake data is expected. Never build a backend, an API, or a database for a
   prototype. Realistic sample rows may be lifted from
   `C:\Projects\pms_mcp_v3\reference\seed\` — reference only, never imported.
4. Prototype **only what this unit needs**. Screens for other units do not belong
   in this cycle even when they look obvious.
5. Run `bash scripts/verify.sh --quick` — broken links fail it.
6. Hand it to the user: say what to look at, and list the open questions this
   prototype is meant to settle (`docs/BACKBONE.md` §4, or the unit's own).
7. Revise on feedback in the same cycle. When the user approves, freeze it:
   `bash scripts/proto-snapshot.sh <nn-slug>`, then fill that row's last column
   in `prototype/snapshots/INDEX.md` with what the stage settled. Continue with
   `/spec` in the next cycle.
