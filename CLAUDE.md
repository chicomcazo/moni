# Claude Code Constitution

## Project Overview

**moni** — Financial monitoring app

## Core Architecture

[To be filled — describe your core architecture here]

## Development Discipline (ALWAYS ON)

These behavioral rules apply during ALL development work, regardless of which SpecKit command is active.

### Debugging Protocol
When encountering errors during development:
1. Read the FULL error message and stack trace — do not paraphrase
2. Reproduce the issue to confirm it's consistent
3. Trace the data flow backwards from the error location
4. Find similar WORKING code in the codebase and compare
5. Change ONE variable at a time when testing hypotheses
6. After 3 failed fix attempts on the same error, STOP and question the architecture
7. NEVER apply "quick fix for now" patches — fix root causes

### Verification Before Completion
Before claiming any work is done:
1. Run the verification command FRESH (not from memory of a previous run)
2. Read the ENTIRE output — do not skim
3. State evidence: "X tests passing, build succeeds" — not "should work" or "looks correct"
4. NEVER mark a task complete without running its specific test

### Package Manager
**ALWAYS use `bun`** — never `npm`, `npx`, or `yarn`.
- `bun install` instead of `npm install`
- `bunx` instead of `npx`
- `bun run` instead of `npm run`
- `bun test` instead of `npm test`

## Coding Standards

### API-First Development
**ALWAYS create API endpoints — NEVER put business logic in pages**

- Use Zod for request validation
- Follow RESTful conventions (GET, POST, PATCH, DELETE)
- Standardized response format:
```typescript
{
  success: boolean,
  data: T | null,
  error: string | null,
  meta?: { page?: number, limit?: number, total?: number }
}
```

### Configuration Management
**ALWAYS use environment variables and database config — NEVER hardcode**

- Use `process.env.*` for sensitive configuration
- Store per-client/per-tenant config in database

## SpecKit + Beads Integration

This project uses **SpecKit** for specification-driven development combined with **Beads** for dynamic task tracking.

### Workflow

```text
/speckit.specify  → spec.md (user stories, requirements)
       ↓
/speckit.plan     → plan.md, research.md, data-model.md
       ↓
/speckit.tasks    → tasks.md (checkbox format)
       ↓
bd ready          → See unblocked work
       ↓
/speckit.implement → Execute tasks
       ↓
Feature Complete  → /speckit.archive
```

### Key Beads Commands

| Command | Purpose |
|---------|---------|
| `bd ready` | Show tasks with no blockers (what to work on next) |
| `bd list` | Show all issues |
| `bd update <id> --status in_progress` | Claim a task |
| `bd close <id>` | Mark task complete |
| `bd create "Title" --deps discovered-from:<id>` | Track discovered work |
| `bd sync` | Sync with git |

### Session Start Best Practice

```bash
bd ready                                    # See what's ready
bd update <issue-id> --status in_progress   # Claim it
# ... work ...
bd close <issue-id> --reason "Completed"    # Done
```

### Completed Feature Management

When a SpecKit feature is fully implemented:
1. Verify completion: All tasks in tasks.md are checked off [x]
2. Run tests: Ensure all tests pass
3. Archive: `/speckit.archive` or `mv specs/NN-feature-name specs/.completed/NN-feature-name`
4. Close beads: `bd close <id> --reason "Feature completed and archived"`

## File Structure

**SpecKit Artifacts:**
- `/specs/` — Active feature specifications
- `/specs/.completed/` — Archived completed features
- `/.specify/` — SpecKit configuration, templates, scripts
- `/.beads/` — Beads issue tracker

**Commands:**
- `/.claude/commands/` — Claude Code slash commands

## Development Commands

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Run linter
bun run lint
```

## Quick Links

- **Constitution**: `.specify/memory/constitution.md`
- **Specs**: `/specs/` directory
- **Commands**: `/.claude/commands/` directory
