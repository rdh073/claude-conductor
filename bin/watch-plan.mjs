#!/usr/bin/env node
/**
 * watch-plan.mjs — long-running monitor for ./.conductor/plan.md
 *
 * Emits "📋 plan: <done>/<total> phases done" on edits. Debounced
 * 500ms (some OSes fire multiple events per save). Watches the
 * directory (not the file) to survive atomic-write rename.
 *
 * Per D3: transitions only. Re-emit only when the summary changes.
 * Per D1: any error → stderr + exit 0.
 */

import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DEBOUNCE_MS = 500;
const POLL_FOR_PLAN_MS = 5000;

async function summarize(planPath) {
  try {
    const txt = await readFile(planPath, 'utf8');
    const done = (txt.match(/\[done\]/gi) || []).length;
    const total = (txt.match(/^###\s+Phase\s+/gim) || []).length;
    if (total === 0) return 'no phases yet';
    return `${done}/${total} phases done`;
  } catch {
    return null;
  }
}

async function waitForFile(p) {
  while (!existsSync(p)) {
    await new Promise((r) => setTimeout(r, POLL_FOR_PLAN_MS));
  }
}

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const conductorDir = join(projectDir, '.conductor');
  const planPath = join(conductorDir, 'plan.md');

  await waitForFile(planPath);

  let lastSummary = '';
  let timer = null;

  const tick = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      const s = await summarize(planPath);
      if (s && s !== lastSummary) {
        process.stdout.write(`📋 plan: ${s}\n`);
        lastSummary = s;
      }
    }, DEBOUNCE_MS);
  };

  // Initial emit on startup
  tick();

  try {
    const w = watch(conductorDir, (_event, filename) => {
      if (filename === 'plan.md') tick();
    });
    w.on('error', (err) => {
      process.stderr.write(`watch-plan: ${err.message}\n`);
      process.exit(0);
    });
  } catch (err) {
    process.stderr.write(`watch-plan: ${err.message}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  process.stderr.write(`watch-plan: ${err.message}\n`);
  process.exit(0);
});
