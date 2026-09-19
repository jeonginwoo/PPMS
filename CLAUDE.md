# PMS v4 — in-house PMS rebuild, planned one unit at a time

`C:\Projects\pms_mcp_v3` is **read-only reference** — history, never current spec.
Two things about it are deliberately not repeated here:

- it planned everything up front (a 150KB PRD, a 197KB ledger), so a single cycle
  produced more code than a human could review;
- it was built around MCP — the repo name, the roadmap and the two-dev split all
  took the AI host as the product, and the PMS bent to fit it.

**In v4 the product is the PMS.** MCP is one feature unit hanging off the backbone
like any other.

## Session start

Read `docs/PROGRESS.md` first — current state, decision log, next task.
`docs/ROADMAP.md` is the feature-unit backlog. `docs/BACKBONE.md` is the skeleton
(three areas + the transfer pipeline) — a sketch to be confirmed, not a frozen spec.

## The cycle (invariant — never skip a step, never run two units at once)

```
단위 선택 → 프로토타입(HTML) → 사용자 리뷰 → 1페이지 스펙 → 구현 → 검증 → 기록
```

1. **One feature unit per cycle.** A unit is what fits in one reviewable diff.
2. Planning starts as a **plain HTML prototype** in `prototype/`. Never write a
   spec before the user has reviewed the prototype for that unit.
3. The spec is `docs/features/<NN-slug>.md` and stays **one page**. There is no
   global PRD in this repo — writing one is the mistake this repo exists to avoid.
4. Implementation never starts without an approved spec file for that unit.
5. **Diff budget: 400 lines per cycle** (`docs/` and `prototype/snapshots/`
   excluded). Over budget means the unit was cut too big — split it and say so.
   Never ask for permission to exceed it.

## Commands

```bash
bash scripts/verify.sh [--quick]        # docs + prototype links (+ snapshot/budget checks)
                                        # full log → build/last-verify.log
                                        # on FAIL read only the failing part (grep/tail)
bash scripts/proto-snapshot.sh <label>  # freeze prototype/ into prototype/snapshots/
```

## Structure rules (invariants — never write code that violates them)

1. `prototype/` is throwaway planning material, not product code. No build step,
   no npm dependency, no framework. Mock data inline or in `prototype/assets/*.js`.
2. `prototype/snapshots/` is **append-only** — a frozen stage is never edited and
   never deleted, only added to. Write there through `scripts/proto-snapshot.sh` only.
3. `docs/BACKBONE.md` changes only together with a PROGRESS decision-log entry.
4. Every feature unit has exactly one file under `docs/features/`. No unit spec
   describes another unit's screens.
5. The transfer pipeline 영업 → 솔루션 → 유지보수 is the backbone. Features hang off
   it; none of them is built before the backbone step they depend on.
6. MCP / AI chat is a **feature unit** (ROADMAP F9), never an architectural premise.
   No host app, no tool catalog, no MCP-shaped API or module boundary is built or
   reserved before that unit's own cycle. One track — v4 has no per-role commands.

## Way of working

- Cycle control: `/next` (restore → plan → wait for approval) → `/proto` or `/spec`
  or implement → `bash scripts/verify.sh` → `/wrap-up` (record → commit).
- Never claim a task done unless `bash scripts/verify.sh` passes.
- Decisions that change or contradict a document go to the PROGRESS decision log,
  always with 근거, and the contradicted document is fixed in the same cycle.
- Harness parts are added only when their pain is felt — no empty sections, no
  speculative parts. The same rule applies to the product.
- Language: instruction files (this file, commands, agents, scripts) in English;
  records (PROGRESS, ROADMAP, BACKBONE, features) in Korean. Code comments in Korean.
