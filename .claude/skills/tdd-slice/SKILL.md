---
name: tdd-slice
description: >-
  Drives one change test first (red, green, refactor) in this monorepo, at the lowest test layer
  that can show the behaviour. Use for any new rule, use case, endpoint or bug fix.
---

# TDD slice

## Workflow

1. **Pick the layer.** Pure rule → unit test next to the code. Use case → service test with
   in-memory fakes of its ports. HTTP edge → integration test on the real pipeline, response
   validated against the Zod contract. Screen → component test with a stubbed API. Whole flow →
   e2e (sparingly).
2. **Red.** Write one failing test named after the behaviour. Run it and see it fail for the
   right reason. Never skip this.
3. **Green.** Smallest change that passes. No speculative code.
4. **Refactor.** With the bar green, tidy names and duplication.
5. **Gates.** Run `pnpm lint && pnpm typecheck && pnpm test`, plus the boundary gates once they
   exist.

## Teaching mode

The owner writes the code. Explain the concept first, link the official docs, let the owner type
the test, then review. Do not write the implementation before the test has failed.
