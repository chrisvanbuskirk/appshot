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
- `appshot.json` - Configuration file
- `screenshots/` - Directory structure for your screenshots
- Device-specific folders with `captions.json` files

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

Edit `appshot.json` to customize your screenshots:

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

### Caption Options

- **font**: Font family name
- **fontsize**: Size in pixels
- **color**: Hex color code
- **align**: `left`, `center`, `right`
- **paddingTop**: Space from top in pixels
- **paddingBottom**: Space from bottom in pixels
- **position**: `above` (above device frame) or `overlay` (on gradient)

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

### `appshot build`
Generate final screenshots with frames, gradients, and captions.

Options:
- `--devices <list>` - Comma-separated device list
- `--preset <ids>` - Use specific App Store presets (e.g., iphone-6-9,ipad-13)
- `--config <file>` - Use specific config file (default: appshot.json)
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

Create dynamic App Store screenshots with partial device frames:

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

## Roadmap

- [x] Official App Store specifications support
- [x] Caption positioning (above/overlay)  
- [x] Partial frame support
- [x] Intelligent caption autocomplete
- [x] Apple Watch optimizations
- [ ] AI-powered translations
- [ ] Cloud rendering service
- [ ] Android device support
- [ ] Custom frame designer
- [ ] Figma plugin
- [ ] Web dashboard

## Support

- [Report issues](https://github.com/chrisvanbuskirk/appshot/issues)
- [Request features](https://github.com/chrisvanbuskirk/appshot/issues/new?labels=enhancement)
- [Documentation](https://github.com/chrisvanbuskirk/appshot/wiki)