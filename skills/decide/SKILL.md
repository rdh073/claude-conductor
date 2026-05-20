---
description: Log a manual decision with rationale to ./.conductor/decisions.md. Useful for choices the conductor doesn't surface automatically — strategic pivots, tooling preferences, scope changes. Append-only; never edits prior decisions.
argument-hint: "[short decision title]"
allowed-tools: AskUserQuestion Read Write Bash
---

# Decide

Capture a user-driven decision with full reasoning. Append to `decisions.md`.

## Process

1. **Title**:
   - If `$ARGUMENTS` is present, use it as the title.
   - Else `AskUserQuestion`: "What's the decision (short title)?"
2. **Capture the reasoning** — batch via `AskUserQuestion`:
   - "Options considered (one per line):"
   - "Chosen option:"
   - "Rationale (why this over the others):"
   - "Supersedes any prior decision? If yes, paste the prior decision's timestamp; else 'no'."
3. **Capture git context** (if in a git repo):
   - `git rev-parse --short HEAD 2>/dev/null` → short SHA
   - `git branch --show-current 2>/dev/null` → branch
4. **Append** to `./.conductor/decisions.md`:

```
## <ISO timestamp> — <decision title>
Git: <branch> @ <short-sha>  (or "no-repo")
Options:
- <option 1>
- <option 2>
- ...
Chosen: <option>
Reason: <rationale>
Supersedes: <prior timestamp or "none">
```

5. Echo the appended block to the user as confirmation.

## Idempotency contract

- decisions.md is **append-only**.
- Never edit prior decisions in-place.
- To overturn a prior decision, create a new entry with `Supersedes: <prior timestamp>`. Future readers can grep for the supersession chain.
- This preserves the engineering-archeology property: the rationale at the time is the rationale at the time, even when wrong in hindsight.
