---
description: Print the current conductor state — phase, last checkpoint, open decisions, audit summary, git status. Read-only and always safe to invoke, including mid-phase or after Ctrl+C.
allowed-tools: Read Bash Glob
---

# Status

Read state files. Print a structured table. Suggest next action.

## Process

1. If `./.conductor/STATE.json` is missing:
   - Print: `No conductor session in this directory. Run /conductor:start to begin.`
   - Exit.
2. Read STATE.json. Gather:
   - `phase`, `last_completed`, `autonomy`, `started_at`, `plan_approved_at`, `last_release`
3. Count checkpoints: `ls -1 ./.conductor/checkpoints/ 2>/dev/null | wc -l`
4. Tail last 3 decisions from `./.conductor/decisions.md` (heading lines starting with `## `, last 3).
5. Read audit summary from STATE.json `audit` key if present.
6. Read git status:
   - Branch: `git branch --show-current 2>/dev/null`
   - Short SHA: `git rev-parse --short HEAD 2>/dev/null`
   - Dirty: `git status --porcelain | head -1` (any output → dirty)

## Output

```
Conductor session — <working dir>
─────────────────────────────────────────
Started        : <started_at>
Autonomy       : <autonomy>
Phase          : <current>
Last completed : <phase id> at <ISO>
Checkpoints    : <count>
Audit          : <C critical / W warning / N nit>  (last run: <ISO>)
Last release   : <version or "none">
Git            : <branch> @ <short-sha> (<dirty|clean>)

Recent decisions:
- <decision heading 1>
- <decision heading 2>
- <decision heading 3>

Next action: <suggested skill>
```

## Suggested next action — routing

- `phase: "onboard"` → `/conductor:onboard`
- `phase: "discover"` → `/conductor:discover`
- `phase: "spec"` → `/conductor:spec`
- `phase: "execute"` → `/conductor:execute`
- `phase: "audit"` with `critical > 0` → `/conductor:execute` (truth-patch)
- `phase: "audit"` with `critical == 0` → `/conductor:release`
- `phase: "release"` and `last_release` set → flow complete, view SESSION-SUMMARY.md

## Read-only contract

This skill never modifies state. Safe to invoke at any time without disturbing an in-flight session.
