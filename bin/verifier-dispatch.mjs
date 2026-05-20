#!/usr/bin/env node
/**
 * verifier-dispatch.mjs — SubagentStop hook
 *
 * PHASE 5 will implement:
 *   - Read stdin JSON for the SubagentStop event (agent_type, etc).
 *   - If agent_type === "verifier": exit 0 (don't verify the verifier).
 *   - If `${CLAUDE_PROJECT_DIR}/.conductor/STATE.json` missing: exit 0.
 *   - Otherwise atomically write `${CLAUDE_PROJECT_DIR}/.conductor/_pending_verification.json`:
 *       { agent_type, finished_at, last_commit, signal_seq }
 *
 * Per D2: this hook does NOT invoke the verifier (that would recurse).
 * It only EMITS a signal. The execute skill reads _pending_verification.json
 * at the start of every loop iteration and dispatches verifier itself.
 *
 * Per D4: atomic write via bin/lib/atomic-write.mjs (Phase 5 helper).
 *
 * Until Phase 5: silent no-op.
 */
process.exit(0);
