---
name: test-driven-development
description: "A development methodology that emphasizes writing tests BEFORE implementing functionality."
---

# Test-Driven Development (TDD) Skill

The goal of TDD is to ensure that code is correct, well-designed, and maintains its behavior over time.

## Process

1.  **Red Phase**:
    -   Identify the next piece of functionality or the bug to be fixed.
    -   Write a failing test case that demonstrates the absence of the feature or presence of the bug.
    -   Verify that the test fails for the expected reason.
2.  **Green Phase**:
    -   Implement the minimum amount of code necessary to make the test pass.
    -   Avoid adding extra features or complexity at this stage.
3.  **Refactor Phase**:
    -   Clean up the code while ensuring the test cases still pass.
    -   Improve design, readability, and performance.
4.  **Repeat**: Move to the next test case and continue the cycle.

## Guidelines

-   **Tests first, always**: Don't be tempted to write code before the test.
-   **Small iterations**: Keep each cycle short and focused.
-   **Comprehensive tests**: Cover both happy paths and edge cases.
-   **Fast feedback**: Ensure tests are quick and easy to run.
-   **Think about the API**: Writing tests first forces you to consider how your code will be used.

## Next Steps

Once the functionality is complete and all tests pass, proceed to `verification-before-completion`.
