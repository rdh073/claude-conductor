#!/usr/bin/env node
/**
 * token-guard.mjs — PreToolUse hook on the `Agent` tool
 *
 * PHASE 5 will implement:
 *   - If `${CLAUDE_PROJECT_DIR}/.conductor/STATE.json` missing: exit 0 (not in a conductor session).
 *   - Read approx cumulative token cost from session transcript or STATE.json.
 *   - If > 80% of model's context budget: exit 2 (BLOCK) with message:
 *       "Token guard: cumulative session > 80% context. Run /compact before next Agent dispatch."
 *   - Else: exit 0.
 *
 * Per D1 exception: this hook IS allowed to block. The blocking path is
 * exit code 2 (per Claude Code hooks spec), NOT an uncaught throw.
 * On internal error (couldn't read transcript, etc.): exit 0 — fail-open
 * even for the guard, because false-positive blocks are worse than
 * missed-positive context-fills (compact recovers fast either way).
 *
 * Until Phase 5: silent pass-through.
 */
process.exit(0);
