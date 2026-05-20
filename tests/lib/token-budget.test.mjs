import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const tokenGuard = join(here, '..', '..', 'bin', 'token-guard.mjs');

function setupState({ running }) {
  const dir = mkdtempSync(join(tmpdir(), 'tg-test-'));
  mkdirSync(join(dir, '.conductor'), { recursive: true });
  writeFileSync(
    join(dir, '.conductor', 'STATE.json'),
    JSON.stringify({ running_tokens_estimate: running })
  );
  return dir;
}

function runGuard(projectDir, opts = {}) {
  // Build a clean env so tests are deterministic regardless of parent state.
  const env = { ...process.env };
  delete env.CC_TOKEN_BUDGET;
  delete env.CC_TOKEN_BUDGET_DISABLED;
  delete env.CC_TOKEN_GUARD_DEBUG;
  return spawnSync('node', [tokenGuard], {
    env: { ...env, CLAUDE_PROJECT_DIR: projectDir, ...(opts.env || {}) },
    // Always pipe stdin (empty by default) so process.stdin.isTTY === false
    // and readStdin() returns deterministically.
    input: opts.stdin ?? '',
    encoding: 'utf8',
  });
}

test('Layer 1 — CC_TOKEN_BUDGET_DISABLED=1 bypasses guard regardless of running', () => {
  const dir = setupState({ running: 999_999 });
  try {
    const r = runGuard(dir, { env: { CC_TOKEN_BUDGET_DISABLED: '1' } });
    assert.equal(
      r.status,
      0,
      `expected exit 0 (escape hatch); got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Layer 2 — CC_TOKEN_BUDGET=500000 with 399999 running passes (just under 80%)', () => {
  // threshold = 0.8 * 500000 = 400000; 399999 < 400000 → pass
  const dir = setupState({ running: 399_999 });
  try {
    const r = runGuard(dir, { env: { CC_TOKEN_BUDGET: '500000' } });
    assert.equal(
      r.status,
      0,
      `expected exit 0; got ${r.status}\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Layer 2 — CC_TOKEN_BUDGET=500000 with 400000 running BLOCKS (at 80% boundary)', () => {
  // threshold = 400000; 400000 >= 400000 → BLOCK
  const dir = setupState({ running: 400_000 });
  try {
    const r = runGuard(dir, { env: { CC_TOKEN_BUDGET: '500000' } });
    assert.equal(
      r.status,
      2,
      `expected exit 2 (BLOCK at boundary); got ${r.status}\nstdout: ${r.stdout}`
    );
    assert.match(r.stdout, /Token budget hit/, 'block message on stdout');
    assert.match(r.stdout, /Source: env:CC_TOKEN_BUDGET=500000/, 'source attribution in message');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Layer 3 — auto-detect Opus [1m] from stdin → 1M budget, 180k passes', () => {
  // threshold = 0.8 * 1000000 = 800000; 180000 << 800000 → pass
  const dir = setupState({ running: 180_000 });
  try {
    const r = runGuard(dir, {
      stdin: JSON.stringify({ model: 'claude-opus-4-7[1m]' }),
      env: { CC_TOKEN_GUARD_DEBUG: '1' },
    });
    assert.equal(r.status, 0, `expected exit 0; stdout: ${r.stdout}`);
    assert.match(
      r.stderr,
      /\[token-guard\] budget=1000000 source=model:claude-opus-4-7\[1m\]/,
      'debug log should show auto-detected 1M budget'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Layer 3 — auto-detect non-[1m] model from stdin → 200k budget, 180k BLOCKS', () => {
  // threshold = 0.8 * 200000 = 160000; 180000 >= 160000 → BLOCK
  const dir = setupState({ running: 180_000 });
  try {
    const r = runGuard(dir, {
      stdin: JSON.stringify({ model: 'claude-sonnet-4-6' }),
    });
    assert.equal(r.status, 2, `expected exit 2; got ${r.status}\nstdout: ${r.stdout}`);
    assert.match(r.stdout, /Token budget hit/);
    assert.match(r.stdout, /Source: model:claude-sonnet-4-6/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Layer 4 — no stdin (empty pipe), 180k BLOCKS via fallback 200k', () => {
  const dir = setupState({ running: 180_000 });
  try {
    const r = runGuard(dir, { env: { CC_TOKEN_GUARD_DEBUG: '1' } });
    assert.equal(r.status, 2, `expected exit 2; got ${r.status}\nstdout: ${r.stdout}`);
    assert.match(
      r.stderr,
      /\[token-guard\] budget=200000 source=fallback-default/,
      'debug log should show fallback source'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Layer 4 — malformed stdin JSON → fail-safe fallback 200k, 180k BLOCKS', () => {
  const dir = setupState({ running: 180_000 });
  try {
    const r = runGuard(dir, {
      stdin: '{{ this is not valid json',
      env: { CC_TOKEN_GUARD_DEBUG: '1' },
    });
    assert.equal(r.status, 2, `expected exit 2 (fail-safe); got ${r.status}\nstdout: ${r.stdout}`);
    assert.match(
      r.stderr,
      /\[token-guard\] budget=200000 source=fallback-default/,
      'malformed JSON should fall through to fallback-default'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
