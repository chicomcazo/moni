# Project Constitution: moni

**Version**: 1.0.0
**Ratified**: 2026-03-30
**Last Amended**: 2026-03-30

## Preamble

This constitution defines the non-negotiable principles and guardrails for moni. All development work — whether by humans or AI agents — MUST comply with these principles.

## Principles

### Principle I: {{PRINCIPLE_1_NAME}}
{{PRINCIPLE_1_DESCRIPTION}}

**MUST**:
- {{RULE_1}}

**MUST NOT**:
- {{RULE_2}}

---

### Principle II: {{PRINCIPLE_2_NAME}}
{{PRINCIPLE_2_DESCRIPTION}}

**MUST**:
- {{RULE_3}}

**MUST NOT**:
- {{RULE_4}}

---

### Principle III: API-First Development
All business logic MUST be accessible through well-defined API endpoints. Page components MUST NOT contain business logic directly.

**MUST**:
- Create API routes for all business operations
- Use Zod for request validation
- Return standardized response format

**MUST NOT**:
- Put database queries in page components
- Hardcode API keys or URLs
- Skip input validation

---

### Principle IV: Bun-First Tooling
This project uses Bun as the primary package manager and runtime.

**MUST**:
- Use `bun install`, `bunx`, `bun run`, `bun test`
- Configure scripts in package.json for bun

**MUST NOT**:
- Use `npm`, `npx`, `yarn`, or `pnpm`

---

## Governance

### Amendment Procedure
1. Propose amendment with rationale
2. Review impact on existing code
3. Update constitution version (semver)
4. Propagate changes to dependent templates

### Versioning Policy
- **MAJOR**: Principle removed or redefined
- **MINOR**: New principle added or expanded
- **PATCH**: Clarifications, wording fixes

### Compliance Review
- Every `/speckit.plan` includes a Constitution Check gate
- Every `/speckit.audit` validates against all principles
- Violations are classified as CRITICAL findings

---

*Instructions: Replace all {{PLACEHOLDER}} values with your project-specific content. Add or remove principles as needed. Run `/speckit.constitution` to interactively fill this template.*
