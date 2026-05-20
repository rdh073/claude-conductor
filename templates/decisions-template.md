<!-- Placeholders use {{double-curly}}. Replace at fill-in time.
     Leave HTML comments — readers strip them, maintainers don't. -->

# Decisions log

Append-only. To override an earlier decision, ADD a new entry citing
`Supersedes: D<n>` — never edit history. Git history captures structural
changes; this file captures rationale.

<!-- Format per entry: ## D<n> — <short title>
     Multiple decisions on the same day → ascending numbers (D1, D2, D3),
     not timestamps. ISO timestamps go in the Date field. -->

---

## D1 — {{short imperative title}}

**Date:** {{ISO timestamp}}
**By:** conductor  <!-- or: architect | engineer | librarian | user -->
**Supersedes:** (none)  <!-- or: D<n> if overturning a prior decision -->

**Context:** {{what triggered this decision — 1-2 sentences}}

**Options considered:**
1. **{{Option A}}** — {{pro}}; {{con}}
2. **{{Option B}}** — {{pro}}; {{con}}
3. **{{Option C}}** — {{pro}}; {{con}}

**Choice:** Option {{X}}

**Rationale:** {{2-4 sentences. Cite empirical evidence where possible —
bench numbers, doc URLs, prior incidents. Avoid "feels right"; name the
criterion that broke the tie.}}

**Reversibility:** can revisit  <!-- or: locked-in (published tag, deleted data, paid action) -->

**Anchored to:** {{commit SHA, file path, or (none)}}

---

## D2 — {{title}}

**Date:** {{ISO}}
**By:** {{role}}
**Supersedes:** (none)

**Context:** {{...}}

**Options considered:**
1. **{{Option A}}** — {{...}}
2. **{{Option B}}** — {{...}}

**Choice:** {{Option}}

**Rationale:** {{...}}

**Reversibility:** {{can revisit | locked-in}}

**Anchored to:** {{...}}

---

<!-- Pattern notes:
     - Same-day decisions get D1, D2, D3 numerically.
     - To overturn D1, add a NEW entry (e.g. D5) with "Supersedes: D1"
       and explain what changed. Future readers grep the supersession
       chain to reconstruct the live state.
     - "Reversibility: locked-in" deserves extra rationale — future-you
       cannot unwind. -->
