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
