# /github-cp - Commit and Push

Commit and Push in one step. Stages changes, creates a commit with a descriptive message, and immediately pushes to GitHub.

## Usage

```
/github-cp
```

## What This Does

1. Runs `git status` to see all changed/untracked files
2. Runs `git diff` to review changes
3. Checks recent commit messages to match the repository's style
4. Stages and commits changes with a descriptive message
5. Pushes all commits (including any previously unpushed) to GitHub

## When to Use

- When you want changes to go directly to GitHub
- For quick iterations where you don't need multiple local commits
- When you're done with a chunk of work and want it backed up remotely

## Implementation Instructions for Claude

When the user invokes `/github-cp`:

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

4. **Get current branch**:
   ```bash
   git branch --show-current
   ```

5. **Stage files**:
   - Prefer staging specific files over `git add -A`
   - Never stage sensitive files (.env, credentials, etc.)

6. **Create the commit**:
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>: <description>

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

7. **Push to remote**:
   - If upstream exists:
     ```bash
     git push
     ```
   - If no upstream:
     ```bash
     git push -u origin $(git branch --show-current)
     ```

8. **Confirm success**:
   ```bash
   git status
   ```
   - Show what was committed and pushed
   - Provide the GitHub branch URL if available

## Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Notes

- Combines `/github-commit` + `/github-push` into one command
- All unpushed commits (not just the new one) will be pushed
- Use `/github-commit` if you want to save locally without pushing