#!/usr/bin/env node
/**
 * watch-verifier.mjs — long-running monitor for verifier reports
 *
 * Tails ./.conductor/reports/ for new or changed JSON files. Surfaces
 * verifier outcomes inline:
 *   - verified === false → "❌ verification failed: <phase>"
 *   - verified === true  → "✓ verified: <phase>" (only once per file)
 *
 * Debounce 500ms. Per D3: only meaningful transitions; we never
 * re-emit for the same file's success.
 * Per D1: any error → stderr + exit 0.
 */

import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const DEBOUNCE_MS = 500;
const POLL_FOR_DIR_MS = 5000;

const emittedSuccess = new Set();

async function processReport(reportsDir, filename) {
  if (!filename || !filename.endsWith('.json')) return;
  const fullPath = join(reportsDir, filename);
  if (!existsSync(fullPath)) return;

  let report;
  try {
    const raw = await readFile(fullPath, 'utf8');
    report = JSON.parse(raw);
  } catch {
    return; // half-written or non-report file
  }

  const phase = report.phase
    || report.subagent_id
    || filename.replace(/\.json$/, '');

  if (report.verified === false) {
    const reason = report.discrepancy ? ` (${report.discrepancy})` : '';
    process.stdout.write(`❌ verification failed: ${phase}${reason}\n`);
  } else if (report.verified === true) {
    if (!emittedSuccess.has(filename)) {
      emittedSuccess.add(filename);
      process.stdout.write(`✓ verified: ${phase}\n`);
    }
  }
}

async function waitForDir(p) {
  while (!existsSync(p)) {
    await new Promise((r) => setTimeout(r, POLL_FOR_DIR_MS));
  }
}

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const reportsDir = join(projectDir, '.conductor', 'reports');

  await waitForDir(reportsDir);

  const pending = new Set();
  let timer = null;

  try {
    const w = watch(reportsDir, (_event, filename) => {
      if (!filename) return;
      pending.add(filename);
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const batch = Array.from(pending);
        pending.clear();
        for (const f of batch) {
          await processReport(reportsDir, f);
        }
      }, DEBOUNCE_MS);
    });
    w.on('error', (err) => {
      process.stderr.write(`watch-verifier: ${err.message}\n`);
      process.exit(0);
    });
  } catch (err) {
    process.stderr.write(`watch-verifier: ${err.message}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  process.stderr.write(`watch-verifier: ${err.message}\n`);
  process.exit(0);
});
