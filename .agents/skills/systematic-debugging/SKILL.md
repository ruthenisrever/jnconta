---
name: systematic-debugging
description: "A skill for identifying, isolating, and fixing bugs in a logical and documented way."
---

# Systematic Debugging Skill

The goal of this skill is to provide a structured approach to debugging that avoids "guess-and-check" and ensures that the root cause is addressed.

## Process

1.  **Observe & Reproduce**: Clearly document the unexpected behavior and provide a reliable reproduction case.
2.  **Isolate & Minimize**: Narrow down the location of the bug and create a minimal failing test case (using `test-driven-development`).
3.  **Hypothesize**: Formulate one or more hypotheses about why the bug is occurring.
4.  **Test Hypotheses**: Verify each hypothesis by examining state, logs, or performing experiments.
5.  **Fix**: Once the root cause is identified, implement the fix.
6.  **Verify**: Ensure the reproduction case no longer fails and that no regressions were introduced.
7.  **Reflect**: Document what was learned to avoid similar bugs in the future.

## Guidelines

-   **Don't jump to conclusions**: Trust the data, not your intuition.
-   **Use logging and the debugger**: Get visibility into the system's state.
-   **Explain "why"**: When fixing, record not just *what* was changed, but *why* it resolves the issue.
-   **Automate reproduction**: A bug is only truly fixed if there's a test to prove it.
-   **Communicate findings**: Keep the user informed about the source of the issue.

## Next Steps

Once the bug is fixed and verified, resume normal development or proceed to `verification-before-completion`.
