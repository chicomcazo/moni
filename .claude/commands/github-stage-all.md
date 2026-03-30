# /github-stage-all - Stage All Changes

Stage all modified and untracked files for the next commit (equivalent to `git add .`).

## Usage

```
/github-stage-all
```

## What This Does

1. Shows you the current git status (what's changed)
2. Stages all modified, deleted, and new files
3. Confirms what was staged

## When to Use

- When you want to include all your changes in the next commit
- When you've reviewed your changes and are ready to commit everything
- As a quick alternative to staging files one by one

## Implementation Instructions for Claude

When the user invokes `/github-stage-all`:

1. **Show current status first**:
   ```bash
   git status
   ```

2. **Review what will be staged** (show the user):
   - Modified files
   - Deleted files
   - New/untracked files

3. **Check for sensitive files**:
   - Warn if `.env`, credentials, or other sensitive files would be staged
   - If found, ask the user before proceeding

4. **Stage all changes**:
   ```bash
   git add .
   ```

5. **Confirm what was staged**:
   ```bash
   git status
   ```

6. **Report to the user**:
   - List what was staged
   - Remind them to use `/github-commit` to create the commit

## Safety Notes

- This command will NOT stage files in `.gitignore`
- Always review `git status` output before committing
- If you accidentally stage something, use `git reset <file>` to unstage

## Related Commands

- `/github-commit` - Commit staged changes locally
- `/github-push` - Push commits to GitHub
- `/github-cp` - Commit and push in one step