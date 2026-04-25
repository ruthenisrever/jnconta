# Requesting Code Review

Use this skill when you're ready to have your code reviewed by another agent or team member.

## Before requesting review

1. **Self-review first** — read your own diff as if you were the reviewer
2. **Run tests** — don't ask someone to review broken code
3. **Verify the build** — compilation must pass
4. **Remove noise**: no debug logs, no commented-out code, no WIP commits

## How to request

Provide the reviewer with:
- **Context**: what problem does this solve?
- **Approach**: why did you choose this implementation?
- **Risk areas**: which parts are you least confident about?
- **Testing done**: what did you manually verify?
- **Out of scope**: what did you intentionally NOT change?

## PR description template (JnConta)

```
## Qué hace este cambio
[1-3 bullets describing the change]

## Por qué este enfoque
[Brief rationale]

## Áreas de riesgo
[Parts the reviewer should pay extra attention to]

## Cómo probarlo
- [ ] Abrir el módulo X
- [ ] Hacer Y
- [ ] Verificar que Z

## Screenshots (si aplica)
[Before/after UI screenshots]
```

## What makes a good review request

- Small, focused changes are easier to review than large sweeping ones
- If the diff is >500 lines, consider splitting into smaller PRs
- Link the relevant ticket/issue
