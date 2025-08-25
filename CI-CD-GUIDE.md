# Complete CI/CD Pipeline Guide for Appshot

## 🏗️ Architecture Overview

Appshot's CI/CD is built with a **modular architecture** where the main workflow (`ci.yml`) orchestrates smaller, specialized workflows. This design enables:
- Parallel execution of different test types
- Reusability (workflows can be called independently)
- Better organization and maintenance
- Efficient resource usage

## 📁 Workflow Files (7 Total)

### 1. **`ci.yml`** - Main Orchestrator
**Triggers:**
- Every push to `main` branch
- Every pull request to `main`
- Manual trigger (`workflow_dispatch`)

**Concurrency Control:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```
Prevents duplicate runs - cancels old runs when new commits are pushed.

**Jobs Pipeline:**
1. **lint-and-typecheck** - ESLint + TypeScript type checking
2. **unit-tests** - Calls `ci-unit.yml` workflow
3. **integration-tests** - Calls `ci-integration.yml` workflow  
4. **visual-tests** - Calls `ci-visual.yml` (conditional)
5. **ci-status** - Aggregates results, fails if any test failed
6. **ci-metrics** - Performance reporting (main branch only)
7. **bundle-size** - Checks dist/ size (PRs only)
8. **release** - Auto-publishes to npm when version changes (main only)

### 2. **`ci-unit.yml`** - Unit Tests
**Test Matrix:**
- **Operating Systems:** Ubuntu, macOS, Windows
- **Node Versions:** 18.x, 20.x, 22.x
- **Total Jobs:** 9 parallel combinations

**Coverage:**
- Core logic: frame selection, render functions
- Font system, translation services
- Configuration handling
- 380+ tests across 50+ test files

**Optimization:**
```yaml
APPSHOT_DISABLE_FONT_SCAN: ${{ startsWith(matrix.os, 'ubuntu') && '1' || '' }}
```
Disables slow font scanning on Linux for faster tests.

### 3. **`ci-integration.yml`** - CLI Integration Tests
**Test Matrix:**
- **OS:** Ubuntu, macOS (Windows skipped due to path issues)
- **Node:** 20.x only (less coverage needed for integration)

**Test Scenarios:**
- Full CLI installation (`npm link`)
- All commands: init, build, specs, presets, fonts, doctor, validate
- Multi-language builds
- Real screenshot generation with sharp
- End-to-end workflows

**Example Test Flow:**
```bash
appshot init --force
# Creates real screenshots
appshot build --devices iphone,ipad,watch
# Tests multi-language
appshot build --langs en,es,fr
```

### 4. **`ci-visual.yml`** - Visual Regression Tests
**Two-Stage Validation:**

**Stage 1: Visual Tests (macOS)**
- Generates test screenshots with known patterns
- Builds with different settings (frames, gradients)
- Pixel-perfect comparison using ImageMagick
- Fails if >100 pixels difference

**Stage 2: Technical Validation (Ubuntu)**
- Analyzes image properties
- Checks dimensions against App Store specs
- Validates file sizes (<5MB warning)
- Creates detailed technical reports

**PR Integration:**
- Auto-comments on PRs with visual differences
- Uploads diff images as artifacts
- Side-by-side comparisons available

### 5. **`claude.yml`** - AI Assistant Integration
**Triggers:**
- Issue/PR comments containing `@claude`
- New issues with `@claude` in title/body

**Capabilities:**
```yaml
allowed_tools: |
  Bash(npm test:*),
  Bash(appshot --version),
  Bash(gh workflow run integration-test.yml)
```
Claude can run tests, check configs, and trigger workflows.

### 6. **`claude-code-review.yml`** - Automated PR Reviews
**Triggers:**
- New PRs opened
- PR updates (unless by a bot)

**Review Focus:**
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Test coverage

**Bot Loop Prevention:**
```yaml
if: |
  !(github.event_name == 'pull_request' && 
    endsWith(github.actor, '[bot]'))
```

### 7. **`scheduled.yml`** - Weekly Health Checks
**Schedule:** Every Monday at 2 AM UTC

**Health Checks:**
1. **compatibility-check** - Full matrix test (all OS, all Node)
2. **frames-integrity** - Validates frame assets
3. **performance-test** - Measures build time (<60s threshold)

## 🔄 Workflow Execution Flow

```mermaid
graph TD
    A[Push/PR to main] --> B[ci.yml triggered]
    B --> C[lint-and-typecheck]
    B --> D[unit-tests]
    B --> E[integration-tests]
    B --> F[visual-tests]
    
    D --> G[ci-unit.yml]
    E --> H[ci-integration.yml]
    F --> I[ci-visual.yml]
    
    G --> J[9 parallel jobs]
    H --> K[2 OS tests]
    I --> L[Visual + Technical]
    
    C & J & K & L --> M[ci-status]
    M --> N{All passed?}
    N -->|Yes| O[release if version changed]
    N -->|No| P[CI fails]
    
    Q[PR opened] --> R[claude-code-review.yml]
    S[@claude comment] --> T[claude.yml]
    U[Monday 2AM] --> V[scheduled.yml]
```

## 🎯 Key Features

### Concurrency Control
Prevents duplicate runs and saves CI minutes:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

### Smart Conditional Execution
Visual tests only run when needed:
```yaml
if: |
  github.event_name == 'pull_request' || 
  github.ref == 'refs/heads/main' ||
  contains(github.event.head_commit.message, '[visual]')
```

### Artifact Management
Unique naming prevents conflicts:
```yaml
name: integration-artifacts-${{ matrix.os }}-${{ github.run_id }}
retention-days: 7  # Standard retention
retention-days: 30 # For important visual diffs
```

### Release Automation
Auto-publishes when version changes:
```yaml
- uses: EndBug/version-check@v2
- if: steps.version.outputs.changed == 'true'
  run: npm publish --access public
```

### Performance Optimizations
- **Node module caching:** `cache: 'npm'`
- **Matrix reduction:** Integration tests only on Node 20.x
- **OS-specific skips:** Windows skipped for integration
- **Font scan disable:** Linux skips slow font scanning

## 📊 Performance Metrics

**Typical Execution Times:**
- Lint & TypeCheck: ~1 minute
- Unit Tests: ~2-3 minutes per job (9 parallel)
- Integration Tests: ~5 minutes per OS
- Visual Tests: ~4 minutes
- **Total PR Time:** ~5-7 minutes (parallelized)

## 🚀 Usage Guide

### Running Locally
```bash
# Run what CI runs
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:visual

# Trigger workflows manually
gh workflow run ci.yml
gh workflow run scheduled.yml
```

### Special Commit Messages
- `[skip ci]` - Skip all CI
- `[visual]` - Force visual tests
- `[skip-review]` - Skip Claude review

### Manual Triggers
All workflows support `workflow_dispatch` for manual runs from GitHub UI.

## 🔍 Debugging CI Failures

1. **Check Summary:** Each job creates a summary in `$GITHUB_STEP_SUMMARY`
2. **Download Artifacts:** Failed tests upload debugging artifacts
3. **Re-run Jobs:** Individual failed jobs can be re-run
4. **Visual Diffs:** PR comments link to visual diff artifacts

## 💡 Best Practices

### For Contributors
1. **Small PRs:** Focused changes = faster CI
2. **Draft PRs:** CI runs but Claude won't review
3. **Local Testing:** Run `npm test` before pushing
4. **Check Matrix:** Some failures may be OS-specific

### For Maintainers
1. **Monitor Performance:** Check ci-metrics on main branch
2. **Review Artifacts:** Clean up old artifacts periodically
3. **Update Matrix:** Adjust OS/Node versions as needed
4. **Cost Management:** Monitor Actions usage

## 🔐 Security

### Permissions
Workflows use minimal required permissions:
```yaml
permissions:
  contents: read
  pull-requests: read
  issues: read
```

Release job requires additional:
```yaml
permissions:
  contents: write  # For GitHub releases
  packages: write  # For npm publishing
```

### Secret Management
- `NPM_TOKEN`: For npm publishing
- `CLAUDE_CODE_OAUTH_TOKEN`: For Claude integration
- No secrets exposed in logs or artifacts

## 📈 Recent Improvements (2024)

### Consolidation Achievement
- **Before:** 11 workflow files with duplicates
- **After:** 7 workflow files, no redundancy
- **Code Reduction:** 593 lines removed
- **Performance:** ~40% faster due to deduplication

### Enhanced Features
- Concurrency controls prevent duplicate runs
- Bundle size tracking for PRs
- ImageMagick technical validation
- Comprehensive CLI command testing
- Better artifact naming with run IDs

## 🛠️ Maintenance

### Regular Tasks
- Review and update Node.js versions quarterly
- Clean up old artifacts monthly
- Monitor CI performance metrics
- Update dependencies in workflows

### Workflow Updates
When updating workflows:
1. Test changes in a PR first
2. Use `workflow_dispatch` for testing
3. Monitor first runs after merge
4. Update this documentation

## 📝 Common Issues & Solutions

### Issue: Windows Path Errors
**Solution:** Integration tests skip Windows
```yaml
matrix:
  os: [ubuntu-latest, macos-latest]  # Windows excluded
```

### Issue: Slow Font Detection on Linux
**Solution:** Environment variable disables it
```yaml
APPSHOT_DISABLE_FONT_SCAN: '1'
```

### Issue: Duplicate CI Runs
**Solution:** Concurrency groups cancel old runs
```yaml
concurrency:
  cancel-in-progress: true
```

### Issue: Large Artifacts
**Solution:** Retention policies and size warnings
```yaml
retention-days: 7  # Short retention for most
```

## 🚦 CI Status Badges

Add to README.md:
```markdown
[![CI](https://github.com/chrisvanbuskirk/appshot/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisvanbuskirk/appshot/actions/workflows/ci.yml)
[![Weekly Health Check](https://github.com/chrisvanbuskirk/appshot/actions/workflows/scheduled.yml/badge.svg)](https://github.com/chrisvanbuskirk/appshot/actions/workflows/scheduled.yml)
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)
- [Claude Code Action](https://github.com/anthropics/claude-code-action)