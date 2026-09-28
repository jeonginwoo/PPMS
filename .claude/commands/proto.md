---
description: Prototype step — build or revise the plain-HTML prototype for the current unit
---

Build the planning prototype for the current unit.

1. **Plain HTML only** — no build step, no `npm install`, no framework. Shared
   styles in `prototype/assets/base.css`, mock data in `prototype/assets/*.js`.
   It must open by double-click, so classic `<script src>` only — never
   `type="module"`, which `file://` blocks.
   One file per screen by default. When the flow needs state to survive navigation
   (a transfer, a multi-step create), use **one hash-routed page** instead: a
   `file://` page cannot reliably share state across documents, and a transfer
   button that forgets what it did validates nothing.
2. Make it walkable: the screens of this unit link to each other so the user can
   click through the flow. Link every new screen from `prototype/index.html`.
3. Fake data is expected. Never build a backend, an API, or a database for a
   prototype. Realistic sample rows may be lifted from
   `C:\Projects\pms_mcp_v3\reference\seed\` — reference only, never imported.
4. Prototype **only what the declared unit needs**. Screens for other units do not
   belong in this cycle even when they look obvious. The one exception is a unit the
   ROADMAP declares as cross-cutting (B0 is the worked example) — and that breadth is
   agreed **before** the cycle starts, in its own `chore:` commit, never claimed
   afterwards by pointing at what was already built.
5. Run `bash scripts/verify.sh --quick` — broken links fail it.
6. Hand it to the user: say what to look at, and list the open questions this
   prototype is meant to settle (`docs/BACKBONE.md` §4, or the unit's own).
7. **Record the why — but ask before writing it.** A `docs/WHY.md` §2 block is the
   user's own account of their work, never your inference from the screens. Before
   adding or changing one, ask them — 지금은 그 일을 어떻게 하고 계세요(쓰는 도구·양식까지)? ·
   그중 무엇이 불편하세요? · 이 화면이 그 불편을 없애나요? — and write the block from the
   answer, tagging its 근거. **Anything you did not ask about is `확인중` and goes to §3**,
   never to §2; `scripts/verify.sh` fails on a §2 that carries a 확인중 or a block with no
   근거. Shape: **one block per feature unit** (지금 · 바꾼 것 · 노리는 것), never one per
   screen or per decision — that altitude belongs to the prototype and the unit spec, and
   a WHY that lists them stops being readable as *why*. Capped at one page.
8. Revise on feedback in the same cycle. When the user approves, freeze it:
   `bash scripts/proto-snapshot.sh <nn-slug>`, then fill that row's last column
   in `prototype/snapshots/INDEX.md` with what the stage settled. Continue with
   `/spec` in the next cycle.
