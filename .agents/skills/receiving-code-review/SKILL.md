# Receiving Code Review

Use this skill when a reviewer has left feedback on your code and you need to respond thoughtfully.

## Steps

1. **Read all comments before responding** — understand the full picture before fixing anything
2. **Categorize each comment**:
   - `MUST FIX`: bugs, security issues, broken logic
   - `SHOULD FIX`: code quality, maintainability
   - `CONSIDER`: suggestions, style preferences
   - `DISCUSS`: disagreements that need dialogue
3. **Address MUST FIX items first** — they block merge
4. **For each fix**, verify you haven't introduced a new issue
5. **Reply to comments** explaining what you changed and why (or why you disagree)
6. **Don't silently ignore** any comment — acknowledge everything
7. **Re-request review** only after all threads are resolved

## Responding to disagreements

- Assume good intent from the reviewer
- Back your position with technical reasoning, not preference
- If uncertain, defer to the reviewer
- Escalate to team lead only if truly blocking

## Anti-patterns

- Blindly implementing all suggestions without understanding them
- Fixing the symptom instead of the root cause
- Pushing new unrelated changes in the same review cycle
