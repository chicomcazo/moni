---
description: Archive a completed SpecKit feature to specs/.completed/ directory
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Parse the feature identifier from user input or current branch:
   - If `$ARGUMENTS` contains a feature number (e.g., "42"), use that
   - If no argument provided, extract feature number from current git branch
   - Feature pattern: `NN-feature-name` where NN is the number

2. Locate the feature directory:
   - Search in `specs/` for directory matching `NN-*` pattern
   - Verify the directory exists and is not already in `.completed/`
   - Get absolute path for the feature directory

3. Verify feature completion status:
   - **Check tasks.md**: Count incomplete tasks (`- [ ]` checkboxes)
   - **Check tests**: If test files exist, verify tests pass
   - **Warn user** if incomplete tasks found
   - Allow user to proceed with confirmation or abort

4. Execute the archive script:
   - Run `.specify/scripts/bash/archive-completed-feature.sh [feature-number]`
   - Script will:
     - Verify completion (unless --force used)
     - Move `specs/NN-feature-name/` to `specs/.completed/NN-feature-name/`
     - Check for related beads issues
     - Provide commands to close beads issues

5. Post-archive cleanup:
   - Display success message with archived location
   - List any related beads issues that should be closed
   - Suggest commands to close beads issues:
     ```bash
     bd close <issue-id> --reason "Feature completed and archived"
     ```

6. Final summary:
   - Confirm feature archived successfully
   - Show path to archived feature in `.completed/`
   - Remind user to commit the changes if needed

## Usage Examples

```bash
# Archive feature from current branch
/speckit.archive

# Archive specific feature by number
/speckit.archive 42

# Force archive without verification
/speckit.archive 42 --force
```

## Important Notes

- Features can only be archived once all tasks in tasks.md are complete (unless --force is used)
- Archiving is reversible (just move the directory back)
- The `.completed/` directory is tracked in git to preserve specifications
- Related beads issues should be closed manually after archiving
- This keeps the active `specs/` directory clean and focused on in-progress work
