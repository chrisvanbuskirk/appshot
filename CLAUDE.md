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
npm run dev -- [cmd] # Run CLI in development mode (e.g., npm run dev -- init)
npm test            # Run all tests
npm run test -- devices.test.ts  # Run specific test file
npm link            # Link CLI globally for testing
npm run clean       # Remove final/ directory
npm run clean:all   # Remove final/, dist/, and .appshot/ directories

# CLI Commands (after build/link)
appshot init        # Scaffold new project
appshot caption --device iphone  # Interactive caption editor with autocomplete
appshot caption --device iphone --translate --langs es,fr  # Real-time AI translation
appshot style --device iphone    # Configure device positioning and styling
appshot style --device iphone --reset  # Reset device to default styling
appshot localize --langs es,fr,de  # Batch translate all captions
appshot localize --langs ja --model gpt-5  # Use specific AI model
appshot build       # Generate final screenshots
appshot build --preset iphone-6-9,ipad-13  # Build with specific App Store presets
appshot build --langs en,es,fr  # Build for multiple languages
appshot specs       # Show device specifications
appshot check       # Validate configuration
appshot presets     # List all App Store presets
appshot presets --required  # Show only required presets
appshot presets --generate iphone-6-9,ipad-13  # Generate config for specific presets
appshot validate    # Validate screenshots against App Store requirements
appshot validate --strict  # Check against required presets only
appshot clean       # Remove generated screenshots from final/
appshot clean --all # Remove all generated files including .appshot/
appshot clean --history  # Clear caption autocomplete history
appshot clean --all --keep-history  # Clean all but preserve caption history

# Custom Commands for Claude Code
/commit <branch> "<message>" "<title>" "<body>"  # Create PR with lint & test checks
/build                                           # Build and install appshot locally
```

## Architecture

### Core Pipeline
The rendering pipeline (`src/core/render.ts`) follows this flow:
1. **Gradient Background** - SVG-based gradient generation
2. **Frame Compositing** - Screenshot placed within device frame using screen coordinates
3. **Caption Overlay** - Text rendered as SVG and composited
4. **Sharp Processing** - All image operations use the sharp library

### Orientation Intelligence
The system (`src/core/devices.ts`) automatically:
- Detects screenshot orientation from dimensions
- Selects matching frame from registry (portrait/landscape variants)
- Calculates best aspect ratio match
- Falls back gracefully if no frame available

### Frame Registry
`frameRegistry` in `src/core/devices.ts` contains metadata for all device frames including:
- Frame dimensions
- Screen rectangle coordinates (where screenshot goes)
- Orientation (portrait/landscape)
- Device type (iphone/ipad/mac/watch)

### Command Structure
Each command in `src/commands/` returns a Commander command object. The build command is the most complex, handling:
- Multi-device processing
- Multi-language support
- Batch processing with configurable concurrency
- Auto frame selection based on screenshot dimensions

### Configuration Schema
`.appshot/config.json` controls rendering with nested configs:
- `gradient`: Colors and direction
- `caption`: Font settings, positioning, and box configuration
  - `box`: Caption box settings (autoSize, maxLines, lineHeight)
- `devices`: Per-device input/output paths and styling
  - `autoFrame`: Enable/disable automatic frame selection
  - `preferredFrame`: Override frame selection
  - `partialFrame`: Cut off bottom portion of device
  - `frameOffset`: Percentage to cut (10-50%)
  - `framePosition`: Vertical position (top/center/bottom/0-100)
  - `frameScale`: Size multiplier (0.5-2.0)
  - `captionSize`: Device-specific font size
  - `captionPosition`: Device-specific position
  - `captionBox`: Device-specific box configuration

### Testing Strategy
Tests use Vitest with temporary directories for file operations. Key test areas:
- `devices.test.ts`: Orientation detection and frame selection logic
- `render.test.ts`: Image processing and compositing
- `files.test.ts`: Configuration loading and validation
- `style.test.ts`: Device styling configuration and validation
- `caption-box.test.ts`: Text wrapping and caption height calculations
- `caption-history.test.ts`: Autocomplete and suggestion system
- `watch-compose.test.ts`: Watch-specific rendering optimizations
- `translation.test.ts`: AI translation service and API key detection
- `ai-types.test.ts`: OpenAI model configurations and parameter handling

## Important Implementation Details

### AI-Powered Translation System
The translation feature enables automatic localization of captions using OpenAI's models:

1. **Core Architecture** (`src/services/translation.ts`)
   - `TranslationService` class manages all translation operations
   - Handles API key detection from `OPENAI_API_KEY` environment variable
   - Implements caching to avoid duplicate API calls
   - Supports both single and batch translation operations
   - Automatically selects correct parameter (`max_tokens` vs `max_completion_tokens`)

2. **Model Configuration** (`src/types/ai.ts`)
   - Defines `OpenAIModel` type for all supported models
   - `MODEL_CONFIGS` contains configuration for each model:
     - GPT-4o series: Uses `max_tokens` parameter, temperature 0.3
     - GPT-5 series: Uses `max_completion_tokens`, temperature fixed at 1.0
     - o1/o3 reasoning models: Uses `max_completion_tokens`, temperature 1.0
   - Context windows range from 64K to 200K tokens

3. **Real-Time Translation** (`src/commands/caption.ts`)
   - Integrated into caption entry workflow
   - Triggered with `--translate` flag
   - Accepts `--langs` for target languages (comma-separated)
   - `--model` parameter to select specific OpenAI model
   - Translations displayed immediately after caption entry
   - Automatically stored in caption JSON with language keys

4. **Batch Translation** (`src/commands/localize.ts`)
   - Complete rewrite from placeholder to full implementation
   - Processes all existing captions across devices
   - Progress tracking with current/total counter
   - `--review` flag for translation approval before saving
   - `--overwrite` flag to replace existing translations
   - `--device` to limit to specific device
   - Efficient batch processing with shared cache

5. **Language Support**
   - 25+ built-in language mappings in `LANGUAGE_NAMES`
   - Supports standard ISO language codes (es, fr, de, ja, zh-CN, etc.)
   - Marketing-optimized translation prompts
   - Maintains tone and impact for app store descriptions

6. **Error Handling & Optimization**
   - Graceful fallback when API unavailable
   - Clear error messages for missing API key
   - Rate limit handling with automatic delays
   - Translation caching to reduce API costs
   - Continues batch operations even if individual translations fail

7. **OpenAI API Integration Details**
   - Uses official `openai` npm package (v5.13.1)
   - API client initialization on first use (lazy loading)
   - Dynamic parameter selection based on model type:
     ```typescript
     if (modelConfig.maxTokensParam === 'max_completion_tokens') {
       params.max_completion_tokens = Math.min(modelConfig.maxTokens, 2000);
     } else {
       params.max_tokens = Math.min(modelConfig.maxTokens, 2000);
     }
     ```
   - System prompt optimized for marketing copy translation
   - User prompt includes all target languages in single request for efficiency

8. **Cache Implementation**
   - In-memory cache using Map with composite keys
   - Cache key format: `${text}-${sortedLangs}-${model}`
   - Languages sorted alphabetically for consistent keys
   - Cache persists for entire CLI session
   - `clearCache()` method for manual cache clearing

9. **Translation Workflow**
   - **Single Translation**: `translate()` method
     - Checks cache first
     - Makes API call if not cached
     - Parses JSON response
     - Stores in cache
     - Returns language→translation map
   - **Batch Translation**: `translateBatch()` method
     - Deduplicates texts before processing
     - Shows progress callback
     - Handles errors per text without stopping batch
     - Returns map of text→translations

### Caption Autocomplete System
The caption command now includes intelligent autocomplete:
1. **History Storage** - Caption history stored in `.appshot/caption-history.json`
2. **Learning** - System learns from all existing captions in `.appshot/captions/*.json`
3. **Fuzzy Search** - Uses the `fuzzy` library for typo-tolerant matching
4. **Frequency Tracking** - Tracks usage count to prioritize common captions
5. **Device-Specific** - Maintains separate suggestions per device type
6. **Pattern Recognition** - Detects patterns like "Track your *", "Manage your *"

### Dynamic Caption Box System
Intelligent caption rendering that adapts to content and device positioning:

1. **Text Measurement** (`src/core/text-utils.ts`)
   - `estimateTextWidth()` - Calculates text width based on font size
   - `calculateCharsPerLine()` - Determines character limit per line
   - `wrapText()` - Smart word wrapping with ellipsis for overflow

2. **Adaptive Height Calculation**
   - `calculateCaptionHeight()` - Basic height based on lines and padding
   - `calculateAdaptiveCaptionHeight()` - Dynamic height based on device position
   - Respects min/max constraints and line limits

3. **Position-Based Scaling**
   - Device at top → 15% screen for captions
   - Device at center → 25-30% for captions
   - Device at bottom → Up to 50% for captions

4. **Multi-Line Rendering**
   - All devices support multiple caption lines (not just watch)
   - Centered text alignment with configurable line height
   - Automatic truncation with ellipsis when exceeding maxLines

### Watch Display Optimizations
Special handling for Apple Watch screenshots:
1. **Caption Positioning** - Uses top 1/3 of screen (vs normal padding)
2. **Text Wrapping** - Automatically wraps to 2 lines for watch
3. **Font Sizing** - Uses 36px font or smaller (vs configured size)
4. **Device Positioning** - Watch positioned with bottom cut off (configurable)
5. **Scaling** - 130% scale for better visibility

### Frame Selection Algorithm
When processing a screenshot, the system:
1. Reads image dimensions to determine orientation
2. Filters frames by device type + orientation
3. Calculates aspect ratio differences
4. Selects frame with closest match
5. Respects `preferredFrame` if it matches orientation

### Multi-Language Handling
Captions in `.appshot/captions/[device].json` can be:
- Simple strings (backwards compatible)
- Objects with language keys (`{ "en": "Hello", "fr": "Bonjour" }`)
- Build command creates language subdirectories when multiple langs specified

### TypeScript Configuration
- Uses ESM modules (`"type": "module"` in package.json)
- Compiles to `dist/` directory
- Entry point is `bin/appshot.js` → `dist/cli.js`

## App Store Specifications Support

### Official Presets
The system includes all official App Store screenshot specifications (`src/core/app-store-specs.ts`):
- **iPhone**: 13 display sizes from 3.5" to 6.9" with multiple resolution options
- **iPad**: 10 display sizes from 9.7" to 13" with various resolutions
- **Mac**: 4 resolutions with required 16:10 aspect ratio
- **Apple TV**: HD (1920x1080) and 4K (3840x2160)
- **Vision Pro**: 3840x2160
- **Apple Watch**: 5 sizes from Series 3 to Ultra

### Preset System
Each preset includes:
- Device models it applies to
- Portrait and/or landscape resolutions
- Required status for App Store submission
- Fallback chains (e.g., 6.5" falls back to 6.9" if not provided)
- Special notes (e.g., Watch must use same size across all localizations)

### Validation Features
The `validate` command checks:
- Resolution compliance with App Store specs
- Actual screenshot dimensions vs configuration
- Required presets coverage (with --strict flag)
- Suggests closest valid resolution for invalid configurations

### Usage Patterns
```bash
# Generate config for iPhone 6.9" and iPad 13" presets
appshot presets --generate iphone-6-9,ipad-13

# Build using specific presets directly
appshot build --preset iphone-6-9-portrait,ipad-13-landscape

# Validate existing screenshots
appshot validate --fix  # Shows suggestions for invalid resolutions
```

## Implementation Notes for LLMs

### Style Command (`src/commands/style.ts`)
The style command provides interactive configuration for device positioning and caption styling:

1. **Partial Frame Control**
   - Prompts for `partialFrame` (boolean) first
   - If enabled, prompts for `frameOffset` percentage (15%, 25%, 35%, 50%, or custom)
   - Cuts off bottom portion of device frame for modern App Store look

2. **Frame Positioning**
   - Independent of partial frame setting
   - Options: top, center, bottom, or custom percentage (0-100)
   - Affects vertical placement of device on canvas

3. **Caption Box Configuration**
   - `autoSize`: Dynamically adjusts height based on content
   - `maxLines`: Limits text lines (1-10)
   - `lineHeight`: Controls line spacing (1.2-1.8)
   - Stored in `deviceConfig.captionBox`

4. **Reset Functionality**
   - `--reset` flag removes ALL custom styling for a device
   - Returns device to global defaults

### Compose Pipeline (`src/core/compose.ts`)
Key changes for dynamic caption system:

1. **Pre-calculation Phase** (lines 59-98)
   - Calculate device dimensions before caption height
   - Determine preliminary device position
   - Use this for adaptive caption sizing

2. **Caption Height Calculation** (lines 99-127)
   - Check for `captionBox.autoSize` setting
   - Use `calculateAdaptiveCaptionHeight()` for dynamic sizing
   - Fall back to `wrapText()` for fixed height with wrapping

3. **Multi-line SVG Rendering** (lines 144-174)
   - Create text elements for each line
   - Center text block vertically in caption area
   - Apply line height multiplier for spacing

4. **Device Positioning** (lines 408-433)
   - Recalculate position after caption height is known
   - Ensure device doesn't go off canvas
   - Special handling for watch positioning

### Text Utilities (`src/core/text-utils.ts`)
Essential functions for caption rendering:

1. **`wrapText(text, maxWidth, fontSize, maxLines?)`**
   - Returns array of wrapped lines
   - Adds ellipsis when truncating
   - Handles empty text (returns empty array)

2. **`calculateAdaptiveCaptionHeight()`**
   - Considers device position for available space
   - Returns both height and wrapped lines
   - Adapts to framePosition setting

3. **Character Width Estimation**
   - Uses factor of 0.65 * fontSize for average character width
   - Works well for most fonts at various sizes

### Configuration Hierarchy
When processing captions, settings are merged in this order:
1. Global `caption` config (base)
2. Global `caption.box` config
3. Device-specific `captionSize`, `captionPosition`
4. Device-specific `captionBox` (highest priority)

### Common Pitfalls to Avoid
1. Don't modify `partialFrame` without updating `frameOffset`
2. Always check if text is empty before wrapping
3. Caption height affects device position - calculate in correct order
4. Watch devices have special 2-line wrapping (preserve this)
5. Reset should remove ALL device-specific settings

## Integration with AI Agents & MCP

### MCP (Model Context Protocol) Workflow
Appshot is designed to work with MCP screenshot tools:

```bash
# Agent captures screenshot via MCP
mcp-tool screenshot --device iphone --output ./screenshots/iphone/screen.png

# Agent processes with appshot
appshot build --devices iphone --no-interactive
```

### Agent Automation Examples

```javascript
// Example: Node.js agent script
import { exec } from 'child_process';
import { writeFileSync } from 'fs';

// 1. Initialize project
exec('appshot init --force');

// 2. Configure via JSON (no CLI interaction needed)
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

// 3. Add captions programmatically
const captions = {
  'home.png': 'Welcome to the future',
  'dashboard.png': 'Your control center'
};
writeFileSync('.appshot/captions/iphone.json', JSON.stringify(captions));

// 4. Build
exec('appshot build --devices iphone');
```

### Key Agent-Friendly Commands

```bash
# Non-interactive initialization
appshot init --force

# JSON output for parsing
appshot specs --json
appshot presets --json
appshot validate --json

# Batch operations
appshot build --devices iphone,ipad --langs en,fr,es

# Direct config application
appshot gradients --apply ocean  # No prompts
appshot style --device iphone --reset  # Predictable reset
```

### Future Agent Features (Roadmap)

1. **Structured Input Mode**: Accept full config via stdin
2. **Stream Processing**: Handle screenshots as they're generated
3. **Validation API**: Return structured validation results
4. **Auto-Caption**: Use local LLMs to generate captions
5. **Batch Config**: Process multiple configurations in one run

## Important Guidelines

- Don't create PR's without my direction.
- Never install libraries without asking.
- NEVER INSTALL librsvg. It's not necessary.
- Keep the tool CLI-only - no web dashboards or GUIs.
- Optimize for agent/automation use cases.