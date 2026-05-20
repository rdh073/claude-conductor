import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const tokenGuard = join(here, '..', '..', 'bin', 'token-guard.mjs');

function setupState({ running, extra = {} }) {
  const dir = mkdtempSync(join(tmpdir(), 'tg-test-'));
  mkdirSync(join(dir, '.conductor'), { recursive: true });
  const state = { running_tokens_estimate: running, ...extra };
  writeFileSync(join(dir, '.conductor', 'STATE.json'), JSON.stringify(state));
  return dir;
}

function runGuard(projectDir, envOverride = {}) {
  // Build a clean env without parent CC_TOKEN_* so tests are deterministic.
  const env = { ...process.env };
  delete env.CC_TOKEN_BUDGET;
  delete env.CC_TOKEN_BUDGET_DISABLED;
  return spawnSync('node', [tokenGuard], {
    env: { ...env, CLAUDE_PROJECT_DIR: projectDir, ...envOverride },
    encoding: 'utf8',
  });
}

test('CC_TOKEN_BUDGET_DISABLED=1 bypasses the guard even at 999999 running', () => {
  const dir = setupState({ running: 999_999 });
  try {
    const r = runGuard(dir, { CC_TOKEN_BUDGET_DISABLED: '1' });
    assert.equal(
      r.status,
      0,
      `expected exit 0 (escape hatch), got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CR-5 reproducer fix: default 1M budget passes at 180000 running', () => {
  // Default CC_TOKEN_BUDGET is 1000000 (v0.1.2). 0.8 threshold = 800000.
  // 180000 << 800000 → pass.
  const dir = setupState({ running: 180_000 });
  try {
    const r = runGuard(dir);
    assert.equal(
      r.status,
      0,
      `expected exit 0 at 180k/1M default, got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Sonnet opt-down still works: CC_TOKEN_BUDGET=200000 with 180k blocks', () => {
  // Explicit opt-down to 200k for Sonnet/Haiku users; 0.8 threshold = 160000.
  // 180000 >= 160000 → BLOCK exit 2.
  const dir = setupState({ running: 180_000 });
  try {
    const r = runGuard(dir, { CC_TOKEN_BUDGET: '200000' });
    assert.equal(
      r.status,
      2,
      `expected exit 2 (BLOCK), got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
    assert.match(
      r.stdout,
      /Token budget hit/,
      'block message should be on stdout'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
