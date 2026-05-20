## What this PR does

<!-- 1-2 sentences. Lead with user-facing impact, not internal architecture. -->

## Type of change

- [ ] Bug fix
- [ ] New feature (skill, agent, hook, monitor, or bin script)
- [ ] Refactor (no functional change)
- [ ] Docs only
- [ ] Tooling / CI

## Related issues

<!-- Closes #N — or N/A if exploratory. -->

## Test plan

<!-- The exact commands you ran and their outcomes. Smoke results.
     For agent/skill changes, walk through the dispatch path. -->

```
claude plugin validate ./claude-conductor
# expected: passed with warnings (the documented CLAUDE.md note)
```

## Checklist

- [ ] Conventional Commits subject (≤ 70 chars)
- [ ] `claude plugin validate ./claude-conductor` clean (warnings tolerated only if documented)
- [ ] `node --check bin/*.mjs bin/lib/*.mjs` clean
- [ ] No new npm dependencies, or rationale below
- [ ] If a skill/agent was added or changed: tool whitelist is minimal
- [ ] If a non-trivial design choice was made: logged to `.conductor/decisions.md` per the supersession-chain pattern
- [ ] If a runtime behavior changed: README or CLAUDE.md updated honestly (gaps disclosed, not hidden)

## Notes for reviewers

<!-- Anything counterintuitive a reviewer should know about? Trade-offs you accepted? -->
