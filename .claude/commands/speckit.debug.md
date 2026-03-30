---
description: Systematic 4-phase debugging when implementation encounters failures. Use when tests fail, builds break, or runtime errors occur.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Systematically diagnose and fix failures using a 4-phase root cause analysis. Invoke this command when something breaks — tests failing, build errors, runtime exceptions, or unexpected behavior.

**CRITICAL RULES**:
- NEVER propose a "quick fix" without completing Phase 1 (root cause investigation)
- NEVER change multiple things at once — one variable at a time
- NEVER say "just try changing X" — understand WHY before changing anything
- After 3 failed fix attempts, STOP and question the architecture

## Phase 1: Root Cause Investigation

1. **Read the actual error**: Copy the FULL error message, stack trace, or test output. Do not paraphrase.
2. **Reproduce**: Confirm the failure is reproducible by running the failing command again.
3. **Check git history**: Run `git log --oneline -10` and `git diff HEAD~3` to see what changed recently.
4. **Trace the data flow**: Starting from the error location, trace backwards through:
   - What function threw the error?
   - What called that function?
   - What data was passed in?
   - Where did that data come from?
5. **Check the spec**: If inside a SpecKit feature, load spec.md and plan.md from the feature directory. Does the error indicate a spec misunderstanding or an implementation bug?

**Output**: A clear statement of the root cause hypothesis with evidence.

## Phase 2: Pattern Analysis

1. **Find similar working code**: Search the codebase for patterns similar to the failing code that DO work.
2. **Compare**: Diff the working pattern against the failing code. List every difference.
3. **Categorize differences**: For each difference, classify as:
   - **Intentional** (required by this feature's unique needs)
   - **Accidental** (copy/paste error, oversight, typo)
   - **Unknown** (needs investigation)

**Output**: A ranked list of differences most likely causing the failure.

## Phase 3: Hypothesis Testing

1. **Form ONE hypothesis**: Based on Phase 1 and 2, state the single most likely cause.
2. **Design a test**: Write a minimal test (or modify an existing one) that would PASS if the hypothesis is correct and FAIL if wrong.
3. **Test the hypothesis**: Make ONE change and run the test.
4. **Evaluate**:
   - If test passes: hypothesis confirmed. Proceed to Phase 4.
   - If test fails: reject hypothesis. Form next hypothesis. Return to step 1.
5. **Escalation**: After 3 failed hypotheses:
   - STOP making changes
   - Question whether the architectural approach is correct
   - Review plan.md for potential design issues
   - Consider if the contracts/ API spec is wrong
   - Ask user for guidance before continuing

**Output**: Confirmed root cause with passing test as evidence.

## Phase 4: Fix Implementation

1. **Implement the SINGLE fix** — change one thing only.
2. **Run the relevant tests** — confirm the fix works.
3. **Run the FULL test suite** — confirm no regressions.
5. **Run the build** — confirm no build errors.
6. **Track in beads** (if initialized):
   - If bug discovered during implementation: `bd create "Bug: [description]" -t bug`
   - Close after fix verified: `bd close <id> --reason "Fixed: [root cause]"`

**Output**: Fix applied, all tests green, build passing.

## Red Flags — HALT if you catch yourself doing these

- "Let me just try changing this..." → STOP. Complete Phase 1 first.
- "Quick fix for now, we'll clean up later" → STOP. Fix it properly now.
- Proposing multiple changes simultaneously → STOP. One variable at a time.
- Spending >15 minutes without a clear hypothesis → STOP. Re-read Phase 1.
- The same test keeps failing after fix → Likely wrong root cause. Return to Phase 2.

## Handoff

After debugging completes successfully:
- If inside a SpecKit implementation session: resume `/speckit.implement` from the task that failed
- If standalone debugging: report the fix and verification evidence
