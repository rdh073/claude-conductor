# Changelog

All notable changes to `claude-conductor` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-05-20

Patch release closing the four CRs from the v0.1.0 self-audit
(see `docs/REVIEW.md`). Phase 10 marketplace submission gate unblocked
(`audit_count_critical: 0`).

### Fixed

- **CR-1: `TodoWrite` deprecation drift** — `TodoWrite` was disabled by default in Claude Code v2.1.142+. Four files declared it in their tool whitelists: `agents/conductor.md`, `agents/engineer.md`, `skills/start/SKILL.md`, `skills/execute/SKILL.md`. Replaced with `TaskCreate, TaskGet, TaskList, TaskUpdate`. `engineer.md` body updated to "Plan with `TaskCreate` if the phase has > 3 steps."
- **CR-2: `token-guard.mjs` increment-without-reset** — `bin/token-guard.mjs` raised `running_tokens_estimate` by 30k per Agent dispatch but no script reset it. Math: 200k × 0.8 / 30k ≈ 5.33 → every 6th dispatch onward was hard-blocked. New `bin/lib/reset-tokens.mjs` script + updated `skills/execute/SKILL.md` token-budget section spell out the two required steps: run `/compact`, then `node ${CLAUDE_PLUGIN_ROOT}/bin/lib/reset-tokens.mjs`. `bin/token-guard.mjs` comment block updated to cross-reference the reset script.
- **CR-3: `agents/auditor.md` frontmatter missing Write/Edit** — body instructed "Write `docs/REVIEW.md`" but the whitelist omitted Write. Plugin agents use allowlist semantics, so the auditor sub-agent literally could not produce its primary artifact. Added `Write, Edit` to the whitelist. The "modifies no source code" anti-pattern guidance in the body is intact — Write into `docs/REVIEW.md` is documentation, not code.
- **CR-4: Privacy leak in state writes** — pre-v0.1.1, `STATE.json` and `brief.json` wrote raw home-directory paths (`/home/<dev>/...`, `/Users/<dev>/...`, `C:\Users\<dev>\...`), leaking developer usernames to any public repo where the target plugin committed `.conductor/`. v0.1.0 of THIS repo also shipped the leak in `.conductor/discoveries.md` and `docs/REVIEW.md` — patched first (commit `e791bb5`) before the system fix below.

### Added

- `bin/lib/redact-path.mjs` — POSIX + Windows home-dir redaction helper. Handles `/home/<user>`, `/Users/<user>`, `C:\Users\<user>`, and UNC long-path `\\?\C:\Users\<user>` variants.
- `bin/lib/atomic-write.mjs` — `atomicWriteJSON` now applies `redactObject()` by default. Pass `{ skipRedaction: true }` to opt out when the path IS the legitimate data (rare).
- `bin/lib/reset-tokens.mjs` — closes CR-2 by resetting `running_tokens_estimate` to 0 and stamping `last_compact_at`. Side-effect: a read-modify-write cycle also launders any pre-v0.1.1 raw paths in the existing STATE.json (cleanup-on-touch).
- `tests/lib/redact-path.test.mjs` — 7 unit tests covering linux/mac/windows home dirs, non-home no-op, recursive object walk, non-string preservation, empty object. Run via `node --test tests/lib/redact-path.test.mjs`. First test file in the plugin — establishes the testing pattern (no npm deps, just `node:test` + `node:assert/strict`).
- `README.md` "Privacy & `.conductor/` directory" section documenting the redaction behavior and the recommended `.gitignore` add for target plugins.
- `docs/REVIEW.md` CR-4 section + v0.1.1 re-audit section with layer re-grades.

### Documentation

- `templates/plan-template.md` opens with a privacy comment block noting `.conductor/` should be gitignored in target plugins.
- `bin/token-guard.mjs` comment block updated to cross-reference `bin/lib/reset-tokens.mjs`.

### Known limitations (carried forward)

- **DISC-3 (runtime test gap)** — v0.1.1 was still patched via mega-prompt and direct file edits, not `/conductor:start --target ./claude-conductor`. Layer D meta-grade stays at C-. The bootstrap paradox (`.conductor/discoveries.md` DISC-10) is closed when v0.1.2+ is built via the conductor against itself.
- **W-1, W-2, W-3, W-4, W-6** — five warnings from the v0.1.0 audit carry forward. Tracked in `docs/ROADMAP.md` for v0.1.2.
- **Unshipped Phase 1 scripts** — `bin/verify-github.mjs`, `bin/conductor-init.mjs`, `bin/conductor-status.mjs`, `bin/conductor-decide.mjs`, `bin/bump-version.mjs`. Still in `docs/ROADMAP.md`.
- **No CI** — `.github/workflows/` does not exist. v0.1.2 item.
- **Residual commit-body leak** — commit `113dd82` body retains the original raw path. Force-push to rewrite would invalidate the v0.1.0 tag and any cached marketplace install; per `.conductor/decisions.md` D7, the residue is documented and bounded.

## [0.1.0] — 2026-05-20

First public preview. Feature-complete for the 7-step conductor flow,
shipped with one documented runtime-test gap (DISC-3, see release
notes).

### Added

- **7 sub-agents** under `agents/`: conductor (main session), architect, engineer, auditor, librarian, release-manager, verifier. Minimal tool whitelists per agent; total ~414 lines.
- **10 skills** under `skills/<name>/SKILL.md`: `start`, `onboard`, `discover`, `spec`, `execute`, `audit`, `release`, `status`, `decide`, `resume`. Total ~545 lines. `/conductor:start` and `/conductor:release` are user-invocation only (`disable-model-invocation: true`).
- **8 bin scripts** under `bin/` plus `bin/lib/atomic-write.mjs`: `preflight`, `token-guard`, `log-commit`, `checkpoint-guarantee`, `verifier-dispatch`, `watch-plan`, `watch-ci`, `watch-verifier`. Zero npm dependencies, Node 20+ only. Total ~631 lines.
- **5 lifecycle hooks** in `hooks/hooks.json`: SessionStart, PreToolUse (on Agent), SubagentStop, PostToolUse (on Write), SessionEnd.
- **3 background monitors** in `monitors/monitors.json`: plan-changes, ci-status (`on-skill-invoke:execute`), verifier-events.
- **6 templates** under `templates/`: `plan-template.md`, `decisions-template.md`, `review-template.md`, `release-notes-template.md`, `bug_report.yml`, `feature_request.yml`. Total ~407 lines.
- `settings.json` activates `conductor` as the default main-session agent.

### Documented

- `CLAUDE.md` — the orchestrator's behavioral contract: identity, behaviors, anti-patterns, 3-AND pause-gate rule, file-state-of-record, dispatch contract, release discipline, token-budget rule.
- `docs/TEST_PROTOCOL.md` — manual runtime test protocol for human runners (the DISC-3 mitigation; primary acceptance gate for v0.1.1).
- `docs/ROADMAP.md` — v0.1.1 / v0.2.0 / v1.0 work tracking.
- `.conductor/decisions.md` — D1–D5 design decisions + SC1–SC4 spec corrections from the plugin's own development.
- `.conductor/discoveries.md` — 7 discoveries from the Phase 7 dogfood (4 → v0.1.1 actions, 3 → validate-don't-regress strengths).
- Community health: `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1, fetched), `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml`, `.github/PULL_REQUEST_TEMPLATE.md`. GitHub community standards: 100%.

### Known limitations

- **DISC-3 (runtime test gap)** — v0.1.0 was developed via spec-walkthrough simulation in Phase 7, not a true `claude --plugin-dir` runtime test. The plugin validates syntactically and individual scripts smoke-test green, but live behavior of hooks firing on events, monitors auto-starting on `when:` triggers, and `Skill` tool composition (`/conductor:start` invoking `/conductor:onboard` etc.) is not directly verified. **Mitigation:** `docs/TEST_PROTOCOL.md` is human-runnable; community testers can validate and report via Issues.
- **4 v0.1.1 items** filed from the dogfood: DISC-1 (release-manager no-remote fallback), DISC-2 (release-manager pre-flight state commit), DISC-5 (inline-vs-dispatch heuristic), plus implementing `bin/verify-github.mjs`. See `docs/ROADMAP.md`.

### Engineering archeology

- Built using its own pattern (meta). Phases 1–8 each shipped as a single Conventional Commits commit. `.conductor/decisions.md` and `.conductor/discoveries.md` accumulate the rationale trail.
- Phase 7 dogfood produced a complete `hello-world` plugin at `~/dogfood/hello-world-plugin-test/` in **exactly 2 user interrupts** (onboarding + plan approval), per the architecture's success criterion. Audit caught a real CR (README install command error) on the 3-file plugin — validates the audit step is load-bearing even at trivial scope.
