# /github-commit - Commit Changes Locally

Commit staged changes to the local git history with a descriptive message following the repository's commit style.

## Usage

```
/github-commit
```

## What This Does

1. Runs `git status` to see all changed/untracked files
2. Runs `git diff` to review staged and unstaged changes
3. Checks recent commit messages to match the repository's style
4. Creates a commit with a descriptive message
5. Changes remain **local** until pushed

## When to Use

- When you want to save a checkpoint of your work locally
- When you're making multiple logical changes and want separate commits
- Before switching branches
- When you're not ready to push to GitHub yet

## Implementation Instructions for Claude

When the user invokes `/github-commit`:

1. **Check git status**:
   ```bash
   git status
   ```

2. **Review changes**:
   ```bash
   git diff
   git diff --staged
   ```

3. **Check recent commit style**:
   ```bash
   git log --oneline -10
   ```

4. **Stage files if needed**:
   - Prefer staging specific files over `git add -A`
   - Never stage sensitive files (.env, credentials, etc.)

5. **Create the commit**:
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>: <description>

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

6. **Confirm success**:
   ```bash
   git status
   ```

## Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Notes

- This command does NOT push to GitHub
- Use `/github-push` to upload commits to remote
- Use `/github-cp` to commit and push in one step