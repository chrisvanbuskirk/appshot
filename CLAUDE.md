# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Appshot is a CLI tool for generating App Store-ready screenshots with device frames, gradients, and captions. It automatically detects screenshot orientation (portrait/landscape) and selects appropriate device frames.

## Key Commands

```bash
# Development
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev -- [cmd] # Run CLI in development mode (e.g., npm run dev -- init)
npm test            # Run all tests
npm run test -- devices.test.ts  # Run specific test file
npm link            # Link CLI globally for testing

# CLI Commands (after build/link)
appshot init        # Scaffold new project
appshot caption --device iphone  # Interactive caption editor
appshot build       # Generate final screenshots
appshot build --preset iphone-6-9,ipad-13  # Build with specific App Store presets
appshot specs       # Show device specifications
appshot check       # Validate configuration
appshot presets     # List all App Store presets
appshot presets --required  # Show only required presets
appshot presets --generate iphone-6-9,ipad-13  # Generate config for specific presets
appshot validate    # Validate screenshots against App Store requirements
appshot validate --strict  # Check against required presets only
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
`appshot.json` controls rendering with nested configs:
- `gradient`: Colors and direction
- `caption`: Font settings and positioning
- `devices`: Per-device input/output paths and frame preferences
  - `autoFrame`: Enable/disable automatic frame selection
  - `preferredFrame`: Override frame selection

### Testing Strategy
Tests use Vitest with temporary directories for file operations. Key test areas:
- `devices.test.ts`: Orientation detection and frame selection logic
- `render.test.ts`: Image processing and compositing
- `files.test.ts`: Configuration loading and validation

## Important Implementation Details

### Frame Selection Algorithm
When processing a screenshot, the system:
1. Reads image dimensions to determine orientation
2. Filters frames by device type + orientation
3. Calculates aspect ratio differences
4. Selects frame with closest match
5. Respects `preferredFrame` if it matches orientation

### Multi-Language Handling
Captions in `captions.json` can be:
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