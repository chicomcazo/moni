# /github-finish - Sync Main After PR Merge

Sync local main branch after a PR has been merged on GitHub. Keeps the feature branch as a backup.

## Usage

```
/github-finish
```

## What This Does

1. Checks out the `main` branch
2. Pulls the latest changes from remote
3. Keeps the feature branch intact (does not delete it)

## When to Use

- After your PR has been merged on GitHub
- When you're done working on a feature branch
- To update your local main with the latest changes

## Implementation Instructions for Claude

When the user invokes `/github-finish`:

1. **Get current branch name** (for reference):
   ```bash
   git branch --show-current
   ```

2. **Check for uncommitted changes**:
   ```bash
   git status
   ```
   - If there are uncommitted changes, warn the user and ask how to proceed
   - Options: commit them, stash them, or abort

3. **Checkout main**:
   ```bash
   git checkout main
   ```

4. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

5. **Confirm success**:
   - Show that main is now up to date
   - Remind user which branch was kept as backup
   - Show recent commits on main to confirm the merge

## Notes

- This command does NOT delete the feature branch
- The old branch is kept as a backup in case you need to reference it
- To manually delete a branch later: `git branch -d <branch-name>`
- If you want to clean up old branches periodically, do it manually