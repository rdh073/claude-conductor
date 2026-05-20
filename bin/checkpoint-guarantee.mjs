#!/usr/bin/env node
/**
 * checkpoint-guarantee.mjs — SessionEnd hook
 *
 * Persists `last_session_end` into STATE.json on session termination
 * so /conductor:resume can identify the last clean shutdown. Atomic
 * write via bin/lib/atomic-write.mjs.
 *
 * Per SC2: this is SessionEnd, not Stop. Single write at session end,
 * no race with skill writes mid-flight.
 *
 * Per D1: never throw. If STATE.json is missing or unparseable, log
 * to stderr and exit 0 — we do not create or trash existing state.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteJSON } from './lib/atomic-write.mjs';

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = join(projectDir, '.conductor', 'STATE.json');

  if (!existsSync(stateFile)) {
    process.exit(0);
  }

  let state;
  try {
    state = JSON.parse(await readFile(stateFile, 'utf8'));
  } catch (err) {
    process.stderr.write(
      `checkpoint-guarantee: STATE.json invalid (${err.message}); not overwriting\n`
    );
    process.exit(0);
  }

  state.last_session_end = new Date().toISOString();

  try {
    await atomicWriteJSON(stateFile, state);
  } catch (err) {
    process.stderr.write(`checkpoint-guarantee: atomic write failed: ${err.message}\n`);
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`checkpoint-guarantee: ${err.message}\n`);
  process.exit(0);
});
