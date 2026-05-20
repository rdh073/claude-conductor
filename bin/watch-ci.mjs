#!/usr/bin/env node
/**
 * watch-ci.mjs — long-running monitor for GitHub Actions CI
 *
 * Starts on first invocation of /conductor:execute (per monitors.json
 * `when: on-skill-invoke:execute`). Polls `gh run list` every 60s for
 * the current branch, emits ONLY on transition (status change or new
 * run id). No heartbeats.
 *
 * Per D3: transitions only. Per D5: probes via `which`-style — if gh
 * or git missing, silently exit 0 (CI watching is optional).
 * Per D1: any error → stderr + exit 0.
 */

import { spawnSync } from 'node:child_process';

const POLL_MS = 60_000;

function tool(cmd, args, cwd) {
  try {
    return spawnSync(cmd, args, { cwd, stdio: 'pipe', encoding: 'utf8' });
  } catch {
    return { status: -1, stdout: '', stderr: '' };
  }
}

function getBranch(cwd) {
  const r = tool('git', ['symbolic-ref', '--short', 'HEAD'], cwd);
  return r.status === 0 ? r.stdout.trim() : null;
}

function getLastRun(cwd, branch) {
  const r = tool(
    'gh',
    ['run', 'list', '--branch', branch, '--limit', '1',
      '--json', 'status,conclusion,databaseId,displayTitle'],
    cwd
  );
  if (r.status !== 0) return null;
  try {
    const arr = JSON.parse(r.stdout);
    return arr[0] || null;
  } catch { return null; }
}

function stateOf(run) {
  return run.conclusion || run.status || 'unknown';
}

function iconFor(state) {
  if (state === 'success') return '✓';
  if (state === 'failure' || state === 'cancelled' || state === 'timed_out') return '✗';
  return '🏃';
}

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Required tools
  if (tool('gh', ['--version']).status !== 0) process.exit(0);
  if (tool('git', ['rev-parse', '--git-dir'], projectDir).status !== 0) {
    process.exit(0);
  }

  let lastRunId = null;
  let lastState = null;

  const poll = () => {
    const branch = getBranch(projectDir);
    if (!branch) return;
    const run = getLastRun(projectDir, branch);
    if (!run) return;
    const state = stateOf(run);
    if (run.databaseId !== lastRunId || state !== lastState) {
      const icon = iconFor(state);
      process.stdout.write(`${icon} CI ${state}: ${run.displayTitle}\n`);
      lastRunId = run.databaseId;
      lastState = state;
    }
  };

  poll();
  setInterval(poll, POLL_MS);
}

main().catch((err) => {
  process.stderr.write(`watch-ci: ${err.message}\n`);
  process.exit(0);
});
