---
description: Start a cycle — restore state, pick one unit, plan one step, wait for approval
---

Start a work cycle.

0. **Sync and branch.** `git pull --rebase`, then check the current branch. If it is
   `main`, branch before any code, prototype or spec work —
   `git switch -c <type>/<nn-slug>` per `docs/conventions/git-workflow.md` §1.
   Docs-only or harness-only work may stay on `main`.
1. Read `docs/PROGRESS.md` — current state, decision log, 다음 작업.
2. Read `docs/ROADMAP.md` — confirm which unit is next. Backbone units (B*) come
   before feature units. Never start a feature unit while a backbone unit it
   depends on is unfinished.
3. Read the unit's own row and decide which step of the cycle it is at:
   - no prototype snapshot yet ....... this is a `/proto` cycle
   - prototype approved, no spec ..... this is a `/spec` cycle
   - spec approved ................... this is an implementation cycle
4. **For a 프로토 cycle, ask before planning.** This unit's `docs/WHY.md` block starts
   here, not after the screens exist — ask the user 지금은 그 일을 어떻게 하고 계세요(쓰는
   도구·양식까지)? · 그중 무엇이 불편하세요?, and carry the answer into the plan as the
   unit's 지금. These two answers are **inputs to the prototype**: asked afterwards they
   arrive too late to change a screen, and the WHY ends up written to match whatever was
   already built (measured 2026-09-28). Skip only when §2 already holds this unit's block
   and the user confirms it still holds.
5. Present a plan for **exactly one step of one unit** and wait for user approval
   before writing any prototype, spec, or code.
6. State the expected diff size in the plan. If it is over the 400-line budget,
   split the unit first and say so — never ask permission to exceed the budget.
7. If the step depends on something `docs/BACKBONE.md` §4 lists as 미확정, name
   that open question in the plan. The prototype exists to settle it.
8. For an implementation step, read the convention covering the files you will touch
   (`docs/conventions/`) before planning — not after the code is written.
