---
description: Bump version, write release notes, tag, create GitHub Release. Refuses if docs/REVIEW.md has unresolved CRITICAL items. Pre-release for 0.x. Manual invocation only — model invocation disabled to prevent accidental ships.
disable-model-invocation: true
allowed-tools: Agent Read Write Bash
---

# Release

Dispatch the `release-manager`. Cross-verify the tag and GH Release via `gh api` before declaring done.

## Pre-flight (refuse if any fail)

1. Read `docs/REVIEW.md`. If any CRITICAL items unresolved:
   - Print the unresolved criticals (title + cite).
   - Suggest: "Run /conductor:execute to truth-patch the criticals, then /conductor:audit, then re-run /conductor:release."
   - Exit.
2. Verify clean working tree: `git status --porcelain` must be empty. If dirty: refuse and print what's untracked/modified.
3. Verify tests pass: run the project's test command (read from package.json `scripts.test` or equivalent). If non-zero exit: refuse.
4. Verify plugin validate clean (if this IS a plugin): `claude plugin validate .` → warnings tolerated only if documented; errors → refuse.

## Process

1. Dispatch via `Agent`:
   - **subagent_type**: `release-manager`
   - **inputs**: list of phases shipped (from `./.conductor/checkpoints/`), `docs/REVIEW.md`, autonomy level
   - **acceptance**: annotated tag `vX.Y.Z` exists locally; CHANGELOG.md `[Unreleased]` block moved under the new version; commit `chore(release): vX.Y.Z` exists; if remote present, tag + commit pushed; if `gh` available, GH Release published (with `--prerelease` flag if 0.x or if user accepted shipping with known gaps)
2. Release-manager returns: `{ version, tag_sha, release_url, prerelease }`.
3. Dispatch the `verifier`:
   - **claim**: "tag vX.Y.Z exists on remote, GH Release exists at <url>"
   - **evidence_refs**: 
     - `gh api repos/<owner>/<repo>/git/refs/tags/vX.Y.Z`
     - `gh release view vX.Y.Z --json url,isPrerelease,name`
4. If `verified: true`:
   - Append to `./.conductor/decisions.md`:
     ```
     ## <ISO> — released vX.Y.Z
     Tag SHA: <sha>
     URL: <url>
     Pre-release: <bool>
     Known gaps (from REVIEW): <one-line summary or "none">
     ```
   - Update STATE.json: `last_release: { version, url, ran_at, prerelease }`.
   - Print the release URL to the caller.
5. If `verified: false`:
   - **Do NOT retry the tag** — tags are immutable. Mistakes get a new patch version (vX.Y.(Z+1)), never a force-push.
   - Surface the discrepancy with full evidence. Pause for user.

## Why model invocation is disabled

Tagging and publishing a GH Release are irreversible side effects. Even with `--prerelease`, the tag is public. This skill is user-only to prevent the conductor from auto-shipping on a "looks ready" judgment. The user types `/conductor:release` deliberately when ready.
