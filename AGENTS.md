# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and other LLM agents when working with code in this repository.

## Project Overview

Appshot is an **agent-first CLI tool** for generating App Store-ready screenshots with device frames, gradients, and captions. It's designed to be controlled by LLM agents and automation tools, providing predictable, scriptable operations. The tool automatically detects screenshot orientation (portrait/landscape) and selects appropriate device frames.

## Agent-Friendly Design Principles

1. **No GUI/Web Interface** - Pure CLI for maximum agent compatibility
2. **Structured Output** - Consistent, parseable responses
3. **File-Based Config** - Agents can directly modify JSON configs
4. **Predictable Commands** - No interactive prompts in automation mode
5. **Exit Codes** - Clear success/failure signals for scripts

## Key Commands

```bash
# Development
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev -- [cmd] # Run CLI in development mode
npm test            # Run all tests
npm link            # Link CLI globally for testing

# Core CLI Commands
appshot init        # Scaffold new project
appshot build       # Generate final screenshots
appshot build --preset iphone-6-9,ipad-13  # Build with App Store presets
appshot build --langs en,es,fr  # Build for multiple languages

# Configuration & Styling
appshot caption --device iphone  # Interactive caption editor with autocomplete
appshot caption --device iphone --translate --langs es,fr  # Real-time AI translation
appshot style --device iphone    # Configure positioning, styling, fonts
appshot style --device iphone --reset  # Reset to defaults
appshot gradients --apply ocean  # Apply gradient preset

# Fonts & Localization
appshot fonts       # Browse recommended fonts
appshot fonts --embedded  # Show bundled fonts
appshot fonts --validate "SF Pro"  # Check availability
appshot localize --langs es,fr,de  # Batch translate captions

# Validation & Diagnostics
appshot doctor      # System diagnostics
appshot specs       # Apple App Store specifications
appshot validate    # Validate screenshots against requirements
appshot presets --generate iphone-6-9,ipad-13  # Generate preset config

# Cleanup
appshot clean       # Remove final/ directory
appshot clean --all # Remove all generated files
```

## Architecture

### Core Pipeline (`src/core/render.ts`)
1. **Gradient Background** - SVG-based gradient generation
2. **Frame Compositing** - Screenshot placed within device frame using screen coordinates
3. **Caption Overlay** - Text rendered as SVG and composited
4. **Sharp Processing** - All image operations use the sharp library

### Key Systems

**Orientation Intelligence** (`src/core/devices.ts`)
- Auto-detects portrait/landscape from dimensions
- Selects matching frame from registry
- Calculates best aspect ratio match
- Falls back gracefully if no frame available

**Frame Registry** (`src/core/devices.ts`)
- Frame dimensions and screen rectangle coordinates
- Orientation (portrait/landscape) metadata
- Device type classification (iphone/ipad/mac/watch)

**Configuration Schema** (`.appshot/config.json`)
```json
{
  "gradient": { "colors": ["#hex1", "#hex2"], "direction": "top-bottom" },
  "caption": {
    "font": "Font Name",
    "fontsize": 64,
    "color": "#FFFFFF",
    "position": "above|below|overlay",
    "background": {
      "color": "#000000",
      "opacity": 0.8,
      "padding": 20
    },
    "border": {
      "color": "#FFFFFF", 
      "width": 2,
      "radius": 12
    }
  },
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1284x2778",
      "autoFrame": true,
      "partialFrame": false,
      "frameOffset": 25,
      "framePosition": "center",
      "frameScale": 0.9,
      "captionPosition": "above",
      "captionBackground": {},
      "captionBorder": {}
    }
  }
}
```

### Testing Strategy

**Test Coverage**: 400+ tests across 50+ test files using Vitest

**Key Test Categories**:
- Device orientation and frame selection
- Image processing and compositing
- Caption styling, positioning, and text wrapping
- Translation and AI model integration
- Font detection and embedded font handling
- App Store specifications validation
- System diagnostics and doctor checks

**CI/CD Workflows** (GitHub Actions):
- Main pipeline with lint, type-check, and test matrix
- Unit tests across 3 OS × 3 Node versions
- Visual regression testing with ImageMagick
- Automated PR reviews by Claude
- Weekly health checks (Mondays 2 AM UTC)

## Feature Implementation Details

### Caption System (v0.7.0)

**Positioning Options**:
- `above` - Caption above device (default)
- `below` - Caption below device
- `overlay` - Caption overlays gradient

**Styling Properties**:
- **Background**: color (hex), opacity (0-1), padding (px)
- **Border**: color (hex), width (1-10px), radius (0-30px)
- **Text**: color (hex), font family, size
- **Full-width**: Spans device width minus 30px margins

**SVG Rendering** (`src/core/compose.ts:generateCaptionSVG`):
- Layered rendering: background → border → text
- XML-safe escaping for all text content
- Dynamic height calculation based on content
- Multi-line support with configurable line height

**Configuration Hierarchy**:
1. Global `caption` config (base)
2. Device-specific overrides (highest priority)
3. Merged at render time

### Font System (v0.6.0-v0.7.0)

**Embedded Fonts** (10 families with variants):
- Modern UI: Inter, Poppins, Montserrat, DM Sans
- Web fonts: Roboto, Open Sans, Lato, Work Sans  
- Code fonts: JetBrains Mono, Fira Code

**Font Detection Priority**: Embedded → System → Fallback

**System Detection**:
- macOS: `system_profiler SPFontsDataType`
- Linux: `fc-list : family`
- Windows: PowerShell with InstalledFontCollection

**Font Stack Mapping**: 50+ pre-configured mappings with intelligent fallback chains based on font name patterns (serif, mono, display).

### Translation System

**OpenAI Integration** (`src/services/translation.ts`):
- Supports GPT-4o, GPT-5, o1/o3 models
- Dynamic parameter selection (`max_tokens` vs `max_completion_tokens`)
- In-memory caching to reduce API costs
- Marketing-optimized translation prompts

**Translation Modes**:
- Real-time: During caption entry with `--translate`
- Batch: Process all captions with `localize` command
- 25+ language support with ISO codes

### App Store Specifications

**Official Presets** (`src/core/app-store-specs.ts`):
- iPhone: 13 display sizes (3.5" to 6.9")
- iPad: 10 display sizes (9.7" to 13")
- Mac: 4 resolutions (16:10 aspect ratio)
- Apple TV: HD and 4K
- Vision Pro: 3840x2160
- Apple Watch: 5 sizes (Series 3 to Ultra)

**Validation** (`validate` command):
- Resolution compliance checking
- Required preset coverage
- Suggestions for invalid configurations

### Special Device Handling

**Apple Watch**:
- Caption positioning: Top 1/3 of screen
- Auto-wrap to 2 lines
- Font size: 36px max
- Device scale: 130% for visibility

**Dynamic Caption Box**:
- Auto-sizing based on content
- Position-based scaling (15-50% of screen)
- Multi-line support with ellipsis truncation
- Configurable min/max constraints

### Doctor Command (v0.5.0)

**System Checks**:
- Node.js version (≥18.0.0)
- Sharp module and native bindings
- Font detection capability
- Filesystem permissions
- Frame asset availability

**Output Modes**:
- Interactive with color coding
- JSON for CI/CD integration
- Verbose for troubleshooting
- Category-specific checks

## Implementation Guidelines

### Style Command (`src/commands/style.ts`)

**Interactive Configuration**:
1. Partial frame control (cut bottom portion)
2. Frame positioning (top/center/bottom/0-100)
3. Caption position (above/below/overlay)
4. Background and border styling
5. Font selection from embedded/system fonts

**Reset Functionality**: `--reset` removes ALL device-specific settings

### Compose Pipeline (`src/core/compose.ts`)

**Key Phases**:
1. Pre-calculation: Device dimensions before caption height
2. Caption height: Dynamic or fixed based on settings
3. SVG rendering: Multi-line text with proper spacing
4. Device positioning: After caption height is known

### Text Utilities (`src/core/text-utils.ts`)

**Core Functions**:
- `wrapText()` - Smart word wrapping with ellipsis
- `calculateAdaptiveCaptionHeight()` - Dynamic height based on position
- `estimateTextWidth()` - Character width estimation (0.65 × fontSize)

### Common Pitfalls

1. Don't modify `partialFrame` without `frameOffset`
2. Check for empty text before wrapping
3. Caption height affects device position - order matters
4. Watch devices have special 2-line wrapping
5. Reset must remove ALL device-specific settings

## Agent Integration

### MCP Workflow
```bash
# Agent captures screenshot via MCP
mcp-tool screenshot --device iphone --output ./screenshots/iphone/screen.png

# Process with appshot
appshot build --devices iphone --no-interactive
```

### Automation Examples
```javascript
// Initialize and configure programmatically
exec('appshot init --force');

const config = {
  gradient: { colors: ['#FF5733', '#FFC300'] },
  devices: {
    iphone: {
      frameScale: 0.85,
      captionBox: { autoSize: false, minHeight: 320 }
    }
  }
};
writeFileSync('.appshot/config.json', JSON.stringify(config));

// Add captions
const captions = { 'home.png': 'Welcome' };
writeFileSync('.appshot/captions/iphone.json', JSON.stringify(captions));

// Build
exec('appshot build --devices iphone');
```

### Agent-Friendly Features

**Non-Interactive Commands**:
- `appshot init --force` - No prompts
- `appshot gradients --apply ocean` - Direct application
- `appshot style --device iphone --reset` - Predictable reset

**JSON Output**:
- `appshot specs --json` - App Store specs
- `appshot doctor --json` - System diagnostics
- `appshot validate --json` - Validation results

**Batch Operations**:
- `appshot build --devices iphone,ipad --langs en,fr,es`
- `appshot localize --langs es,fr,de --model gpt-4o`

## Important Guidelines

- Don't create PRs without explicit direction
- Never install libraries without asking
- NEVER INSTALL librsvg (not necessary)
- Keep the tool CLI-only - no web dashboards or GUIs
- Optimize for agent/automation use cases

**Version Updates** - Update in 3 places:
1. `package.json` - version field
2. `src/cli.ts` - .version() call (line ~45)
3. `src/services/doctor.ts` - version in JSON output (line ~480)

**Code Style**:
- No comments unless asked
- Follow existing patterns and conventions
- Use existing libraries and utilities
- Maintain security best practices

**Testing**:
- Run `npm test` before commits
- Add tests for new features
- Maintain backwards compatibility

## Update: Frame-Only Command

- New `appshot frame <input>`: Applies device frames with a fully transparent background (no gradient/caption).
- Supports files and directories (`--recursive`), auto device detection, and PNG/JPEG output (`--format`).
- Options: `--output`, `--device`, `--suffix`, `--overwrite`, `--dry-run`, `--verbose`.
- Core additions: `composeFrameOnly()` and `detectDeviceTypeFromDimensions()`.
