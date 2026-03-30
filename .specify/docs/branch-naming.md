# Branch Naming Strategy

This project uses two distinct branch naming patterns depending on whether work is managed by SpecKit or done ad-hoc.

## 1. SpecKit-Managed Features (Spec-Driven Development)

**Pattern**: `{spec-number}-{feature-slug}`

**Examples**:
- `49-contact-account-associations`
- `50-email-threading`
- `51-campaign-analytics`

**When to Use**: For any feature that goes through the full SpecKit workflow:
- `/speckit.specify` → spec.md
- `/speckit.plan` → plan.md, research.md
- `/speckit.tasks` → tasks.md
- `/speckit.implement` → implementation

**Workflow**:
```bash
# 1. Create SpecKit feature (auto-numbered)
/speckit.specify

# 2. Rename branch to include spec number (if not already)
# If spec was numbered 49:
git branch -m feature-name 49-feature-name
git push origin -u 49-feature-name
```

## 2. Outside SpecKit (Ad-hoc Work)

**Pattern**: `o-{number}-{description}`

**Examples**:
- `o-1-fix-toast-positioning`
- `o-2-update-dependencies`
- `o-3-performance-optimization`

**When to Use**: For work that doesn't need full SpecKit process:
- Quick fixes
- Dependency updates
- Small refactors
- Bug fixes
- Minor improvements

**Workflow in Claude Code**:
```bash
# Use the slash command (easiest)
/create-outside-spec fix-toast-positioning
# Creates: o-1-fix-toast-positioning
```

**Workflow in Terminal**:
```bash
# Use the shell function
git-outside fix-toast-positioning
# Creates: o-1-fix-toast-positioning

# Or call script directly
.specify/scripts/bash/create-outside-branch.sh fix-toast-positioning
```

The number auto-increments based on existing `o-` branches.

## 3. Other Branch Types

**Hotfixes**: `hotfix-{description}`
- Example: `hotfix-critical-auth-bug`

**Experiments**: `exp-{description}`
- Example: `exp-new-ui-framework`

**Temporary**: `tmp-{description}`
- Example: `tmp-debugging-issue-123`

## Benefits of This System

1. **Clear History**: Looking at branches immediately shows if it's SpecKit-managed or ad-hoc
2. **Auto-Numbering**: No manual tracking needed for either pattern
3. **Flexibility**: SpecKit for big features, outside for quick work
4. **Traceability**: Numbers help track order and find related work
5. **No Conflicts**: `o-` prefix prevents number collisions with specs

## Git Aliases

Reload your shell after setup:
```bash
source ~/.zshrc
```

Available commands:
- `git-outside {description}` - Create outside branch with auto-numbering

## FAQ

**Q: When should I use SpecKit vs outside branches?**
A: Use SpecKit for features requiring design docs, planning, and multi-session work. Use outside branches for quick fixes and small changes.

**Q: What if I start with outside branch but realize it needs a spec?**
A: Create the spec, then rename your branch from `o-X-name` to `{spec-number}-name`

**Q: Do outside branches need beads issues?**
A: Optional. Use beads if you want to track dependencies or multi-step work.

**Q: Can I use regular descriptive names like `contact-fixes`?**
A: Yes, but numbered branches provide better organization and history tracking.