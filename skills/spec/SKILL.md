---
description: Dispatch the architect to produce a phased plan from brief + research. Outputs ./.conductor/plan.md. MANDATORY GATE 2 — the conductor cannot proceed to Execute without the user's explicit approval of the plan.
allowed-tools: Agent Read Write AskUserQuestion
---

# Spec

Dispatch the architect. Verify structure. Present plan summary to the user. Wait for approval.

## Process

1. Read `./.conductor/brief.json` and `./.conductor/research.md`. Both must exist — if not, halt and tell the caller to run the missing prerequisite skill.
2. Dispatch the architect via the `Agent` tool:
   - **subagent_type**: `architect`
   - **inputs**: paths to `brief.json` and `research.md`; `templates/plan-template.md` if present in the plugin
   - **acceptance**: `./.conductor/plan.md` exists; has phases (each single-concern, smoke-testable); each phase has verifiable acceptance criteria (file/test/API assertions, not "looks good"); pause gates marked per the 3-AND condition; stack rationale per choice; effort estimate (S/M/L) and token estimate per phase
3. Dispatch the `verifier`:
   - **claim**: "plan.md meets the structural acceptance criteria"
   - **evidence_refs**: read the file, check for the structural elements
4. If `verified: false` → re-dispatch the architect with corrective feedback.

## MANDATORY GATE 2

Once the plan is structurally verified, present a one-screen summary to the user:

```
Plan summary — <N phases>
─────────────────────────────────────────
Phases       : 0 → A → B → … → Z
Pause gates  : <phase ids where user input is required>
Biggest risks: <top 2-3 from plan.md>
Effort       : <sum of S/M/L> | Token budget: ~<total>k
Stack        : <one-line summary>

Full plan at: ./.conductor/plan.md
```

Then `AskUserQuestion`:
- **Approve** → proceed to Execute
- **Revise** → user gives feedback, re-dispatch architect, loop back
- **Abort** → leave plan.md in place, exit

## On approve

- Write `./.conductor/checkpoints/spec-approved.json` with the plan's git SHA (or content hash) + user-acceptance timestamp.
- Append to `decisions.md`: "Plan approved by user at <ISO>."
- Update STATE.json: `phase: "execute"`, `plan_approved_at: <ISO>`.

## This is a hard gate

Do not proceed without explicit approval. The plan looking perfect to YOU is not a substitute for the user owning the strategic shape of the work. Your job here is structural verification, not strategic approval.
