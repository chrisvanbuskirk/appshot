# Appshot 📸

> 🎉 **Now available on NPM!** Install with `npm install -g appshot-cli`

Generate beautiful, App Store-ready screenshots with device frames, gradients, and captions.

[![CI](https://github.com/chrisvanbuskirk/appshot/actions/workflows/ci.yml/badge.svg)](https://github.com/chrisvanbuskirk/appshot/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/appshot-cli.svg)](https://www.npmjs.com/package/appshot-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🖼️ **Smart Frames** - Automatically detects portrait/landscape and selects appropriate device frame
- 🎨 **Gradients** - Beautiful gradient backgrounds with customizable colors
- ✏️ **Captions** - Add marketing text with full typography control (above or overlay)
- 🌍 **Localization** - Multi-language support for international app stores
- 📱 **Multi-Device** - Support for iPhone, iPad, Mac, Apple TV, Vision Pro, and Apple Watch
- 📏 **App Store Specs** - Built-in support for all official App Store screenshot resolutions
- ✅ **Validation** - Verify screenshots meet App Store requirements
- 🔄 **Orientation Detection** - Intelligently handles both portrait and landscape screenshots
- ⚡ **Fast** - Parallel processing with configurable concurrency
- 🛠️ **CLI** - Simple command-line interface

## Quick Start

### Installation

```bash
npm install -g appshot-cli
```

> **Note**: The package is called `appshot-cli` on NPM, but the command is still `appshot`

### Initialize a new project

```bash
appshot init
```

This creates:
- `.appshot/config.json` - Main configuration file
- `.appshot/captions/` - Device-specific caption files
- `screenshots/` - Directory structure for your screenshots

### Add your screenshots

Place your app screenshots in the appropriate device folders:
```
screenshots/
├── iphone/
├── ipad/
├── mac/
└── watch/
```

### Add captions

Use the interactive caption editor with autocomplete:

```bash
appshot caption --device iphone
```

Features:
- 🔍 **Autocomplete** - Smart suggestions as you type
- 📊 **Frequency tracking** - Most-used captions appear first  
- 🎯 **Device-specific** - Suggestions tailored to device type
- ⌨️ **Keyboard shortcuts** - Tab to complete, arrows to navigate

### Build final screenshots

Generate your App Store-ready screenshots:

```bash
appshot build
```

Output appears in the `final/` directory, ready for upload!

## Configuration

Edit `.appshot/config.json` to customize your screenshots:

```json
{
  "output": "./final",
  "frames": "./frames",
  "gradient": {
    "colors": ["#FF5733", "#FFC300"],
    "direction": "top-bottom"
  },
  "caption": {
    "font": "SF Pro",
    "fontsize": 64,
    "color": "#FFFFFF",
    "align": "center",
    "paddingTop": 100
  },
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1284x2778",
      "autoFrame": true,
      "preferredFrame": "iphone-15-pro-max"
    }
  }
}
```

### Gradient Options

- **colors**: Array of hex color codes
- **direction**: `top-bottom`, `bottom-top`, `left-right`, `right-left`, `diagonal`

#### Using Gradient Presets

Instead of manually configuring gradients, you can use one of the 24+ built-in presets:

```bash
# Browse available gradients
appshot gradients

# Apply a preset
appshot gradients --apply sunset

# Interactive selection with visual preview
appshot gradients select

# Generate preview image
appshot gradients --preview ocean

# Create samples of all gradients
appshot gradients --sample
```

##### Available Presets by Category

**Warm Gradients** 🔥
- **sunset** - Warm orange to pink (#FF5733 → #FFC300)
- **autumn** - Fall foliage colors (#D2691E → #FF4500)
- **golden** - Rich golden tones (#FFD700 → #FFA500)
- **coral** - Soft coral reef (#FF6B6B → #FFE66D)

**Cool Gradients** ❄️
- **ocean** - Deep blue waves (#0077BE → #33CCCC)
- **arctic** - Icy blue frost (#E0F7FA → #81D4FA)
- **mint** - Fresh mint green (#00C9A7 → #00F5FF)
- **twilight** - Evening sky (#667EEA → #764BA2)

**Vibrant Gradients** 🎨
- **neon** - Electric glow (#FF006E → #8338EC → #3A86FF)
- **tropical** - Paradise colors (#FE6B8B → #FF8E53)
- **rainbow** - Full spectrum (#FF0000 → #FF7F00 → #FFFF00 → #00FF00 → #0000FF → #8B00FF)
- **vivid** - Bold and bright (#F72585 → #7209B7 → #3A0CA3)

**Subtle Gradients** 🕊️
- **pastel** - Soft blend (#E8D8F5 → #D6E6FF)
- **lavender** - Gentle purple (#E6E6FA → #DDA0DD)
- **peach** - Soft peach tones (#FFDAB9 → #FFE4E1)
- **sky** - Clear day (#87CEEB → #E0F6FF)

**Monochrome Gradients** ⚫⚪
- **noir** - Deep black (#000000 → #434343)
- **silver** - Metallic shine (#C0C0C0 → #F5F5F5)
- **charcoal** - Dark grey (#36454F → #708090)
- **pearl** - Soft white (#F8F8FF → #FFFFFF)

**Brand-Inspired Gradients** 🏢
- **instagram** - Brand colors (#833AB4 → #FD1D1D → #FCB045)
- **spotify** - Green energy (#1DB954 → #191414)
- **twitter** - Blue bird (#1DA1F2 → #14171A)
- **slack** - Workspace hues (#4A154B → #36C5F0 → #2EB67D)

### Caption Options

- **font**: Font family name
- **fontsize**: Size in pixels
- **color**: Hex color code
- **align**: `left`, `center`, `right`
- **paddingTop**: Space from top in pixels
- **paddingBottom**: Space from bottom in pixels
- **position**: `above` (above device frame) or `overlay` (on gradient)
- **box**: Caption box configuration (see Dynamic Caption Box section)

### Device Options

- **input**: Directory containing screenshots
- **resolution**: Output resolution (use App Store specs or custom)
- **autoFrame**: Enable automatic frame selection based on screenshot orientation (default: true)
- **preferredFrame**: Preferred frame name from the registry (optional)
- **partialFrame**: Cut off bottom portion of frame for dynamic look (default: false)
- **frameOffset**: Percentage to cut off when partialFrame is true (default: 25)

## Commands

### `appshot init`
Initialize a new appshot project with scaffolding.

Options:
- `--force` - Overwrite existing files

### `appshot caption`
Interactively add or edit captions for screenshots with intelligent autocomplete.

Features:
- **Autocomplete suggestions** - Shows previous captions as you type
- **Fuzzy search** - Finds captions even with typos
- **Usage tracking** - Frequently used captions appear first
- **Learning system** - Improves suggestions over time
- **Device-specific** - Prioritizes captions used for the same device

Options:
- `--device <name>` - Device name (required)
- `--lang <code>` - Language code (default: en)

Keyboard shortcuts:
- **Tab** - Autocomplete the top suggestion
- **↑↓** - Navigate through suggestions
- **Enter** - Select current suggestion
- **Esc** - Dismiss suggestions

### `appshot gradients`
Browse, preview, and apply gradient presets for stunning backgrounds.

Options:
- `--list` - List all available gradient presets (default)
- `--category <name>` - Filter by category (warm, cool, vibrant, subtle, monochrome, brand)
- `--preview <id>` - Generate preview image for a specific gradient
- `--sample` - Generate sample images for all gradients with HTML preview
- `--apply <id>` - Apply gradient preset to current project

Subcommands:
- `select` - Interactive gradient selection with visual preview

Features:
- **24+ Beautiful Presets** - Curated collection of professional gradients
- **6 Categories** - Warm, Cool, Vibrant, Subtle, Monochrome, Brand-inspired
- **Visual Preview** - See color blocks in terminal with ANSI approximation
- **Sample Generation** - Create PNG samples of all gradients
- **HTML Preview Page** - Browse all gradients in your browser
- **Quick Apply** - Instantly update project configuration
- **Direction Support** - All gradient directions (top-bottom, diagonal, etc.)

Example usage:
```bash
# Browse all gradients with color previews
appshot gradients

# Filter by category
appshot gradients --category warm

# Preview a specific gradient (creates gradient-sunset.png)
appshot gradients --preview sunset

# Apply a gradient to your project
appshot gradients --apply ocean

# Interactive selection with arrow keys
appshot gradients select

# Generate samples for all gradients (creates gradient-samples/ directory)
appshot gradients --sample
# Then open gradient-samples/preview.html in your browser
```

#### How Gradient Presets Work

1. **Browsing** - The `gradients` command displays all presets with:
   - Visual color blocks showing the gradient colors
   - Name and description
   - Category grouping
   - Gradient ID for applying

2. **Previewing** - Generate a sample image to see exactly how a gradient looks:
   ```bash
   appshot gradients --preview neon
   # Creates: gradient-neon.png (400x800px)
   ```

3. **Applying** - Updates your `.appshot/config.json` automatically:
   ```bash
   appshot gradients --apply twilight
   # Updates gradient.colors and gradient.direction in config
   ```

4. **Sample Generation** - Creates a gallery of all gradients:
   ```bash
   appshot gradients --sample
   # Creates: gradient-samples/
   #   ├── sunset.png
   #   ├── ocean.png
   #   ├── neon.png
   #   └── preview.html (view all in browser)
   ```

5. **Interactive Selection** - Visual menu for choosing gradients:
   ```bash
   appshot gradients select
   # Use arrow keys to navigate, Enter to apply, Esc to cancel
   ```

### `appshot style`
Configure device positioning and caption styling interactively.

Options:
- `--device <name>` - Device name (iphone, ipad, mac, watch)
- `--reset` - Reset device styling to defaults (removes all custom settings)

Features:
- **Auto frame selection** - Enable/disable automatic frame selection based on screenshot dimensions
- **Preferred frame** - Choose specific device frame when auto selection is disabled
- **Partial frames** - Toggle on/off and adjust cut-off percentage (15%-50%)
- **Frame positioning** - Top, center, bottom, or custom positioning (0-100%)
- **Frame scaling** - Control device size (75%-130% or custom)
- **Caption customization** - Device-specific size, position, and box behavior
- **Caption box** - Auto-sizing, max lines, line height adjustments
- **Interactive prompts** - Step-by-step configuration with visual descriptions

### `appshot build`
Generate final screenshots with frames, gradients, and captions.

Options:
- `--devices <list>` - Comma-separated device list
- `--preset <ids>` - Use specific App Store presets (e.g., iphone-6-9,ipad-13)
- `--config <file>` - Use specific config file (default: .appshot/config.json)
- `--langs <list>` - Comma-separated language codes
- `--preview` - Generate low-res previews
- `--concurrency <n>` - Parallel processing limit
- `--no-frame` - Skip device frames
- `--no-gradient` - Skip gradient backgrounds
- `--no-caption` - Skip captions

### `appshot specs`
Display device specifications and resolutions.

### `appshot clean`
Remove generated screenshots and temporary files.

Options:
- `--all` - Remove all generated files including .appshot/ directory
- `--history` - Clear caption autocomplete history
- `--keep-history` - Preserve caption history when using --all
- `--yes` - Skip confirmation prompt

Options:
- `--device <name>` - Filter by device type
- `--json` - Output as JSON

### `appshot check`
Validate project configuration and assets.

Options:
- `--fix` - Attempt to fix issues automatically

### `appshot presets`
Manage App Store screenshot presets for all official resolutions.

Options:
- `--list` - List all available presets
- `--required` - Show only required presets for App Store submission
- `--generate <ids>` - Generate config for specific preset IDs (comma-separated)
- `--category <type>` - Filter by category (iphone, ipad, mac, appletv, visionpro, watch)
- `--output <file>` - Output file for generated config (default: appshot-presets.json)

### `appshot validate`
Validate screenshots against App Store requirements.

Options:
- `--strict` - Validate against required presets only
- `--fix` - Suggest fixes for invalid screenshots

### `appshot localize` (Coming Soon)
Generate translations for captions using AI providers.

Options:
- `--langs <codes>` - Target languages
- `--device <name>` - Specific device or all
- `--provider <name>` - Translation provider

## Multi-Language Support

Captions support multiple languages:

```json
{
  "home.png": {
    "en": "Organize your life",
    "fr": "Organisez votre vie",
    "es": "Organiza tu vida"
  }
}
```

Build for specific languages:

```bash
appshot build --langs en,fr,es
```

## App Store Specifications

Appshot includes all official App Store screenshot resolutions. View them with:

```bash
# Show all presets
appshot presets

# Show only required presets
appshot presets --required

# Generate config for specific devices
appshot presets --generate iphone-6-9,ipad-13,mac-2880,watch-ultra
```

### Required Resolutions

**iPhone** (choose one):
- **6.9" Display**: 1290×2796 (iPhone 16 Pro Max, 15 Pro Max, etc.)
- **6.5" Display**: 1284×2778 (iPhone 14 Plus, 13 Pro Max, etc.)

**iPad** (required):
- **13" Display**: 2064×2752 or 2048×2732

**Mac** (for Mac apps):
- **16:10 aspect ratio**: 2880×1800, 2560×1600, 1440×900, or 1280×800

**Apple Watch** (for Watch apps):
- **Ultra**: 410×502
- **Series 10**: 416×496
- **Series 9/8/7**: 396×484

### Quick Preset Usage

```bash
# Build with iPhone 6.9" and iPad 13" presets
appshot build --preset iphone-6-9,ipad-13

# Validate existing screenshots
appshot validate --strict
```

## Examples

See the `examples/minimal-project` directory for a complete example setup.

## Development

```bash
# Clone the repository
git clone https://github.com/chrisvanbuskirk/appshot.git
cd appshot

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Link for local development
npm link
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Security

For security issues, please see [SECURITY.md](SECURITY.md).

## License

MIT © Chris Van Buskirk

## Advanced Features

### Smart Frame Selection

Appshot automatically detects whether your screenshots are portrait or landscape and selects the appropriate device frame:

- **iPhone screenshots** automatically use portrait frames for vertical shots and landscape frames for horizontal ones
- **iPad screenshots** work seamlessly in both orientations  
- **Mac screenshots** always use landscape frames
- **Watch screenshots** always use portrait frames

Override automatic selection with `preferredFrame` in your device configuration.

### Partial Frames

Create dynamic App Store screenshots with partial device frames in `.appshot/config.json`:

```json
{
  "devices": {
    "iphone": {
      "partialFrame": true,
      "frameOffset": 25  // Cut off bottom 25%
    }
  }
}
```

### Caption Positioning

Place captions above the device frame (recommended) or as an overlay:

```json
{
  "caption": {
    "position": "above",  // or "overlay"
    "paddingTop": 120,
    "paddingBottom": 80
  }
}
```

### Dynamic Caption Box System

Appshot features an intelligent caption system that automatically adapts to your content and device positioning:

#### How It Works

1. **Automatic Text Wrapping** - Long captions automatically wrap to multiple lines based on available width
2. **Dynamic Height Calculation** - Caption area expands or contracts based on:
   - Text content length
   - Device frame position
   - Available space constraints
3. **Smart Positioning** - Caption space adjusts to device placement:
   - Device at **top** → Minimal caption space (15% of screen)
   - Device at **center** → Balanced caption space
   - Device at **bottom** → Maximum caption space (up to 50% of screen)

#### Configuration

Global caption box settings in `.appshot/config.json`:

```json
{
  "caption": {
    "fontsize": 64,
    "box": {
      "autoSize": true,      // Auto-size height based on content
      "maxLines": 3,         // Maximum lines before truncation
      "lineHeight": 1.4,     // Line spacing (1.2-1.8)
      "minHeight": 100,      // Minimum caption area height
      "maxHeight": 500       // Maximum caption area height
    }
  }
}
```

Device-specific overrides:

```json
{
  "devices": {
    "iphone": {
      "captionBox": {
        "autoSize": true,
        "maxLines": 4,       // iPhone can show more lines
        "lineHeight": 1.5    // More spacing for readability
      }
    },
    "watch": {
      "captionBox": {
        "maxLines": 2,       // Watch limited to 2 lines
        "lineHeight": 1.3    // Tighter spacing
      }
    }
  }
}
```

#### Examples

**Long Caption Handling:**
- Input: "This is a very long caption that needs multiple lines to display properly"
- Result: Automatically wrapped to 2-3 centered lines with proper spacing

**Device Position Impact:**
- `framePosition: "top"` → Caption gets ~400px height
- `framePosition: "center"` → Caption gets ~700px height  
- `framePosition: "bottom"` → Caption gets ~1400px height

**Best Practices:**
- Keep captions concise (under 100 characters)
- Use 3-4 lines maximum for readability
- Test with `appshot build --preview` to quickly iterate
- Adjust `lineHeight` for visual balance (1.4 recommended)

### Device-Specific Styling

Use the `appshot style` command or configure directly in `.appshot/config.json`:

```json
{
  "devices": {
    "iphone": {
      "partialFrame": true,          // Enable partial frame
      "frameOffset": 25,             // Cut off bottom 25%
      "framePosition": "center",     // or "top", "bottom", 0-100
      "frameScale": 0.9,             // Size multiplier (0.5-2.0)
      "captionSize": 72,             // Override global caption size
      "captionPosition": "above",    // Override global position
      "captionBox": {                // Caption box configuration
        "autoSize": true,            // Auto-size based on content
        "maxLines": 4,               // Maximum lines before truncation
        "lineHeight": 1.4            // Line spacing multiplier
      }
    },
    "watch": {
      "framePosition": "bottom",     // Position at bottom
      "frameScale": 1.3,             // Make watch larger
      "partialFrame": true,          // Cut off band
      "frameOffset": 30              // Cut 30% from bottom
    }
  }
}
```

### Achieving Consistent Device Positioning

⚠️ **Important**: Caption sizing can affect device frame positioning and size. Here's how to achieve perfectly consistent screenshots:

#### The Problem

By default, appshot uses dynamic caption sizing which causes:
- **Variable device sizes** - Longer captions = smaller devices
- **Variable device positions** - Caption height affects vertical placement
- **Inconsistent layouts** - Each screenshot looks different

#### The Solution: Fixed Layout Configuration

To ensure all screenshots have identical device size and position regardless of caption length:

```json
{
  "devices": {
    "iphone": {
      "autoFrame": false,              // Disable auto frame selection
      "preferredFrame": "iphone-16-pro-max-portrait",  // Use specific frame
      "frameScale": 0.85,              // Lock device at 85% size
      "framePosition": 40,             // Position at 40% from top
      "captionBox": {
        "autoSize": false,             // CRITICAL: Disable auto-sizing
        "minHeight": 320,              // CRITICAL: Set fixed height
        "maxHeight": 320               // CRITICAL: Same as minHeight
      }
    }
  }
}
```

#### Key Settings Explained

1. **`autoFrame: false`** - Disables automatic frame selection
   - Use with `preferredFrame` to specify exact device frame
   - Ensures consistent frame across all screenshots

2. **`frameScale`** - Controls device size (0.5 to 2.0)
   - Set explicitly to lock device size
   - Without this, device scales based on available space

3. **`framePosition`** - Vertical positioning (0-100 or "top"/"center"/"bottom")
   - Number = percentage from top of available space
   - Keeps device at consistent height

4. **`captionBox.autoSize: false`** - Disables dynamic caption sizing
   - MUST be false for consistent layouts
   - Default is true (adapts to content)

5. **`minHeight` = `maxHeight`** - Forces exact caption height
   - Both MUST be set to same value
   - Creates fixed caption area regardless of text length

#### Complete Example for Consistent iPhone Screenshots

```json
{
  "gradient": {
    "colors": ["#FF5733", "#FFC300"],
    "direction": "top-bottom"
  },
  "caption": {
    "fontsize": 64,
    "color": "#FFFFFF",
    "align": "center",
    "paddingTop": 100
  },
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1284x2778",
      "autoFrame": false,
      "preferredFrame": "iphone-16-pro-max-portrait",
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320,
        "maxLines": 3
      },
      "frameScale": 0.85,
      "framePosition": 40
    }
  }
}
```

With this configuration:
- ✅ All devices are exactly the same size
- ✅ All devices are at the same vertical position
- ✅ Caption area is always 320px tall
- ✅ Long captions truncate instead of expanding
- ✅ Professional, consistent App Store screenshots

#### Interactive Styling

Run `appshot style --device iphone` for step-by-step configuration:
1. **Partial Frame** - Choose whether to cut off device bottom
2. **Frame Offset** - Select how much to cut (15%, 25%, 35%, 50%, or custom)
3. **Frame Position** - Set vertical position (top, center, bottom, or 0-100%)
4. **Frame Scale** - Adjust device size
5. **Caption Settings** - Customize text size, position, and box behavior

#### Reset Styling

To reset a device to default settings:
```bash
appshot style --device iphone --reset
```

## Agent-First Design 🤖

Appshot is designed to work seamlessly with LLM agents and automation tools. The CLI interface is structured for predictable, scriptable operations that agents can easily control.

### Working with AI Agents

- **Structured Commands** - All commands have consistent, predictable outputs
- **JSON Support** - Most commands support `--json` output for agent parsing
- **Error Codes** - Consistent exit codes for automation workflows
- **File-Based Config** - Agents can modify `.appshot/config.json` directly
- **Batch Operations** - Process multiple devices/languages in single commands

### MCP (Model Context Protocol) Integration

Appshot works perfectly with MCP screenshot tools:

```bash
# Agent takes screenshot via MCP
mcp-screenshot capture --app "MyApp" --output ./screenshots/iphone/home.png

# Agent processes with appshot
appshot build --devices iphone
```

### Agent Workflow Example

```python
# Example: Agent automating screenshot generation
def generate_app_store_screenshots():
    # 1. Agent captures screenshots from simulator/device
    run_command("xcrun simctl io booted screenshot screen1.png")
    
    # 2. Agent initializes appshot project
    run_command("appshot init")
    
    # 3. Agent configures styling
    modify_json(".appshot/config.json", {
        "gradient": {"colors": ["#FF5733", "#FFC300"]},
        "devices": {"iphone": {"frameScale": 0.85}}
    })
    
    # 4. Agent adds captions programmatically
    modify_json(".appshot/captions/iphone.json", {
        "screen1.png": "Your perfect companion"
    })
    
    # 5. Agent builds final screenshots
    run_command("appshot build --devices iphone")
```

### Why CLI-Only?

- **Predictable** - Agents need consistent, scriptable interfaces
- **Composable** - Integrates with any automation pipeline
- **Version Control** - All config is text files, perfect for Git
- **Fast** - No UI overhead, pure processing power
- **Universal** - Works on any system with Node.js

## Roadmap

- [x] Official App Store specifications support
- [x] Caption positioning (above/overlay)  
- [x] Partial frame support
- [x] Intelligent caption autocomplete
- [x] Apple Watch optimizations
- [x] Gradient presets system (24+ gradients)
- [ ] **AI-Powered Translations** - Translate captions using OpenAI/Anthropic/local LLMs
- [ ] **MCP Integration Guide** - Documentation for screenshot tool integration
- [ ] **Agent API Mode** - Structured JSON input/output for all commands
- [ ] **Android Device Support** - Google Play Store specifications
- [ ] **Batch Config Files** - Process multiple configurations in one run
- [ ] **Screenshot Validation API** - Programmatic validation for CI/CD
- [ ] **Auto-Caption Generation** - Use AI to generate marketing captions from screenshots
- [ ] **Smart Frame Detection** - AI-powered frame selection based on screenshot content
- [ ] **Pipeline Mode** - Stream processing for large batches
- [ ] **WebP/AVIF Support** - Modern image formats for smaller files
- [ ] **Differential Builds** - Only rebuild changed screenshots

## Support

- [Report issues](https://github.com/chrisvanbuskirk/appshot/issues)
- [Request features](https://github.com/chrisvanbuskirk/appshot/issues/new?labels=enhancement)
- [Documentation](https://github.com/chrisvanbuskirk/appshot/wiki)