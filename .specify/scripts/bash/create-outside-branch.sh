#!/bin/bash
# Create Outside Branch Script
# Creates branches with o-{number}-{description} pattern for work outside SpecKit

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the next available "outside" spec number by looking at existing branches
get_next_outside_number() {
  # Get all branches with o- prefix
  local max_num=0

  # Check local branches
  while IFS= read -r branch; do
    if [[ $branch =~ ^[[:space:]]*o-([0-9]+)- ]]; then
      num="${BASH_REMATCH[1]}"
      if ((num > max_num)); then
        max_num=$num
      fi
    fi
  done < <(git branch -a)

  # Next number is max + 1 (starting from 1 if none exist)
  echo $((max_num + 1))
}

# Show usage
usage() {
  echo "Usage: $0 <branch-description>"
  echo ""
  echo "Creates a branch with pattern: o-{number}-{description}"
  echo "  o = Outside SpecKit workflow"
  echo "  number = Auto-incremented based on existing o- branches"
  echo ""
  echo "Example:"
  echo "  $0 contact-account-associations"
  echo "  Creates: o-1-contact-account-associations"
  echo ""
  echo "For SpecKit-managed features, use /speckit.specify instead"
  exit 1
}

# Check if description provided
if [ -z "$1" ]; then
  usage
fi

DESCRIPTION="$1"

# Validate description (no spaces, lowercase with hyphens)
if [[ ! "$DESCRIPTION" =~ ^[a-z0-9-]+$ ]]; then
  echo -e "${RED}Error: Branch description must be lowercase with hyphens only (a-z, 0-9, -)${NC}"
  echo "Example: contact-account-associations"
  exit 1
fi

# Get next number
NEXT_NUM=$(get_next_outside_number)
BRANCH_NAME="o-${NEXT_NUM}-${DESCRIPTION}"

echo -e "${YELLOW}Creating outside branch: ${GREEN}${BRANCH_NAME}${NC}"
echo ""
echo "This branch is for work OUTSIDE the SpecKit workflow."
echo "For SpecKit-managed features, use /speckit.specify instead."
echo ""

# Create and checkout branch
git checkout -b "$BRANCH_NAME"

echo ""
echo -e "${GREEN}✓ Branch created: ${BRANCH_NAME}${NC}"
echo ""
echo "Next steps:"
echo "  1. Make your changes"
echo "  2. Commit: git add . && git commit -m 'feat: ...'"
echo "  3. Push: git push -u origin ${BRANCH_NAME}"
echo "  4. Create PR when ready"