# Finishing a Development Branch

Use this skill when a feature branch is ready to be merged and needs final polish before review.

## Steps

1. **Verify all acceptance criteria** are met — re-read the original task description
2. **Run the full test suite** — fix any failures before proceeding
3. **Clean up temporary code**: remove debug logs, TODO comments, commented-out blocks
4. **Check for regressions** in adjacent modules that may have been affected
5. **Verify the build compiles** without errors or warnings
6. **Update the schema** if database changes were made (`prisma db push` or `prisma migrate dev`)
7. **Self-review the diff** — read every changed file as if you were the code reviewer
8. **Write a clear commit message** summarizing *why*, not just *what*
9. **Open a Pull Request** with a description that includes: summary, test plan, and screenshots if UI changed

## JnConta-specific checklist

- [ ] Backend: `npx tsc --noEmit` passes in `/api`
- [ ] Frontend: `next build` passes in `/frontend`
- [ ] Prisma schema changes: migration created and applied
- [ ] No hardcoded `localhost:3005` or `localhost:3000` — all ports via `NEXT_PUBLIC_API_URL`
- [ ] New endpoints registered in `app.module.ts`
- [ ] Audit log entries created for destructive operations
