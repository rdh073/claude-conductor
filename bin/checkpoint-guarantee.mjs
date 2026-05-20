#!/usr/bin/env node
/**
 * checkpoint-guarantee.mjs — SessionEnd hook
 *
 * Ensures STATE.json reflects the latest in-memory state at session
 * termination, so /conductor:resume can pick up cleanly next time.
 *
 * PHASE 5 will implement:
 *   - If `${CLAUDE_PROJECT_DIR}/.conductor/STATE.json` missing: exit 0.
 *   - Read current STATE.json. Set `last_session_end: <ISO>`.
 *   - Atomic write back via bin/lib/atomic-write.mjs (fs.writeFile(temp)
 *     → fs.rename(temp, target)). Rename is atomic on same filesystem.
 *
 * Per SC2: this is SessionEnd, not Stop. Per-turn writes (Stop) risk
 * races with skill writes mid-flight. SessionEnd fires once, no race.
 *
 * Per D1: exit 0 on internal error. Best effort — losing one timestamp
 * is recoverable, blocking session termination is not.
 *
 * Until Phase 5: silent no-op.
 */
process.exit(0);
