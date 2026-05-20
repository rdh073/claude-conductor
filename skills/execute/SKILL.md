---
description: Loop through plan phases. Dispatch the engineer per phase, run verifier on every claim, decide proceed/retry/escalate per the dispatch contract. The heart of the boomerang.
allowed-tools: Agent Skill Read Write Edit Bash TaskCreate TaskGet TaskList TaskUpdate
---

# Execute

For each phase in `./.conductor/plan.md` not marked `[done]`: dispatch engineer, verify, decide. Loop until plan complete or pause-gate fires.

## Token budget — check before every dispatch

Per CLAUDE.md: at phase start, estimate cumulative tokens since the last checkpoint. If > 50k:

1. Run `/compact` in the main session.
2. Run `bash` `node "${CLAUDE_PLUGIN_ROOT}/bin/lib/reset-tokens.mjs"` to reset `running_tokens_estimate` to 0 in STATE.json.
3. Then dispatch the next sub-agent.

Both steps are required: without step 2, `bin/token-guard.mjs` keeps incrementing and hard-blocks on the 6th dispatch of the session (CR-2 in docs/REVIEW.md). Sub-agents always get fresh context, so the budget concern is YOUR main session — keep it lean by pointing at files, not pasting prior chatter.

## Phase loop

For each phase not yet `[done]`:

1. Read ONLY that phase's section in `plan.md`. Do not re-read prior phases.
2. Read STATE.json `autonomy` — affects pause behavior on completion.
3. Dispatch via `Agent`:
   - **subagent_type**: `engineer`
   - **inputs**: the phase section verbatim + paths to prior-phase artifacts ONLY if the spec references them
   - **acceptance**: the phase's verifiable criteria, verbatim
   - **timeout**: S=10min, M=30min, L=60min
4. Engineer returns: commit SHA, test output, files changed (`git diff --stat HEAD~1`).
5. Dispatch the `verifier`:
   - **claim**: engineer's report
   - **evidence_refs**: commit SHA, test output excerpt, plan.md phase section
6. Branch on verifier result:

**If `verified: true`:**
- Write `./.conductor/checkpoints/<phase-id>.json`:
  ```json
  { "phase": "<id>", "commit": "<sha>", "criteria_checked": [...], "verified_at": "<ISO>" }
  ```
- Write `./.conductor/reports/<phase-id>.json` with the engineer's report.
- Edit `plan.md` to mark the phase `[done]`.
- Update STATE.json: `last_completed: <phase-id>`, `phase: <next>`.
- If `autonomy === "review"`: print a one-line summary and pause for user ack before continuing. Else: continue.

**If `verified: false`:**
- Dispatch `auditor` for root cause (subagent_type: `auditor`). Read `docs/REVIEW.md`.
- Decide per CLAUDE.md (do not bounce to user unless 3-AND triggers):
  - **retry** — re-dispatch engineer with corrective spec from auditor's findings
  - **scope-cut** — defer the failing assertion to v.next; mark phase partial-done; log
  - **pause-gate** — write a proposal to decisions.md with `[PAUSE_GATE]` prefix; halt
- Append the decision + reasoning to `./.conductor/decisions.md`.
- Apply the decision.

## Stop conditions

- All phases `[done]` → return to caller (typically `/conductor:audit`).
- Pause-gate fired → halt with the proposal surfaced to the user.
- **Three consecutive verifier failures on the same phase** → unconditional halt. Rotting work needs human eyes. Surface to user with the full failure history.

## What you do NOT do here

- You do not write code. The engineer does.
- You do not audit your own dispatches. The verifier does after each, the auditor does on failure.
- You do not skip the verifier because "the engineer's report looked fine". Narration is not evidence.
