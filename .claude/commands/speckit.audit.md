---
description: Post-implementation audit to verify built code aligns with spec and project constitution.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Verify that implemented code aligns with the original specification and project constitution AFTER implementation completes. This is a **POST-IMPLEMENTATION** validator that answers: "Does what we built make sense and align with our principles?"

**Key Distinction:**
- `/speckit.analyze` = PRE-implementation (checks spec/plan/tasks consistency)
- `/speckit.audit` = POST-implementation (checks actual code against spec + constitution)

## Operating Constraints

**STRICTLY READ-ONLY**: Do **not** modify any files. Output a structured audit report. Offer remediation suggestions that require explicit user approval before any changes are applied.

**Scope Control**: Audit at most 50 changed files. Prioritize API routes, then components, then services.

**Constitution Authority**: The project constitution (`.specify/memory/constitution.md`) is **non-negotiable**. Constitution violations are automatically CRITICAL severity.

## Execution Steps

### 1. Initialize Audit Context

Run from repo root:
```bash
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

Parse JSON output for:
- `FEATURE_DIR` - Path to current feature's spec directory
- `AVAILABLE_DOCS` - Which artifacts exist (spec.md, plan.md, tasks.md)

### 2. Discover Implementation Files

**Primary method** - Get files changed since branching from main:
```bash
git diff main --name-only --diff-filter=ACMR -- src/
```

**Validation** - Parse `tasks.md` for expected file paths mentioned in task descriptions. Cross-reference with actual changes to identify:
- **Missing implementations**: Files expected but not created
- **Unexpected files**: Files created but not mentioned in tasks

**Scope limit**: If more than 50 files changed, prioritize:
1. `src/app/api/**/*.ts` (API routes) - HIGH priority
2. `src/components/**/*.tsx` (UI components) - HIGH priority
3. `src/services/**/*.ts` (business logic) - MEDIUM priority
4. `prisma/schema.prisma` (data model) - HIGH priority

### 3. Load Reference Documents

Load these artifacts for comparison:

| Document | Required | Purpose |
|----------|----------|---------|
| `spec.md` | YES | Requirements to verify against |
| `tasks.md` | YES | Expected implementation scope |
| `.specify/memory/constitution.md` | Reference | 17 principles to check |
| `CLAUDE.md` | Reference | Coding standards |

### 4. Execute Automated Checks (Tier 1 - Fast)

Run pattern-based checks on all changed files:

#### A. Client Isolation (Constitution Principle IV)
Search for Prisma queries that may be missing `clientId` filtering:
- Look for `.findMany`, `.findFirst`, `.update`, `.delete` without `clientId` in where clause
- Flag any unfiltered queries in multi-tenant contexts

#### B. API-First Development (Constitution Principle III)
Check that business logic is NOT in page components:
- Search for Prisma imports/usage in `src/app/(dashboard)/**/*.tsx` files
- These should use API routes instead

#### C. Dark Mode Compliance (UI/UX Standards)
In `.tsx` files, check Tailwind classes:
- `bg-{color}-50` should have corresponding `dark:bg-{color}-950`
- `text-{color}-900` should have corresponding `dark:text-{color}-100`
- `border-{color}-200` should have corresponding `dark:border-{color}-800`

#### D. Hardcoded Secrets (Security)
Search for patterns that suggest hardcoded API keys:
- `sk-[a-zA-Z0-9]{20,}` (API key patterns)
- `password`, `secret`, `apiKey` with string literals nearby

#### E. Console Statements (Code Quality)
Search for `console.log` in production code:
- Should only exist in dev/test files
- `console.warn` and `console.error` are acceptable

#### F. API Response Format (Pattern Compliance)
In API route files (`src/app/api/**/*.ts`):
- Check for `NextResponse.json` usage without `apiSuccess`/`apiError` wrappers
- Should use standardized response helpers from `@/lib/api/response`

#### G. Verification Evidence (Test Coverage)
Check that implementation was verified with tests, not just written:
- For each new service file (`src/services/**/*.ts`), check for a corresponding test file
- For each new API route (`src/app/api/**/*.ts`), check for a corresponding test file
- Verify test files contain meaningful assertions (not just `expect(true).toBe(true)`)
- Check that tests exercise error paths, not just happy paths
- Flag any service or API route with logic that has NO corresponding test file

### 5. Execute Semantic Analysis (Tier 2 - LLM-Assisted)

For the top 20 most critical files, perform deeper analysis:

#### A. Spec Fulfillment
- Extract each requirement from `spec.md`
- For each requirement, search implementation files for evidence of fulfillment
- Flag requirements with no apparent implementation

#### B. CRM Hierarchy (Constitution Principle I)
If data model changes exist:
- Verify new entities follow Account → Contact → Campaign hierarchy
- Check that contacts reference accounts
- Ensure activities link to contacts/campaigns

#### C. Plugin Patterns (Constitution Principle II)
If integration code exists:
- Should be located in `src/services/plugins/` or `src/app/api/v1/plugins/`
- Should NOT have hardcoded vendor logic in core application code
- Should use webhook patterns for external service integration

#### D. Architectural Fit
- Compare implementation patterns to existing codebase
- Flag significant deviations from established conventions
- Note any over-engineering or unnecessary complexity

### 6. Classify Severity

Assign severity to each finding:

| Severity | Criteria | Action Required |
|----------|----------|-----------------|
| **CRITICAL** | Constitution violation, missing client isolation, security issue | Must fix before merge |
| **HIGH** | Spec requirement not implemented, missing validation | Should fix before merge |
| **MEDIUM** | Pattern inconsistency, missing dark mode, code quality issue | Consider fixing |
| **LOW** | Style inconsistency, minor improvements possible | Optional |

### 7. Generate Audit Report

Output a structured Markdown report:

```markdown
# Audit Report: [Feature Name]

## Summary
- **Spec Coverage**: X/Y requirements implemented (Z%)
- **Constitution Alignment**: X/17 principles checked, Y issues found
- **Files Audited**: N files
- **Issues Found**: X critical, Y high, Z medium, W low

## Automated Check Results

| Check | Status | Violations |
|-------|--------|------------|
| Client Isolation | ✅ PASS / ❌ FAIL | [file:line, ...] |
| API-First | ✅ PASS / ❌ FAIL | [file:line, ...] |
| Dark Mode | ✅ PASS / ❌ FAIL | [file:line, ...] |
| No Hardcoded Secrets | ✅ PASS / ❌ FAIL | [file:line, ...] |
| No console.log | ✅ PASS / ❌ FAIL | [file:line, ...] |
| API Response Format | ✅ PASS / ❌ FAIL | [file:line, ...] |

## Spec Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| [REQ from spec.md] | ✅ Implemented / ❌ Missing | [file path or -] |
| ... | ... | ... |

## Constitution Alignment

| Principle | Status | Notes |
|-----------|--------|-------|
| I. CRM-First | ✅ / ⚠️ / ❌ | [explanation] |
| II. Plugin Ecosystem | ✅ / ⚠️ / ❌ | [explanation] |
| III. API-First | ✅ / ⚠️ / ❌ | [explanation] |
| IV. Client Isolation | ✅ / ⚠️ / ❌ | [explanation] |
| ... | ... | ... |

## Findings Detail

| ID | Severity | Category | File | Finding | Recommendation |
|----|----------|----------|------|---------|----------------|
| A001 | CRITICAL | Client Isolation | src/app/api/foo/route.ts:42 | Missing clientId filter | Add `.where({ clientId })` |
| A002 | HIGH | Spec Coverage | - | REQ-003 not implemented | Implement user story US-003 |
| ... | ... | ... | ... | ... | ... |

## Next Actions

1. **CRITICAL**: [List critical issues that must be addressed]
2. **HIGH**: [List high-priority issues to review]
3. **MEDIUM**: [List medium issues to consider]
```

### 8. Offer Remediation

After presenting the report, ask:

> "Would you like me to suggest specific fixes for the top N critical/high issues?"

**DO NOT apply fixes automatically.** User must explicitly approve each fix before any modifications are made.

## Handoff

After audit completes, if all critical issues are resolved:

```yaml
handoffs:
  - label: "Archive Completed Feature"
    agent: speckit.archive
    prompt: "Archive this completed feature to specs/.completed/"
    send: false
```
