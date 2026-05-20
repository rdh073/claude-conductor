# Claude Conductor

> Tell Claude what to build. Claude leads from spec to ship.

An orchestrator-style Claude Code plugin. You describe a goal in plain
language; the Conductor onboards, plans, delegates, reviews, decides,
and ships — pausing only for the two decisions a human must own
(onboarding answers and plan approval).

---

## What is it

_TODO: one-paragraph pitch — Conductor as the lead, sub-agents as the
crew. Reference the pattern this codifies (clip-forge v0.1 → v0.2)._

## Install

_TODO: marketplace install command + `--plugin-dir` local-dev command._

```bash
# Local dev
claude --plugin-dir ./claude-conductor

# Marketplace (once published)
# /plugin install claude-conductor@<marketplace>
```

## Quickstart

```bash
cd ~/projects/some-idea
claude
/conductor:start
```

## Privacy & `.conductor/` directory

When the conductor runs in a target project, it writes state to
`./.conductor/` (`STATE.json`, `brief.json`, checkpoints, reports).

Pre-v0.1.1, those files wrote raw working-directory paths
(e.g. `/home/alice/proj`), which leaked Linux/macOS/Windows usernames
to any public repo where `.conductor/` was committed.

**Since v0.1.1:**

- Path-like strings are automatically redacted at write time to
  `/home/<user>/...`, `/Users/<user>/...`, or `C:\Users\<user>\...`.
- For target plugins intended for public commit, **also add
  `.conductor/` to your `.gitignore`** as an extra safety layer.

**Pre-v0.1.1 state files may contain raw paths.** If you committed
any `.conductor/STATE.json` or `brief.json` before v0.1.1, audit and
sanitize. The conductor itself shipped one such leak in v0.1.0 — see
[CR-4 in docs/REVIEW.md](docs/REVIEW.md) and [decisions.md D7](.conductor/decisions.md)
for the patch + the residual commit-body note.

## Power users — context budget

As of **v0.1.3**, the conductor's `bin/token-guard.mjs` auto-detects
your model's context budget from the PreToolUse hook's `model` field.
No env vars needed for either tier.

**Auto-detection rules:**

| Model ID pattern | Budget |
| :--- | :--- |
| `claude-*[1m]` (e.g. `claude-opus-4-7[1m]`) — Opus 1M tier | 1,000,000 |
| `claude-*` (no `[1m]` suffix) — Sonnet, Haiku, base Opus | 200,000 |

**Override priority (highest to lowest):**

1. `CC_TOKEN_BUDGET_DISABLED=1` — bypass token-guard entirely (escape hatch for manual context management or debugging).
2. `CC_TOKEN_BUDGET=<n>` — explicit budget in tokens.
3. Auto-detected from the `model` field in PreToolUse hook stdin.
4. Fallback **200,000** — fail-closed-visible default.

The fallback is intentionally conservative: if auto-detection fails
(no stdin, missing `model` field, malformed JSON), the guard assumes
a 200k context. This produces a visible block message with a clear
env-var override path — better than a silent miss against a real
context wall.

**Troubleshooting** — set `CC_TOKEN_GUARD_DEBUG=1` to see budget
source on stderr:

```
[token-guard] budget=1000000 source=model:claude-opus-4-7[1m]
[token-guard] budget=200000 source=fallback-default
[token-guard] budget=500000 source=env:CC_TOKEN_BUDGET=500000
```

The disabled state stays silent — the escape hatch is invisible.

The per-dispatch estimator is a flat 30k as of v0.1.3. Role-aware
estimator (verifier ~5k, librarian ~80k, etc.) tracked for v0.1.4 —
see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## The 7-step flow

1. **Onboard** — 3-5 questions, saved to `./.conductor/brief.json`
2. **Discover** — research + bench, saved to `./.conductor/research.md`
3. **Spec** — architect drafts phased plan, you approve once
4. **Execute** — phase-by-phase loop with cross-verification
5. **Audit** — brutal self-review in `docs/REVIEW.md`
6. **Release** — bump, tag, GitHub Release with honest notes
7. **Report** — session summary in `./.conductor/SESSION-SUMMARY.md`

## Pause gates

The Conductor pauses for the user only when ALL of these are true:

1. Decision is irreversible (deleted data, paid action, tag immutable)
2. Trade-off is non-factual (taste, strategy, business)
3. Options analyzed, no clear winner

Everything else: Conductor decides, logs to `./.conductor/decisions.md`,
proceeds.

## `.conductor/` state directory

_TODO: layout reference — brief.json, plan.md, decisions.md, discoveries.md,
checkpoints/, SESSION-SUMMARY.md._

## Resume after Ctrl+C

_TODO: how `/conductor:resume` picks up from the last checkpoint._

## When to use this vs raw Claude Code

_TODO: decision matrix. Raw Claude when you want hands-on control.
Conductor when you want delegation with verification._

## License

MIT
