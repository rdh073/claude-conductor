#!/usr/bin/env node
/**
 * preflight.mjs — SessionStart hook for claude-conductor
 *
 * PHASE 5 will implement:
 *   - If `${CLAUDE_PROJECT_DIR}/.conductor/` does not exist: silent exit
 *     (conductor not yet active in this project — don't pre-warn).
 *   - Otherwise check, log to stderr, never block:
 *       * git on PATH         (REQUIRED — conductor depends on git)
 *       * node >= 20          (REQUIRED — modern fs/promises)
 *       * gh CLI authenticated (WARN — release-manager needs it)
 *       * .conductor/STATE.json present (info)
 *
 * Per D1 (fail-open): exit 0 on every internal error.
 * Per D5: tool discovery via `which`, no npm dependency.
 *
 * Until Phase 5: silent no-op.
 */
process.exit(0);
