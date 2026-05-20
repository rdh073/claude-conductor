---
description: Trigger a brutal self-audit on the current repo state via the auditor agent. Outputs docs/REVIEW.md with findings categorized critical / warning / nit. Updates STATE.json so callers can route based on counts.
allowed-tools: Agent Read Write Bash
---

# Audit

Dispatch the `auditor`. Read its REVIEW. Update STATE. Return counts to caller.

## Pre-flight

1. Verify the working tree is in a defensible state:
   - `git status --porcelain` empty (or all changes are intentional from `execute`).
   - If dirty with unintended changes: print warning, ask user to stage/commit first OR proceed anyway.
2. Verify the audit inputs exist:
   - `./.conductor/plan.md`
   - `./.conductor/decisions.md`
   - At least one checkpoint in `./.conductor/checkpoints/`

## Process

1. Dispatch via `Agent`:
   - **subagent_type**: `auditor`
   - **inputs**: paths to plan.md, decisions.md, discoveries.md (if exists), CHANGELOG.md (if exists), current repo state
   - **acceptance**: `docs/REVIEW.md` exists; findings categorized critical / warning / nit; each finding cites evidence (file:line or command output); header signed with timestamp + git SHA
2. After return, read `docs/REVIEW.md`. Count:
   - `critical` (false claims, broken happy path, security gaps, data loss)
   - `warning` (untested edges, doc drift, missing criteria)
   - `nit` (cosmetic)
3. Update `./.conductor/STATE.json`:
   ```json
   {
     "audit": {
       "critical": <N>,
       "warning": <N>,
       "nit": <N>,
       "ran_at": "<ISO>",
       "review_path": "docs/REVIEW.md"
     }
   }
   ```
4. Append to `./.conductor/decisions.md`:
   ```
   ## <ISO> — audit complete
   Critical: <N> | Warning: <N> | Nit: <N>
   See: docs/REVIEW.md
   ```
5. Return the counts as a structured one-liner.

## Decision routing (caller's responsibility)

The conductor (or /conductor:start) reads the returned counts and routes:

- `critical > 0` → route back to `/conductor:execute` with a truth-patch spec built from the critical findings. Then re-audit.
- `critical == 0, warning > 0` → per `autonomy`:
  - `full` → proceed to /conductor:release
  - `guarded` or `review` → print warning summary, ask user to ack
- `critical == 0, warning == 0` → proceed to /conductor:release

## What this skill is not

- Not a code-quality scan. The auditor finds claim-vs-reality gaps. Lint is the engineer's job during execute.
- Not a fix step. Auditor reports; conductor decides; engineer patches.
