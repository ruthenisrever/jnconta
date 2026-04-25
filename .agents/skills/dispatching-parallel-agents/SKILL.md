# Dispatching Parallel Agents

Use this skill when a task can be decomposed into independent subtasks that don't depend on each other's output.

## When to use

- Multiple files need to be investigated simultaneously
- Several independent features need to be implemented
- Research across different parts of the codebase can happen in parallel

## How to apply

1. **Decompose** the work into truly independent units (no shared state, no sequential dependency)
2. **Launch agents concurrently** by including multiple Agent tool calls in a single message
3. **Synthesize results** from all agents before proceeding to the next phase
4. **Merge carefully** — reconcile any overlapping changes before committing

## Example

Instead of:
```
1. Research module A → wait → Research module B → wait → implement
```

Do:
```
1. [Agent: research A] + [Agent: research B]  ← same message, parallel
2. Synthesize findings → implement
```

## Anti-patterns to avoid

- Launching agents that write to the same file (causes conflicts)
- Parallel agents that depend on each other's output (causes ordering bugs)
- Over-parallelizing trivial tasks (wastes overhead)
