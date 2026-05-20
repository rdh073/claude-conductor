# Contributing to claude-conductor

Thanks for considering a contribution. This guide covers quick setup, local
testing, and the small set of conventions we enforce on every PR.

## Quick setup

```bash
git clone https://github.com/rdh073/claude-conductor.git
cd claude-conductor
# No npm deps. The plugin runs on bare Node 20+.
```

## Running locally

Load the plugin into a Claude Code session pointed at any target project:

```bash
cd /path/to/your/target/project
claude --plugin-dir /path/to/claude-conductor
```

Inside the session, `/help` should list `/conductor:*` skills. To begin:

```
/conductor:start
```

You'll hit exactly two mandatory interrupts: the onboarding wizard and the
plan approval. Everything else the conductor decides and logs.

## Before opening a PR

Run all four checks. They take seconds.

```bash
claude plugin validate ./claude-conductor         # must pass (CLAUDE.md warn OK)
node --check bin/*.mjs bin/lib/*.mjs              # must pass
git status                                         # must be clean
git log --oneline -5                              # commits use Conventional Commits
```

If you added a skill or agent, keep the tool whitelist minimal. Don't grant
`Write` to an auditor; don't grant `Agent` to a sub-agent (only the conductor
can spawn).

If you made a non-trivial design choice (anything that needs justification a
year from now), log it to `.conductor/decisions.md` per the supersession-chain
pattern. New decision = new entry. Overturn an old decision by appending a new
one with `Supersedes: D<n>`.

## Conventional Commits

Subject ≤ 70 chars. Body explains *why*, not *what*.

Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.

Scope examples:
- `feat(agents): add summarizer sub-agent`
- `feat(skills): /conductor:rollback`
- `fix(hook): log-commit skips non-tracked files`
- `chore(release): v0.2.0`

One commit = one slice. No WIP commits. No batch end-of-day commits.

## Triage policy

- Bugs filed via `bug_report.yml` are triaged within 7 days.
- Feature requests are batched into the next milestone.
- PRs are reviewed by [@rdh073](https://github.com/rdh073).
- Security issues: use the [private advisory form](https://github.com/rdh073/claude-conductor/security/advisories/new), not a public issue.

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md)
(Contributor Covenant v2.1).
