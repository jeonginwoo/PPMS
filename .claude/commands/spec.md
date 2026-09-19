---
description: Spec step — turn the approved prototype into a one-page unit spec
---

Write the spec for the current unit.

1. Precondition: this unit's prototype is approved and snapshotted. If it is not,
   stop and run `/proto` instead.
2. Copy `docs/features/_TEMPLATE.md` to `docs/features/<NN-slug>.md` and fill it.
3. **One page.** Write only what the prototype showed and what the user decided.
   Never invent requirements the prototype did not raise, never restate the
   backbone, never describe another unit. A spec that needs a table of contents
   is already too long.
4. §5 "이 단위가 하지 않는 것" is mandatory — it is the scope-creep brake. Anything
   discovered but not in scope goes to the ROADMAP backlog, never into this spec.
5. Any decision that contradicts `docs/BACKBONE.md` or an earlier spec goes to the
   PROGRESS decision log with 근거, and the contradicted document is fixed now.
6. Wait for the user to approve the spec. Implementation never starts without it.
