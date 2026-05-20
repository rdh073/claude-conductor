#!/usr/bin/env node
/**
 * verifier-dispatch.mjs — SubagentStop hook
 *
 * Emits a "pending verification" signal when a sub-agent finishes,
 * so the execute skill can dispatch the verifier on its next loop
 * iteration. The hook does NOT invoke the verifier directly — doing
 * so would recurse (verifier completing → SubagentStop → verify the
 * verifier → ...).
 *
 * Per D2: signal-only. Atomic write via bin/lib/atomic-write.mjs.
 * Per D1: never throw; any error → stderr log + exit 0.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteJSON } from './lib/atomic-write.mjs';

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const conductorDir = join(projectDir, '.conductor');

  // Not in a conductor session
  if (!existsSync(conductorDir)) process.exit(0);

  const raw = await readStdin();
  if (!raw) process.exit(0);

  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  // Field name varies across Claude Code versions; be defensive.
  const agentType = input?.agent_type
    || input?.subagent_type
    || input?.subagent_id
    || '';

  // Don't verify the verifier — that would recurse.
  if (/verifier/i.test(agentType)) process.exit(0);

  const signal = {
    subagent_id: agentType,
    completed_at: new Date().toISOString(),
    raw_input: input,
  };

  try {
    await atomicWriteJSON(
      join(conductorDir, '_pending_verification.json'),
      signal
    );
  } catch (err) {
    process.stderr.write(`verifier-dispatch: write failed: ${err.message}\n`);
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`verifier-dispatch: ${err.message}\n`);
  process.exit(0);
});
