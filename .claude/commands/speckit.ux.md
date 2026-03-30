# SpecKit UX - UI/UX Design Review with Gemini CLI

Generate a comprehensive UI/UX design prompt for Gemini CLI review.

## Trigger

Run this command before implementing any UI component or screen.

## Workflow

### Step 1: Gather Context

Before generating the prompt, I need to understand:

1. **What screen/component are you designing?**
2. **What user story does this serve?**
3. **What data will be displayed/collected?**
4. **What actions can the user take?**

### Step 2: Generate Gemini CLI Prompt

Once context is gathered, I will generate a prompt file that you can use with Gemini CLI:

```bash
gemini -p "$(cat .specify/references/ux-gemini-prompt.md)"
```

Or copy the generated prompt directly into Gemini CLI.

### Step 3: Design Review Output

The Gemini CLI prompt will request feedback on:

- **Layout & Hierarchy**: Information architecture, visual flow
- **Interaction Design**: Click targets, hover states, transitions
- **Accessibility**: Color contrast, keyboard navigation, screen reader support
- **Mobile Responsiveness**: Touch targets, responsive breakpoints
- **Error Handling**: Validation, error messages, recovery paths
- **Loading States**: Skeleton screens, progress indicators
- **Empty States**: First-time user experience, no-data states

## Reference Materials

See `.specify/references/ux-gemini-prompt.md` for the full prompt template.
See `.specify/templates/ux-review-template.md` for the output format.

## Design System Constraints

All designs MUST use:

- **Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS utility classes
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Typography**: System font stack or Inter

## Example Usage

**User**: I need to design the Campaign Creation form

**Assistant**: I'll gather context and generate a Gemini CLI prompt for UI/UX review.

Questions:

1. What fields are required? (name, client, sequence, etc.)
2. Is this a single page or multi-step wizard?
3. What's the expected complexity level of sequences?
4. Are there any existing patterns to follow?

After answers, generates:

- Gemini CLI prompt with full context
- Component hierarchy suggestion
- Accessibility checklist for this specific form

## Constitution Reference

This command implements **Principle XIV: UI/UX First Design** from the constitution.

Key requirements:

- Simple, intuitive interfaces
- WCAG 2.1 AA compliance
- Design before code
- Progressive disclosure
