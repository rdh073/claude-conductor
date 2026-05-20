#!/usr/bin/env node
/**
 * log-commit.mjs — PostToolUse hook on the `Write` tool
 *
 * Auto-commits .conductor/decisions.md and .conductor/discoveries.md
 * updates to git as engineering archeology. Append-only by design.
 *
 * Stdin is the standard PostToolUse hook JSON. We extract
 * `tool_input.file_path`, match against the audit-trail filenames,
 * and run git add + commit. `--no-verify` is intentional (SC4).
 *
 * Per D1: any error → stderr log + exit 0. Losing one auto-commit is
 * recoverable; blocking the parent on a hook failure is not.
 */

import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';

const AUDIT_TRAIL_RE = /[\/\\]\.conductor[\/\\](decisions|discoveries)\.md$/;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const raw = await readStdin();
  if (!raw) process.exit(0);

  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  const filePath = input?.tool_input?.file_path;
  if (!filePath || !AUDIT_TRAIL_RE.test(filePath)) {
    process.exit(0);
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Must be a git repo to commit
  const gitDir = spawnSync('git', ['rev-parse', '--git-dir'], {
    cwd: projectDir, stdio: 'pipe',
  });
  if (gitDir.status !== 0) process.exit(0);

  // Stage
  const add = spawnSync('git', ['add', '--', filePath], {
    cwd: projectDir, stdio: 'pipe', encoding: 'utf8',
  });
  if (add.status !== 0) {
    process.stderr.write(`log-commit: git add failed: ${add.stderr || ''}\n`);
    process.exit(0);
  }

  // Commit. `--no-verify` per SC4 — automated audit-trail commits
  // should not be blocked by the user's project pre-commit hooks.
  const msg = `log: ${basename(filePath)} update`;
  const commit = spawnSync(
    'git',
    ['commit', '-m', msg, '--no-verify', '--only', '--', filePath],
    { cwd: projectDir, stdio: 'pipe', encoding: 'utf8' }
  );
  // commit can fail with "nothing to commit" if the content didn't change —
  // that's fine, treat as success.
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`log-commit: ${err.message}\n`);
  process.exit(0);
});
