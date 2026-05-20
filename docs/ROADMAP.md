# Roadmap — claude-conductor

This roadmap captures upcoming work. Items emerge from the
[`.conductor/discoveries.md`](../.conductor/discoveries.md) log and from
community feedback via Discussions + Issues.

## v0.1.1 — patch follow-up to v0.1.0

Lands within ~2 weeks of v0.1.0 community feedback.

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
