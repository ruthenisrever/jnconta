# Writing Skills

Use this skill when you need to create a new skill file for this project's `.agents/skills/` directory.

## What makes a good skill

A skill is reusable procedural knowledge — a step-by-step playbook for a recurring type of task.

Good skills are:
- **Specific enough** to be actionable (not just "be careful")
- **General enough** to apply to more than one situation
- **Opinionated** — they encode *how we work here*, not just generic advice
- **Project-aware** — they reference JnConta specifics where relevant

## Structure of a SKILL.md

```markdown
# Skill Name

One-line description of when to trigger this skill.

## When to use
[Specific triggers or situations]

## Steps
[Numbered, concrete steps]

## JnConta-specific guidance (if applicable)
[Project-specific rules, file paths, conventions]

## Anti-patterns
[Common mistakes this skill helps avoid]
```

## How to register a new skill

1. Create directory: `.agents/skills/<skill-name>/`
2. Write `SKILL.md` inside it following the structure above
3. Add the skill name (the directory name) to `.agents/plugin.json` under `"skills"`

## Naming convention

- Use kebab-case: `my-new-skill`
- Name it after the *action*, not the *topic*: `debugging-auth` not `authentication`
- Be specific: `writing-prisma-migrations` not `database-stuff`

## Quality checklist

- [ ] Does it say *when* to use it?
- [ ] Does it give concrete steps, not vague advice?
- [ ] Does it mention JnConta-specific paths/patterns?
- [ ] Is it shorter than 80 lines? (If not, split it)
