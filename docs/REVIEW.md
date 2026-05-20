# Code review — claude-conductor v0.1.0 (self-audit)

Audited by: auditor (sub-agent briefed with `agents/auditor.md` role)
Repo commit: `ffd2cf9` (HEAD, tagged `v0.1.0`)
Timestamp: 2026-05-20T00:57:44Z

## TL;DR

- **3** critical · **6** warnings · **8** nits · **8** strengths
- Layer scores: A=B+ B=B- C=C+ D=C- | **Overall=C+ / B-**
- Recommendation: **ship-with-known-gaps** — v0.1.0 is already tagged
  immutable, the documented DISC-3 runtime gap covers most live-fire
  risk, and the fresh criticals below are tractable in a v0.1.1 patch.
  Do **not** promote to `latest` or v1.x while CR-1, CR-2, CR-3 hold.

## Honest scores

| Layer | Grade | One-line justification |
| :--- | :---: | :--- |
| A — Architecture | B+ | Roles cohere, dispatch contract is consistent, but two contracts reference tools the actor cannot use (auditor missing Write; subagent recursion guard rationale half-correct). |
| B — Implementation | B- | Atomic-write, fail-open, signal-only dispatch, defensive JSON parsing all sound. But token-guard has a fatal asymmetry (increment without reset), `bash <.mjs>` mismatch, and D5's "use `which`" decision is undocumented in code. |
| C — Documentation | C+ | TEST_PROTOCOL, ROADMAP, DISC narrative are strong. README is half-TODO; CHANGELOG over-claims component counts; CLAUDE.md and conductor.md are well-aligned but the meta-flow they describe was never run against this repo. |
| D — Self-consistency (meta) | C- | Conductor did not eat its own dogfood on the conductor build itself: no `brief.json`, no `plan.md`, no `STATE.json`, no `checkpoints/`, no `reports/`, no `SESSION-SUMMARY.md`. Commit messages also do not follow the `feat(phase): <slice>` shape engineer.md prescribes. |
| **Overall** | **C+ / B-** | Solid skeleton, two real wiring bugs, one tooling drift against current Claude Code; ships honestly because the gaps are disclosed but the meta-claim "built using its own pattern" overstates what actually happened. |

## Critical (must fix before next release)

- [ ] **CR-1: `TodoWrite` is disabled by default in Claude Code v2.1.142+; conductor and engineer agents (plus `start` and `execute` skills) declare it as their planning tool.**
  - File: `agents/conductor.md:4`, `agents/engineer.md:4`, `skills/start/SKILL.md:5`, `skills/execute/SKILL.md:3`
  - Evidence: Official tools reference at `code.claude.com/docs/en/tools-reference` (fetched 2026-05-20): "`TodoWrite` ... Disabled by default as of v2.1.142 in favor of `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate`. Set `CLAUDE_CODE_ENABLE_TASKS=0` to re-enable." Current `claude --version` on this host: `2.1.144 (Claude Code)`.
  - Detail: Every agent that lists `TodoWrite` in its `tools:` whitelist will see the tool absent when run on a current Claude Code build. The skills that pre-approve `TodoWrite` via `allowed-tools` will pre-approve a tool that does not exist; new task planning falls back to `TaskCreate/TaskUpdate`. Functionally the conductor will still work because `Task*` is inherited, but the prescriptive guidance ("Plan with TodoWrite if the phase has > 3 steps." — `engineer.md:23`) points at a disabled tool.
  - Proposed fix: Replace `TodoWrite` with `TaskCreate, TaskGet, TaskList, TaskUpdate` in all four files; rewrite the engineer.md guidance to "Plan with `TaskCreate` if the phase has > 3 steps."
  - Regression test: Add a test that greps `agents/*.md` and `skills/*/SKILL.md` for `TodoWrite` and fails if any hit appears; add a CI matrix entry that runs `claude plugin validate` against the current stable Claude Code.

- [ ] **CR-2: `token-guard.mjs` increments `running_tokens_estimate` on every Agent dispatch but no skill or agent ever resets it; after ~6 dispatches the hard-block fires and stays fired for the rest of the session.**
  - File: `bin/token-guard.mjs:57`, with the contract assertion at `bin/token-guard.mjs:10-12` ("Skills are responsible for resetting `running_tokens_estimate` to 0 after a successful `/compact`.")
  - Evidence: `grep -rn "running_tokens_estimate\|/compact" skills/ agents/ CLAUDE.md` returns three hits (`conductor.md:23`, `execute/SKILL.md:12`, `CLAUDE.md:46`) — all of them only instruct "run `/compact`"; none touch STATE.json. Math: `BUDGET=200000`, `PER_DISPATCH=30000`, `BLOCK_RATIO=0.8` → threshold = 160000 → 160000/30000 ≈ 5.33 → the **6th** dispatch in a session blocks and every dispatch after that also blocks until STATE.json is hand-edited.
  - Detail: For a real `/conductor:start` flow that walks Onboard → Discover → Spec → Execute (N phases) → Audit → Release, N=6 is the canonical phase count in the TEST_PROTOCOL. The token-guard will hard-block somewhere during Execute on any plan with more than ~3 phases. The reset side of the contract is implementation-missing, not just doc-missing.
  - Proposed fix: Add a small `bin/lib/reset-tokens.mjs` (or inline the atomic write) and call it from the execute skill immediately after `/compact`. Document the contract in `CLAUDE.md` § Token budget so the skill body is not the only place it lives.
  - Regression test: Smoke-test that simulates 7 sequential Agent dispatches against a fresh STATE.json and asserts the 7th still succeeds.

- [ ] **CR-3: `agents/auditor.md` declares `tools: Read, Glob, Grep, Bash` but the documented output is "Write `docs/REVIEW.md`"; the auditor subagent literally cannot create or modify the file with its declared toolset.**
  - File: `agents/auditor.md:4` vs `agents/auditor.md:32`
  - Evidence: Frontmatter `tools: Read, Glob, Grep, Bash`; body line 32 "Write `docs/REVIEW.md`". Per `code.claude.com/docs/en/sub-agents`: plugin subagents get exactly the tools listed in `tools:` (allowlist semantics); Write is not in the list.
  - Detail: When the conductor dispatches `auditor` via the Agent tool, the subagent will receive a system prompt instructing it to write a file with a toolset that has no Write/Edit/NotebookEdit. The auditor can technically work around this by piping content through Bash (`cat <<EOF > docs/REVIEW.md`), but the auditor.md body says "Write `docs/REVIEW.md`", not "shell-redirect". This is the role contract diverging from the tool reality.
  - Proposed fix: Add `Write, Edit` to `agents/auditor.md` `tools:` field. Keep the "modifies no code" anti-pattern guidance — Write into `docs/REVIEW.md` is documentation, not code.
  - Regression test: Validate every `agents/*.md` body for a `Write \`...\`` instruction and cross-check the tool whitelist contains Write.

## Warnings (should fix in next minor)

- [ ] **W-1: `skills/start/SKILL.md:18` invokes the (non-existent) `bin/conductor-init.mjs` with `bash`, not `node`.**
  - File: `skills/start/SKILL.md:18`
  - Evidence: ``bash "${CLAUDE_PLUGIN_ROOT}/bin/conductor-init.mjs"``. The file does not exist (acknowledged in `docs/ROADMAP.md:22`), but if it ever lands as the `.mjs` extension implies, `bash` cannot execute an ES module. Fallback `mkdir -p` happens to be correct.
  - Detail: When the script ships in v0.1.1 the obvious extension is `.mjs`, which means the launcher should be `node`. Today the if-branch is dead because the file is missing, so the fallback wins — but the bug latches on first delivery.
  - Proposed fix: Change to `node "${CLAUDE_PLUGIN_ROOT}/bin/conductor-init.mjs"` (or `"${CLAUDE_PLUGIN_ROOT}/bin/conductor-init.mjs"` directly with a `#!/usr/bin/env node` shebang and `chmod +x`, since the docs say `bin/` is added to PATH).

- [ ] **W-2: Spec/code drift on the rationale behind D2 (signal-only SubagentStop hook).**
  - File: `.conductor/decisions.md:22-29` and `bin/verifier-dispatch.mjs:5-13`
  - Evidence: D2 reasons "Spawning [verifier] from a SubagentStop hook would fire another SubagentStop when verifier finishes, which would spawn another verifier, ad infinitum." The official sub-agent docs ("Subagents cannot spawn other subagents" — `code.claude.com/docs/en/sub-agents`, "Restrict which subagents can be spawned" §) state the verifier could not have been launched recursively anyway. The signal-only design is still correct — but for a different reason: the hook process is not the conductor's main session, so it cannot dispatch via the Agent tool at all.
  - Detail: Doc-drift in the rationale, not in the code. Future maintainers will mis-debug if the recursion guard is the load-bearing claim.
  - Proposed fix: Add a SC entry in `.conductor/decisions.md` correcting the rationale; cite the official "subagents cannot spawn subagents" rule.

- [ ] **W-3: D5 (probe via `which`) is declared but no script in `bin/` actually probes with `which`; they call `spawnSync('git', ...)` directly, which on native Windows without Git Bash will fail with ENOENT.**
  - File: `bin/preflight.mjs:13`, `bin/log-commit.mjs:43,49,60`, `bin/watch-ci.mjs:19-21`
  - Evidence: `grep -n "which\b" bin/*.mjs` returns only the comment `bin/watch-ci.mjs:10`. D5 in decisions.md picks "(b) `which` directly, no npm dependency". No code uses `child_process.spawnSync('which', ...)`.
  - Detail: D5 also says "Native Windows without bash is a known gap — documented as future work, not blocked here." Today the implementation is in fact `spawnSync(bin, ...)` and inherits Node's PATH lookup, which works on POSIX hosts and on Windows when the binary is `.exe` on PATH but fails for `git-bash`-only shims. The decision and the code disagree.
  - Proposed fix: Either (a) actually implement the `which` probe per D5 and update the scripts, or (b) supersede D5 with a new decision "use Node's built-in PATH search via spawnSync; Windows gap is OK."

- [ ] **W-4: Hook event `SubagentStop` does match the official spec, but the hook's input field name was bumped from `subagent_type` → `agent_type` in v2.1.63 (when `Task` was renamed `Agent`); the code reads both, but the comment is silent.**
  - File: `bin/verifier-dispatch.mjs:39-43`
  - Evidence: Code: `const agentType = input?.agent_type || input?.subagent_type || input?.subagent_id || '';` — defensive across versions. But the inline comment says "Field name varies across Claude Code versions; be defensive." with no version citation. Official spec (`code.claude.com/docs/en/hooks`, fetched 2026-05-20): "`agent_type` ... Present when the session uses `--agent` or the hook fires inside a subagent."
  - Detail: Defensive parsing is good. Cite the rename so future readers know `agent_type` is the canonical and `subagent_type`/`subagent_id` are legacy.
  - Proposed fix: One-line comment update: "// `agent_type` is canonical since v2.1.63 rename (Task→Agent); the other two are legacy aliases."

- [ ] **W-5: CHANGELOG entry over-claims by stating "**5** lifecycle hooks" — there are 5 entries in `hooks/hooks.json`, but two of them (`SessionStart`, `SessionEnd`) only run preflight/checkpoint, not five distinct behaviors. Also undercounts the test coverage: zero tests.**
  - File: `CHANGELOG.md:19-21`
  - Evidence: Entries match the file count, but no `tests/` directory exists (acknowledged in ROADMAP.md:25 "Add a `tests/` directory ..."). CHANGELOG says nothing about test coverage being zero. The "Documented" section also omits that `bin/verify-github.mjs`, `bin/conductor-init.mjs`, `bin/conductor-status.mjs`, `bin/conductor-decide.mjs`, and `bin/bump-version.mjs` from the Phase 1 spec did not ship.
  - Detail: The CHANGELOG under-discloses gaps. Per CLAUDE.md § Release discipline ("Release notes mention what's missing, not just what shipped") this is the kind of drift the conductor pattern is built to prevent.
  - Proposed fix: Add a single line under "Known limitations" enumerating the unshipped `bin/*.mjs` files and the "no tests" status. The roadmap already names them; the changelog should cite the roadmap by anchor.

- [ ] **W-6: README has three `_TODO:_` placeholders shipped in v0.1.0 ("What is it", "Install", ".conductor/ state directory", "Resume after Ctrl+C", "When to use this vs raw Claude Code").**
  - File: `README.md:14, 19, 60, 65, 67`
  - Evidence: ``_TODO: one-paragraph pitch — Conductor as the lead, sub-agents as the crew._`` and four more.
  - Detail: A first-time user landing on the v0.1.0 release page will see five TODO markers in the canonical README. This contradicts the "every release is a pre-release on GitHub" + "release notes are honest" discipline only by omission — the v0.1.0 release is marked prerelease per the conductor's own policy, but the README itself does not say "preview, see ROADMAP for what's filled in." DISC-6 in `.conductor/discoveries.md` cites exactly this anti-pattern caught on the hello-world dogfood; the conductor's own README has it.
  - Proposed fix: Fill the placeholders, or replace each `_TODO:_` with `Coming in v0.1.1 — see [ROADMAP.md](docs/ROADMAP.md)` so the user knows it is deliberate.

## Nits (style, micro-optimizations)

- [ ] **N-1:** Commit messages do not follow `engineer.md`'s prescribed `feat(phase): <slice>` shape — actuals are `feat(scaffold)`, `feat(agents)`, `feat(skills)`, `feat(hooks)`, `feat(bin)`, `feat(templates)`, `chore`, `docs`. Engineer was never actually invoked.
- [ ] **N-2:** `.conductor/` is missing every state file the spec promises (no `brief.json`, no `plan.md`, no `STATE.json`, no `checkpoints/`, no `reports/`, no `SESSION-SUMMARY.md`) — only `decisions.md` and `discoveries.md` exist. Acceptable for the self-build (architect/engineer didn't actually run); but the README/CLAUDE.md/conductor.md all describe these paths as load-bearing. A cold reader cloning v0.1.0 sees an "empty" `.conductor/` and reasonably wonders if the plugin shipped.
- [ ] **N-3:** `atomic-write.mjs` does not handle `EXDEV` (cross-filesystem rename). On POSIX, `rename()` returns `EXDEV` when source and destination live on different filesystems (e.g. tempdir on tmpfs, target on ext4). Today the temp file is a sibling of the target so they share a filesystem — the bug is latent until someone refactors. Documenting the invariant in the comment header would prevent the regression.
- [ ] **N-4:** `monitors/monitors.json` is at the default location and works as of `claude --version 2.1.144`, but the official spec warns "Components under the `experimental` key, `themes` and `monitors`, have a manifest schema that may change between releases ... the top level still works, `claude plugin validate` warns, and a future release will require `experimental.*`." Plug into `plugin.json` `experimental.monitors` proactively to future-proof.
- [ ] **N-5:** `bin/log-commit.mjs`'s `--no-verify` flag is justified in `.conductor/decisions.md` SC4 with a stronger case than the inline comment. The comment cites "SC4" with no link/context — a one-line "per .conductor/decisions.md SC4: user-explicit + automated audit-trail commits" would orient future readers.
- [ ] **N-6:** `watch-plan.mjs` regex for phase count is `/^###\s+Phase\s+/gim` which matches `### Phase A — title`. The template uses backtick `[pending]` after the title; if a user writes `### Phase A [pending] — title` or rearranges, the count may drift. Document the expected heading shape in `templates/plan-template.md` (it does, on line 26 — but the watcher's regex contract is undocumented).
- [ ] **N-7:** `bin/preflight.mjs:32` says "node ${process.versions.node} — conductor requires >= 20" using `parseInt(process.versions.node.split('.')[0], 10)`. For `2.1.0-alpha.1`-style versions this works, but for hypothetical `20.0.0-rc1` it still works. Not a real bug — but the existing `Node 20+` ROADMAP claim is loadbearing and there's no boot-time refusal, only a stderr warn. Spec says "fail-open per D1" which is intentional. Worth a 1-line comment confirming "warn-only is deliberate, not a TODO."
- [ ] **N-8:** `docs/TEST_PROTOCOL.md` uses ten skills in the `/help` expected output but the plugin shipping list is exactly 10 (`start, onboard, discover, spec, execute, audit, release, status, decide, resume`). Cross-checked clean. The expected output should also note that `/conductor:start` and `/conductor:release` will be flagged "manual invocation only" per `disable-model-invocation: true`, so the user can spot the difference in `/help`.

## Strengths (validate so we don't regress)

- **S-1: Defensive JSON parsing in `verifier-dispatch.mjs` (`agent_type || subagent_type || subagent_id`)** — the rename from Task→Agent in v2.1.63 would have silently broken a tighter parser; the disjunction survives the rename. Validate that future hook scripts copy this pattern when they read stdin JSON.
- **S-2: `bin/lib/atomic-write.mjs`'s tempfile-+-rename pattern with `unlink` cleanup on throw** — the right primitive, used by exactly the scripts that need it (`STATE.json`, signal file, checkpoint). Decisions.md D4 is correctly cited at the call sites.
- **S-3: `token-guard.mjs` exits 2 (HARD BLOCK) only for budget overruns, exit 0 for every internal error** — fail-open per D1 is implemented uniformly across all hook scripts (`preflight`, `log-commit`, `checkpoint-guarantee`, `verifier-dispatch`, `token-guard`, the watchers). Even when invariants fail (corrupt STATE.json, write failure), the parent flow keeps running. Validate that no future contributor adds a `process.exit(1)` on internal error.
- **S-4: Minimal tool whitelists per agent** — every agent's `tools:` is scoped down (architect has no Bash/Edit; auditor has no Write/Edit per CR-3; release-manager has no Glob/Grep/WebFetch). This is exactly the engineering archeology DISC-4 + DISC-7 cite as load-bearing. Validate-don't-regress: each PR that adds a tool to an agent's whitelist should require a one-line justification.
- **S-5: Hook event names all match the official Claude Code v2.1.144 spec** — `SessionStart`, `PreToolUse` (matcher `Agent`), `SubagentStop`, `PostToolUse` (matcher `Write`), `SessionEnd`. Cross-checked against `code.claude.com/docs/en/plugins-reference` and `code.claude.com/docs/en/hooks`. Validate that any future event added is also vetted against the official spec.
- **S-6: D2's signal-only pattern (write `_pending_verification.json`, let the next skill consume)** is the correct decoupling even though the rationale (W-2) is partly wrong. The pattern survives across hook-process boundaries and across Claude Code versions where the SubagentStop input schema may evolve.
- **S-7: `disable-model-invocation: true` on `/conductor:start` and `/conductor:release`** prevents the conductor from accidentally auto-shipping or auto-restarting on a "looks ready" judgment. Cited in `skills/release/SKILL.md:46-50`. Validate-don't-regress: any new skill with side effects (delete, push, tag, paid action) must set this.
- **S-8: `discoveries.md` is honest about the dogfood gaps** — explicitly flags DISC-3 (no live runtime test), DISC-1/DISC-2/DISC-5 (spec omissions), and ships them into ROADMAP.md as v0.1.1 work. This is the engineering-archeology pattern in action. Validate-don't-regress: every release whose audit found gaps should publish those gaps in `discoveries.md`, not just in the changelog.

## Verification commands run

```bash
claude plugin validate /home/<user>/playground/plugins/claude-conductor-dev/claude-conductor
# → Validation passed with warnings (CLAUDE.md at root, already documented)

for f in bin/*.mjs bin/lib/*.mjs; do node --check "$f"; done
# → all 9 files OK

git -C . log --oneline -30
# → 10 commits, v0.1.0 tagged at ffd2cf9

git -C . tag
# → v0.1.0

claude --version
# → 2.1.144 (Claude Code)

ls .conductor/checkpoints .conductor/reports
# → both ENOENT (state dirs not yet created)

ls .conductor/
# → decisions.md  discoveries.md  (plus .gitkeep)

grep -rn "TodoWrite" agents/ skills/
# → 4 hits (conductor.md, engineer.md, start/SKILL.md, execute/SKILL.md)

grep -rn "running_tokens_estimate" bin/ skills/ agents/ CLAUDE.md
# → only token-guard.mjs writes; nothing resets

grep -rn "Write\b" agents/auditor.md
# → body line 32 "Write `docs/REVIEW.md`"; frontmatter line 4 omits Write

WebFetch https://code.claude.com/docs/en/plugins-reference
# → fetched, confirmed hook event names, monitors schema, settings.json `agent` key

WebFetch https://code.claude.com/docs/en/sub-agents
# → confirmed `tools:` allowlist semantics, plugin subagent rules, Task→Agent rename

WebFetch https://code.claude.com/docs/en/hooks
# → confirmed `Agent` matcher name for PreToolUse, `agent_type` canonical field

WebFetch https://code.claude.com/docs/en/tools-reference
# → confirmed TodoWrite is disabled by default in v2.1.142+

WebFetch https://code.claude.com/docs/en/cli-reference
# → confirmed --plugin-dir is a real flag
```

## Out-of-scope flags

- **OOS-1: No live runtime test.** Acknowledged as DISC-3 in `.conductor/discoveries.md`; mitigated by `docs/TEST_PROTOCOL.md`. A nested interactive `claude --plugin-dir` session is out of scope for this audit pass (per the auditor role — auditor verifies, does not execute the live protocol).
- **OOS-2: `bin/verify-github.mjs`, `bin/conductor-init.mjs`, `bin/conductor-status.mjs`, `bin/conductor-decide.mjs`, `bin/bump-version.mjs` not implemented.** Acknowledged in ROADMAP.md v0.1.1 backlog. Per W-5 the CHANGELOG should disclose; the existence of the gap itself is tracked.
- **OOS-3: No CI yet.** `.github/workflows/` does not exist. ROADMAP.md v0.1.1 names it. Out of scope for the audit; flagged for the next release.
- **OOS-4: `node_modules` test surface.** Plugin ships zero npm deps by design (CONTRIBUTING.md confirms). No `package.json` to maintain. This is a strength but means no `npm test` to gate releases; release-manager.md bump-guard 2 ("Tests green") has no command to run today.
- **OOS-5: Cross-platform PATH search on native Windows.** D5 marks this a known gap. W-3 above is the residue.

---

## CR-4 (added v0.1.1) — Privacy leak in state writes [FIXED]

**Severity:** CRITICAL — already shipped in v0.1.0 public artifacts.
**Found by:** Empirical user feedback (post-Phase 9 release).
**File (before fix):** `bin/lib/atomic-write.mjs` wrote JSON objects as-is, including raw `process.cwd()` paths embedded in STATE.json / brief.json by callers.

**Detail:** Pre-v0.1.1, every state-file write preserved raw absolute paths like `/home/alice/proj`. When a target plugin later committed `.conductor/` to a public repo, the Linux/macOS/Windows username leaked. v0.1.0 of THIS repo also shipped the leak: `.conductor/discoveries.md` line 8 and `docs/REVIEW.md` line 112 both contained the development host's path.

**Evidence pre-fix:** `grep -rn "/home/$(whoami)/" .conductor/ docs/` returned hits at the two file locations. Commit `113dd82` body also contained the path — residual leak in git history, documented in `.conductor/decisions.md` D7 (not force-pushed; bounded surface).

**Fix in v0.1.1:**

- `bin/lib/redact-path.mjs` — POSIX + Windows home-dir regex helper (`/home/<user>`, `/Users/<user>`, `C:\Users\<user>`, plus UNC long-path variant `\\?\C:\Users\<user>`).
- `bin/lib/atomic-write.mjs` — `atomicWriteJSON` now applies `redactObject` by default. Opt-out via `{ skipRedaction: true }` for the rare case where the path IS the legitimate data.
- `README.md` — new "Privacy & `.conductor/` directory" section documenting the redaction behavior and the recommended `.gitignore` add for target plugins.
- `templates/plan-template.md` — comment block notes the privacy contract.
- `tests/lib/redact-path.test.mjs` — 7 unit tests covering linux/mac/windows home dirs, no-op for non-home paths, recursive object walk, non-string values (null/numbers/booleans), and empty objects. All pass.
- Already-shipped v0.1.0 leak patched in commit `e791bb5` (sed replacement of `/home/<dev-username>/` → `/home/<user>/` in the two affected files).

**Regression test:** `node --test tests/lib/redact-path.test.mjs` — must show 7/7 passing. Also: `grep -rn "/home/$(whoami)\|/Users/$(whoami)" .conductor/ docs/ templates/ README.md` should return zero hits before any release.

**Disclosure note:** The original commit body `113dd82` retains the raw path. Force-pushing to rewrite would invalidate the v0.1.0 tag SHA and any cached marketplace install. Per D7 in `.conductor/decisions.md`, the residue is accepted as bounded; the forward path is sealed.

---

## v0.1.1 re-audit — 2026-05-20T01:50:00Z

**Method:** Inline re-audit (per DISC-5 heuristic — verifying 4 specific CR fixes is deterministic file checks; sub-agent dispatch overhead unjustified). Verification commands listed below.

### TL;DR

- **0** critical (down from 3) · **5-6** warnings (carried over from v0.1.0 audit, mostly unchanged) · **8** nits (carried over) · **10** strengths (8 carried + S-9, S-10 new)
- Layer scores: A=A- (was B+), B=B+ (was B-), C=B- (was C+), D=C- (unchanged) | **Overall = B- / B** (was C+ / B-)
- Recommendation: **ship v0.1.1** — Phase 10 marketplace unblock conditions met. Promotion to `latest` waits on community-runner TEST_PROTOCOL passes per the v1.0 checklist.

### Critical resolutions

- ✅ **CR-1 fixed** — `grep -rn "TodoWrite" agents/ skills/` returns 0 hits. Replaced with `TaskCreate, TaskGet, TaskList, TaskUpdate` in `agents/{conductor,engineer}.md` and `skills/{start,execute}/SKILL.md`. `engineer.md` body updated to "Plan with `TaskCreate` if the phase has > 3 steps."
- ✅ **CR-2 fixed** — `bin/lib/reset-tokens.mjs` ships; `skills/execute/SKILL.md` token-budget section now spells out the two required steps (`/compact` + `node ${CLAUDE_PLUGIN_ROOT}/bin/lib/reset-tokens.mjs`); `bin/token-guard.mjs` comment block updated. Smoke-tested: starting from `running_tokens_estimate: 150000`, the reset brings it to `0` and stamps `last_compact_at`.
- ✅ **CR-3 fixed** — `agents/auditor.md` frontmatter is now `tools: Read, Write, Edit, Glob, Grep, Bash`. Body's "no source modifications" anti-pattern is intact — only the tool wiring matched the intent.
- ✅ **CR-4 fixed** — `bin/lib/redact-path.mjs` ships with POSIX + Windows home-dir handling; `bin/lib/atomic-write.mjs` applies `redactObject()` by default; 7 unit tests pass; README carries a Privacy section; template carries a comment block. Latent leaks in test inputs and decisions.md narrative were also swept (see below).

### Layer re-grades

| Layer | Before | After | Why |
| :--- | :---: | :---: | :--- |
| A — Architecture | B+ | **A-** | CR-3 closed; remaining note is W-2's half-correct D2 rationale, deferred. |
| B — Implementation | B- | **B+** | CR-1, CR-2, CR-4 all closed; reset-tokens.mjs and redact-path.mjs are net-new correctness primitives, with tests. Remaining: W-3, W-4, N-3 latent. |
| C — Documentation | C+ | **B-** | README Privacy section added, atomic-write docstring extended, template carries gitignore note. Remaining: W-6 — 5 `_TODO:_` markers still in README. |
| D — Self-consistency (meta) | C- | **C-** | Unchanged. v0.1.1 was still patched via mega-prompt + this Claude session, not `/conductor:start --target ./claude-conductor`. Bootstrap paradox (DISC-10) still open. |
| **Overall** | **C+ / B-** | **B- / B** | Three layers up, one flat. Modest move because Layer D didn't budge. |

### New strengths to preserve

- **S-9 (cleanup-on-touch)** — `atomicWriteJSON` redacts on every write, so any read-modify-write cycle automatically launders pre-v0.1.1 raw paths in existing STATE.json. Smoke test confirmed: a STATE.json with `cwd: "/home/example-user/proj"` came out as `cwd: "/home/<user>/proj"` after `reset-tokens.mjs` ran — CR-2 + CR-4 exercised in one round-trip.
- **S-10 (testing precedent)** — `tests/lib/redact-path.test.mjs` is the plugin's first test file. OOS-4 from Phase 9 ("no `npm test`") moves from "no path" to "directory established, pattern set." `node --test` + `node:assert/strict`, zero npm deps. New test files for other primitives can follow this template.

### Latent fix during re-audit

Two latent leaks surfaced during the inline re-audit and were patched before v0.1.1 ships:

1. `tests/lib/redact-path.test.mjs` originally used the developer's actual username as test-input strings (`/home/<dev>/foo`). The TEST was correct (it asserted the redactor turned it into `/home/<user>/foo`), but the literal in the source file leaked. Renamed all test inputs to `alice` — tests still pass, leak removed.
2. `.conductor/decisions.md` D7 narrative explicitly NAMED the leaked username in parentheses. The doc became the leak. Rewrote to "leaking the developer's local username."

After the latent fix: `grep -rn "<dev-username-pattern>" --exclude-dir=.git .` returns **0** hits across all tracked files.

### Verification commands run

```bash
grep -rn "TodoWrite" agents/ skills/                          # 0 hits
grep "^tools:" agents/auditor.md                              # contains Read, Write, Edit
test -f bin/lib/reset-tokens.mjs                              # exists
test -f bin/lib/redact-path.mjs                               # exists
grep -c "redactObject" bin/lib/atomic-write.mjs               # 3
node --check bin/*.mjs bin/lib/*.mjs                          # 10/10 clean
node --test tests/lib/redact-path.test.mjs                    # 7/7 passing
claude plugin validate .                                      # passed with documented CLAUDE.md warning
grep -rn "<dev-username>" --exclude-dir=.git .                # 0 hits

# Round-trip smoke test exercising CR-2 + CR-4 simultaneously:
# Input STATE.json:  running_tokens_estimate=150000, cwd="/home/example-user/proj"
# After running:     node bin/lib/reset-tokens.mjs (with CLAUDE_PROJECT_DIR pointing at a tmpdir)
# Output STATE.json: running_tokens_estimate=0, cwd="/home/<user>/proj", last_compact_at=<ISO>
```

### Out-of-scope flags still standing

- **OOS-1 — Live runtime test (DISC-3)**: Unchanged. `docs/TEST_PROTOCOL.md` is human-runnable; community testers gate the next promotion.
- **OOS-2 — Unshipped Phase 1 `bin/*.mjs` scripts**: `verify-github.mjs`, `conductor-init.mjs`, `conductor-status.mjs`, `conductor-decide.mjs`, `bump-version.mjs`. In `docs/ROADMAP.md`.
- **OOS-3 — No CI yet**: `.github/workflows/` does not exist. v0.1.2 item.
- **W-1, W-2, W-3, W-4, W-6, N-1 through N-8**: Carried over from v0.1.0 audit; tracked in `docs/ROADMAP.md`.

### Promotion gate

**Phase 10 marketplace submission unblocked** — `audit_count_critical: 0`. Per Phase 9's spec ("Bypass IF audit returns ≥ 3 critical"), v0.1.1 clears the gate.

**Promote to `latest`?** Not yet. Per CLAUDE.md release discipline: "v1.x and above, latest only when the auditor has signed off and the release notes disclose all known gaps." We're at 0.1.1 — `--prerelease` stays on. Move to `latest` happens when 0.x becomes 1.0 per `docs/ROADMAP.md`'s v1.0 checklist.


---

## CR-5 (v0.1.2 fix) — token-guard incompatible with Opus 1M context

**Severity:** CRITICAL (higher than CR-1/2/3/4) — self-defeats the boomerang loop for power users.
**Found by:** Empirical user testing during the v0.1.1 patch session.
**File (before fix):** `bin/token-guard.mjs:21` — `const BUDGET = parseInt(process.env.CC_TOKEN_BUDGET || '200000', 10);`.

**Detail:** Default `CC_TOKEN_BUDGET=200000` and the flat 30k-per-dispatch estimate combined to block the 6th Agent dispatch (200000 × 0.8 / 30000 ≈ 5.33). For an Opus 1M context user, real context utilization at dispatch #6 was under 10% — the guard fired against a phantom threshold while massive headroom remained. The boomerang loop was unusable end-to-end for the exact users most likely to drive complex multi-phase projects through the plugin.

**Evidence pre-fix:** Boomerang against any plan with ≥ 6 phases would block at phase #6 verifier-or-engineer dispatch even on a 1M context model with sub-100k real usage.

**Fix in v0.1.2:**

- `bin/token-guard.mjs` — `CC_TOKEN_BUDGET_DISABLED=1` escape hatch checked at module load (before any state read). Default `CC_TOKEN_BUDGET` bumped 200000 → 1000000 to match Opus 1M.
- `tests/lib/token-budget.test.mjs` — 3 spawn-based integration tests: escape hatch passes at 999999 running, default 1M passes at 180000 running (CR-5 reproducer fix), Sonnet opt-down `CC_TOKEN_BUDGET=200000` with 180000 running still blocks (exit 2). All pass.
- `README.md` — new "Power users — Opus 1M context" section documents both env vars and the deferred role-aware estimator.

**Deferred to v0.1.3 (new W-7):**

- Role-aware `PER_DISPATCH` estimator (verifier ~5k, engineer ~30k, librarian ~80k, auditor ~15k, release-manager ~10k, architect ~20k). Needs verification that `tool_input.subagent_type` is populated by Claude Code's PreToolUse hook input; current `bin/verifier-dispatch.mjs:43` reads `agent_type || subagent_type || subagent_id`, suggesting the field IS available — but the verifier-dispatch is on SubagentStop, not PreToolUse, so the schema may differ.

**Regression test:** `tests/lib/token-budget.test.mjs` — must continue to pass on every release. Add to a future CI workflow alongside `redact-path.test.mjs`.

---

## DISC-11 — Empirical user testing surfaces structural bugs the audit cannot find

**Date:** 2026-05-20 (v0.1.2 patch session)
**Source:** CR-4 (privacy leak) and CR-5 (token-guard 200k default) — both found by empirical user usage, NOT by the Phase 9 self-audit.
**Severity:** META — changes the auditor.md role spec for future audits.

**Pattern:** Phase 9 audit found three logic bugs (CR-1/2/3): tool deprecation drift, missing reset path, tool-whitelist contradiction. All three are inspectable from inside the same context the auditor runs in — read the file, grep for symbols, run `claude --version`, done.

CR-4 and CR-5 are different: they're ASSUMPTION bugs about deployment context. The auditor runs as a sub-agent in the same Claude Code session as the conductor, on the same dev machine, with the same env vars, against the same model. It literally cannot see "what if the user is on Opus 1M instead of Sonnet 200k?" or "what if the user's username appears in a path field of a committed state file?" — those questions live outside the auditor's process boundary.

**Impact on spec:** `agents/auditor.md` should grow a **"Layer E — Environmental variance"** audit step for future v0.X.0 releases. Sample variants the auditor should explicitly consider:

- `CC_TOKEN_BUDGET ∈ {200000, 1000000}` (Sonnet vs Opus 1M default).
- Path variants: Linux `/home/<user>`, macOS `/Users/<user>`, Windows `C:\Users\<user>`, UNC `\\?\C:\Users\<user>`.
- Git: remote configured vs absent, pre-commit hooks present vs absent.
- Permissions: gh CLI authenticated vs not.
- Tools deprecation: re-run `claude --version` and consult `/tools-reference` for any prerequisites that may have shifted.
- Plugin not the user's only one — interactions with other enabled plugins.

**Action for v0.2.0 (or earlier):** amend `agents/auditor.md` to add Layer E. Document an "Environmental variance checklist" the auditor walks deliberately. Tracked in `docs/ROADMAP.md` v0.2.0 themes.

**Why deferred:** Layer E is a real design amendment to the auditor role + the audit deliverable shape. Tail-of-session work in v0.1.2 isn't the right venue. v0.2.0 (or the v0.1.3 patch if community testing produces more variance findings).
