# /commit Command

This command automates the process of creating a pull request with proper linting and testing.

## Usage
```
/commit <branch-name> "<commit-message>" "<pr-title>" "<pr-body>"
```

## What it does:
1. Creates a new branch from the current branch
2. Stages all changes
3. Runs linting with auto-fix
4. Runs tests to ensure nothing is broken
5. Builds the project
6. Commits changes with the provided message
7. Pushes to remote
8. Creates a pull request

## Example:
```
/commit fix/button-styles "Fix button hover styles" "Fix button hover state styling issues" "This PR fixes the hover state styling for primary buttons that was causing visual glitches on mobile devices."
```

## Implementation:

```bash
#!/bin/bash

# Parse arguments
BRANCH_NAME="$1"
COMMIT_MESSAGE="$2"
PR_TITLE="$3"
PR_BODY="$4"

# Validate arguments
if [ -z "$BRANCH_NAME" ] || [ -z "$COMMIT_MESSAGE" ] || [ -z "$PR_TITLE" ]; then
  echo "❌ Missing required arguments"
  echo "Usage: /commit <branch-name> \"<commit-message>\" \"<pr-title>\" \"<pr-body>\""
  exit 1
fi

# Default PR body if not provided
if [ -z "$PR_BODY" ]; then
  PR_BODY="$COMMIT_MESSAGE"
fi

echo "🚀 Starting automated commit and PR process..."

# 1. Create and checkout new branch
echo "📝 Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" || { echo "❌ Failed to create branch"; exit 1; }

# 2. Stage all changes
echo "📦 Staging changes..."
git add -A

# 3. Run linting with auto-fix
echo "🧹 Running linter..."
npm run lint -- --fix || { echo "❌ Linting failed"; exit 1; }

# 4. Run tests
echo "🧪 Running tests..."
npm test || { echo "❌ Tests failed"; exit 1; }

# 5. Build the project
echo "🔨 Building project..."
npm run build || { echo "❌ Build failed"; exit 1; }

# 6. Stage any changes from lint/build
git add -A

# 7. Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" || { echo "❌ Commit failed"; exit 1; }

# 8. Push to remote
echo "⬆️ Pushing to remote..."
git push -u origin "$BRANCH_NAME" || { echo "❌ Push failed"; exit 1; }

# 9. Create PR
echo "🔀 Creating pull request..."
gh pr create --title "$PR_TITLE" --body "$PR_BODY

🤖 Generated with [Claude Code](https://claude.ai/code)" || { echo "❌ PR creation failed"; exit 1; }

echo "✅ Success! PR created and ready for review."
```

## Notes:
- Ensures code quality by running lint and tests before committing
- Automatically adds Claude Code attribution to commits and PRs
- Fails fast if any step encounters an error
- Works with the existing GitHub CLI (gh) setup