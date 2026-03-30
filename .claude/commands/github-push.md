# /github-push - Push Commits to GitHub

Push all unpushed local commits to the remote branch on GitHub.

## Usage

```
/github-push
```

## What This Does

1. Checks if there are unpushed commits
2. Verifies the current branch has a remote tracking branch
3. Pushes all local commits to GitHub
4. If no upstream exists, sets it with `-u origin <branch-name>`

## When to Use

- After making one or more local commits with `/github-commit`
- When you want to back up your work to GitHub
- Before creating a PR (commits must be pushed first)
- When collaborating and others need to see your changes

## Implementation Instructions for Claude

When the user invokes `/github-push`:

1. **Check current branch**:
   ```bash
   git branch --show-current
   ```

2. **Check for unpushed commits**:
   ```bash
   git status
   git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null || echo "No upstream branch"
   ```

3. **Push to remote**:
   - If upstream exists:
     ```bash
     git push
     ```
   - If no upstream:
     ```bash
     git push -u origin $(git branch --show-current)
     ```

4. **Confirm success**:
   - Show the pushed commits
   - Provide the GitHub branch URL if available

## Notes

- This command does NOT create a new commit
- It only uploads existing local commits to GitHub
- Use `/github-commit` first if you have uncommitted changes
- Use `/github-cp` to commit and push in one step