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
7. **Close the WHY block — ask, never infer.** `/next` already asked 지금 방식 · 불편;
   now that the screens exist, ask the one question that needed them: 이 화면이 그 불편을
   없애나요? Write this unit's `docs/WHY.md` §2 block from those answers (지금 · 바꾼 것 ·
   노리는 것) and tag its 근거 — a block is the user's own account of their work, never
   your inference from the screens. **If an answer contradicts a block already in the
   file, stop and ask about that block too**: a correction to one unit's account usually
   corrects another's (measured 2026-09-28). Anything you did not ask about is `확인중`
   and goes to §3, never §2; `scripts/verify.sh` fails on a §2 carrying a 확인중 or a
   block with no 근거. Shape: **one block per feature unit**, never one per screen or per
   decision — that altitude belongs to the prototype and the unit spec, and a WHY that
   lists them stops being readable as *why*. Capped at one page.
8. Revise on feedback in the same cycle. When the user approves, freeze it:
   `bash scripts/proto-snapshot.sh <nn-slug>`, then fill that row's last column
   in `prototype/snapshots/INDEX.md` with what the stage settled. Continue with
   `/spec` in the next cycle.
