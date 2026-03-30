# /github-pr - Create Pull Request

Create a Pull Request from the current branch to `main` and update the CHANGELOG.

## Usage

```
/github-pr
```

## What This Does

1. Analyzes all commits on the branch since it diverged from main
2. Reviews the full diff against main
3. Generates a PR summary and test plan
4. **Adds an entry to CHANGELOG.md** with user-friendly descriptions
5. Creates the PR using `gh pr create`
6. Returns the PR URL

## When to Use

- When your feature/fix is ready for review
- After pushing all your commits to GitHub
- When you want to merge your branch into main

## Implementation Instructions for Claude

When the user invokes `/github-pr`:

### Step 1: Check current state (run in parallel)
```bash
git status
git branch --show-current
git log origin/main..HEAD --oneline
git diff main...HEAD --stat
```

### Step 2: Verify branch is pushed
- If there are unpushed commits, push them first
- If no upstream, set it with `-u origin <branch>`

### Step 3: Analyze ALL commits on the branch
- Not just the latest commit
- Understand the full scope of changes

### Step 4: Generate the changelog entry

Write a user-friendly description of changes. Follow these rules:
- Write as if explaining to a non-technical team member
- Focus on **what changed for users**, not how it was implemented
- Use simple language, avoid technical jargon
- Start each bullet with a verb (Added, Fixed, Improved, Updated, Removed)
- Keep bullets short and clear

**Good examples:**
- Added a sandbox workspace for Super Admins to test features safely
- Fixed the "Act As" button not closing when clicked again
- Improved the workspace switcher to show which role you're testing as

**Bad examples (too technical):**
- Refactored getAuthContext() to remove NODE_ENV check
- Added triggerRef prop to ActAsPanel component
- Fixed useEffect dependency array in WorkspaceSwitcher

### Step 5: Update CHANGELOG.md

Read the current CHANGELOG.md, then use Edit tool to add a new entry at the top (after the "<!-- New entries are added below this line -->" comment).

Format for the new entry:
```markdown
## [PR Title] - YYYY-MM-DD
[PR #XX](link-to-pr)

### Added
- Description of new features

### Changed
- Description of changes to existing features

### Fixed
- Description of bug fixes

---

```

Only include sections (Added/Changed/Fixed/Removed) that apply to this PR.

### Step 6: Stage and amend the changelog

```bash
git add CHANGELOG.md
git commit --amend --no-edit
git push --force-with-lease
```

### Step 7: Create the PR

```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing what this PR does>

## Test plan
- [ ] <Testing checklist item 1>
- [ ] <Testing checklist item 2>

## Changelog
<Copy the same user-friendly bullet points you added to CHANGELOG.md>

---
Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 8: Update CHANGELOG.md with PR link

After the PR is created, update the changelog entry to include the actual PR number and link.

### Step 9: Return the PR URL
So the user can view it.

## PR Title Format

- Use conventional commit style: `feat: add user authentication`
- Keep it concise but descriptive
- Match the primary type of change (feat, fix, docs, refactor, etc.)

## Notes

- Requires `gh` CLI to be installed and authenticated
- The PR always targets `main` branch
- Make sure all commits are pushed before running this command
- Use `/github-push` first if you have unpushed commits
- The changelog is committed as part of the PR, so reviewers can see it