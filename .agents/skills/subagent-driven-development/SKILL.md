# Subagent-Driven Development

Use this skill when a task is too large or complex to implement in a single pass and benefits from specialized agents handling distinct concerns.

## When to use

- Implementing a full feature that spans backend + frontend + database
- Large refactors where different modules need independent analysis
- Tasks requiring both research and implementation phases

## Workflow

### Phase 1: Research (parallel agents)
Launch specialized Explore agents to gather context:
```
[Agent: explore backend schema]
[Agent: explore frontend components]  ← same message, parallel
[Agent: search for existing patterns]
```

### Phase 2: Plan
Synthesize research findings into a concrete implementation plan.
Break work into discrete, independently-implementable tasks.

### Phase 3: Implement (sequential or parallel as appropriate)
- **Sequential**: when tasks have dependencies (schema first, then controller, then frontend)
- **Parallel**: when tasks are independent (fix module A and fix module B simultaneously)

### Phase 4: Verify
Use the `verification-before-completion` skill to validate each task.

## JnConta-specific guidance

When adding a new feature:
1. Schema first (`prisma/schema.prisma`) → run `prisma db push`
2. Backend controller → register in `app.module.ts`
3. Frontend page/component → use `NEXT_PUBLIC_API_URL` for all API calls
4. Run both servers and verify end-to-end

## Anti-patterns

- Spawning agents for trivial 1-file tasks (overhead > benefit)
- Not synthesizing agent results before continuing
- Agents that contradict each other because they lacked shared context
