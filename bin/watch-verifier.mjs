#!/usr/bin/env node
/**
 * watch-verifier.mjs — monitor for verifier output files
 *
 * Tails `${CLAUDE_PROJECT_DIR}/.conductor/reports/*.json` for new files
 * and surfaces verifier failures (`verified: false`) immediately.
 *
 * PHASE 5 will implement:
 *   - If `${CLAUDE_PROJECT_DIR}/.conductor/reports/` missing: poll for
 *     creation, then start watching.
 *   - fs.watch on the reports directory.
 *   - On new .json file: read it. If `verified: false`, emit one line:
 *       "verifier: FAIL phase=<id> reason=<discrepancy>"
 *   - If `verified: true`, silent (the success is checkpointed elsewhere).
 *
 * Per D3: emit only on failures (the meaningful transition). Successes
 * don't need notification — the conductor sees them via the verifier's
 * direct Agent return.
 *
 * Until Phase 5: silent block — exits after ~3 seconds.
 */
setTimeout(() => process.exit(0), 3000);
