#!/usr/bin/env node
/**
 * watch-plan.mjs — monitor for ./.conductor/plan.md edits
 *
 * Background process; stdout lines become Claude notifications. Event-
 * driven (fs.watch / chokidar) — NO heartbeats per D3.
 *
 * PHASE 5 will implement:
 *   - If `${CLAUDE_PROJECT_DIR}/.conductor/plan.md` missing: poll for
 *     creation, then start watching.
 *   - On change: read the diff vs last-snapshot. Emit one line:
 *       "plan: <N phases changed>: <summary>"
 *   - Debounce 500ms (architects do batched edits).
 *
 * Per D3: emit only on transitions (file change events). Skip emissions
 * for write-without-content-change (e.g. touch).
 *
 * Until Phase 5: silent block — exits after ~3 seconds to avoid
 * hanging the session.
 */
setTimeout(() => process.exit(0), 3000);
