# Using Git Worktrees

Use this skill to work on multiple branches simultaneously without stashing or switching branches.

## What is a git worktree

A git worktree creates a secondary working directory linked to the same repository but checked out at a different branch. This lets you:
- Work on a feature while a colleague's branch is also checked out for review
- Run the app on two branches side-by-side for comparison
- Isolate experimental changes without affecting your main workspace

## Basic commands

```bash
# Create a worktree for an existing branch
git worktree add ../jnconta-feature-x feature/x

# Create a worktree and new branch simultaneously
git worktree add -b feature/new-module ../jnconta-new-module main

# List all worktrees
git worktree list

# Remove a worktree when done
git worktree remove ../jnconta-feature-x
```

## JnConta workflow

```bash
# In c:\Users\ruthe\.gemini\antigravity\scratch\jnconta
git worktree add ../jnconta-hotfix hotfix/treasury-port-fix

# Work in the new worktree
cd ../jnconta-hotfix
# make changes, commit...

# Return to main workspace
cd ../jnconta

# Clean up
git worktree remove ../jnconta-hotfix
```

## Important rules

- Each worktree must be on a **different branch** — you can't check out the same branch in two worktrees
- Worktrees share the same `.git` directory — commits in one are immediately visible in others
- Don't forget to `git worktree remove` when done — stale worktrees cause confusion
- The `node_modules` and build artifacts are **not shared** — run `npm install` in each worktree separately
