---
name: writing-plans
description: "A skill for creating detailed, actionable implementation plans for a task or feature. Use this AFTER brainstorming."
---

# Writing Plans Skill

The goal of this skill is to create a clear and actionable implementation plan that can be followed by an AI assistant or human developer.

## Process

1.  **Objective**: Clearly define the main goal and any constraints or requirements.
2.  **Breakdown**: Divide the main goal into smaller, manageable tasks.
3.  **Propose Changes**: Document the files that will be created, modified, or deleted. Use logic to group them.
4.  **Verification Plan**: Define how each task and the overall goal will be verified.
5.  **Task Artifact**: Create a `task.md` artifact to track progress during execution.

## Guidelines

-   **Be specific**: Avoid vague tasks. Each task should have a clear "done" state.
-   **Identify dependencies**: Note any tasks that must be completed before others.
-   **Include failure modes**: Consider what could go wrong and how the plan handles it.
-   **Follow the project's architecture**: Ensure proposed changes align with existing patterns.
-   **Ask for review**: Always request feedback on the plan before starting execution.

## Next Steps

Once the plan is approved, proceed to the `executing-plans` skill.
