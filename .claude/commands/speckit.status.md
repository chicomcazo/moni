---
description: Show current SpecKit workflow status - last command, next command, and progress
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Display a beautiful visual status of where the user is in the SpecKit workflow, showing:
- The feature name
- Last command run
- Current workflow position
- Next command to run
- Progress percentage

## Execution Steps

### 1. Detect Feature

**If `$ARGUMENTS` contains a number:**
- Use that as the feature number
- Find matching directory in `specs/` with pattern `NN-*`

**If `$ARGUMENTS` is empty:**
- Extract feature number from current git branch name
- Branch pattern: `NN-feature-name` where NN is the number

**If no feature detected:**
Display this and stop:
```
╔══════════════════════════════════════════════════════════════╗
║                      SpecKit Status                          ║
╚══════════════════════════════════════════════════════════════╝

     No feature detected.

     Either:
     - Switch to a feature branch (e.g., 52-feature-name)
     - Specify a feature number: /speckit.status 52
```

### 2. Check if Archived

Look for the feature in `specs/.completed/`. If found, display:
```
╔══════════════════════════════════════════════════════════════╗
║                 SpecKit · [NN-feature-name]                  ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│  Last:  /speckit.archive                                     │
└──────────────────────────────────────────────────────────────┘

     [✓] specify
     [ ] clarify              optional
     [✓] plan
     [✓] tasks
     [ ] analyze              optional
     [✓] implement
     [✓] archive

┌──────────────────────────────────────────────────────────────┐
│  ✅  ARCHIVED  →  specs/.completed/[NN-feature-name]/        │
└──────────────────────────────────────────────────────────────┘

  ████████████████████████████  100%  (complete)
```

### 3. Gather State Information

Run this command to get feature info:
```bash
.specify/scripts/bash/check-prerequisites.sh --json
```

Parse the JSON to determine which files exist:
- `spec.md` exists?
- `plan.md` exists?
- `tasks.md` exists?

### 4. Check Task Completion (if tasks.md exists)

Count checkboxes in tasks.md:
- Incomplete: `- [ ]`
- Complete: `- [x]`

If ALL tasks are complete, the implement phase is done.

### 5. Determine Phase

| Files Present | Last Command | Next Command | Steps Done |
|---------------|--------------|--------------|------------|
| None | - | specify | 0/4 |
| spec.md | specify | plan | 1/4 |
| spec.md + plan.md | plan | tasks | 2/4 |
| spec.md + plan.md + tasks.md | tasks | implement | 3/4 |
| All tasks [x] complete | implement | archive | 4/4 |

### 6. Render Output

Use this exact format (replace placeholders with actual values):

**In progress example:**
```
╔══════════════════════════════════════════════════════════════╗
║                 SpecKit · [NN-feature-name]                  ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│  Last:  /speckit.[last-command]                              │
└──────────────────────────────────────────────────────────────┘

     [✓] specify
     [ ] clarify              optional
     [✓] plan
     [✓] tasks
     [ ] analyze              optional
     [→] implement

┌──────────────────────────────────────────────────────────────┐
│  Next:  /speckit.[next-command]                              │
└──────────────────────────────────────────────────────────────┘

  ████████████████████░░░░░░░  75%  (3/4 steps)
```

**Workflow complete example:**
```
╔══════════════════════════════════════════════════════════════╗
║                 SpecKit · [NN-feature-name]                  ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────┐
│  Last:  /speckit.implement                                   │
└──────────────────────────────────────────────────────────────┘

     [✓] specify
     [ ] clarify              optional
     [✓] plan
     [✓] tasks
     [ ] analyze              optional
     [✓] implement

┌──────────────────────────────────────────────────────────────┐
│  ✅  COMPLETE  →  /speckit.archive                           │
└──────────────────────────────────────────────────────────────┘

  ████████████████████████████  100%  (4/4 steps)
```

### 7. Progress Bar Calculation

Calculate progress bar based on steps completed (4 main steps: specify, plan, tasks, implement):

- 0/4 = 0% = `░░░░░░░░░░░░░░░░░░░░░░░░░░░░`
- 1/4 = 25% = `███████░░░░░░░░░░░░░░░░░░░░░`
- 2/4 = 50% = `██████████████░░░░░░░░░░░░░░`
- 3/4 = 75% = `█████████████████████░░░░░░░`
- 4/4 = 100% = `████████████████████████████`

### Symbols Reference

- `[✓]` = completed step
- `[ ]` = not done (for optional steps)
- `[→]` = current step (next to do)

## Important Notes

- This command is READ-ONLY - it does not modify any files
- Clarify and analyze are always shown as optional (they don't count toward the 4 main steps)
- The progress percentage is based on the 4 required steps only