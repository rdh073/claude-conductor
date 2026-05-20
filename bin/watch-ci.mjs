#!/usr/bin/env node
/**
 * watch-ci.mjs — monitor for GitHub Actions CI status
 *
 * Started on first invocation of /conductor:execute (per monitors.json
 * `when: on-skill-invoke:execute`). Polls `gh run list` every 60s.
 *
 * PHASE 5 will implement:
 *   - Require `gh` on PATH (per D5 probe); if missing, log to stderr
 *     and exit 0 — CI watching is optional.
 *   - cd to ${CLAUDE_PROJECT_DIR}.
 *   - Determine current branch via `git branch --show-current`.
 *   - Every 60s: `gh run list --branch <br> --limit 1 --json status,conclusion,name,databaseId`.
 *   - Compare to last-emitted state. Emit ONLY on transition:
 *       "ci: <run_name> <prev_state> → <new_state>"
 *   - Max 1 emit per minute per run.
 *
 * Per D3: transitions only. No heartbeats. Identical-state polls are
 * silent.
 *
 * Until Phase 5: silent block — exits after ~3 seconds.
 */
setTimeout(() => process.exit(0), 3000);
