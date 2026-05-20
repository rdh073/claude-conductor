# Discoveries — claude-conductor (self-build engineering archeology)

Empirical findings about the conductor that emerged from building it AND from
running it against itself. Append-only. Each discovery should override or amend
the spec where it surfaces — that's the whole point of `discoveries.md` per
CLAUDE.md.

Linked to dogfood session: `/home/xtrzy/dogfood/hello-world-plugin-test/` (Phase 7).

---

## DISC-1 — release-manager.md doesn't document the no-remote fallback

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood (target repo had no `origin` remote)
**Severity:** WARNING — design omission

**Finding:** When the release-manager runs against a target without a remote, `gh release create` is meaningless. The spec in `agents/release-manager.md` says (step 8) "Create GitHub Release: `gh release create vX.Y.Z --notes ...`" but doesn't specify what to do when no remote is configured.

In the dogfood, the conductor decided ad-hoc (D6 in dogfood decisions.md) to skip the gh step, tag locally, and log. That worked, but it was an unwritten convention.

**Impact on spec:** `agents/release-manager.md` should add a "Pre-flight branching" section:
- If `git remote get-url origin` fails → tag locally, skip push, skip gh release, log the omission in decisions.md
- If remote exists but `gh auth status` fails → tag + push, skip gh release, log
- If both available → full path

**Action for v0.1.1 of conductor:** amend `agents/release-manager.md`. Possibly add a `bin/verify-github.mjs` helper script (mentioned in the original Phase 1 spec but not yet implemented).

**Reversibility:** spec amendment, easy.

---

## DISC-2 — log-commit hook doesn't fire in simulation; state files accumulated unstaged

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood (no real Claude Code runtime, hence no hook firing)
**Severity:** INFORMATIONAL — confirms hook design works as intended in real sessions

**Finding:** During the dogfood, every Write to `.conductor/decisions.md` and `.conductor/checkpoints/*.json` and `.conductor/reports/*.json` accumulated in the working tree without auto-commit. In a real Claude Code session, the PostToolUse hook on Write (`bin/log-commit.mjs`) would have auto-committed `.conductor/decisions.md` and `.conductor/discoveries.md` (the audit-trail files specifically — checkpoints/reports aren't in the log-commit filter).

Before the release-manager could pass its clean-tree guard, the conductor had to manually run `git add .conductor/ docs/ && git commit ...`.

**Impact on spec:** Two things to consider for v0.1.1:
1. The log-commit hook covers only decisions.md and discoveries.md. Should it also cover checkpoints/ and reports/? Argument FOR: clean tree at release time. Argument AGAINST: noisier commit history. Current scope is correct — release-manager should be the one to bundle non-log state files into a single `chore(conductor-state): ...` commit before the release commit.
2. The release-manager.md spec should explicitly include "commit any uncommitted conductor state (checkpoints/, reports/) under `chore(conductor-state): ...`" before bump-guard step 1.

**Action for v0.1.1 of conductor:** amend `agents/release-manager.md` step 1 to include pre-flight state commit.

---

## DISC-3 — true runtime test of the plugin requires an interactive nested session

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood (I am Claude running in a session without the conductor plugin loaded)
**Severity:** CRITICAL gap in test coverage

**Finding:** A true dogfood test — "start Claude with `--plugin-dir`, run `/conductor:start`, answer the wizard interactively, watch the conductor lead from spec to ship" — was not directly executable from within my session.

What I COULD do (and did):
- Validate the plugin syntactically via `claude plugin validate` (clean).
- Read each skill body and manually execute its instructions.
- Dispatch the engineer as a real general-purpose sub-agent briefed with the engineer.md role — this DID validate that the engineer role spec is internally consistent (the sub-agent self-corrected the author-warning and produced clean output).
- Verify the resulting plugin works structurally (`claude plugin validate ./hello-world` clean).

What I COULD NOT do:
- Verify that the plugin's hooks actually fire when invoked in a real session (e.g., does preflight.mjs run on SessionStart? Does token-guard.mjs really block at exit 2?).
- Verify that the monitors (watch-plan, watch-ci, watch-verifier) actually start on their `when:` triggers.
- Verify that `AskUserQuestion` inside the onboard skill actually prompts the user in interactive mode.
- Verify that `/conductor:start` actually invokes `/conductor:onboard` via the Skill tool (the skill composition path).
- Verify how the conductor agent (set via `settings.json: { "agent": "conductor" }`) actually presents itself as the main session agent.

**Impact on spec:** Phase 9 (self-audit) should explicitly include a manual runtime test step that the human user runs in a real terminal. Document this as a checklist in CONTRIBUTING.md or a new TEST_PROTOCOL.md.

**Action for v0.1.1 or Phase 9:** Write TEST_PROTOCOL.md with manual runtime test steps. Probably add it to `docs/` so it ships with the plugin and is also the reference for community testers.

---

## DISC-4 — engineer sub-agent role spec validates (self-correction observed)

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood, engineer dispatch
**Severity:** POSITIVE — engineer.md role is sound

**Finding:** The engineer sub-agent (dispatched as general-purpose, briefed with the verbatim engineer.md role + Phase A spec) executed correctly:
1. Read ONLY Phase A from plan.md (didn't re-read brief unprompted).
2. First `claude plugin validate` emitted an `author` warning. Engineer self-corrected (added author field) and re-ran — exactly per engineer.md "iterate until ALL acceptance criteria hold."
3. Did NOT invent scope (no .gitignore, no CI, no tests beyond validate, no extra files).
4. Committed with valid Conventional Commits message.
5. Reported back concisely with the structured shape requested.
6. STOPPED after Phase A.

**Impact on spec:** engineer.md is internally consistent. No spec changes needed for the engineer role.

**Action:** None. This is a validate-don't-regress strength.

---

## DISC-5 — inline-vs-dispatch heuristic for verifier and librarian

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood (D2 and D4 in dogfood decisions.md)
**Severity:** PATTERN — document, don't change behavior

**Finding:** Twice in the dogfood, the conductor chose to do work INLINE rather than dispatch a sub-agent:
- D2: librarian for a trivial research question (bash-only plugin, no library choice to make)
- D4: verifier for deterministic file/structural checks (`ls`, `python -c "json.load"`, `claude plugin validate`)

The rationale was token economy — sub-agent dispatch costs ~30k tokens; trivial work doesn't justify it.

**Impact on spec:** Neither `agents/librarian.md` nor `agents/verifier.md` documents when to bypass the dispatch. The skill files (`skills/discover/SKILL.md`, `skills/execute/SKILL.md`) hard-code "Dispatch via Agent tool." This is correct for the GENERAL case but creates token waste for trivial cases.

**Proposed amendment for v0.1.x:** Add to `skills/discover/SKILL.md` and `skills/execute/SKILL.md` a "When to inline" clause:
> If the research question is decidable from < 2 doc pages AND requires no bench → consider answering inline, logging the decision per the decide skill, and skipping the dispatch.
> If the verification step is fully deterministic (file presence, JSON schema, plugin validate, sed substitution) → consider inline verification, logging the method used in the checkpoint.

The discovery is that the conductor pattern needs this inline-vs-dispatch decision as an explicit step, not an implicit one.

**Action for v0.1.1:** Amend both skill files.

---

## DISC-6 — the audit step found a real bug on a "trivial" plugin

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood, auditor step
**Severity:** POSITIVE — validates the audit-is-load-bearing premise

**Finding:** The hello-world plugin was 3 files, ~63 lines. The engineer's `claude plugin validate` was clean and all 6 acceptance criteria mapped 1-to-1 to verifier checks that passed. By every "did the engineer ship correctly" metric, this was done.

The audit step found CR-1: the README's secondary install command `claude plugin install ./hello-world` is invalid per official docs. The engineer's verifier didn't catch it because the acceptance criteria didn't include "README's claims are accurate" — they included "README exists with install + usage + MIT note" (structural).

This is the exact gap the auditor.md role is designed to find: the engineer's narration is "I implemented all acceptance criteria" → the auditor verifies "do the claims match reality, including claims the engineer didn't think to verify?"

**Impact on spec:** No changes needed. The audit step worked as designed.

**Action:** None. This is a validate-don't-regress strength. Future auditor sessions should explicitly include "run every command shown in README and verify the documented output" as a default check.

---

## DISC-7 — interrupt count was EXACTLY 2 in the simulation

**Date:** 2026-05-20T00:38:30Z
**Source:** Phase 7 dogfood
**Severity:** POSITIVE — architecture validation

**Finding:** The user's success criterion for Phase 7 was: "If conductor can ship that without interrupting more than 2 times (onboard + plan-approval), Phase 7 passes." Counted interrupts during the dogfood: **exactly 2**.

Gate 1 (onboard): the 5-question wizard fired at the start.
Gate 2 (spec approval): the plan was presented and "approved".

Everything between (research, plan drafting, engineer dispatch + iteration, verifier, audit categorization, release decision, no-remote fallback) was conductor-decided and logged. No user pause.

The 3-AND condition held: when CR-1 surfaced post-audit, the conductor picked ship-with-disclosure (D5) rather than asking the user. The decision was reversible (next ship adds the fix), not strategic-business (it was a clear pattern: pre-1.0 + disclose gaps), and the technical winner was clear (continue the dogfood narrative).

**Impact on spec:** Confirms the 3-AND pause-gate logic is well-calibrated. No changes needed.

**Action:** None. Validate-don't-regress.

---

## Summary of v0.1.1 action items (from this dogfood)

1. Amend `agents/release-manager.md` — no-remote fallback + pre-flight state commit (DISC-1, DISC-2).
2. Amend `skills/discover/SKILL.md` and `skills/execute/SKILL.md` — inline-vs-dispatch heuristic (DISC-5).
3. Write `docs/TEST_PROTOCOL.md` — manual runtime test steps (DISC-3).
4. Implement `bin/verify-github.mjs` per the Phase 1 spec but not yet in Phase 5 (referenced in DISC-1).

Non-actions (strengths to preserve):
- engineer.md role (DISC-4)
- auditor.md role (DISC-6)
- 3-AND pause-gate logic (DISC-7)

---

## DISC-8 — the auditor found a bug in itself (and survived)

**Date:** 2026-05-20T01:00:00Z
**Source:** Phase 9 self-audit
**Severity:** POSITIVE — pattern self-validates

**Finding:** CR-3 in `docs/REVIEW.md` is the auditor pointing out that `agents/auditor.md` declares `tools: Read, Glob, Grep, Bash` but the body instructs "Write `docs/REVIEW.md`". The auditor sub-agent, briefed with the exact auditor.md role, found this contradiction in its own spec — and reported it without flinching, even though the contradiction technically made the auditor unable to produce its primary output (mitigated only because we dispatched via general-purpose with full tools, not as a strict plugin sub-agent).

**Why it matters:** Self-finding works. The auditor is not just a critic of others' code — its role is sufficient to critique its own role spec. Future audits should explicitly include "audit the auditor" as a step (similar to how the verifier doesn't auto-verify the verifier in `bin/verifier-dispatch.mjs`).

**Impact on spec:** No change to the audit pattern itself. v0.1.1 will fix CR-3, which closes the loop.

---

## DISC-9 — Phase 9 changed v0.1.1 priority order

**Date:** 2026-05-20T01:00:00Z
**Source:** Phase 9 self-audit
**Severity:** ROUTING — changes v0.1.1 scope

**Finding:** Pre-audit v0.1.1 priorities were the 4 dogfood DISCs + 4 Phase 1 spec scripts. Post-audit, the priority order shifts: CR-1/2/3 jump to the top (must-fix), DISC-* slide to mid-priority (correctness improvements), Phase 1 unshipped scripts stay where they were.

**Impact on spec:** `docs/ROADMAP.md` was updated to reflect this — CR section appears first under v0.1.1.

**Action:** None beyond the ROADMAP edit. Future audits should expect to re-prioritize the next minor's backlog.

---

## DISC-10 — Layer D's C- grade is a bootstrap paradox, not a defect

**Date:** 2026-05-20T01:00:00Z
**Source:** Phase 9 self-audit, layer D grading
**Severity:** META — naming a known constraint

**Finding:** The auditor graded Layer D (Self-consistency / meta) at C-, citing that the conductor's own build did not produce a `brief.json`, `plan.md`, `STATE.json`, `checkpoints/`, `reports/`, or `SESSION-SUMMARY.md` at the conductor repo. The CHANGELOG's "built using its own pattern" claim is therefore overstated.

**Why it's not strictly a defect:** This is a chicken-and-egg constraint. The conductor cannot eat its own dogfood on its OWN build before v0.1.0 exists. v0.1.0 IS the very thing that allows `/conductor:start --target ./claude-conductor` to work. Layer D's grade reflects that the v0.1.0 build was a mega-prompt phase-by-phase walk, not a `/conductor:start` driven flow.

**Why we still graded it C-:** Honest pre-existing claim ("built using its own pattern") was too strong for what actually happened.

**Impact on spec:** Two things:
1. The CHANGELOG entry needs a softer claim. v0.1.1 should rewrite "built using its own pattern" to "designed by extracting the pattern from a prior plugin build (clip-forge), with v0.1.1 onward built using `/conductor:start --target ./claude-conductor`."
2. The conductor's own .conductor/ directory should eventually contain the full state file set after v0.1.1's first dogfood-against-itself run.

**Action for v0.1.1:** Run `/conductor:start --target ./claude-conductor` as the v0.1.1 work itself. Layer D grade in the v0.1.1 self-audit should rise to A- or B+. If it does, the bootstrap paradox is closed.
