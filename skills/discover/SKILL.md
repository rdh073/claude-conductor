---
description: Dispatch the librarian agent to research stack, libraries, and precedent based on the project brief. Outputs ./.conductor/research.md with ≥3 candidates per decision area, a decision matrix, bench output, and a non-binding recommendation.
allowed-tools: Agent Read Write
---

# Discover

Frame the research question from the brief. Dispatch `librarian`. Verify. Log.

## Process

1. Read `./.conductor/brief.json`. Extract:
   - The "what" (one-sentence pitch).
   - The "constraints" (especially language/runtime — they narrow candidates).
   - The "context" (existing codebase informs what we're integrating with).
2. Frame the research question as one paragraph. Example:
   > "Build a Node CLI that converts MP4 → animated WebP for blog hero images. Constraints: Node 20+, no GPU, single binary preferred. Need to pick (a) the encoder, (b) the CLI framework, (c) the test runner."
3. Dispatch the librarian via the `Agent` tool:
   - **subagent_type**: `librarian`
   - **inputs**: path to `brief.json` + the framed research question + the decision areas (a, b, c, …)
   - **acceptance**: `./.conductor/research.md` exists; has ≥3 candidates per decision area; has a methodology section; has a decision matrix; has bench output (citations) for any latency/throughput claim; has an explicit (non-binding) recommendation per decision area
4. On return, dispatch the `verifier`:
   - **claim**: "research.md meets the acceptance criteria above"
   - **evidence_refs**: the file itself, plus any bench outputs cited
5. If `verified: true`:
   - Append to `./.conductor/decisions.md`:
     ```
     ## <ISO timestamp> — discovery complete
     Question: <one line>
     Output: ./.conductor/research.md
     Recommendations (non-binding):
     - <area a>: <choice>
     - <area b>: <choice>
     ```
   - Update STATE.json: `phase: "spec"`.

## Retry policy

- Verifier fails once → re-dispatch librarian with corrective feedback (cite the missing criterion).
- Verifier fails twice → dispatch `auditor` for root cause. Conductor decides: retry, swap method, or pause-gate.
- Three failures → unconditional halt. Surface to user.

## What this skill is not

- Not for picking the winner — that's the conductor's job after reading research.md, often during /conductor:spec.
- Not for benching things outside the brief's scope. Stay in lane.
