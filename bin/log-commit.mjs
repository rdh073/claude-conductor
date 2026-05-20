#!/usr/bin/env node
/**
 * log-commit.mjs — PostToolUse hook on the `Write` tool
 *
 * Auto-commits .conductor/decisions.md and .conductor/discoveries.md
 * updates to git as engineering archeology. Append-only by design.
 *
 * PHASE 5 will implement:
 *   - Read stdin JSON. Extract `tool_input.file_path`.
 *   - Match against /\.conductor\/(decisions|discoveries)\.md$/. Else exit 0.
 *   - cd to ${CLAUDE_PROJECT_DIR}. Verify it's a git repo (else exit 0).
 *   - git add <file>; git commit -m "log: $(basename file) update" --no-verify
 *   - `--no-verify` is intentional (SC4 in decisions.md): this is an
 *     automated audit-trail commit, not a user commit. Pre-commit hooks
 *     in the user's project should not block .conductor/ writes.
 *
 * Per D1: exit 0 on internal error (lost commit > broken hook).
 *
 * Until Phase 5: silent pass-through.
 */
process.exit(0);
