---
description: End a cycle — verify, record, commit
---

End the current cycle.

1. Run `bash scripts/verify.sh`. If it fails, fix it first — never wrap up red.
2. Report the cycle's diff size. If it went over the 400-line budget, record why
   in the session log — that is the signal that units are being cut too big.
3. Update `docs/PROGRESS.md`:
   - 현재 상태 (진행 중인 단위 · 사이클 단계 · 다음 작업)
   - 세션 로그 entry (use the 형식 template, newest on top)
   - any new decisions → 결정 기록, always with 근거
4. Update this unit's row in `docs/ROADMAP.md` (프로토 / 스펙 / 구현 columns).
5. If `CLAUDE.md` or `docs/BACKBONE.md` drifted from reality this cycle, fix it now.
6. Commit on the work branch — one cycle step = one commit, message format
   `<nn-slug>(프로토|스펙|구현): summary`. Then open the PR with the description
   `docs/conventions/git-workflow.md` §3 lists (verify output including the diff
   budget line, reviewer verdict, snapshot path or spec path).
   Docs-only and harness-only changes (`docs:` / `chore:`) may go straight to `main`.
7. After merging, confirm `main` actually has it: `git log --oneline main` and look
   for the subject. A PR marked merged is not evidence (git-workflow §2).
