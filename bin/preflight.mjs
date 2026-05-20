#!/usr/bin/env node
/**
 * preflight.mjs — SessionStart hook
 *
 * Checks required + recommended tools when claude-conductor is enabled.
 * Silent on pass. Stderr warn on fail. Always exit 0 (fail-open per D1).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function probe(cmd, args = ['--version']) {
  try {
    const r = spawnSync(cmd, args, { stdio: 'pipe' });
    return r.status === 0;
  } catch {
    return false;
  }
}

function warn(level, msg) {
  process.stderr.write(`${level} ${msg}\n`);
}

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // node >= 20
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeMajor < 20) {
    warn('⚠', `node ${process.versions.node} — conductor requires >= 20`);
  }

  // git on PATH
  if (!probe('git')) {
    warn('⚠', 'git not found on PATH — release will be blocked');
  }

  // gh CLI
  const ghOk = probe('gh');
  if (!ghOk) {
    warn('⚠', 'gh CLI not found — release-manager needs it');
  } else {
    // gh auth
    const auth = spawnSync('gh', ['auth', 'status'], { stdio: 'pipe' });
    if (auth.status !== 0) {
      warn('⚠', 'gh not authenticated — run: gh auth login');
    }
  }

  // CWD is a git repo
  const gitRepo = spawnSync('git', ['rev-parse', '--git-dir'], {
    cwd: projectDir, stdio: 'pipe',
  });
  if (gitRepo.status !== 0) {
    warn('ℹ', 'CWD is not a git repo — conductor expects git');
  }

  // .conductor/ exists
  if (!existsSync(join(projectDir, '.conductor'))) {
    warn('ℹ', '/conductor:start has not run in this project yet');
  }

  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`preflight: ${err.message}\n`);
  process.exit(0);
});
