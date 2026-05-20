#!/usr/bin/env node
/**
 * token-guard.mjs — PreToolUse hook on the `Agent` tool
 *
 * Blocks the Agent dispatch via exit code 2 when the conductor's
 * cumulative token estimate is at or above 80% of the resolved
 * budget. Otherwise increments the estimate by ~30k (one Agent
 * dispatch) and exits 0.
 *
 * BUDGET RESOLUTION (CR-5 / v0.1.3, supersedes v0.1.2's bump-default)
 * ------------------------------------------------------------------
 * 4-layer priority chain, highest first:
 *
 *   1. `CC_TOKEN_BUDGET_DISABLED=1` (env)
 *      → hard escape hatch; exit 0, no log, no state read.
 *
 *   2. `CC_TOKEN_BUDGET=<n>` (env)
 *      → use n as the budget. Explicit override.
 *
 *   3. Stdin `model` field (auto-detect)
 *      → if model ends with `[1m]` (Opus 1M tier) → 1,000,000
 *      → if model is present and lacks [1m] → 200,000 (Sonnet/Haiku)
 *      → if stdin is empty or JSON is malformed → fall through.
 *
 *   4. Fallback 200,000 (fail-closed-visible)
 *      → conservative default. Sonnet user with no env vars + no
 *        stdin sees a clear block message and the override path,
 *        instead of fail-silently running past a 1M phantom
 *        threshold against a real 200k context wall.
 *
 * DEBUG: set `CC_TOKEN_GUARD_DEBUG=1` to write a single line to
 * stderr: `[token-guard] budget=N source=...`. Three documented
 * source values:
 *   - `env:CC_TOKEN_BUDGET=N`
 *   - `model:<id>`
 *   - `fallback-default`
 * The disabled state stays silent — the escape hatch is invisible.
 *
 * PER_DISPATCH stays a flat 30k as of v0.1.3. Role-aware estimator
 * (verifier ~5k, librarian ~80k, etc.) deferred to v0.1.4 — needs
 * verification that `tool_input.subagent_type` is populated in
 * PreToolUse hook input (the SubagentStop hook input has it, per
 * `bin/verifier-dispatch.mjs:43`; PreToolUse schema may differ).
 *
 * Skills are responsible for resetting `running_tokens_estimate` to 0
 * after a successful /compact via `bin/lib/reset-tokens.mjs` (CR-2,
 * v0.1.1). Without that reset, the estimate increments forever and
 * blocks once the threshold is crossed.
 *
 * Per D1 (fail-open): any internal error → exit 0 (false-positive
 * blocks would be worse than missed-positive context-fills).
 * Per D4: atomic write via bin/lib/atomic-write.mjs.
 */

// Layer 1: hard escape hatch. Checked at module load, before any
// imports or stdin reads. CC_TOKEN_BUDGET_DISABLED=1 → silent exit 0.
if (process.env.CC_TOKEN_BUDGET_DISABLED === '1') {
  process.exit(0);
}

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteJSON } from './lib/atomic-write.mjs';

const PER_DISPATCH = 30_000;
const BLOCK_RATIO = 0.8;
const OPUS_1M_BUDGET = 1_000_000;
const TIER_200K_BUDGET = 200_000;
const FALLBACK_BUDGET = 200_000;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

// Read stdin once at module load. Stays as '' if no pipe / TTY.
let stdinRaw = '';
try {
  stdinRaw = await readStdin();
} catch {
  // ignore — fall through to env/fallback
}

function resolveBudget() {
  // Layer 2: env override
  const envBudget = parseInt(process.env.CC_TOKEN_BUDGET || '0', 10);
  if (envBudget > 0) {
    return { budget: envBudget, source: `env:CC_TOKEN_BUDGET=${envBudget}` };
  }

  // Layer 3: auto-detect from hook stdin
  if (stdinRaw) {
    try {
      const input = JSON.parse(stdinRaw);
      const model = (input && typeof input.model === 'string') ? input.model : '';
      if (model) {
        if (/\[1m\]$/.test(model)) {
          return { budget: OPUS_1M_BUDGET, source: `model:${model}` };
        }
        return { budget: TIER_200K_BUDGET, source: `model:${model}` };
      }
    } catch {
      // malformed JSON → fall through to fallback
    }
  }

  // Layer 4: fallback (fail-closed-visible)
  return { budget: FALLBACK_BUDGET, source: 'fallback-default' };
}

async function main() {
  const { budget, source } = resolveBudget();

  if (process.env.CC_TOKEN_GUARD_DEBUG === '1') {
    process.stderr.write(`[token-guard] budget=${budget} source=${source}\n`);
  }

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
  const threshold = BLOCK_RATIO * budget;

  if (current >= threshold) {
    // HARD BLOCK — exit 2 per Claude Code hooks spec
    process.stdout.write(
      `Token budget hit (${current} / ${budget}, ${Math.round((current / budget) * 100)}%). ` +
      `Source: ${source}. Run /compact before the next Agent dispatch, then skills should reset running_tokens_estimate to 0.\n`
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
