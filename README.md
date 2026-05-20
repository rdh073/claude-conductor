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
