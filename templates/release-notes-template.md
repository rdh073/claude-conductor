<!-- Placeholders use {{double-curly}}. Replace at fill-in time.
     Leave HTML comments — readers strip them, maintainers don't.
     Honest release notes mention WHAT'S MISSING, not just what shipped. -->

# {{version}} — {{tagline}}

## What changed

{{2-3 paragraphs of plain English. Lead with user-facing impact, not
internal architecture. Answer: what can the user do now that they
couldn't before?}}

## Visual proof

![{{name}}]({{path-or-url-to-png-or-gif}})

<!-- Honest caveat (if any): explain ANY caveat about the visual. -->
{{e.g. "Rendered with synthetic data; production cardinality is ~10x larger."}}

## Critical issues fixed

<!-- Cite docs/REVIEW.md by CR-id so the audit trail is traceable. -->

- ✅ **CR-{{N}}: {{title}}** — {{one-line description}}. See [`docs/REVIEW.md`](docs/REVIEW.md#cr-{{N}}).

## Engineering archeology (optional, encouraged for major releases)

<!-- Discoveries that overrode the plan. Document the surprise + how it
     changed the design. Useful for future-you and for users porting
     similar patterns. -->

- **Discovery {{N}}:** {{empirical finding worth documenting}}

## Known characteristics

| Metric | Value | Comparison |
| :--- | :--- | :--- |
| {{e.g. cold-start latency}} | {{N ms}} | vs {{alternative}}: {{M ms}} |
| {{e.g. install size}} | {{N MB}} | vs {{alternative}}: {{M MB}} |

## What's NOT in this release (honest disclosure)

<!-- This section is mandatory if anything was deferred or has a known
     limitation. Empty is OK for clean releases but rare. -->

- **{{deferred feature}}** — moved to {{milestone}} because {{reason}}.
- **{{known limitation}}** — workaround: {{workaround}}.

## Install

```bash
{{exact one or two commands a user would copy-paste}}
```

## Full changelog

https://github.com/{{owner}}/{{repo}}/blob/{{version}}/CHANGELOG.md

<!-- For pre-1.0 releases, `gh release create --prerelease` is the default.
     For 1.x+, promote to "latest" only when the auditor signed off AND
     the "What's NOT" section above is honest. -->
