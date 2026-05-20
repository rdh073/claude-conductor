---
description: Run the 5-question onboarding wizard. Persists answers to ./.conductor/brief.json. This is MANDATORY GATE 1 — the conductor cannot guess what the user is building, for whom, with what constraints. Wait for the user.
argument-hint: "[--reset]"
allowed-tools: AskUserQuestion Read Write Bash
---

# Onboard

Ask five high-leverage questions, save to `brief.json`, return.

## Pre-flight

1. If `./.conductor/brief.json` exists AND `$ARGUMENTS` does not contain `--reset`:
   - Read it. Show a one-line summary to the user.
   - AskUserQuestion: "Brief still valid?" (yes / no — re-onboard)
   - On yes: return path. On no: proceed as reset.

## The five questions

Use `AskUserQuestion` to ask **in two batched calls** (the tool caps at 4 questions per call).

**Batch 1 (4 questions):**
1. "What are you building, in ONE sentence?"
2. "Who will use this? (audience — devs, end-users, internal team, etc.)"
3. "Hard constraints? (language, runtime, budget, timeline, anything fixed)"
4. "Existing context? (paste a path to a codebase, prior work, or reference repos — or 'none')"

**Batch 2 (1 question):**
5. "Definition of done? What does 'shipped' mean for THIS project? (e.g. 'tagged v0.1, demo URL live, README has install', or 'PRD passed review and engineering started')"

## Persist

Write `./.conductor/brief.json`:

```json
{
  "generated_at": "<ISO timestamp>",
  "working_dir": "<absolute cwd>",
  "git_remote": "<git remote get-url origin 2>/dev/null || null>",
  "answers": {
    "what": "<Q1>",
    "audience": "<Q2>",
    "constraints": "<Q3>",
    "context": "<Q4>",
    "done": "<Q5>"
  }
}
```

Echo a 4-line summary back to the user and ask: "Anything to correct?" If yes, capture the correction and rewrite the relevant field.

## Anti-patterns

- Paraphrasing the user's answers to "make them clearer". Store verbatim.
- Proceeding with < 5 answers. All five are load-bearing for the architect.
- Asking follow-up questions about the project beyond the five. Discovery is the next skill's job.
- Skipping the echo-and-confirm step. The brief is the contract for the whole flow.
