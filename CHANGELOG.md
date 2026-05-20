# Changelog

All notable changes to `claude-conductor` are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
