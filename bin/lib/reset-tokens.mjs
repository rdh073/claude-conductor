#!/usr/bin/env node
/**
 * reset-tokens.mjs — close the loop on token-guard's increment-only budget.
 *
 * Called by skills/execute IMMEDIATELY AFTER the main session runs
 * `/compact`. Resets `running_tokens_estimate` to 0 in STATE.json
 * atomically and records `last_compact_at`.
 *
 * Why it exists: pre-v0.1.1, `bin/token-guard.mjs` incremented the
 * estimate on every Agent dispatch but no script reset it. Math:
 * 200k * 0.8 / 30k = 5.33 → the 6th dispatch hard-blocked every
 * subsequent dispatch. CR-2 in docs/REVIEW.md (Phase 9 audit).
 *
 * Per D1 (fail-open): on any error, log to stderr and exit 0.
 * Atomic write via bin/lib/atomic-write.mjs which also redacts
 * home-dir paths via redact-path.mjs (CR-4).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteJSON } from './atomic-write.mjs';

const statePath = join(process.env.CLAUDE_PROJECT_DIR || '.', '.conductor', 'STATE.json');

try {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  state.running_tokens_estimate = 0;
  state.last_compact_at = new Date().toISOString();
  await atomicWriteJSON(statePath, state);
  console.log('token-budget reset to 0');
} catch (err) {
  process.stderr.write(`reset-tokens: ${err.message}\n`);
  process.exit(0);
}
