# Decisions — claude-conductor plugin (self-build log)

This is the decisions log for the plugin's own development. The
conductor pattern says: every non-trivial choice gets logged with
options + reasoning + supersession chain. Eating own dogfood by
recording the decisions made while building the conductor itself.

Append-only. To overturn a decision, append a new entry with
`Supersedes: <prior timestamp>`.

---

## 2026-05-19T23:55:00Z — D1: hook script error handling
Git: no-repo (plugin development, pre-git-init)
Options:
- (a) Fatal — preflight throws → abort session
- (b) Log + continue — preflight is informational
Chosen: (b)
Reason: Preflight checks (git, node, gh) are advisory. A missing `gh` CLI is fine until release time — the user can install gh later. Blocking onboarding because of a future-phase tool would prevent the conductor from doing its main job. Fail-open is the right default; the user gets visibility via console output without being gated. Applied universally: all hook scripts exit 0 on internal error, logging to stderr. Exception: PreToolUse token-guard, which IS intended to block — but blocks via exit code 2 (per docs), not via uncaught throw.
Supersedes: none

## 2026-05-19T23:55:00Z — D2: SubagentStop verifier dispatch (no recursion)
Git: no-repo
Options:
- (a) SubagentStop hook directly invokes verifier via Agent tool — risks recursion if verifier itself is a subagent
- (b) SubagentStop hook only EMITS a signal (writes `./.conductor/_pending_verification.json`); the execute skill polls/reads this on its next iteration and dispatches verifier itself
Chosen: (b)
Reason: The verifier IS a subagent (`agents/verifier.md`). Spawning it from a SubagentStop hook would fire another SubagentStop when verifier finishes, which would spawn another verifier, ad infinitum. Signal pattern decouples the trigger from the action: hook writes a flag, the main session (conductor) consumes it during the next execute iteration. Atomic and non-recursive.
Supersedes: none

## 2026-05-19T23:55:00Z — D3: monitor token-cost discipline
Git: no-repo
Options:
- (a) Heartbeat polling — emit current state every N seconds even if unchanged
- (b) Transitions only — emit ONLY on state change, with a max-rate-limit per minute
Chosen: (b) with 60s poll interval, max 1 emit per state change per minute, no heartbeats
Reason: Each monitor stdout line becomes a Claude notification, which costs tokens. A 30-minute CI run heartbeating every 30s = 60 notifications of mostly identical content. Transitions-only collapses that to ~3-5 meaningful events (queued → in_progress → success). For ci-status specifically: 60s poll cadence is plenty for human-paced workflows. plan-changes and verifier-events are event-driven (inotify / new-file tail), not polled — they're transition-only by nature.
Supersedes: none

## 2026-05-19T23:55:00Z — D4: atomic-write pattern for state files
Git: no-repo
Options:
- (a) Direct fs.writeFile — risk of corruption if process dies mid-write
- (b) Atomic: fs.writeFile(temp) → fs.rename(temp, target)
Chosen: (b)
Reason: State files (STATE.json, checkpoints/*.json) are critical for /conductor:resume. A corrupted STATE.json bricks resume. Atomic write via tempfile + rename is the standard POSIX pattern — rename is atomic on the same filesystem. Implementation lands in Phase 5 as `bin/lib/atomic-write.mjs`; all state-modifying scripts (checkpoint-guarantee, verifier-dispatch, log-commit indirectly) MUST use it. Direct writes are forbidden for state files. Plain markdown logs (decisions.md, discoveries.md) are append-only via `>>` and acceptable without atomic guarantee — losing a partial append is recoverable.
Supersedes: none

## 2026-05-19T23:55:00Z — D5: hook script PATH dependency
Git: no-repo
Options:
- (a) Hardcoded paths (e.g. /usr/bin/git)
- (b) Probe via `which` (POSIX) / `where` (Windows) at runtime
- (c) NPM `which-bin` package (cross-platform helper)
Chosen: (b) — `which` directly, no npm dependency
Reason: Hardcoded paths break on macOS/WSL/distro variations. The `which-bin` npm package would force a `node_modules/` install for the plugin, which contradicts the bin-script-as-skeleton design (scripts should be runnable without setup). Direct `which` invocation via `child_process.spawnSync('which', [bin])` works on all POSIX systems (Linux, macOS, WSL, Git-Bash on Windows). Native Windows without bash is a known gap — documented as future work, not blocked here.
Supersedes: none

---

## Spec corrections logged during Phase 4

These are NOT design decisions per se — they're places where my reading of the user's Phase 4 spec diverged from the official Claude Code docs, and the docs won.

## 2026-05-19T23:56:00Z — SC1: hook commands use ${CLAUDE_PLUGIN_ROOT}, not ${CLAUDE_PROJECT_DIR}
Git: no-repo
Reason: User Phase 4 spec wrote `node ${CLAUDE_PROJECT_DIR}/bin/preflight.mjs`. But `bin/` is part of the plugin's bundled files, not the user's project. Per official docs (plugins-reference § Environment variables): `${CLAUDE_PLUGIN_ROOT}` references the plugin's installation directory; `${CLAUDE_PROJECT_DIR}` references the user's project root. Hook scripts that LIVE in the plugin must use `${CLAUDE_PLUGIN_ROOT}`. Hook scripts can THEN cd into `${CLAUDE_PROJECT_DIR}` if they need to operate on the user's project.

## 2026-05-19T23:56:00Z — SC2: Stop → SessionEnd for checkpoint-guarantee
Git: no-repo
Reason: User wrote "5. Stop — checkpoint guarantee … On session stop, ensure STATE.json reflects latest". Per official docs: `Stop` fires after every Claude response (per-turn), `SessionEnd` fires once at session termination. Description ("on session stop, ensure STATE.json reflects latest") matches SessionEnd semantics. Per-turn writes also risk races with skill writes. Using SessionEnd.

## 2026-05-19T23:56:00Z — SC3: monitor `when` syntax
Git: no-repo
Reason: User wrote `"when": {"phase": ["execute", "release"]}` for ci-status. Per official docs, `when` accepts only `"always"` (default) or `"on-skill-invoke:<skill-name>"`. Phase-based gating doesn't exist. Closest equivalent: `"on-skill-invoke:execute"` — fires when execute starts, then runs until session end (including through release). Slight overhead (ci-status keeps polling after release) is negligible.

## 2026-05-19T23:56:00Z — SC4: PostToolUse `--no-verify` for the log-commit hook
Git: no-repo
Reason: User explicitly wrote `--no-verify` in the spec for the auto-commit hook. This is normally an anti-pattern (skips pre-commit hooks). Honored here because: (a) it's an automated audit-trail commit, not a user commit, (b) the user's project may have pre-commit hooks that conflict with .conductor/*.md writes, (c) the user explicitly requested it. Documented so future readers don't strip it.

---

## 2026-05-20T01:00:00Z — D6: Defer v0.1.1 patch to a fresh session
Git: main @ 58b8a49 (post Phase 9 self-audit)

Options considered:
- Patch CR-1/2/3 + 6 W now in the tail of this session
- Stop at v0.1.0 + post-audit; v0.1.1 patches in a fresh session

Chosen: Option 2 (stop)

Reason: This session is already substantial (~6 phases of substantial work + 1 sub-agent dispatch worth 182k tokens for the audit alone). Patching mid-session would either require `/compact` (violating the conductor's own discipline of not rushing tail-of-session work) or risk token-budget hit. Plus: a fresh session lets the v0.1.1 patch be driven by `/conductor:start --target ./claude-conductor` AGAINST itself — finally closing Layer D's meta-grade gap. The CR severity is "ship-with-known-gaps" not "block-release"; no urgency. Community-runners may surface additional issues via TEST_PROTOCOL that batch better with the audit fixes.

Reversibility: N/A (decision affects when patches land, not whether)

Anchored to: docs/REVIEW.md (audit output), v0.1.0 tag (immutable), discussions/1 (community advisory)

---

## 2026-05-20T01:10:00Z — D7: CR-4 privacy leak found in shipped state (immediate patch + system fix)
Git: main @ 33ee21f (post Phase 9, pre v0.1.1)

Context: empirical user finding — STATE.json/brief.json write raw cwd paths, leaking the developer's local username to any public repo where the target plugin commits `.conductor/`. v0.1.0 of THIS repo also shipped the leak: `.conductor/discoveries.md` line 8 + `docs/REVIEW.md` line 112 both contained the raw path. Commit body of `113dd82` (Phase 7 dogfood findings) also contains it.

Options considered:
1. Force-push to rewrite git history (clean repo)
2. Sanitize on-disk files only, accept commit-history leak as documented residue, ship a v0.1.1 with the proper redactor system

Chosen: Option 2

Reason: Force-pushing rewrites SHAs other tools may have cached (Claude Code installs, gh release, Discussions, the v0.1.0 tag). The leaked content is exactly one path string in one commit body — searchable but not catastrophic. The proper fix (redact-path.mjs + atomic-write wrapper) prevents FUTURE leaks for both this repo and every downstream plugin. Document the residual commit-body leak here; do not unwind the v0.1.0 tag.

Reversibility: locked-in (no force-push) — but the leak surface is bounded to commit `113dd82` body. Future v0.1.1 patches close the leak in shipped state files.

Anchored to: this commit (D7), v0.1.1 release notes, README.md privacy section to be added

---

## 2026-05-20T02:15:00Z — D8: Sweep latent CR-4 regression in CR-5/DISC-11 narrative
Git: main @ a0012c6 (post v0.1.2 tag, pre cleanup commit)

Context: v0.1.2's docs/REVIEW.md DISC-11 section used the developer's actual username as a CONCRETE EXAMPLE of "a username variant the auditor cannot test." Writing about the leak named the leak — same failure class as the original D7 narrative which had to be rewritten in v0.1.1. The v0.1.2 tag (`a0012c6`) now contains the latent leak in REVIEW.md line 301.

Options considered:
1. Force-undo v0.1.2 tag, sanitize, re-tag
2. Sanitize on main going forward, accept the leak in the v0.1.2 tag as residue (same D7 pattern)

Chosen: Option 2

Reason: v0.1.2 release was published, Discussion #1 comment posted, three-tag-prerelease-pattern already established. Force-undo would invalidate v0.1.2 SHA + GH Release URL + Discussion message link — visible cost to anyone who already viewed the release. Per D7 precedent: residual commit/tag leaks are documented and bounded; the forward path is sealed.

Sanitization: line 301 of docs/REVIEW.md rewritten — the literal developer username removed from the concrete-example phrasing, replaced with a generic descriptor that conveys the same point ("what if the user's username appears in a path field of a committed state file?").

Lesson for future writing about CR-4-class issues: NEVER use a real username in examples, even in security-fix narratives. Use `alice`, `<dev-username>`, or "the user's local username" as default placeholders. Already applied in tests/ via the alice convention; now applied to REVIEW.md narratives.

Reversibility: locked-in for the v0.1.2 tag's REVIEW.md content. Forward main is clean.

Anchored to: this commit, docs/REVIEW.md line 301, the cleanup-pattern for future writers

---

## 2026-05-20T02:30:00Z — D9: tag-immutability is an INVARIANT, not a per-decision question
Git: main @ 39e5b0f (post-v0.1.2 sweep, pre-v0.1.3)

Context: D7 (v0.1.0 commit-body leak in 113dd82) + D8 (v0.1.2 latent narrative leak in REVIEW.md line 301) + this v0.1.3-eve question ("force-undo v0.1.2 for the auto-detect refinement?") all hit the same gate three times in a row. The choice is no longer ambiguous — it's a stable pattern.

Three applications, same answer, same reasoning:
- D7: v0.1.0 commit body contains the raw path → patch forward, accept commit-body residue, document.
- D8: v0.1.2 REVIEW.md narrative names the dev username → patch forward, accept tag residue, document.
- D9 (this one): v0.1.2 ships bump-default-to-1M; empirical follow-up shows auto-detect from hook `model` is strictly better → DO NOT force-undo v0.1.2; ship auto-detect as v0.1.3.

The invariant:

**Tags are immutable. Mistakes get a new tag, not a force-push.**

Originally stated in CLAUDE.md § Release discipline as one rule among many. After three consecutive applications without exception, promoting to "invariant" — future sessions don't re-litigate this gate. Hitting it means: ship the next tag.

This isn't new policy. It's recognizing that the pattern is stable enough to lift out of per-decision deliberation. Anyone reading decisions.md hitting this question for a fourth time should not be re-evaluating; they should be running `git tag -a v0.X.Y` for the next slot.

Caveat: the invariant CAN be revisited if a force-push truly becomes the only safe action (legal/security mandate to scrub a leaked secret from git history with no other mitigation). The bar is "no other option exists," not "the next tag would be cleaner."

Reversibility: this lift can itself be reversed if a future situation demonstrates that the invariant is too strict. Currently no such situation has surfaced.

Anchored to: D7, D8; CLAUDE.md § Release discipline already states the rule; .conductor/discoveries.md DISC-11 documents the related "writing about a privacy leak names the leak" pattern that drives D8.
