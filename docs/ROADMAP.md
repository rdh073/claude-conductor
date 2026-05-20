# Roadmap — claude-conductor

This roadmap captures upcoming work. Items emerge from the
[`.conductor/discoveries.md`](../.conductor/discoveries.md) log, the
[`docs/REVIEW.md`](REVIEW.md) self-audit, and community feedback via
Discussions + Issues.

## v0.1.1 — patch follow-up to v0.1.0

**Marketplace submission (Phase 10) is blocked** until CR-1, CR-2, and CR-3 below are resolved. Lands within ~2 weeks of v0.1.0 community feedback.

### From Phase 9 self-audit — CRITICAL (must-fix before any promotion)

- **CR-1 (TodoWrite → Task\*)**: `TodoWrite` is disabled by default in Claude Code v2.1.142+ (current host: v2.1.144). Four files declare it in their tool whitelists: `agents/conductor.md:4`, `agents/engineer.md:4`, `skills/start/SKILL.md:5`, `skills/execute/SKILL.md:3`. Replace with `TaskCreate, TaskGet, TaskList, TaskUpdate`; rewrite the engineer guidance ("Plan with `TaskCreate` if the phase has > 3 steps."). Regression test: `grep -r TodoWrite agents/ skills/` must return 0 hits.
- **CR-2 (token-guard increment without reset)**: `bin/token-guard.mjs:57` increments `running_tokens_estimate` by 30k per Agent dispatch but no skill resets it. Math: 200k × 0.8 / 30k ≈ 5.33 → the 6th dispatch hard-blocks every subsequent dispatch. Add `bin/lib/reset-tokens.mjs` (or inline atomic write); call from `skills/execute/SKILL.md` immediately after `/compact`. Document the contract in `CLAUDE.md` § Token budget so the skill body is not the only place it lives. Regression test: smoke 7 sequential dispatches against a fresh STATE.json, assert the 7th still passes.
- **CR-3 (auditor frontmatter missing Write)**: `agents/auditor.md:4` declares `tools: Read, Glob, Grep, Bash` but the body at line 32 says "Write `docs/REVIEW.md`". The auditor sub-agent cannot create its primary output with the declared toolset. Add `Write, Edit` to the tools list (the "modifies no code" anti-pattern guidance still holds — Write into `docs/REVIEW.md` is documentation, not code). Regression test: lint `agents/*.md` for body `Write \`...\`` instructions and cross-check the tool whitelist.

### From Phase 9 self-audit — WARNINGS

- **W-1**: `skills/start/SKILL.md:18` invokes `bin/conductor-init.mjs` with `bash`, not `node`. The file is an ES module by extension. Fix: `node "${CLAUDE_PLUGIN_ROOT}/bin/conductor-init.mjs"` or rely on `bin/` PATH + shebang once `conductor-init.mjs` ships.
- **W-2**: D2's recursion-guard rationale in `.conductor/decisions.md` is half-correct. The signal-only pattern is right, but the load-bearing reason is "hook process cannot dispatch via Agent tool" — not "subagents could recursively spawn." Add a SC entry correcting the rationale; cite "subagents cannot spawn subagents" from the official spec.
- **W-3**: D5 says "probe via `which`" but no `bin/*.mjs` actually invokes `child_process.spawnSync('which', ...)` — they call `spawnSync('git', ...)` directly and rely on Node's PATH inheritance. Decide: implement `which` per D5, or supersede D5 with the inherited-PATH approach.
- **W-4**: `bin/verifier-dispatch.mjs:39-43` is defensively parsing `agent_type || subagent_type || subagent_id`, but the inline comment lacks the version citation (Task→Agent rename, v2.1.63). One-line comment fix.
- **W-5**: `CHANGELOG.md` under-discloses the 5 unshipped `bin/*.mjs` files from the Phase 1 spec and the zero-tests reality. Per CLAUDE.md § Release discipline: "Release notes mention what's missing." Add a "Known limitations" line citing the ROADMAP.
- **W-6**: `README.md` ships 5 `_TODO:_` placeholders in v0.1.0 (lines 14, 19, 60, 65, 67). Either fill them or replace with `Coming in v0.1.1 — see [ROADMAP.md](docs/ROADMAP.md)` so the user knows the gap is deliberate.

### From Phase 7 dogfood discoveries

- **DISC-1** (release-manager): amend `agents/release-manager.md` with an explicit no-remote fallback path. Currently the spec doesn't cover the case where `gh release create` is meaningless (target repo has no remote). The dogfood handled this ad-hoc.
- **DISC-2** (release-manager): amend `agents/release-manager.md` with a pre-flight state-commit step. The log-commit hook covers `decisions.md` and `discoveries.md`; `checkpoints/` and `reports/` still accumulate unstaged before release.
- **DISC-3** (runtime test): shipped `docs/TEST_PROTOCOL.md` in v0.1.0. v0.1.1 task: incorporate findings from community-run protocol passes into the spec.
- **DISC-5** (inline-vs-dispatch): amend `skills/discover/SKILL.md` and `skills/execute/SKILL.md` with explicit heuristics for when to inline trivial work vs. dispatch a sub-agent.

### From Phase 1 spec, not yet implemented

- `bin/verify-github.mjs` — wraps `gh api` checks for release verification (referenced by the verifier handshake in `skills/release/SKILL.md`).
- `bin/conductor-init.mjs` — bootstrap helper. `/conductor:start` currently falls back to `mkdir -p` inline.
- `bin/conductor-status.mjs` / `bin/conductor-decide.mjs` — CLI accessors for status + decide (skills already cover the in-session path; CLI is for non-Claude invocation).
- `bin/bump-version.mjs` — semver bump helper for release-manager.

### Plugin's own quality

- Add a `tests/` directory with smoke tests for: skills parse, hooks fire on the right events, atomic-write maintains invariants, monitors don't crash, frontmatter schemas validate.
- Add CI: `.github/workflows/validate.yml` running `claude plugin validate ./claude-conductor` and `node --check bin/*.mjs bin/lib/*.mjs` on every push.

## v0.2.0 — feature follow-up

Themes (subject to community feedback):

- **Multi-project sessions** — currently the conductor assumes one project per session. Spec how to support multiple `.conductor/` dirs.
- **Resume from any phase** — `/conductor:resume` currently routes by `phase`. Add `--from <phase-id>` to explicitly rewind.
- **Sub-agent retry budgets** — execute's "3 consecutive verifier failures" is the only hard stop. Add per-phase configurable retry caps.
- **Templates registry** — `templates/` is local; consider a URL-fetch mechanism so plugins can ship custom plan/review templates.
- **Token-guard refinement** — current model: flat 30k per Agent dispatch. Refine with model-aware estimates (Opus vs Sonnet vs Haiku consume context differently).

## v1.0 — API stability

Conditions for v1.0 (checklist, not a date):

- [ ] At least 5 community-run TEST_PROTOCOL passes documented in Discussions.
- [ ] At least one non-trivial real-world plugin shipped via the conductor flow.
- [ ] Spec frozen — no `discoveries.md` overrides for 3 months.
- [ ] All v0.1.x discoveries resolved or explicitly deferred to v1.1+.
- [ ] `CHANGELOG.md` covers all behavior changes since v0.1.0.
- [ ] `docs/TEST_PROTOCOL.md` updated to cover failure modes observed in the wild.

No commitment to a v1.0 date until the above checklist crosses ~60%.

## Preserve in future audits (Phase 9 strengths)

The auditor flagged these as load-bearing patterns. Any PR that regresses one of these should require an explicit override:

- **S-1 — Defensive JSON parsing in `verifier-dispatch.mjs`**: `agent_type || subagent_type || subagent_id` disjunction. The Task→Agent rename in v2.1.63 would have silently broken a tighter parser. New hook scripts that read stdin JSON should copy this pattern.
- **S-2 — `bin/lib/atomic-write.mjs` tempfile + rename + unlink-on-throw**: the right primitive, scoped to exactly the scripts that need it (STATE.json, signal file, checkpoints).
- **S-3 — Fail-open consistency** (exit 0 on internal error; exit 2 only as a deliberate BLOCK in `token-guard.mjs`): uniform across all 8 hook scripts. No `process.exit(1)` slipping in.
- **S-4 — Minimal tool whitelists per agent**: every agent's `tools:` is scoped down. PRs adding a tool should require a one-line justification.
- **S-5 — Hook event names match v2.1.144 spec exactly**: cross-checked against `code.claude.com/docs/en/plugins-reference` and `…/hooks`. Future event additions must be vetted against the live spec.
- **S-6 — Signal-only SubagentStop pattern**: `_pending_verification.json` decoupling survives across hook-process boundaries and Claude Code version evolutions, even though the W-2 rationale is partly wrong.
- **S-7 — `disable-model-invocation: true` on irreversible skills** (`/conductor:start`, `/conductor:release`): prevents auto-shipping on a "looks ready" judgment. New side-effect skills must set this flag.
- **S-8 — `discoveries.md` honest about gaps**: DISC-3 (no live runtime test), DISC-1/2/5 (spec omissions) all in `discoveries.md` and routed to ROADMAP. Every release whose audit found gaps should publish those gaps in `discoveries.md`, not just in the changelog.
