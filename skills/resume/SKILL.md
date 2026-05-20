---
description: Resume a conductor session from the last checkpoint. Reads STATE.json + checkpoints/, asks the user to confirm context still applies, routes to the appropriate next skill (execute / audit / release / etc.). Use after Ctrl+C, session restart, or when returning to a paused flow.
allowed-tools: Read Skill AskUserQuestion Bash
---

# Resume

Restore session context. Confirm with user. Route to the right next skill.

## Process

1. Read `./.conductor/STATE.json`. If missing:
   - Print: `No session to resume in this directory. Use /conductor:start.`
   - Exit.
2. Gather context:
   - Current phase, last completed, autonomy
   - Most recent decision (last `## ` block in decisions.md)
   - Audit summary if present
   - Most recent checkpoint file (most-recently-modified in `./.conductor/checkpoints/`)
   - Git: branch, short SHA, dirty status
3. Print a one-screen summary:

```
Resuming conductor session
─────────────────────────────────────────
Started        : <started_at>
Last completed : <phase id> at <ISO>
Now at phase   : <current>
Last decision  : <decision title>
Audit          : <summary if present, else "not yet run">
Git            : <branch> @ <sha> (<dirty|clean>)
```

4. `AskUserQuestion`:
   - **Continue** — proceed from where we left off
   - **Re-onboard** — context changed, restart the brief (calls `/conductor:onboard --reset`)
   - **Status only** — just show me, don't resume (caller is exploring; exit after printing)
   - **Abort** — leave state in place, exit without action

5. On **Continue**: route based on STATE.json `phase`:
   - `onboard` → `/conductor:onboard`
   - `discover` → `/conductor:discover`
   - `spec` → `/conductor:spec`
   - `execute` → `/conductor:execute` (will pick up unmarked phases in plan.md)
   - `audit` → `/conductor:audit`
   - `release` → `/conductor:release`
   - unknown phase → halt, surface to user

6. On **Re-onboard**: invoke `/conductor:onboard --reset`. The new brief overrides the old; existing plan.md / research.md are NOT auto-deleted (user can decide).

7. Update STATE.json: `resumed_at: <ISO>`. Do not erase prior state.

## What this skill is not

- Not a state-modifier beyond a `resumed_at` timestamp. Resume is an entry point, not a rollback.
- Not a rollback tool. If the user wants to roll back to a checkpoint, they can manually copy from `./.conductor/checkpoints/<phase>.json` and then resume.
