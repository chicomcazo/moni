#!/bin/bash
# Create Git Worktree Script
# Creates a worktree for an existing or new branch

set -e

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKTREE_BASE_DIR="../"  # Worktrees created as siblings to main repo

# Show usage
usage() {
    echo "Usage: $0 [options] <branch-name>"
    echo ""
    echo "Creates a git worktree for the specified branch."
    echo ""
    echo "Options:"
    echo "  --json          Output result as JSON"
    echo "  --new           Create a new branch (defaults to current HEAD)"
    echo "  --base <branch> Base branch for new branch (used with --new)"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 58-sandbox-workspaces           # Worktree for existing branch"
    echo "  $0 --new o-1-quick-fix             # Create new branch + worktree"
    echo "  $0 --new --base main feature-x     # New branch from main + worktree"
    echo ""
    echo "Worktree location: Parent directory with 'bdr-' prefix"
    echo "  e.g., ../bdr-58-sandbox-workspaces/"
    exit 1
}

# Parse arguments
JSON_OUTPUT=false
CREATE_NEW=false
BASE_BRANCH=""
BRANCH_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --new)
            CREATE_NEW=true
            shift
            ;;
        --base)
            BASE_BRANCH="$2"
            shift 2
            ;;
        --help)
            usage
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            usage
            ;;
        *)
            BRANCH_NAME="$1"
            shift
            ;;
    esac
done

# Validate branch name provided
if [ -z "$BRANCH_NAME" ]; then
    if [ "$JSON_OUTPUT" = true ]; then
        echo '{"success": false, "error": "No branch name provided"}'
    else
        echo -e "${RED}Error: No branch name provided${NC}"
        usage
    fi
    exit 1
fi

# Ensure we're in a git repository
if ! is_git_repo; then
    if [ "$JSON_OUTPUT" = true ]; then
        echo '{"success": false, "error": "Not a git repository"}'
    else
        echo -e "${RED}Error: Not a git repository${NC}"
    fi
    exit 1
fi

# Get repository info
REPO_ROOT=$(get_repo_root)
REPO_NAME=$(basename "$REPO_ROOT")
WORKTREE_PATH="${REPO_ROOT}/${WORKTREE_BASE_DIR}bdr-${BRANCH_NAME}"

# Normalize worktree path (resolve ../)
WORKTREE_PATH=$(cd "$REPO_ROOT" && cd "$WORKTREE_BASE_DIR" 2>/dev/null && pwd)/bdr-${BRANCH_NAME}

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"success\": false, \"error\": \"Worktree already exists at ${WORKTREE_PATH}\"}"
    else
        echo -e "${RED}Error: Worktree already exists at ${WORKTREE_PATH}${NC}"
        echo ""
        echo "To use existing worktree:"
        echo "  cd ${WORKTREE_PATH}"
        echo ""
        echo "To remove and recreate:"
        echo "  git worktree remove ${WORKTREE_PATH}"
    fi
    exit 1
fi

# Check if branch exists (local or remote)
BRANCH_EXISTS=false
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}" 2>/dev/null; then
    BRANCH_EXISTS=true
    BRANCH_TYPE="local"
elif git show-ref --verify --quiet "refs/remotes/origin/${BRANCH_NAME}" 2>/dev/null; then
    BRANCH_EXISTS=true
    BRANCH_TYPE="remote"
fi

# Handle branch creation logic
if [ "$CREATE_NEW" = true ]; then
    if [ "$BRANCH_EXISTS" = true ]; then
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"success\": false, \"error\": \"Branch '${BRANCH_NAME}' already exists (${BRANCH_TYPE}). Remove --new flag to create worktree for existing branch.\"}"
        else
            echo -e "${RED}Error: Branch '${BRANCH_NAME}' already exists (${BRANCH_TYPE})${NC}"
            echo "Remove --new flag to create worktree for existing branch."
        fi
        exit 1
    fi

    # Create worktree with new branch
    if [ -n "$BASE_BRANCH" ]; then
        git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"
    else
        git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH"
    fi
    CREATED_NEW_BRANCH=true
else
    if [ "$BRANCH_EXISTS" = false ]; then
        if [ "$JSON_OUTPUT" = true ]; then
            echo "{\"success\": false, \"error\": \"Branch '${BRANCH_NAME}' does not exist. Use --new flag to create a new branch.\"}"
        else
            echo -e "${RED}Error: Branch '${BRANCH_NAME}' does not exist${NC}"
            echo "Use --new flag to create a new branch:"
            echo "  $0 --new ${BRANCH_NAME}"
        fi
        exit 1
    fi

    # Create worktree for existing branch
    if [ "$BRANCH_TYPE" = "remote" ]; then
        # Track remote branch
        git worktree add --track -b "$BRANCH_NAME" "$WORKTREE_PATH" "origin/${BRANCH_NAME}"
    else
        git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
    fi
    CREATED_NEW_BRANCH=false
fi

# Verify worktree was created
if [ ! -d "$WORKTREE_PATH" ]; then
    if [ "$JSON_OUTPUT" = true ]; then
        echo '{"success": false, "error": "Failed to create worktree"}'
    else
        echo -e "${RED}Error: Failed to create worktree${NC}"
    fi
    exit 1
fi

# Output results
if [ "$JSON_OUTPUT" = true ]; then
    cat <<EOF
{
    "success": true,
    "branch_name": "${BRANCH_NAME}",
    "worktree_path": "${WORKTREE_PATH}",
    "created_new_branch": ${CREATED_NEW_BRANCH},
    "repo_root": "${REPO_ROOT}"
}
EOF
else
    echo ""
    echo -e "${GREEN}✓ Worktree created successfully${NC}"
    echo ""
    echo -e "${BLUE}Branch:${NC}    ${BRANCH_NAME}"
    echo -e "${BLUE}Location:${NC}  ${WORKTREE_PATH}"
    if [ "$CREATED_NEW_BRANCH" = true ]; then
        echo -e "${BLUE}Status:${NC}    New branch created"
    else
        echo -e "${BLUE}Status:${NC}    Using existing branch"
    fi
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Open in VS Code:  code ${WORKTREE_PATH}"
    echo "  2. Or change directory: cd ${WORKTREE_PATH}"
    echo ""
    echo -e "${YELLOW}To remove worktree later:${NC}"
    echo "  git worktree remove ${WORKTREE_PATH}"
    echo ""
    echo -e "${YELLOW}List all worktrees:${NC}"
    echo "  git worktree list"
fi