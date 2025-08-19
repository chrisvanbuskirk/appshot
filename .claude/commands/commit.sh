#!/bin/bash

# Appshot /commit command
# Automates PR creation with linting and testing

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
BRANCH_NAME="$1"
COMMIT_MESSAGE="$2"
PR_TITLE="$3"
PR_BODY="$4"

# Function to print colored output
print_step() {
  echo -e "${BLUE}$1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Validate arguments
if [ -z "$BRANCH_NAME" ] || [ -z "$COMMIT_MESSAGE" ] || [ -z "$PR_TITLE" ]; then
  print_error "Missing required arguments"
  echo "Usage: /commit <branch-name> \"<commit-message>\" \"<pr-title>\" \"<pr-body>\""
  echo ""
  echo "Example:"
  echo "  /commit fix/button-styles \"Fix button hover styles\" \"Fix button hover state styling issues\" \"This PR fixes the hover state styling\""
  exit 1
fi

# Default PR body if not provided
if [ -z "$PR_BODY" ]; then
  PR_BODY="$COMMIT_MESSAGE"
fi

print_step "🚀 Starting automated commit and PR process..."
echo ""

# Check for uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
  print_error "No changes to commit"
  exit 1
fi

# 1. Create and checkout new branch
print_step "📝 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" 2>/dev/null || {
  print_warning "Branch already exists, using existing branch"
  git checkout "$BRANCH_NAME"
}

# 2. Stage all changes
print_step "📦 Staging changes..."
git add -A

# Show what will be committed
echo "Changes to be committed:"
git status --short

# 3. Run linting with auto-fix
print_step "🧹 Running linter..."
if npm run lint -- --fix; then
  print_success "Linting passed"
else
  print_error "Linting failed"
  exit 1
fi

# 4. Run tests
print_step "🧪 Running tests..."
if npm test; then
  print_success "Tests passed"
else
  print_error "Tests failed"
  exit 1
fi

# 5. Build the project
print_step "🔨 Building project..."
if npm run build; then
  print_success "Build successful"
else
  print_error "Build failed"
  exit 1
fi

# 6. Stage any changes from lint/build
git add -A

# 7. Commit changes
print_step "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" || {
  print_error "Commit failed (possibly no changes after lint/build)"
  exit 1
}

# 8. Push to remote
print_step "⬆️ Pushing to remote..."
git push -u origin "$BRANCH_NAME" || {
  print_error "Push failed"
  exit 1
}

# 9. Create PR
print_step "🔀 Creating pull request..."

# Build PR body with test status
PR_BODY_FULL="## Summary
$PR_BODY

## Pre-merge Checklist
✅ Linting passed
✅ Tests passed  
✅ Build successful

🤖 Generated with [Claude Code](https://claude.ai/code)"

if gh pr create --title "$PR_TITLE" --body "$PR_BODY_FULL"; then
  print_success "Pull request created successfully!"
  
  # Get the PR URL
  PR_URL=$(gh pr view --json url -q .url)
  echo ""
  echo "📎 PR URL: $PR_URL"
else
  # Check if PR already exists
  if gh pr view &>/dev/null; then
    print_warning "PR already exists for this branch"
    PR_URL=$(gh pr view --json url -q .url)
    echo "📎 Existing PR: $PR_URL"
  else
    print_error "PR creation failed"
    exit 1
  fi
fi

echo ""
print_success "All done! Your PR is ready for review."