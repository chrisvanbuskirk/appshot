# Appshot 📸

> **AI-First CLI for App Store Screenshots** - Generate beautiful, localized screenshots with device frames, gradients, and captions.

[![CI](https://github.com/chrisvanbuskirk/appshot/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisvanbuskirk/appshot/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/appshot-cli.svg)](https://www.npmjs.com/package/appshot-cli)
[![npm downloads](https://img.shields.io/npm/dm/appshot-cli.svg)](https://www.npmjs.com/package/appshot-cli)
[![Node.js Version](https://img.shields.io/node/v/appshot-cli.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🆕 **Version 0.8.6** - **Background Images** - Replace gradients with custom static images, auto-detection, and dimension validation!

> ⚠️ **NEW in v0.8.6**: Use custom background images instead of gradients! Auto-detects `background.png` in device folders, supports multiple fit modes, and validates dimensions against App Store specs.

> ⚠️ **BREAKING CHANGE in v0.4.0**: Output structure now always uses language subdirectories.
> Single language builds now output to `final/device/lang/` instead of `final/device/`.
> Run `appshot migrate --output-structure` to update existing projects.

## 📖 Table of Contents

- [Why Appshot?](#-why-appshot)
- [Features](#-features)
- [Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Your First Screenshot](#your-first-screenshot)
- [Core Concepts](#-core-concepts)
- [Visual Customization](#-visual-customization)
  - [Gradient System](#gradient-system)
  - [Font System](#font-system)
  - [Device Frames](#device-frames)
  - [Caption System](#caption-system)
- [Localization & Translation](#-localization--translation)
- [Device Support](#-device-support)
- [Command Reference](#-command-reference)
- [Configuration Reference](#️-configuration-reference)
- [Agent & Automation Guide](#-agent--automation-guide)
- [Recipes & Examples](#-recipes--examples)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)
- [Roadmap](#-roadmap)
- [License & Support](#-license--support)

## 🌟 Why Appshot?

Appshot is the only **agent-first CLI tool** designed for automated App Store screenshot generation. Built for LLM agents, CI/CD pipelines, and developers who value automation over GUIs.

### Key Differentiators

- 🤖 **Agent-First Design** - JSON outputs, predictable commands, no interactive prompts in automation mode
- 🎯 **Smart Automation** - Auto-detects orientation, selects appropriate frames, handles batch operations
- 🌍 **AI-Powered Localization** - Translate captions in real-time using GPT-4o, GPT-5, o1, and o3 models
- 📏 **App Store Compliant** - Built-in validation for all official Apple App Store specifications
- ⚡ **Fast & Parallel** - Process hundreds of screenshots with configurable concurrency
- 🛠️ **Pure CLI** - No web UI, no GUI, just predictable commands perfect for automation

## ✨ Features

- 🖼️ **Smart Frames** - Automatically detects portrait/landscape and selects appropriate device frame
- 🎨 **Gradient Presets** - 24+ beautiful gradients with visual preview and easy application
- 🔤 **Font System** - 50+ font mappings, direct font setting, interactive selection, and system detection
- 📦 **Embedded Fonts** - 10 high-quality open source fonts bundled for consistent rendering everywhere
- ✏️ **Dynamic Captions** - Smart text wrapping, auto-sizing, and multi-line support
- 🌍 **AI Translation** - Real-time and batch translation using OpenAI's latest models
- 📱 **Multi-Device** - iPhone, iPad, Mac, Apple TV, Vision Pro, and Apple Watch support
- 🎭 **Frame-Only Mode** - Quick device framing with transparent backgrounds (no gradients/captions)
- 📏 **App Store Specs** - All official resolutions with validation and presets
- 🔄 **Orientation Detection** - Intelligently handles both portrait and landscape
- 👁️ **Watch Mode** - File system monitoring with auto-processing (macOS)
- 📱 **Device Capture** - Direct capture from iOS simulators (macOS)
- ⚡ **Parallel Processing** - Configurable concurrency for large batches
- 🔍 **Caption Autocomplete** - Intelligent suggestions with fuzzy search and learning
- 🔬 **Dry-Run Mode** - Preview what would be built without generating images
- 🐛 **Verbose Debugging** - Detailed rendering metrics for troubleshooting

## 🚀 Quick Start

### Prerequisites

- **Node.js 16+** - Required for ESM modules
- **npm** or **yarn** - Package manager
- **Operating System** - macOS, Linux, or Windows
- **Optional**: OpenAI API key for translation features

### Installation

```bash
# Install globally via npm
npm install -g appshot-cli

# Or with yarn
yarn global add appshot-cli

# Verify installation
appshot --version
```

> **Note**: The package is called `appshot-cli` on NPM, but the command is `appshot`

### Your First Screenshot

Create App Store-ready screenshots in 5 simple steps:

```bash
# 1. Initialize your project
appshot init

# 2. Add your screenshots
cp ~/Desktop/screenshots/*.png screenshots/iphone/

# 3. Add captions interactively
appshot caption --device iphone

# 4. Apply a gradient preset
appshot gradients --apply ocean

# 5. Build final screenshots
appshot build

# ✨ Output ready in final/ directory!
```

### Quick Frame-Only Mode

Need just device frames without the full treatment? Use the new frame command:

```bash
# Frame a single screenshot
appshot frame screenshot.png

# Batch frame a directory
appshot frame ./screenshots --recursive

# ✨ Framed PNGs with transparent backgrounds ready!
```

### Watch Mode (macOS)

Automatically process screenshots as they're added:

```bash
# Start watching for new screenshots
appshot watch start --process --background

# Capture from simulator (auto-processes via watch)
appshot device capture

# Check status
appshot watch status

# Stop watching
appshot watch stop
```

### Example Output Structure

```
final/
├── iphone/
│   └── en/           # Language subdirectory (always created)
│       ├── home.png       # 1284×2778 with frame, gradient, and caption
│       ├── features.png   
│       └── settings.png
└── ipad/
    └── en/           # Language subdirectory
        └── dashboard.png  # 2048×2732 iPad Pro screenshot
```

## 📘 Core Concepts

### Project Structure

Appshot uses a simple, predictable directory structure:

```
your-project/
├── .appshot/
│   ├── config.json          # Main configuration
│   ├── captions/            # Device-specific captions
│   │   ├── iphone.json
│   │   └── ipad.json
│   └── caption-history.json # Autocomplete history
├── screenshots/             # Original screenshots
│   ├── iphone/
│   ├── ipad/
│   └── mac/
├── frames/                  # Device frames (auto-downloaded)
└── final/                   # Generated output
```

### Configuration Overview

All settings are stored in `.appshot/config.json`:

```json
{
  "output": "./final",
  "gradient": {
    "colors": ["#0077BE", "#33CCCC"],
    "direction": "diagonal"
  },
  "caption": {
    "font": "SF Pro",
    "fontsize": 64,
    "color": "#FFFFFF",
    "position": "above"
  },
  "devices": {
    "iphone": {
      "resolution": "1284x2778",
      "autoFrame": true
    }
  }
}
```

### Workflow

1. **Capture** - Take screenshots from simulator/device or design tool
2. **Configure** - Set up gradients, fonts, and device settings
3. **Caption** - Add marketing text with optional AI translation
4. **Build** - Generate final App Store-ready screenshots
5. **Validate** - Ensure compliance with App Store requirements

## 🎨 Visual Customization

### Gradient System

Appshot includes 24+ professional gradient presets organized by category:

#### Browse & Apply Gradients

```bash
# View all gradients with color preview
appshot gradients

# Apply a gradient to your project
appshot gradients --apply sunset

# Interactive selection
appshot gradients select

# Generate preview image
appshot gradients --preview ocean

# Create sample gallery
appshot gradients --sample
```

#### Gradient Categories

- **🔥 Warm**: sunset, autumn, golden, coral
- **❄️ Cool**: ocean, arctic, mint, twilight  
- **🎨 Vibrant**: neon, tropical, rainbow, vivid
- **🕊️ Subtle**: pastel, lavender, peach, sky
- **⚫⚪ Monochrome**: noir, silver, charcoal, pearl
- **🏢 Brand**: instagram, spotify, twitter, slack

#### Custom Gradients

```json
{
  "gradient": {
    "colors": ["#FF5733", "#FFC300", "#FF1493"],
    "direction": "diagonal"  // top-bottom, left-right, diagonal
  }
}
```

### Background System (NEW in v0.8.6)

Replace gradients with custom static background images for a unique, branded look. Appshot supports automatic detection, multiple formats, and intelligent scaling.

#### Background Locations

Backgrounds are searched in priority order:

1. **Device-specific**: `screenshots/<device>/background.png`
2. **Global**: `screenshots/background.png`  
3. **Custom**: Path specified via config or CLI

#### Background Commands

```bash
# Set background for a device
appshot backgrounds set iphone ./backgrounds/sunset.jpg

# Set global background for all devices
appshot backgrounds set --global ./backgrounds/brand-bg.png

# Validate dimensions against App Store specs
appshot backgrounds validate

# List all configured backgrounds
appshot backgrounds list

# Clear background configuration
appshot backgrounds clear iphone
```

#### Build Options

```bash
# Auto-detect background.png in device folders
appshot build --auto-background

# Use specific background image
appshot build --background ./assets/custom-bg.png

# Set background fit mode
appshot build --background-fit cover

# Disable backgrounds (transparent)
appshot build --no-background
```

#### Fit Modes

- **`cover`** - Scale to cover entire area (may crop)
- **`contain`** - Scale to fit within area (may add letterbox bars)
- **`fill`** - Stretch to exact dimensions (may distort)
- **`scale-down`** - Only scale down if larger, never scale up

#### Creating Backgrounds with ImageMagick

ImageMagick is a powerful CLI tool for creating custom backgrounds:

```bash
# Solid color background
magick -size 1290x2796 canvas:navy background.png

# Gradient background
magick -size 1290x2796 gradient:blue-purple background.png

# Radial gradient
magick -size 1290x2796 radial-gradient:white-darkblue background.png

# Plasma fractal pattern
magick -size 1290x2796 plasma:fractal background.png

# Blurred noise texture
magick -size 1290x2796 xc: +noise Random -blur 0x10 background.png

# Tiled pattern
magick -size 100x100 pattern:checkerboard -scale 1290x2796 background.png

# Multi-point color interpolation
magick -size 1290x2796 xc: -sparse-color barycentric \
  '0,0 skyblue 1290,0 white 645,2796 lightblue' background.png
```

#### Configuration

```json
{
  "background": {
    "mode": "image",
    "image": "./backgrounds/global.png",
    "fit": "cover"
  },
  "devices": {
    "iphone": {
      "background": {
        "image": "./backgrounds/iphone.png",
        "fit": "contain"
      }
    }
  }
}
```

#### Mixed Configurations

You can mix backgrounds and gradients across devices:

- iPhone uses a custom background image
- iPad falls back to gradient
- Mac uses a different background
- Watch uses the global background

This flexibility allows you to optimize each device's appearance independently.

#### Dimension Validation

Appshot validates background dimensions and warns about:

- Images smaller than target resolution (will be upscaled)
- Aspect ratio mismatches (may cause cropping/distortion)
- Large file sizes (>10MB triggers optimization suggestion)

Use `appshot backgrounds validate` to check all backgrounds before building.

### Font System

Version 0.4.0 introduces comprehensive font management with intelligent fallbacks.

#### Font Commands

```bash
# Browse recommended fonts
appshot fonts

# Set font directly (NEW in v0.4.0)
appshot fonts --set "Montserrat"

# Interactive font selection (NEW in v0.4.0)
appshot fonts --select

# Set device-specific font (NEW in v0.4.0)
appshot fonts --set "SF Pro" --device iphone

# List ALL system fonts
appshot fonts --all

# Validate a font
appshot fonts --validate "SF Pro"

# Get JSON output for automation
appshot fonts --json
```

#### Font Setting Methods

You have three ways to set fonts:

1. **Direct Command** (Fastest):
   ```bash
   appshot fonts --set "Helvetica"
   appshot fonts --set "SF Pro" --device iphone
   ```

2. **Interactive Selection**:
   ```bash
   appshot fonts --select
   appshot style --device iphone  # Also includes font selection
   ```

3. **Manual Configuration**:
   ```json
   {
     "caption": {
       "font": "Montserrat",     // Global default
       "fontsize": 64
     },
     "devices": {
       "iphone": {
         "captionFont": "SF Pro"  // Device override
       }
     }
   }
   ```

#### Intelligent Fallbacks

Every font automatically includes appropriate fallback chains:

- **SF Pro** → `system-ui, -apple-system, Helvetica, Arial, sans-serif`
- **Custom Serif** → `'Custom Serif', Georgia, Times New Roman, serif`
- **Code Font** → `'Code Font', Monaco, Consolas, monospace`

#### System Font Detection

- **macOS**: Uses `system_profiler` for complete font list
- **Linux**: Uses `fc-list` for fontconfig fonts
- **Windows**: PowerShell queries font registry

### Frame-Only Mode

New in v0.8.0, the `appshot frame` command provides a quick way to apply device frames to screenshots without adding gradients or captions. Perfect for design workflows, quick exports, and when you just need a framed device mockup.

#### Features

- **Auto Device Detection** - Intelligently detects iPhone, iPad, Mac, or Apple Watch from image dimensions
- **Transparent Backgrounds** - Outputs PNG with alpha channel preserved
- **Batch Processing** - Frame entire directories with recursive support
- **Smart Frame Selection** - Automatically chooses portrait/landscape frames
- **No Configuration Required** - Works instantly without setup

#### Basic Usage

```bash
# Frame a single screenshot
appshot frame screenshot.png

# Frame all images in a directory
appshot frame ./screenshots

# Recursive directory processing
appshot frame ./screenshots --recursive

# Output to specific directory
appshot frame screenshot.png -o ./framed

# Force device type
appshot frame screenshot.png --device iphone
```

#### Options

- `-o, --output <dir>` - Output directory (default: same as input)
- `-d, --device <type>` - Force device type (iphone|ipad|mac|watch)
- `-r, --recursive` - Process directories recursively
- `-f, --format <type>` - Output format: png (default) or jpeg
- `--suffix <text>` - Filename suffix (default: "-framed")
- `--overwrite` - Overwrite original file name
- `--dry-run` - Preview without processing
- `--verbose` - Show detailed information

#### Examples

```bash
# Batch frame iPhone screenshots
appshot frame ./iphone-screenshots

# Frame with custom output directory
appshot frame ./screenshots -o ./mockups --recursive

# Preview what would be framed
appshot frame ./screenshots --dry-run

# Force iPad frame for ambiguous dimensions
appshot frame screenshot.png --device ipad

# JPEG output with white background
appshot frame screenshot.png --format jpeg
```

#### Device Detection Logic

The frame command uses intelligent heuristics to detect device type:

1. **Apple Watch** - Small, square-ish images (< 600k pixels, aspect ratio 0.75-1.3)
2. **iPad** - 4:3 aspect ratio (1.20-1.40) with 1.5M-8M pixels
3. **Mac** - 16:10 or 16:9 aspect ratio (1.50-1.85) with 2M+ pixels
4. **iPhone** - Tall aspect ratios (1.60-2.40) with < 5M pixels

When dimensions are ambiguous, use `--device` to specify the target device.

### Device Frames

#### Smart Frame Selection

Appshot automatically detects screenshot orientation and selects the appropriate frame:

```json
{
  "devices": {
    "iphone": {
      "autoFrame": true,  // Auto-detect orientation
      "preferredFrame": "iphone-16-pro-max-portrait"  // Override
    }
  }
}
```

#### Partial Frames

Create modern App Store screenshots with cut-off device frames:

```json
{
  "devices": {
    "iphone": {
      "partialFrame": true,
      "frameOffset": 25,      // Cut 25% from bottom
      "framePosition": 40,    // Position at 40% from top
      "frameScale": 0.85      // Scale to 85%
    }
  }
}
```

### Caption System

#### Dynamic Caption Box

Intelligent caption rendering that adapts to content:

```json
{
  "caption": {
    "position": "above",      // above, below, or overlay
    "box": {
      "autoSize": true,       // Dynamic height
      "maxLines": 3,          // Line limit
      "lineHeight": 1.4,      // Line spacing
      "minHeight": 100,
      "maxHeight": 500
    }
  }
}
```

#### Caption Positioning Options

- **`above`** (default): Caption appears above the device frame
- **`below`** (new in v0.7.0): Caption appears below the device frame  
- **`overlay`**: Caption overlays on the gradient background

```bash
# Configure caption below device
appshot style --device iphone
# → Select "Below device frame" option

# Or set directly in config
{
  "devices": {
    "iphone": {
      "captionPosition": "below"
    }
  }
}
```

#### Caption Styling (New in v0.7.0)

Create professional captions with customizable backgrounds and borders:

```json
{
  "caption": {
    "color": "#FFFFFF",           // Text color (hex)
    "background": {
      "color": "#000000",         // Background color (hex)
      "opacity": 0.8,             // Transparency (0-1)
      "padding": 20               // Padding around text
    },
    "border": {
      "color": "#FFFFFF",         // Border color (hex)
      "width": 2,                 // Border thickness (1-10)
      "radius": 12                // Rounded corners (0-30)
    }
  }
}
```

**Key Features:**
- **Full-width styling** - Backgrounds and borders span device width for uniformity
- **Flexible positioning** - Works with above, below, and overlay positions
- **Device-specific overrides** - Customize styling per device type
- **Professional appearance** - Rounded corners and padding for polished look

**Interactive Configuration:**
```bash
# Configure caption styling interactively
appshot style --device iphone
# → Choose caption position (above/below/overlay)
# → Configure background color and opacity
# → Set border color, width, and radius
```

**Examples:**

```json
// Dark background with white border
{
  "caption": {
    "color": "#FFFFFF",
    "background": {
      "color": "#000000",
      "opacity": 0.9,
      "padding": 30
    },
    "border": {
      "color": "#FFFFFF",
      "width": 3,
      "radius": 16
    }
  }
}

// Subtle gradient-matched styling
{
  "caption": {
    "color": "#FFFFFF",
    "background": {
      "color": "#FF5733",
      "opacity": 0.6,
      "padding": 25
    }
  }
}
```

#### Caption Autocomplete

The caption command includes intelligent autocomplete:

```bash
appshot caption --device iphone
# Features:
# - Fuzzy search
# - Frequency tracking
# - Device-specific suggestions
# - Pattern detection
```

Keyboard shortcuts:
- **Tab** - Complete suggestion
- **↑↓** - Navigate suggestions
- **Enter** - Select
- **Esc** - Dismiss

## 🌍 Localization & Translation

### AI-Powered Translation

Appshot integrates with OpenAI for instant caption translation.

#### Setup

```bash
export OPENAI_API_KEY="your-api-key-here"
```

#### Real-Time Translation

```bash
# Translate as you type
appshot caption --device iphone --translate --langs es,fr,de

# Output:
# ? home.png: Welcome to the future
#   es: Bienvenido al futuro
#   fr: Bienvenue dans le futur
#   de: Willkommen in der Zukunft
```

#### Batch Translation

```bash
# Translate all existing captions
appshot localize --langs es,fr,de,ja,zh-CN

# Device-specific translation
appshot localize --device iphone --langs es,fr

# Use premium model
appshot localize --langs ja,ko --model gpt-5

# Review before saving
appshot localize --langs es --review
```

### Supported Models

| Model Series | Best For | Parameter | Temperature |
|-------------|----------|-----------|-------------|
| **GPT-4o** | Fast, cost-effective | `max_tokens` | 0.3 |
| **GPT-5** | High-quality, nuanced | `max_completion_tokens` | 1.0 |
| **o1** | Deep reasoning | `max_completion_tokens` | 1.0 |
| **o3** | State-of-the-art | `max_completion_tokens` | 1.0 |

### Supported Languages

25+ languages including:
- **European**: es, fr, de, it, pt, nl, sv, no, da, fi, pl, ru
- **Asian**: ja, ko, zh-CN, zh-TW, hi, th, vi, id, ms
- **Middle Eastern**: ar, he, tr
- **Variants**: pt-BR

### Multi-Language Workflow

```bash
# 1. Add captions with translation
appshot caption --device iphone --translate --langs es,fr

# 2. Build localized screenshots
appshot build --langs en,es,fr

# Output structure (always uses language subdirectories):
# final/
#   iphone/
#     en/
#     es/
#     fr/
```

## 📱 Device Support

### Apple Devices

| Device | Orientations | Frame Variants | Special Features |
|--------|-------------|----------------|------------------|
| **iPhone** | Portrait, Landscape | 15+ models | Notch/Dynamic Island support |
| **iPad** | Portrait, Landscape | 10+ models | Multiple sizes |
| **Mac** | Landscape | 4 resolutions | 16:10 aspect ratio |
| **Apple Watch** | Portrait | 5 sizes | Band cropping |
| **Apple TV** | Landscape | HD, 4K | TV frame |
| **Vision Pro** | Landscape | 3840×2160 | Spatial computing |

### App Store Specifications

#### Required Resolutions

**iPhone** (choose one):
- 6.9" Display: 1290×2796 (iPhone 16/15 Pro Max)
- 6.5" Display: 1284×2778 (iPhone 14 Plus)

**iPad**:
- 13" Display: 2064×2752 or 2048×2732

**Mac**:
- 16:10 aspect: 2880×1800, 2560×1600, 1440×900, or 1280×800

**Apple Watch**:
- Must use same size across all localizations

#### Preset Management

```bash
# View all presets
appshot presets

# Show required only
appshot presets --required

# Generate config for specific presets
appshot presets --generate iphone-6-9,ipad-13

# Build with presets
appshot build --preset iphone-6-9,ipad-13
```

### Validation

```bash
# Validate against App Store requirements
appshot validate

# Strict mode (required presets only)
appshot validate --strict

# Get fix suggestions
appshot validate --fix
```

## 📝 Command Reference

### `appshot build`

Generate final screenshots with frames, gradients, and captions.

```bash
appshot build [options]
```

**Options:**
- `--devices <list>` - Comma-separated device list (default: all)
- `--preset <ids>` - Use App Store presets (e.g., `iphone-6-9,ipad-13`)
- `--config <file>` - Custom config file (default: `.appshot/config.json`)
- `--langs <list>` - Build for specific languages (if not specified, auto-detects)
- `--preview` - Generate low-res previews
- `--concurrency <n>` - Parallel processing limit (default: 5)
- `--dry-run` - Show what would be rendered without generating images
- `--verbose` - Show detailed rendering information
- `--no-frame` - Skip device frames
- `--no-gradient` - Skip gradient backgrounds
- `--no-caption` - Skip captions

**Language Detection:**
When `--langs` is not specified, appshot automatically determines languages in this order:
1. Languages found in caption files (if using multi-language captions)
2. `defaultLanguage` setting in config.json
3. System locale (e.g., `fr` for French systems)
4. Fallback to `en`

**Examples:**
```bash
# Build all devices
appshot build

# Specific devices and languages
appshot build --devices iphone,ipad --langs en,fr,es

# Use App Store presets
appshot build --preset iphone-6-9-portrait,ipad-13-landscape

# Preview mode
appshot build --preview --devices iphone

# Dry-run to see what would be built
appshot build --dry-run

# Verbose mode for debugging
appshot build --verbose --devices iphone
```

**Exit Codes:**
- `0` - Success
- `1` - Configuration error
- `2` - Missing screenshots
- `3` - Processing error

### `appshot caption`

Add or edit captions with autocomplete and AI translation.

```bash
appshot caption --device <name> [options]
```

**Options:**
- `--device <name>` - Device name (required)
- `--lang <code>` - Primary language (default: en)
- `--translate` - Enable real-time AI translation
- `--langs <codes>` - Target languages for translation
- `--model <name>` - OpenAI model (default: gpt-4o-mini)

**Examples:**
```bash
# Basic caption entry
appshot caption --device iphone

# With translation
appshot caption --device iphone --translate --langs es,fr,de

# Custom model
appshot caption --device ipad --translate --langs ja --model gpt-5
```

### `appshot check`

Validate project configuration and assets.

```bash
appshot check [options]
```

**Options:**
- `--fix` - Attempt automatic fixes

**Checks:**
- Configuration file validity
- Screenshot presence
- Frame availability
- Directory structure
- Caption files

### `appshot clean`

Remove generated files and temporary data.

```bash
appshot clean [options]
```

**Options:**
- `--all` - Remove all generated files including `.appshot/`
- `--history` - Clear caption autocomplete history
- `--keep-history` - Preserve history when using `--all`
- `--yes` - Skip confirmation prompt

**Examples:**
```bash
# Clean output only
appshot clean

# Full reset
appshot clean --all --yes

# Clear history
appshot clean --history
```

### `appshot doctor`

Run comprehensive system diagnostics to verify appshot installation and dependencies.

```bash
appshot doctor [options]
```

**Options:**
- `--json` - Output results as JSON for CI/automation
- `--verbose` - Show detailed diagnostic information
- `--category <categories>` - Run specific checks (comma-separated: system,dependencies,fonts,filesystem,frames)

**Checks:**
- **System Requirements** - Node.js version (≥18), npm availability, platform detection
- **Dependencies** - Sharp module installation, native bindings, image processing test, OpenAI API key
- **Font System** - Font detection commands, system font loading, common font availability
- **File System** - Write permissions (current/temp directories), .appshot directory, configuration validity
- **Frame Assets** - Frame directory presence, Frames.json validation, device frame counts, missing files

**Examples:**
```bash
# Run all diagnostics
appshot doctor

# Check specific categories
appshot doctor --category system,dependencies

# JSON output for CI
appshot doctor --json

# Verbose mode for debugging
appshot doctor --verbose
```

**Output Example:**
```
🏥 Appshot Doctor - System Diagnostics

System Requirements:
  ✓ Node.js v20.5.0 (minimum: v18.0.0)
  ✓ npm v9.8.0
  ✓ darwin (macOS)

Dependencies:
  ✓ Sharp v0.33.5 installed
  ✓ libvips v8.15.3 loaded
  ✓ Sharp image processing test passed
  ⚠ OpenAI API key not found (translation features disabled)

Summary: 20 passed, 1 warning, 0 errors

Suggestions:
  • Set OPENAI_API_KEY environment variable to enable translation features
```

### `appshot fonts`

Browse, validate, and set fonts for captions. Includes 8 high-quality embedded fonts for consistent rendering across all platforms.

```bash
appshot fonts [options]
```

**Options:**
- `--all` - List all system fonts
- `--embedded` - Show embedded fonts bundled with appshot
- `--recommended` - Show recommended fonts only (default)
- `--validate <name>` - Check if font is available (embedded or system)
- `--set <name>` - Set the caption font
- `--select` - Interactive font selection
- `--device <name>` - Target specific device (with --set or --select)
- `--json` - Output as JSON

**Embedded Fonts (Always Available):**
- **Modern UI**: Inter, Poppins, Montserrat, DM Sans
- **Popular Web**: Roboto, Open Sans, Lato, Work Sans
- **Monospace**: JetBrains Mono, Fira Code
- **Variants**: Regular, Italic, Bold, and Bold Italic styles

All embedded fonts use open source licenses (OFL or Apache 2.0) and provide consistent rendering without requiring system installation. Font variants are automatically detected and properly rendered with correct styles.

**Examples:**
```bash
# Browse recommended fonts
appshot fonts

# Show embedded fonts
appshot fonts --embedded

# Set global font directly (embedded font)
appshot fonts --set "Inter"

# Set font variant (italic style)
appshot fonts --set "Poppins Italic"

# Set bold variant
appshot fonts --set "Montserrat Bold"

# Interactive font selection
appshot fonts --select

# Set device-specific font variant
appshot fonts --set "Poppins Bold Italic" --device iphone

# Validate font availability
appshot fonts --validate "Inter"  # Shows: embedded
appshot fonts --validate "Arial"  # Shows: system installed

# List all system fonts
appshot fonts --all

# JSON output for automation
appshot fonts --json > fonts.json
```

### `appshot frame`

Apply device frames to screenshots with transparent backgrounds (no gradients or captions).

```bash
appshot frame <input> [options]
```

**Arguments:**
- `<input>` - Input image file or directory

**Options:**
- `-o, --output <dir>` - Output directory (default: same as input)
- `-d, --device <type>` - Force device type (iphone|ipad|mac|watch)
- `-r, --recursive` - Process directories recursively
- `-f, --format <type>` - Output format: png or jpeg (default: png)
- `--suffix <text>` - Filename suffix when not overwriting (default: "-framed")
- `--overwrite` - Overwrite original file name
- `--dry-run` - Preview files without processing
- `--verbose` - Show detailed information

**Features:**
- Auto-detects device type from image dimensions
- Preserves transparency with PNG output
- Batch processes entire directories
- Smart portrait/landscape frame selection
- Progress indicators for large batches

**Examples:**
```bash
# Frame single file (auto-detect device)
appshot frame screenshot.png

# Specify output directory
appshot frame screenshot.png -o framed/

# Force device type
appshot frame screenshot.png --device iphone

# Batch process directory
appshot frame ./screenshots -o ./framed --recursive

# Dry run with verbose logs
appshot frame ./screenshots --dry-run --verbose

# JPEG output (white background)
appshot frame screenshot.png --format jpeg
```

### `appshot device` (macOS only)

Capture screenshots from iOS simulators.

```bash
appshot device <command> [options]
```

**Commands:**
- `capture` - Capture screenshot from device
- `list` - List available devices
- `prepare` - Boot simulators

**Capture Options:**
- `-d, --device <name>` - Device name or alias
- `--all` - Capture from all devices
- `--simulators` - Filter simulators
- `--booted` - Currently booted simulators
- `--process` - Auto-process with frames
- `--app <bundleId>` - Launch app before capture

**Examples:**
```bash
# List devices
appshot device list

# Interactive capture
appshot device capture

# Capture from specific device
appshot device capture --device "iPhone 15 Pro"

# Capture and process
appshot device capture --process
```

### `appshot watch` (macOS only)

Monitor directories for new screenshots with automatic processing.

```bash
appshot watch <command> [options]
```

**Commands:**
- `start` - Start watching directories
- `stop` - Stop the watch service
- `status` - Check service status
- `setup` - Interactive configuration

**Start Options:**
- `-d, --dirs <paths...>` - Directories to watch
- `--devices <names...>` - Device names for processing
- `--process` - Auto-process with frames
- `--frame-only` - Frames only (no gradient/caption)
- `--background` - Run in background
- `--verbose` - Detailed output

**Examples:**
```bash
# Interactive setup
appshot watch setup

# Start in background with processing
appshot watch start --process --background

# Watch multiple directories
appshot watch start --dirs ./screenshots ./downloads

# Check status
appshot watch status --verbose

# Stop watching
appshot watch stop
```

### `appshot gradients`

Manage gradient presets.

```bash
appshot gradients [options]
appshot gradients select
```

**Options:**
- `--list` - List all presets (default)
- `--category <name>` - Filter by category
- `--preview <id>` - Generate preview image
- `--sample` - Generate all samples with HTML
- `--apply <id>` - Apply preset to project

**Examples:**
```bash
# Browse all
appshot gradients

# Apply preset
appshot gradients --apply ocean

# Interactive selection
appshot gradients select

# Generate samples
appshot gradients --sample
```

### `appshot init`

Initialize new project with scaffolding.

```bash
appshot init [options]
```

**Options:**
- `--force` - Overwrite existing files

**Creates:**
- `.appshot/config.json`
- `.appshot/captions/`
- `screenshots/` directories
- Default configuration

### `appshot migrate`

Migrate project structure to latest version.

```bash
appshot migrate [options]
```

**Options:**
- `--output-structure` - Migrate to language subdirectory structure
- `--dry-run` - Preview changes without making them
- `--lang <code>` - Language to use for migration (default: system language)

**Examples:**
```bash
# Migrate existing screenshots to language subdirectories
appshot migrate --output-structure

# Preview migration without changes
appshot migrate --output-structure --dry-run

# Specify target language
appshot migrate --output-structure --lang fr
```

### `appshot localize`

Batch translate all captions using AI.

```bash
appshot localize --langs <codes> [options]
```

**Options:**
- `--langs <codes>` - Target languages (required)
- `--device <name>` - Specific device only
- `--model <name>` - OpenAI model (default: gpt-4o-mini)
- `--source <lang>` - Source language (default: en)
- `--review` - Review before saving
- `--overwrite` - Replace existing translations

**Examples:**
```bash
# Translate all
appshot localize --langs es,fr,de

# Device-specific
appshot localize --device iphone --langs ja,ko

# Premium model with review
appshot localize --langs zh-CN --model gpt-5 --review
```

### `appshot presets`

Manage App Store screenshot presets.

```bash
appshot presets [options]
```

**Options:**
- `--list` - List all presets (default)
- `--required` - Show required only
- `--generate <ids>` - Generate config for presets
- `--category <type>` - Filter by device type
- `--output <file>` - Output file for config

**Examples:**
```bash
# View all
appshot presets

# Required only
appshot presets --required

# Generate config
appshot presets --generate iphone-6-9,ipad-13
```

### `appshot specs`

Display complete Apple App Store screenshot specifications.

```bash
appshot specs [options]
```

**Options:**
- `--device <name>` - Filter by device type (iphone|ipad|mac|watch|appletv|visionpro)
- `--json` - Output as JSON (exact Apple specifications for diffing)
- `--required` - Show only required presets

**Shows:**
- Complete Apple specifications with exact resolutions
- Display sizes and device compatibility lists
- Required vs optional indicators
- Fallback notes and requirements

**JSON Output for Change Tracking:**
The `--json` flag outputs the complete Apple App Store specifications data, perfect for tracking changes over time:

```bash
# Save current specifications
appshot specs --json > apple-specs-2024-08.json

# After Apple updates (typically September)
appshot specs --json > apple-specs-2024-09.json

# See what changed
diff apple-specs-2024-08.json apple-specs-2024-09.json
```

**Data Source:**
The specifications mirror [Apple's official screenshot requirements](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) 
and are maintained in sync with Apple's updates. The JSON output preserves all metadata including:
- Exact resolutions (e.g., `1290x2796` for iPhone 6.9")
- Device groupings (which devices share requirements)
- Requirement status (mandatory vs optional)
- Fallback rules and special notes

This is particularly useful for:
- Tracking when Apple adds new device requirements
- Validating screenshot compliance before submission
- Automating screenshot generation pipelines
- Planning resource allocation for new devices

### `appshot style`

Configure device styling interactively.

```bash
appshot style --device <name> [options]
```

**Options:**
- `--device <name>` - Device name (required)
- `--reset` - Reset to defaults

**Configures:**
- Font selection
- Frame settings
- Partial frames
- Frame positioning
- Frame scaling
- Caption settings

**Examples:**
```bash
# Configure iPhone
appshot style --device iphone

# Reset to defaults
appshot style --device iphone --reset
```

### `appshot validate`

Validate screenshots against App Store requirements.

```bash
appshot validate [options]
```

**Options:**
- `--strict` - Validate required presets only
- `--fix` - Show fix suggestions

**Validates:**
- Resolution compliance
- Aspect ratios
- Required presets
- File formats

## ⚙️ Configuration Reference

### Complete Schema

```json
{
  "output": "./final",           // Output directory
  "frames": "./frames",          // Frame directory
  "defaultLanguage": "en",       // Default language for builds (optional)
  "gradient": {
    "colors": ["#hex1", "#hex2"],
    "direction": "top-bottom"    // or diagonal, left-right
  },
  "caption": {
    "font": "Font Name",
    "fontsize": 64,              // Pixels
    "color": "#FFFFFF",         // Text color (hex)
    "align": "center",           // left, center, right
    "position": "above",         // above, below, overlay
    "paddingTop": 100,
    "paddingBottom": 60,
    "background": {              // Optional background styling
      "color": "#000000",        // Background color (hex)
      "opacity": 0.8,            // Transparency (0-1)
      "padding": 20              // Padding around text
    },
    "border": {                  // Optional border styling
      "color": "#FFFFFF",        // Border color (hex)
      "width": 2,                // Border thickness (1-10)
      "radius": 12               // Rounded corners (0-30)
    },
    "box": {
      "autoSize": true,          // Dynamic height
      "maxLines": 3,
      "lineHeight": 1.4,
      "minHeight": 100,
      "maxHeight": 500
    }
  },
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1284x2778",
      "autoFrame": true,
      "preferredFrame": "frame-name",
      "partialFrame": false,
      "frameOffset": 25,         // Percentage
      "framePosition": "center", // or top, bottom, 0-100
      "frameScale": 0.9,         // 0.5-2.0
      "captionFont": "Override",
      "captionSize": 72,
      "captionPosition": "above",
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320
      }
    }
  }
}
```

### Device Configuration

Each device can override global settings:

```json
{
  "devices": {
    "iphone": {
      // Required
      "input": "./screenshots/iphone",
      "resolution": "1284x2778",
      
      // Frame options
      "autoFrame": true,
      "preferredFrame": "iphone-16-pro-max-portrait",
      "partialFrame": true,
      "frameOffset": 25,
      "framePosition": 40,
      "frameScale": 0.85,
      
      // Caption overrides
      "captionFont": "SF Pro",
      "captionSize": 64,
      "captionPosition": "above",
      "captionBackground": {     // Device-specific background
        "color": "#FF5733",
        "opacity": 0.7,
        "padding": 25
      },
      "captionBorder": {         // Device-specific border
        "color": "#FFFFFF",
        "width": 3,
        "radius": 16
      },
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320,
        "maxLines": 3
      }
    }
  }
}
```

### Fixed Layout Configuration

For consistent screenshots regardless of caption length:

```json
{
  "devices": {
    "iphone": {
      "autoFrame": false,
      "preferredFrame": "iphone-16-pro-max-portrait",
      "frameScale": 0.85,
      "framePosition": 40,
      "captionBox": {
        "autoSize": false,    // Critical
        "minHeight": 320,     // Fixed height
        "maxHeight": 320      // Same as min
      }
    }
  }
}
```

## 🤖 Agent & Automation Guide

### Design Principles

Appshot is built for automation:

1. **Predictable** - Consistent commands and outputs
2. **Scriptable** - JSON configs, exit codes, no GUI
3. **Composable** - Unix philosophy, pipe-friendly
4. **Fast** - Parallel processing, no overhead

### JSON Output Mode

Most commands support JSON output for parsing:

```bash
# Device specs as JSON
appshot specs --json

# Font list as JSON
appshot fonts --json

# Preset data as JSON
appshot presets --json

# Validation results as JSON
appshot validate --json
```

### Exit Codes

| Code | Meaning | Commands |
|------|---------|----------|
| 0 | Success | All |
| 1 | Configuration error | build, check |
| 2 | Missing files | build, validate |
| 3 | Processing error | build |
| 4 | Invalid input | All |
| 5 | API error | localize, caption |

### Batch Operations

```bash
# Process multiple devices
appshot build --devices iphone,ipad,mac

# Multiple languages
appshot build --langs en,es,fr,de,ja

# Parallel processing
appshot build --concurrency 10
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Generate Screenshots
on: [push]

jobs:
  screenshots:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Appshot
        run: npm install -g appshot-cli
      
      - name: Generate Screenshots
        run: |
          appshot init --force
          appshot gradients --apply ocean
          appshot build --preset iphone-6-9,ipad-13
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v2
        with:
          name: screenshots
          path: final/
```

#### Shell Script Automation

```bash
#!/bin/bash
set -e

# Configure
cat > .appshot/config.json << EOF
{
  "gradient": {"colors": ["#FF5733", "#FFC300"]},
  "devices": {
    "iphone": {"resolution": "1284x2778"}
  }
}
EOF

# Add captions programmatically
echo '{"home.png": "Welcome"}' > .appshot/captions/iphone.json

# Build
appshot build --devices iphone

# Validate
appshot validate --strict || exit 1
```

### MCP Integration

Works with Model Context Protocol tools:

```bash
# MCP captures screenshot
mcp-screenshot capture --output ./screenshots/iphone/home.png

# Appshot processes
appshot build --devices iphone --no-interactive
```

### Python Automation

```python
import subprocess
import json

def generate_screenshots(device, captions):
    # Configure
    config = {
        "gradient": {"colors": ["#0077BE", "#33CCCC"]},
        "devices": {
            device: {"resolution": "1284x2778"}
        }
    }
    
    with open('.appshot/config.json', 'w') as f:
        json.dump(config, f)
    
    # Add captions
    with open(f'.appshot/captions/{device}.json', 'w') as f:
        json.dump(captions, f)
    
    # Build
    result = subprocess.run(
        ['appshot', 'build', '--devices', device],
        capture_output=True,
        text=True
    )
    
    return result.returncode == 0

# Usage
captions = {
    "home.png": "Your Dashboard",
    "settings.png": "Customize Everything"
}
generate_screenshots("iphone", captions)
```

### Node.js Automation

```javascript
import { exec } from 'child_process';
import { writeFileSync } from 'fs';

async function generateScreenshots() {
  // 1. Initialize
  await execPromise('appshot init --force');
  
  // 2. Configure
  const config = {
    gradient: { colors: ['#FF5733', '#FFC300'] },
    caption: { font: 'SF Pro', fontsize: 64 }
  };
  writeFileSync('.appshot/config.json', JSON.stringify(config));
  
  // 3. Add captions
  const captions = {
    'home.png': {
      en: 'Welcome',
      es: 'Bienvenido',
      fr: 'Bienvenue'
    }
  };
  writeFileSync('.appshot/captions/iphone.json', JSON.stringify(captions));
  
  // 4. Build with multiple languages
  await execPromise('appshot build --langs en,es,fr');
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
```

## 🎯 Recipes & Examples

### App Store Submission Workflow

```bash
# 1. Initialize project
appshot init

# 2. Configure for App Store
appshot presets --generate iphone-6-9,ipad-13 > .appshot/config.json

# 3. Add screenshots
cp simulator/*.png screenshots/iphone/

# 4. Add captions with translation
export OPENAI_API_KEY="sk-..."
appshot caption --device iphone --translate --langs es,fr,de,ja,zh-CN

# 5. Apply premium gradient
appshot gradients --apply twilight

# 6. Configure styling
appshot style --device iphone

# 7. Build all localizations
appshot build --preset iphone-6-9,ipad-13 --langs en,es,fr,de,ja,zh-CN

# 8. Validate
appshot validate --strict

# 9. Output ready in final/
```

### Consistent Marketing Screenshots

For identical device positioning across all screenshots:

```json
{
  "devices": {
    "iphone": {
      "resolution": "1284x2778",
      "autoFrame": false,
      "preferredFrame": "iphone-16-pro-max-portrait",
      "frameScale": 0.85,
      "framePosition": 40,
      "partialFrame": true,
      "frameOffset": 25,
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320,
        "maxLines": 3
      }
    }
  }
}
```

### Brand Guidelines Compliance

```json
{
  "gradient": {
    "colors": ["#BrandColor1", "#BrandColor2"],
    "direction": "diagonal"
  },
  "caption": {
    "font": "Brand Font Name",
    "fontsize": 72,
    "color": "#BrandTextColor",
    "align": "center"
  }
}
```

### Multi-Device Campaign

```bash
# Configure each device
appshot style --device iphone
appshot style --device ipad
appshot style --device mac

# Build all at once
appshot build --devices iphone,ipad,mac --langs en,es,fr

# Output structure (language subdirectories):
# final/
#   iphone/
#     en/ es/ fr/
#   ipad/
#     en/ es/ fr/
#   mac/
#     en/ es/ fr/
```

### A/B Testing Different Styles

```bash
# Version A - Ocean gradient
appshot gradients --apply ocean
appshot build --devices iphone --output final-ocean

# Version B - Sunset gradient
appshot gradients --apply sunset
appshot build --devices iphone --output final-sunset

# Version C - Monochrome
appshot gradients --apply noir
appshot build --devices iphone --output final-noir
```

## 🔧 Troubleshooting

### Common Issues

#### Screenshots Not Found

```bash
# Check path configuration
appshot check

# Verify screenshot location
ls screenshots/iphone/

# Fix: Update config
{
  "devices": {
    "iphone": {
      "input": "./correct/path/to/screenshots"
    }
  }
}
```

#### Font Not Rendering

```bash
# 1. Validate font availability
appshot fonts --validate "Font Name"

# 2. Use fallback font
appshot fonts --recommended

# 3. Set web-safe font
{
  "caption": {
    "font": "Arial"  // Always works
  }
}
```

#### Translation Not Working

```bash
# Check API key
echo $OPENAI_API_KEY

# Test with different model
appshot caption --device iphone --translate --model gpt-4o-mini

# Check rate limits
# Wait 60 seconds between large batches
```

#### Blurry Output

```bash
# Ensure high-res input
# Minimum: 1242x2208 for iPhone

# Check scaling
{
  "devices": {
    "iphone": {
      "frameScale": 1.0  // No scaling
    }
  }
}
```

#### Memory Issues with Large Batches

```bash
# Reduce concurrency
appshot build --concurrency 2

# Process in batches
appshot build --devices iphone
appshot build --devices ipad
```

### Debugging with Verbose Mode

Use `--verbose` flag to diagnose rendering issues:

```bash
# See detailed caption metrics
appshot build --verbose --devices iphone

# Output includes:
# - Caption wrap width and line count
# - Font stack with fallbacks
# - Device frame scaling factors
# - Position calculations
```

Use `--dry-run` to validate configuration without processing:

```bash
# Check what would be generated
appshot build --dry-run

# Verify frame selection
appshot build --dry-run --devices iphone

# Check multi-language output
appshot build --dry-run --langs en,es,fr
```

### Performance Tips

1. **Use appropriate concurrency**
   ```bash
   # For 8GB RAM
   appshot build --concurrency 3
   
   # For 16GB+ RAM
   appshot build --concurrency 8
   ```

2. **Optimize images before processing**
   ```bash
   # Use imagemagick to optimize
   mogrify -quality 95 screenshots/iphone/*.png
   ```

3. **Cache translations**
   - Translations are automatically cached
   - Reuse improves speed and reduces costs

4. **Use preview mode for testing**
   ```bash
   appshot build --preview
   ```

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Frame not found` | Missing frame file | Run `appshot check --fix` |
| `Invalid resolution` | Wrong dimensions | Check with `appshot validate` |
| `Font validation failed` | Font not available | Use `appshot fonts` to find alternatives |
| `API rate limit` | Too many requests | Add delays or reduce batch size |
| `Out of memory` | Large images | Reduce concurrency or image size |

## 🧑‍💻 Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/chrisvanbuskirk/appshot.git
cd appshot

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Link for local development
npm link

# Run in development mode
npm run dev -- build --devices iphone
```

### Project Structure

```
appshot/
├── src/
│   ├── cli.ts              # Entry point
│   ├── commands/           # Command implementations
│   ├── core/              # Core functionality
│   ├── services/          # Services (fonts, translation)
│   └── types.ts           # TypeScript definitions
├── tests/                 # Test files
├── frames/               # Device frame images
└── examples/            # Example projects
```

### Testing

Appshot includes comprehensive test coverage with unit tests, integration tests, and CI/CD validation.

#### Test Suites

- **Unit Tests** (50+ test files)
  - Device detection and frame selection
  - Gradient rendering and presets
  - Font validation and fallbacks
  - Caption positioning and text wrapping
  - Multi-language support
  - App Store specifications validation

- **Integration Tests** (`tests/integration/`)
  - Full CLI command testing
  - End-to-end workflow validation
  - Multi-platform compatibility
  - Error handling scenarios

- **CI/CD Testing**
  - Automated testing on every PR
  - Multi-OS testing (Ubuntu, macOS, Windows)
  - Multi-Node version testing (18.x, 20.x, 22.x)
  - Visual validation workflows
  - Screenshot artifact generation

```bash
# Run all tests
npm test

# Run specific test
npm test -- fonts.test.ts

# Run integration tests
npm test -- tests/integration/cli-integration.test.ts

# Watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 🗺️ Roadmap

### Completed ✅
- [x] Official App Store specifications
- [x] Caption positioning (above/below/overlay)
- [x] Partial frame support
- [x] Intelligent caption autocomplete
- [x] Apple Watch optimizations
- [x] Gradient presets system (24+ gradients)
- [x] AI-Powered Translations (GPT-4o, GPT-5, o1, o3)
- [x] Comprehensive Font System (v0.4.0)
- [x] Frame-Only Mode (v0.8.0)

### In Progress 🚧
- [ ] MCP Integration Guide
- [ ] Agent API Mode

### Planned 📋
- [ ] Fastlane Integration Plugin
- [ ] GitHub Actions Marketplace Action
- [ ] CI/CD Templates (Jenkins, GitLab CI, CircleCI)
- [ ] Image Backgrounds (as alternative to gradients)
- [ ] Screenshot Templates System
- [ ] Android Device Support (Google Play Store)
- [ ] Batch Config Files
- [ ] Screenshot Validation API
- [ ] Auto-Caption Generation (AI-powered)
- [ ] Smart Frame Detection (ML-based)
- [ ] Pipeline Mode
- [ ] WebP/AVIF Support
- [ ] Differential Builds
- [ ] Screenshot A/B Testing Framework

## 📄 License & Support

### License

MIT © Chris Van Buskirk

### Support

- 🐛 [Report Issues](https://github.com/chrisvanbuskirk/appshot/issues)
- 💡 [Request Features](https://github.com/chrisvanbuskirk/appshot/issues/new?labels=enhancement)
- 📚 [Documentation Wiki](https://github.com/chrisvanbuskirk/appshot/wiki)
- 💬 [Discussions](https://github.com/chrisvanbuskirk/appshot/discussions)

### Security

For security vulnerabilities, please see [SECURITY.md](SECURITY.md).

### NPM Package

- 📦 [appshot-cli on NPM](https://www.npmjs.com/package/appshot-cli)
- 🔄 Latest version: 0.8.6

---

<div align="center">
Built with ❤️ for developers and AI agents who automate everything.
</div>