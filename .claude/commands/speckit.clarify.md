---
description: Identify underspecified areas in the current feature spec by asking up to 5 highly targeted clarification questions and encoding answers back into the spec.
handoffs:
  - label: Build Technical Plan
    agent: speckit.plan
    prompt: Create a plan for the spec. I am building with...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Goal: Detect and reduce ambiguity or missing decision points in the active feature specification and record the clarifications directly in the spec file.

Execution steps:

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` from repo root. Parse minimal JSON payload fields:
   - `FEATURE_DIR`
   - `FEATURE_SPEC`

2. Load the current spec file. Perform a structured ambiguity & coverage scan using this taxonomy:

   Functional Scope & Behavior:
   - Core user goals & success criteria
   - Explicit out-of-scope declarations
   - User roles / personas differentiation

   Domain & Data Model:
   - Entities, attributes, relationships
   - Identity & uniqueness rules
   - Lifecycle/state transitions
   - Data volume / scale assumptions

   Interaction & UX Flow:
   - Critical user journeys / sequences
   - Error/empty/loading states
   - Accessibility or localization notes

   Non-Functional Quality Attributes:
   - Performance (latency, throughput targets)
   - Scalability (horizontal/vertical, limits)
   - Reliability & availability (uptime, recovery expectations)
   - Observability (logging, metrics, tracing signals)
   - Security & privacy (authN/Z, data protection, threat assumptions)
   - Compliance / regulatory constraints (if any)

   Integration & External Dependencies:
   - External services/APIs and failure modes
   - Data import/export formats
   - Protocol/versioning assumptions

3. Generate (internally) a prioritized queue of candidate clarification questions (maximum 5). Apply constraints:
   - Maximum of 10 total questions across the whole session.
   - Each question must be answerable with EITHER:
     - A short multiple‑choice selection (2–5 distinct, mutually exclusive options), OR
     - A one-word / short‑phrase answer (<=5 words).
   - Only include questions whose answers materially impact architecture, data modeling, task decomposition, test design, UX behavior, operational readiness, or compliance validation.

4. Sequential questioning loop (interactive):
   - Present EXACTLY ONE question at a time.
   - For multiple‑choice questions, provide a **recommended option** with reasoning.
   - After the user answers, record it in working memory and move to the next queued question.
   - Stop when: all critical ambiguities resolved, user signals completion, or 5 questions asked.

5. Integration after EACH accepted answer:
   - Maintain in-memory representation of the spec plus raw file contents.
   - Ensure a `## Clarifications` section exists.
   - Append bullet line: `- Q: <question> → A: <final answer>`.
   - Apply the clarification to the most appropriate section(s).
   - Save the spec file AFTER each integration.

6. Validation (performed after EACH write plus final pass):
   - Clarifications session contains exactly one bullet per accepted answer (no duplicates).
   - Total asked (accepted) questions ≤ 5.
   - No contradictory earlier statement remains.

7. Write the updated spec back to `FEATURE_SPEC`.

8. Report completion:
   - Number of questions asked & answered.
   - Path to updated spec.
   - Sections touched (list names).
   - Suggested next command.
