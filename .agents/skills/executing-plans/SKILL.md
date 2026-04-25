---
name: executing-plans
description: "A skill for systematically executing a plan, tracking progress, and managing tasks."
---

# Executing Plans Skill

The goal of this skill is to translate a written plan into a completed implementation, ensuring that all tasks are tracked and verified.

## Process

1.  **Preparation**: Ensure an implementation plan and a `task.md` exist.
2.  **Task Execution**: For each task in `task.md`:
    -   Mark the task as in-progress (`[/]`).
    -   Implement the changes described in the task.
    -   Verify the changes (e.g., compile, run tests, manually check).
    -   Mark the task as completed (`[x]`).
3.  **Ongoing Maintenance**: Update the implementation plan if significant changes are needed during execution.
4.  **Verification**: Once all tasks are complete, perform final verification.
5.  **Completion**: Notify the user and provide a summary of the accomplishments.

## Guidelines

-   **Focus on one task at a time**: Avoid doing multiple things at once.
-   **Commit frequently**: If you have git access, commit after each logical task.
-   **Maintain transparency**: Keep the `task.md` updated so the user can see your progress.
-   **Don't skip verification**: Every task, no matter how small, must be verified.
-   **Ask for help if blocked**: If a task is more complex than expected, stop and consult the user.

## Next Steps

Once execution is complete, proceed to the `verification-before-completion` skill.
