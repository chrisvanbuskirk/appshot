# Claude Custom Commands

This directory contains custom commands for Claude Code to use in this project.

## Available Commands

### `/export`
Exports Appshot-generated screenshots for Fastlane upload to App Store Connect.

**Usage:**
```bash
/export [options]
```

**Options:**
- `--devices iphone,ipad` - Export specific devices only
- `--copy` - Copy files instead of symlinks
- `--clean` - Clean output directory first
- `--dry-run` - Preview without creating files
- `--generate-config` - Generate Fastlane configuration

**What it does:**
1. Auto-detects languages from screenshots
2. Maps language codes to Fastlane format
3. Validates against App Store requirements
4. Creates Fastlane directory structure
5. Handles special device naming (iPad Pro)
6. Optionally generates Fastlane config files

### `/build`
Builds and installs the appshot CLI tool locally for testing.

**Usage:**
```bash
/build
```

**What it does:**
1. Cleans previous build artifacts
2. Installs dependencies
3. Compiles TypeScript
4. Links globally
5. Verifies installation

### `/commit`
Automates the process of creating a pull request with proper quality checks.

**Usage:**
```bash
/commit <branch-name> "<commit-message>" "<pr-title>" "<pr-body>"
```

**What it does:**
1. Creates a new branch
2. Runs linting with auto-fix
3. Runs all tests
4. Builds the project
5. Commits changes
6. Pushes to remote
7. Creates a pull request

**Example:**
```bash
/commit fix/api-error "Fix API error handling" "Fix error handling in API endpoints" "This PR improves error handling in our API endpoints to provide better error messages"
```

## Adding New Commands

To add a new command:
1. Create a new `.sh` script in this directory
2. Make it executable: `chmod +x your-command.sh`
3. Document it in this README
4. Claude will be able to use it with `/your-command`

## Implementation Notes

These commands are project-specific and override any global Claude commands with the same name. They help maintain consistent development workflows and ensure code quality before creating PRs.