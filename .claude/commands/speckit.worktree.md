---
description: Create a git worktree for parallel development on multiple branches
---

# /speckit.worktree - Create Git Worktree

Creates a git worktree for working on multiple branches simultaneously without stashing or switching.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## What is a Worktree?

A git worktree lets you have multiple branches checked out at the same time in different directories. All worktrees share the same git history and push to the same remote repository.

**Example:**
```
/bdr-management-platform/           ← main branch
/bdr-58-sandbox-workspaces/         ← worktree for feature branch
/bdr-o-1-quick-fix/                 ← worktree for quick fix
```

All three directories share the same git repo and push to the same GitHub remote.

## Usage Patterns

### Pattern 1: Worktree for Existing Branch

When the user has already created a branch (via `/speckit.specify` or `/create-outside-spec`):

```
/speckit.worktree 58-sandbox-workspaces
```

### Pattern 2: Worktree for Current Branch

When no branch name is provided, use the current branch:

```
/speckit.worktree
```

### Pattern 3: Create New Branch + Worktree

When the user wants to create a new branch and worktree together:

```
/speckit.worktree --new o-2-dependency-update
/speckit.worktree --new --base main feature-branch
```

## Implementation Instructions for Claude

When the user invokes `/speckit.worktree`, follow these steps:

### Step 1: Determine Branch Name

1. **If arguments provided**: Use the provided branch name
2. **If no arguments**:
   - Check if currently on a feature branch (not `main`)
   - If on feature branch, offer to create worktree for current branch
   - If on `main`, ask user which branch they want

### Step 2: Parse Options

Check if the arguments include:
- `--new`: Create a new branch (not just worktree for existing)
- `--base <branch>`: Base branch for new branch creation

### Step 3: Execute Worktree Creation

Run the script with appropriate flags:

```bash
# For existing branch
.specify/scripts/bash/create-worktree.sh --json <branch-name>

# For new branch
.specify/scripts/bash/create-worktree.sh --json --new <branch-name>

# For new branch from specific base
.specify/scripts/bash/create-worktree.sh --json --new --base main <branch-name>
```

### Step 4: Report Results and Ask About VS Code

Parse the JSON output and report to user.

**On Success:**

1. **Report the creation:**
```
✓ Worktree created successfully

Branch:    58-sandbox-workspaces
Location:  /path/to/bdr-58-sandbox-workspaces
```

2. **ALWAYS ask if the user wants to open in their IDE:**

Use the AskUserQuestion tool to ask:
```
Question: "Would you like me to open this worktree in a new editor window?"
Options:
  - "Yes, open in Antigravity" → Run: antigravity /path/to/worktree
  - "Yes, open in VS Code" → Run: code /path/to/worktree
  - "No, I'll open it myself" → Just show the path
```

3. **If user says yes**, execute the appropriate command:
```bash
# For Antigravity (Google's agentic IDE - recommended)
antigravity "/path/to/bdr-58-sandbox-workspaces"

# For VS Code
code "/path/to/bdr-58-sandbox-workspaces"
```

4. **After handling VS Code**, show cleanup info:
```
To remove worktree later:
  git worktree remove /path/to/bdr-58-sandbox-workspaces
```

**On Error:**
- Display the error message from JSON output
- Provide helpful suggestions based on error type

## Error Handling

| Error | Solution |
|-------|----------|
| Branch doesn't exist | Suggest using `--new` flag or create branch first |
| Worktree already exists | Show path, suggest `cd` or `git worktree remove` |
| Not a git repository | Ensure user is in correct directory |
| Branch name not provided | Ask user for branch name |

## Examples

### Example 1: Worktree for SpecKit Feature

```
User: /speckit.worktree 58-sandbox-workspaces

Claude: Creating worktree for branch 58-sandbox-workspaces...

✓ Worktree created successfully

Branch:    58-sandbox-workspaces
Location:  /Users/chris/Documents/bdr-58-sandbox-workspaces

This worktree shares the same git history as your main repository.
Commits and pushes from here go to the same GitHub remote.

Next steps:
1. Open in VS Code: code /Users/chris/Documents/bdr-58-sandbox-workspaces
2. Continue with SpecKit: /speckit.plan, /speckit.tasks, etc.
```

### Example 2: Worktree for Quick Fix

```
User: /speckit.worktree --new o-3-fix-auth-bug

Claude: Creating new branch and worktree...

✓ Worktree created successfully

Branch:    o-3-fix-auth-bug (new)
Location:  /Users/chris/Documents/bdr-o-3-fix-auth-bug

Next steps:
1. Open in VS Code: code /Users/chris/Documents/bdr-o-3-fix-auth-bug
2. Make your fixes
3. Commit and push as usual
```

### Example 3: Current Branch Worktree

```
User: /speckit.worktree
(currently on branch 58-sandbox-workspaces)

Claude: You're currently on branch `58-sandbox-workspaces`.
Creating worktree for this branch...

✓ Worktree created at /Users/chris/Documents/bdr-58-sandbox-workspaces
```

## Worktree Management Commands

Include these helpful commands in your response when relevant:

```bash
# List all worktrees
git worktree list

# Remove a worktree (from main repo)
git worktree remove /path/to/worktree

# Prune stale worktree references
git worktree prune
```

## Integration with SpecKit Workflow

Worktrees work seamlessly with the full SpecKit workflow:

1. **Start on main**: Plan your feature
2. **Create spec**: `/speckit.specify` creates branch `58-feature-name`
3. **Create worktree**: `/speckit.worktree 58-feature-name`
4. **Open worktree**: New VS Code window or add to workspace
5. **Continue SpecKit**: `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`
6. **Commit/Push**: Works exactly the same, goes to same GitHub repo
7. **Create PR**: PR appears in the same repository
8. **Cleanup**: `git worktree remove` when done

## When NOT to Use Worktrees

- Single-branch work (just use normal git checkout)
- Quick changes that don't need isolation
- When disk space is limited (each worktree is a full copy of files)