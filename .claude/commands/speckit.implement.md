---
description: Execute the implementation plan by processing and executing all tasks defined in tasks.md
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Check beads issue tracker for ready work** (AUTOMATIC - NO USER PROMPT):
   - Run `bd ready --json` to check for open issues with no blockers
   - If beads issues exist:
     - Display summary: "Found X ready beads issues: [list IDs and titles]"
     - These issues represent discovered work from previous sessions
     - Include them in the work queue alongside tasks.md
   - If no beads issues: proceed silently
   - If `bd` command fails: proceed without beads (not installed or not initialized)

2. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute.

3. **Check checklists status** (if FEATURE_DIR/checklists/ exists):
   - Scan all checklist files in the checklists/ directory
   - For each checklist, count total/completed/incomplete items
   - **If any checklist is incomplete**: STOP and ask user to proceed or wait
   - **If all checklists are complete**: Automatically proceed

4. Load and analyze the implementation context:
   - **REQUIRED**: Read tasks.md for the complete task list and execution plan
   - **REQUIRED**: Read plan.md for tech stack, architecture, and file structure
   - **IF EXISTS**: Read data-model.md for entities and relationships
   - **IF EXISTS**: Read contracts/ for API specifications and test requirements
   - **IF EXISTS**: Read research.md for technical decisions and constraints
   - **IF EXISTS**: Read quickstart.md for integration scenarios
   - **CACHED DOCS**: Query doc_references table for relevant documentation:
     a. Extract technologies from plan.md Technical Context
     b. Call `get_docs_by_tech()` for exact technology matches
     c. For each task, call `search_docs_semantic()` with task description
     d. Budget: Max 10,000 tokens from cached docs per task
     e. Include relevant cached docs in context before implementing each task

5. **Project Setup Verification**:
   - Create/verify ignore files based on actual project setup (.gitignore, .eslintignore, etc.)
   - Follow technology-specific patterns from plan.md

6. Parse tasks.md structure and extract:
   - **Task phases**: Setup, Tests, Core, Integration, Polish
   - **Task dependencies**: Sequential vs parallel execution rules
   - **Task details**: ID, description, file paths, parallel markers [P]
   - **Execution flow**: Order and dependency requirements

6.5. **Subagent Execution Model** (applies to all tasks in steps 7-9):

   Each non-trivial task from tasks.md is executed using a focused subagent pattern:

   **For each task:**

   a. **Dispatch**: Create a fresh subagent (via Task tool) with ONLY:
      - The full task text (ID, description, file paths)
      - Relevant plan.md section (not the entire plan)
      - The debugging protocol (for error handling)
      - Relevant contracts/ spec (if task is an API endpoint)

   b. **Implement**: The subagent:
      - Implements the code
      - Runs tests to verify
      - Self-reviews for obvious issues

   c. **Review Stage 1 — Spec Compliance**:
      - Does the implementation match the task description?
      - Does it follow the contracts/ API spec (if applicable)?
      - Does it handle the edge cases from spec.md?
      - Are all file paths correct per plan.md project structure?

   d. **Review Stage 2 — Code Quality**:
      - Does it follow the project's coding standards (CLAUDE.md)?
      - Dark mode compliance for UI components?
      - Client isolation (workspace scoping) for data access?
      - Proper error handling and logging?
      - No hardcoded values?

   e. **Resolution**: If either review finds issues:
      - Implementer fixes the issues
      - Both reviews run again on the fixed code
      - Max 2 fix cycles; if still failing, flag for user attention

   **Scaling rules:**
   - **Simple tasks** (config, markup, types, migrations): Implement directly with basic verification. Skip formal subagent dispatch.
   - **Medium tasks** (single service, single component): Full subagent with both review stages.
   - **Complex tasks** (multi-file, cross-cutting): Full subagent + parallel dispatch if independent.

7. Execute implementation following the task plan:
   - **Phase-by-phase execution**: Complete each phase before moving to the next
   - **Respect dependencies**: Run sequential tasks in order, parallel tasks [P] can run together
   - **Parallel Agent Dispatch**: When 3 or more tasks marked [P] in the same phase are ready:
     a. Confirm tasks touch DIFFERENT files and have NO shared state
     b. Dispatch as focused subagents (per step 6.5), each with clear scope boundary
     c. After all complete, review for conflicts, run full test suite
     d. Do NOT dispatch in parallel when: fewer than 3 tasks, tasks share DB migrations, or debugging
   - **File-based coordination**: Tasks affecting the same files must run sequentially
   - **Validation checkpoints**: Verify each phase completion before proceeding

8. Implementation execution rules:
   - **Setup first**: Initialize project structure, dependencies, configuration
   - **Core development**: Implement models, services, CLI commands, endpoints
   - **Integration work**: Database connections, middleware, logging, external services
   - **Polish and validation**: Performance optimization, documentation

9. Progress tracking and error handling:
   - Report progress after each completed task
   - Halt execution if any non-parallel task fails
   - For parallel tasks [P], continue with successful tasks, report failed ones
   - **On failure — Systematic Debugging Protocol**:
     a. Do NOT immediately try to fix. Read the FULL error output first.
     b. If the error is a simple typo/import: fix directly and continue.
     c. If the error is non-obvious (test logic failure, unexpected behavior, architectural issue):
        - **Phase 1 — Root Cause**: Reproduce the error. Check `git log --oneline -5` for recent changes. Trace data flow backwards from the error.
        - **Phase 2 — Pattern Analysis**: Find similar WORKING code in the codebase. Compare line by line. List every difference.
        - **Phase 3 — Hypothesis Testing**: Form ONE hypothesis. Change ONE variable. Test. If wrong, form next hypothesis. After 3 failed attempts, STOP and ask user for guidance.
        - **Phase 4 — Fix**: Implement the single fix. Verify all tests pass.
     d. Track discovered bugs in beads: `bd create "Bug: [description]" -t bug`
     e. NEVER apply "quick fix for now" patches. Fix root causes.
   - Suggest next steps if implementation cannot proceed
   - **IMPORTANT** For completed tasks, make sure to mark the task off as [x] in the tasks file.

10. Completion verification (MANDATORY — no completion claims without fresh evidence):

    **Per-task verification** — Before marking ANY task as [x]:
    a. Identify the verification command (test file, build, curl, etc.)
    b. Run the command FRESH right now — do not rely on previous runs
    c. Read the ENTIRE output — do not skim
    d. State evidence: "Marked [x] — `bun run test src/services/foo.test.ts` shows 8/8 passing"
    e. NEVER: "Marked [x] — looks correct based on code review"

    **Phase-end verification** — At the end of each phase:
    1. Run full test suite: `bun run test` — ALL tests must pass
    2. Run build: `bun run build` — must succeed with no errors
    3. If either fails: DO NOT proceed to next phase. Debug first (step 9).

    **RED FLAGS — HALT if you catch yourself**:
    - Using "should work" or "probably passes" → Run the actual command
    - Expressing satisfaction before running tests → Evidence first
    - Marking a task [x] without running its specific test → Run the test

    **Final feature verification** (after all phases):
    - Run full test suite + build + linter
    - Verify task completion count matches tasks.md total
    - Cross-reference spec.md user stories for coverage
    - Report: "All X tests passing, build succeeds, Y/Y tasks complete"

11. **Feature Archival** (when all tasks complete):
   - **IMPORTANT**: When feature is fully complete, archive it to keep specs/ directory clean
   - Run: `.specify/scripts/bash/archive-completed-feature.sh [feature-number]`
   - Or manually: `mv specs/NN-feature-name specs/.completed/NN-feature-name`
   - Close related beads issues: `bd close <id> --reason "Feature completed and archived"`
   - Remind user to archive the feature after completion verification

Note: This command assumes a complete task breakdown exists in tasks.md. If tasks are incomplete or missing, suggest running `/speckit.tasks` first to regenerate the task list.
