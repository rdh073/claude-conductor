#!/usr/bin/env node
/**
 * token-guard.mjs — PreToolUse hook on the `Agent` tool
 *
 * Blocks the Agent dispatch via exit code 2 when the conductor's
 * cumulative token estimate is at or above 80% of the configured
 * budget. Otherwise increments the estimate by ~30k (one Agent
 * dispatch) and exits 0.
 *
 * Skills are responsible for resetting `running_tokens_estimate` to 0
 * after a successful /compact.
 *
 * Per D1 (fail-open): any internal error → exit 0 (false-positive
 * blocks would be worse than missed-positive context-fills).
 * Per D4: atomic write via bin/lib/atomic-write.mjs.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteJSON } from './lib/atomic-write.mjs';

const BUDGET = parseInt(process.env.CC_TOKEN_BUDGET || '200000', 10);
const PER_DISPATCH = 30000;
const BLOCK_RATIO = 0.8;

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(projectDir, '.conductor', 'STATE.json');

  // Not in a conductor session → silent pass
  if (!existsSync(stateFile)) {
    process.exit(0);
  }

  let state;
  try {
    state = JSON.parse(await readFile(stateFile, 'utf8'));
  } catch {
    // Corrupt state → fail-open
    process.exit(0);
  }

  const current = Number(state.running_tokens_estimate) || 0;
  const threshold = BLOCK_RATIO * BUDGET;

  if (current >= threshold) {
    // HARD BLOCK — exit 2 per Claude Code hooks spec
    process.stdout.write(
      `Token budget hit (${current} / ${BUDGET}, ${Math.round((current / BUDGET) * 100)}%). ` +
      `Run /compact before the next Agent dispatch, then skills should reset running_tokens_estimate to 0.\n`
    );
    process.exit(2);
  }

  // Pass — increment estimate for this dispatch
  state.running_tokens_estimate = current + PER_DISPATCH;
  try {
    await atomicWriteJSON(stateFile, state);
  } catch (err) {
    process.stderr.write(`token-guard: state write failed: ${err.message}\n`);
    // still pass
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`token-guard: ${err.message}\n`);
  process.exit(0);
});
