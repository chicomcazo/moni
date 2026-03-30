# /create-outside-spec - Create Outside Branch

Creates a new git branch with the `o-{number}-{description}` pattern for work outside the SpecKit workflow.

## Usage

```
/create-outside-spec [branch-description]
```

## What This Does

1. Auto-generates the next available `o-` number by scanning existing branches
2. Creates a new branch: `o-{number}-{description}`
3. Checks out the new branch
4. Provides next steps guidance

## When to Use

Use `/create-outside-spec` for work that doesn't require the full SpecKit spec-driven process:

- **Quick fixes** - Bug fixes, typo corrections
- **Small refactors** - Code cleanup, minor improvements
- **Dependency updates** - Package upgrades
- **Performance optimizations** - Small performance tweaks
- **Minor UI tweaks** - Style adjustments, spacing fixes

## When NOT to Use

For substantial features that need planning and documentation, use `/speckit.specify` instead:

- New features requiring database changes
- Multi-API endpoint implementations
- Features requiring design decisions
- Work spanning multiple sessions
- Anything needing a spec document

## Examples

```bash
# Create branch for a quick fix
/create-outside-spec fix-toast-positioning
# Creates: o-1-fix-toast-positioning

# Create branch for dependency update
/create-outside-spec update-next-version
# Creates: o-2-update-next-version

# Create branch for performance improvement
/create-outside-spec optimize-contact-queries
# Creates: o-3-optimize-contact-queries
```

## Branch Naming Rules

- Use lowercase only
- Use hyphens to separate words (no spaces or underscores)
- Be descriptive but concise (3-5 words ideal)
- Pattern: `o-{auto-number}-{your-description}`

## Implementation Instructions for Claude

When the user invokes `/create-outside-spec {description}`, you must:

1. **Validate the description**:
   - Must be lowercase with hyphens only (a-z, 0-9, -)
   - No spaces, underscores, or special characters
   - If invalid, explain the rules and ask for a valid description

2. **Execute the branch creation script**:
   ```bash
   .specify/scripts/bash/create-outside-branch.sh {description}
   ```

3. **Confirm success**:
   - Show the created branch name
   - Verify current branch with `git branch --show-current`
   - Provide next steps

4. **If no description provided**:
   - Ask the user for a branch description
   - Explain the naming rules
   - Wait for their input before proceeding

## Error Handling

- **Script not found**: Ensure `.specify/scripts/bash/create-outside-branch.sh` exists
- **Invalid description**: Show validation rules and ask for correction
- **Git errors**: Display error and suggest resolution

## Workflow After Branch Creation

After creating the outside branch:

1. Make your code changes
2. Commit with descriptive message: `git commit -m "fix: description"`
3. Push to remote: `git push -u origin o-{number}-{description}`
4. Create PR when ready
5. Merge to main after approval

## Comparison with SpecKit

| Aspect | Outside Branch (`/create-outside-spec`) | SpecKit Branch (`/speckit.specify`) |
|--------|----------------------------|-------------------------------------|
| Pattern | `o-{number}-{description}` | `{spec-number}-{feature-slug}` |
| Planning | Minimal/None | Full spec with design docs |
| Scope | Small changes, fixes | Features, major changes |
| Sessions | Usually single session | Often multi-session |
| Documentation | Commit messages only | spec.md, plan.md, tasks.md |
| Beads tracking | Optional | Recommended for dependencies |

## Example Interaction

```
User: /create-outside-spec fix-auth-redirect

Claude: Creating outside branch for quick fix...
[Executes script]
✓ Branch created: o-1-fix-auth-redirect
✓ Current branch: o-1-fix-auth-redirect

Next steps:
1. Make your changes to fix the auth redirect issue
2. Commit: git commit -m "fix: resolve auth redirect loop"
3. Push: git push -u origin o-1-fix-auth-redirect
4. Create PR when ready
```