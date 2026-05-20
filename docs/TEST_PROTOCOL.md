# Test protocol — manual runtime validation

This document is the human-runnable counterpart to the Phase 7 dogfood
spec-walkthrough. It tests what the in-session simulation could NOT:
the plugin's actual runtime behavior in a real Claude Code session.

Use this protocol:

- Before tagging a new minor or major release.
- After any change to `hooks/`, `monitors/`, `settings.json`, or `agents/conductor.md`.
- When [DISC-3](../.conductor/discoveries.md#disc-3) (or similar runtime gaps) needs validation.

## Prerequisites

- Claude Code CLI installed and authenticated.
- `node >= 20` on PATH.
- `git` on PATH; `gh` CLI authenticated to github.com.
- A clean target project directory.

## Setup

```bash
# Clone claude-conductor locally
git clone https://github.com/rdh073/claude-conductor.git ~/claude-conductor

# Create a fresh target project
mkdir -p ~/test-conductor && cd ~/test-conductor
git init -q -b main && touch README.md && git add . && git commit -qm "init"

# Start Claude Code with the conductor plugin loaded
claude --plugin-dir ~/claude-conductor
```

## Verification at startup

Inside the Claude session, verify the plugin loaded:

```
/help
```

**Expected:** ten conductor skills appear under "Plugin Skills":
`/conductor:start`, `/conductor:onboard`, `/conductor:discover`,
`/conductor:spec`, `/conductor:execute`, `/conductor:audit`,
`/conductor:release`, `/conductor:status`, `/conductor:decide`,
`/conductor:resume`.

If any are missing, the plugin didn't load. Common causes:

- `--plugin-dir` path wrong.
- Plugin manifest invalid.
- Run `claude --plugin-dir <path> --debug` to see load errors.

## Test 1 — preflight hook (SessionStart)

**Expected:** at session start, stderr shows informational lines from
`bin/preflight.mjs`. Because `~/test-conductor` is a fresh git repo
with no `.conductor/`, you should see:

> ℹ /conductor:start has not run in this project yet

If `gh` is missing or unauthenticated, you'll also see `⚠` lines.
Nothing should BLOCK the session. If the session aborts, the
fail-open contract is broken.

## Test 2 — `/conductor:status` (read-only, no `.conductor/`)

Type:

```
/conductor:status
```

**Expected output:**

> No conductor session in this directory. Run /conductor:start to begin.

If anything else fires, the `status` skill has a bug.

## Test 3 — `/conductor:start` (full flow)

Type:

```
/conductor:start
```

**Expected sequence — count interrupts as you go:**

1. **`/conductor:onboard` fires** → 5-question wizard.
   - **INTERRUPT 1 (Gate 1).** Answer the 5 questions.
   - Suggested sample answers (to mirror the Phase 7 dogfood):
     - Q1: `A Claude Code plugin called hello-world with a single skill /hello-world:greet that prints Hello <name>`
     - Q2: `Developers learning Claude Code plugin authoring`
     - Q3: `Bash-only, no Node deps, ship in one phase`
     - Q4: `None — fresh dir`
     - Q5: `Plugin loads via --plugin-dir, /hello-world:greet works, npm test passes (or equivalent if no tests applicable)`
2. **`/conductor:discover` fires** → librarian dispatches (or inlines per the DISC-5 heuristic when implemented in v0.1.1). Should be silent unless an error fires.
3. **`/conductor:spec` fires** → architect dispatches.
   - When the plan is ready, the conductor presents a one-screen summary and asks for approval.
   - **INTERRUPT 2 (Gate 2).** Type `approve`.
4. **`/conductor:execute` fires** → engineer dispatches per phase. Verifier runs after each.
   - No interrupts unless the 3-AND condition triggers (irreversible AND non-factual AND no clear winner).
5. **`/conductor:audit` fires** → auditor writes `docs/REVIEW.md`.
6. **`/conductor:release` fires** → release-manager tags. If a remote is configured, GH Release fires too; if not, local tag only (DISC-1: graceful fallback).
7. **`/conductor:start` writes `.conductor/SESSION-SUMMARY.md`** and stops.

## Success criteria

- **Exactly 2 user interrupts** (onboarding + plan approval).
- **All state files populated:**
  - `.conductor/{STATE,brief}.json`
  - `.conductor/{plan,decisions,research,SESSION-SUMMARY}.md`
  - `.conductor/checkpoints/` contains `spec-approved.json` + per-phase JSON
  - `.conductor/reports/` contains per-phase JSON
- `docs/REVIEW.md` exists with categorized findings (critical / warning / nit).
- The target plugin you built validates clean: `claude plugin validate ./<your-plugin>`.
- Git tag created (locally + remote if remote configured).

## Token budget verification

After completion:

```bash
cat .conductor/STATE.json | jq .running_tokens_estimate
```

Should be `< 160000` (the 80% threshold of the default `CC_TOKEN_BUDGET=200000`). If at or above, the conductor should have run `/compact` mid-flow — verify by inspecting the conversation log for a compact event.

## Failure modes — how to file issues

If any step fails:

1. Save the conversation transcript (`/save` inside Claude Code).
2. Snapshot the state files: `cp -r .conductor ~/conductor-failure-$(date +%s)`.
3. File a bug: https://github.com/rdh073/claude-conductor/issues/new?template=bug_report.yml
   - Include the snapshot path.
   - Include the last 50 lines of relevant stderr.
   - Mention which test step failed.

## Acceptance gate for releases

Before tagging conductor `v0.X.0` or `v0.X.Y`:

1. Run this protocol to completion in a clean target dir.
2. Document the result in the release notes (test passed / specific failures / mitigations).
3. If failures, defer the tag and address before release.

**For `v0.1.0`:** this protocol DOCUMENTS the runtime-test gap (DISC-3).
Community-runner reports validate `v0.1.1` and unlock the path to v1.0.
