# Git Workflow (1 human + AI agents)

> Model: **GitHub Flow** — `main` + short-lived branches.
> Referenced from the root `CLAUDE.md`. AI agents follow the same rules as the human.
>
> Carried over from `pms_mcp_v3` on 2026-09-19 and rewritten for v4. v3's version
> assumed two developers on two tracks (`host/` vs `pms/`); v4 is a single track, so
> the whole conflict-prevention section and the "approval from the other person"
> merge condition are gone. What survived is what protects `main` from a lone
> developer working with an agent.

## 1. Branch rules

- **`main` is always green.** No code commits directly to `main`. Exception: docs
  (`docs:`) and harness (`chore:`) changes may go straight to `main`.
- **AI agents never do code work on `main`.** Check the branch at session start;
  if on `main`, branch first. This is the single most important rule here — an
  agent that commits to `main` removes the only place the human reviews before
  the change is permanent.
- **1 cycle step = 1 branch = 1 PR.** A cycle step is one cell of the ROADMAP
  table (프로토 / 스펙 / 구현 of one unit) — not a whole unit. A branch that
  lives longer than 1–2 days means the unit was cut too big (CLAUDE.md, 400-line
  budget).
- **Naming**: `<type>/<nn-slug>`. Types mirror the cycle:
  `proto/` · `spec/` · `feat/` · `fix/` · `chore/` · `docs/`.
  Examples: `proto/b1-backbone`, `spec/b1-backbone`, `feat/b5-transfer`.
- **Starting procedure**:
  `git switch main && git pull --rebase && git switch -c proto/b1-backbone`
- **Session start = sync**: `git pull --rebase` before reading PROGRESS/ROADMAP or
  planning. Planning against a stale `main` surfaces as a rejected push at the
  worst possible moment. `/next` enforces this.

## 2. PR & merge rules

- **Merge method: squash merge** — `main` keeps "1 cycle step = 1 commit", which is
  what makes `git log` readable as the project's history.
- **Commit / squash message**: `<nn-slug>(프로토|스펙|구현): summary`, matching
  `/wrap-up`. Non-cycle commits use `docs:` / `chore:`.
- **Merge conditions** (there is no second reviewer and no CI yet — the gate is
  what the repo can actually check):
  1. `bash scripts/verify.sh` green,
  2. the `reviewer` agent's verdict is `APPROVE`,
  3. the human has looked at the diff.
  Attach 1 and 2 to the PR description. Self-merge is normal here; the PR exists
  to give the human a review surface, not to collect approvals.
- Sync with `git pull --rebase origin main` before opening the PR. Delete the
  branch after merging.
- **A PR marked merged is not evidence that `main` has the code** (v3, 2026-08-25).
  A PR based on another branch lands in that branch, and if the base merged first,
  the stacked PR merges into a dead branch — GitHub reports success and the work
  never reaches `main`. So: **branch from `main`**, and after merging anything run
  `git log --oneline main` and confirm the subject is there.

## 3. What goes in the PR description

- what cycle step this is (unit · 프로토/스펙/구현) and the one-line goal,
- `bash scripts/verify.sh` output, including the **diff budget line**,
- the `reviewer` agent verdict,
- for a 프로토 step: the snapshot path (`prototype/snapshots/<NNN>-<label>/`),
- for a 구현 step: the spec it implements (`docs/features/<NN-slug>.md`).

## 4. Forbidden

- No force push to `main` (`.claude/settings.json` blocks the agent's
  `git push --force`).
- Force push to a work branch only with `--force-with-lease`.
- **Never weaken or delete a test, a check, or a verify stage to get a PR through.**
  Fix the code instead. The `reviewer` agent treats this as a BLOCKER.
- Never edit or delete anything under `prototype/snapshots/` (append-only —
  CLAUDE.md structure rule 2).
