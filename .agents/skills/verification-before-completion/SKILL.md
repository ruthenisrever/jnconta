---
name: verification-before-completion
description: "A skill for ensuring that all work is correct, complete, and meets the objective BEFORE providing a final update."
---

# Verification Before Completion Skill

The purpose of this skill is to perform a final, comprehensive check on all work done in a task or project to ensure top-quality results and avoid regressions.

## Process

1.  **Objective Review**: Re-read the initial user request and the implementation plan to ensure all requirements were met.
2.  **Code Review**: Perform a final pass over all modified code to check for style, correctness, and potential issues (use the `code-reviewer` agent).
3.  **Automated Testing**: Run all relevant unit, integration, and end-to-end tests.
4.  **Manual Verification**: Perform manual checks on the UI and functionality. Use the `browser_subagent` if applicable.
5.  **Documentation**: Ensure all artifacts (`implementation_plan.md`, `task.md`, `walkthrough.md`) are up-to-date and accurate.
6.  **Cleanup**: Remove any temporary files or debug code.

## Guidelines

-   **Be thorough**: Don't just check the main goal; check for side effects and regressions.
-   **Verify from the user's perspective**: Use the system as they would to ensure a good experience.
-   **Check across browsers/devices**: If applicable, ensure the application works in different environments.
-   **Don't rush the final step**: Quality is more important than speed.
-   **Ask for user verification**: The final check should always include the user's feedback.

## Next Steps

Once verification is complete, provide a final summary to the user and create the `walkthrough.md`.
