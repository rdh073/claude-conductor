<!-- Placeholders use {{double-curly}}. Replace at fill-in time.
     Leave HTML comments — readers strip them, maintainers don't.

     PRIVACY (v0.1.1+): .conductor/ should be added to your target
     project's .gitignore as an extra safety layer. The conductor
     redacts home-directory paths at write time, but a gitignored
     state dir is the cleanest seal. -->


# Plan — {{project-name}}

Generated: {{ISO-timestamp}}
Based on: `.conductor/brief.json` + `.conductor/research.md`
Architect commit: `{{short-sha}}`

## Stack rationale

<!-- One paragraph per choice. State what it beats and on what dimension. -->

| Component | Choice | Why |
| :--- | :--- | :--- |
| Runtime | {{e.g. Node 20+}} | {{why over alternatives}} |
| Framework | {{e.g. none / Express / Next}} | {{why}} |
| Test runner | {{e.g. node:test / vitest}} | {{why}} |
| {{...}} | {{...}} | {{...}} |

## Phases

<!-- Each phase: single concern, smoke-testable, verifiable criteria.
     Status one of: pending | done | deferred  -->

### Phase A — {{title}} `[pending]`

**Concern:** {{one sentence — what this phase does. If you need "and", split.}}

**Inputs:** {{files this phase reads / prior-phase artifacts}}
**Outputs:** {{files this phase creates or modifies}}
**Effort:** {{S | M | L}}  |  **Estimated tokens:** ~{{N}}k

**Acceptance criteria:**
- [ ] {{verifiable assertion 1 — file exists with pattern, test exits 0, API returns 200}}
- [ ] {{verifiable assertion 2}}
- [ ] {{verifiable assertion 3}}

**Pause gate?** No  <!-- or: Yes — explain which leg of the 3-AND triggers
                         (irreversible AND non-factual AND no clear winner) -->

**Dependencies:** none  <!-- or: blocked by Phase 0 -->

---

### Phase B — {{title}} `[pending]`

**Concern:** {{...}}

**Inputs:** {{...}}
**Outputs:** {{...}}
**Effort:** {{...}}  |  **Estimated tokens:** ~{{N}}k

**Acceptance criteria:**
- [ ] {{...}}

**Pause gate?** {{No | Yes — reason}}
**Dependencies:** {{none | Phase X}}

---

<!-- Repeat for every phase. Keep each one single-concern. If a phase
     description needs an "and" to explain what it does, split it. -->

## Pause gates summary

| Gate | Phase | Reason (which leg of 3-AND triggers) |
| :--- | :--- | :--- |
| {{e.g. domain choice}} | Phase 0 | irreversible (paid) + non-factual + no clear winner |

## Open questions (zero is good — resolve before user approves)

- [ ] {{question 1 the architect could not resolve from brief+research}}
- [ ] {{question 2}}

<!-- On user approval, save a snapshot to .conductor/checkpoints/spec-approved.json
     and update STATE.json: phase: "execute", plan_approved_at: <ISO>. -->
