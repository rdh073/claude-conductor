<!-- Placeholders use {{double-curly}}. Replace at fill-in time.
     Leave HTML comments — readers strip them, maintainers don't. -->

# Code review — {{project}} {{version}}

Audited by: `auditor` agent
Repo commit: `{{short-sha}}`
Timestamp: {{ISO}}

## TL;DR

- **{{N}}** critical · **{{M}}** warnings · **{{P}}** nits · **{{Q}}** strengths
- Overall recommendation: {{ship | ship-with-known-gaps | block-release}}

## Honest scores

| Area | Grade | One-line justification |
| :--- | :---: | :--- |
| Architecture | {{A+ ... F}} | {{...}} |
| Robustness (error paths) | | |
| Testing (assertions vs aspirations) | | |
| Docs (matches code) | | |
| Security | | |
| Ergonomics (DX) | | |
| Performance | | |
| **Overall** | | |

## Critical (must fix before next release)

<!-- A CRITICAL is one of: false claim, broken happy path, security gap,
     data loss risk. If you wrote 0 CRITICAL items, re-read the README
     and run every command claim — you didn't audit hard enough. -->

- [ ] **CR-1: {{title}}**
  - **File:** `{{path:line}}`
  - **Evidence:** {{exact command output, file excerpt, or API response}}
  - **Detail:** {{1-3 sentences}}
  - **Proposed fix:** {{1 sentence — auditor proposes, conductor decides}}
  - **Regression test:** {{1 sentence — what would catch this next time}}

- [ ] **CR-2: {{title}}**
  - {{...}}

## Warnings (should fix in next minor)

- [ ] **W-1: {{title}}**
  - **File:** `{{path:line}}`
  - **Evidence:** {{...}}
  - **Detail:** {{...}}
  - **Proposed fix:** {{...}}

## Nits (style, micro-optimizations)

- [ ] **N-1:** {{title}} — {{one-line context}}

## Strengths (validate so we don't regress)

<!-- Document what worked. Future-you regressing a strength is worse
     than future-you regressing a fix. -->

- **S-1:** {{title}} — {{why it matters}}

## Verification commands run

```bash
{{exact reproducible commands the auditor ran, one per line}}
```

## Out-of-scope flags

<!-- Anything found outside the audit window — surface here for future
     tracking, do NOT try to fix in this pass. -->

- {{finding}} — {{why deferred / where it belongs}}
