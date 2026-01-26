# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] - 2026-01-25

### 🐛 Fixed
- **CI Workflow Deduplication**: Removed duplicate push/PR triggers from `ci-unit.yml` and `ci-visual.yml` that caused parallel workflow runs and allowed releases when standalone tests failed
- **Test Timeout**: Increased `background-integration.test.ts` timeout to 60s for Windows CI stability

## [2.0.0] - 2026-01-25

### ✨ Added
- **Layout v2 Engine:** Fixed caption/device zones with three layouts (header, footer, screenshot-only)
- **Config v2:** New `version: 2` schema focused on styling (fonts/colors/backgrounds) with deterministic layout rules
- **Device Strategies:** Per-device ratios, font sizes, line limits, and padding constants
- **Migration Command:** `appshot migrate` converts v1 configs to v2 with warnings + backups

### 🔄 Changed
- **Templates:** Replaced v1 template IDs with v2 presets (`ocean-header`, `sunset-footer`, `clean-screenshot`, `pastel-header`, `noir-footer`, `silver-header`, `tropical-header`, `slate-footer`, `midnight-header`)
- **Quickstart/Style:** v2 flows now choose layout + gradient + caption color; positioning knobs removed
- **Compose:** New `composeV2()` path with v1 preserved for compatibility

### ⚠️ Deprecated
- **v1 Layout Options:** `caption.position`, `framePosition`, `frameScale`, `caption.box.*`, and overlay mode
- **Legacy Template IDs:** v1 template names remain as deprecated aliases

## [1.0.3] - 2025-01-21

### ✨ Added
- **MCP Tool Annotations:** Added `readOnlyHint` and `destructiveHint` annotations to all 18 MCP tools per MCP Directory Policy
  - Read-only tools (6): `projectInfo`, `doctor`, `specs`, `validate`, `languages`, `fonts`
  - Destructive tools (12): `build`, `frame`, `export`, `init`, `clean`, `localize`, `presets`, `config`, `captions`, `gradients`, `backgrounds`, `template`, `quickstart`

## [1.0.2] - 2025-01-21

### 🐛 Fixed
- **Language Mapping:** Added `es-419` (BCP-47 Latin American Spanish), `es-latam`, and `es-la` to default Fastlane language mappings, all mapping to `es-MX`
- **Broken Symlink Handling:** Fixed `--clean` option in export command to properly detect and remove broken symlinks in ancestor directories
- **Windows Path Handling:** Fixed symlink cleanup to correctly handle Windows drive roots (e.g., `C:\`) by using `path.parse().root` instead of `path.sep`
- **Windows Git Root:** Normalized git root path in safety checks to handle forward slashes returned by git on Windows
- **Filesystem Root Safety:** Fixed path prefix check in `isSafeToClean` to avoid double separators when repo/CWD is at filesystem root

## [1.0.1] - 2025-01-20

### 🐛 Fixed
- **Claude Desktop Compatibility:** Changed MCP tool names from `appshot.X` to `appshot_X` to comply with Claude Desktop's tool name validation pattern (`^[a-zA-Z0-9_-]{1,64}$`)

## [1.0.0] - 2025-01-19

### ✨ Added
- **MCP Server:** Full Model Context Protocol support with `appshot mcp` command
- **17 MCP Tools:** Complete agent coverage:
  - `appshot_projectInfo` - Get project metadata
  - `appshot_init` - Initialize projects
  - `appshot_build` - Generate screenshots
  - `appshot_frame` - Apply device frames
  - `appshot_captions` - Read/write/auto-generate caption text
  - `appshot_gradients` - List/apply gradient presets
  - `appshot_backgrounds` - Configure background images
  - `appshot_fonts` - List/validate fonts
  - `appshot_config` - Modify device settings
  - `appshot_validate` - Check App Store compliance
  - `appshot_specs` - View App Store specifications
  - `appshot_doctor` - Run diagnostics
  - `appshot_presets` - Manage presets
  - `appshot_localize` - AI caption translation
  - `appshot_languages` - Discover translations
  - `appshot_export` - Fastlane export
  - `appshot_clean` - Remove generated files
- **Auto-Caption:** Generate captions from filenames automatically
  - CLI: `appshot build --auto-caption`
  - MCP: `appshot_captions` with `action: "auto"` or `action: "bulk-set"`
  - Converts `home-screen.png` → "Home Screen"
- **Skill Install Command:** `appshot skill` installs Claude Code skill
  - Includes template recommendations by app type
  - Troubleshooting guide for common errors
  - Reference files for gradients, fonts, templates
- **Claude Code Skill:** Enhanced skill with 4 reference files
- **Frame Tone Option:** `appshot frame --frame-tone neutral` for desaturated frames

### 🔄 Changed
- Removed legacy Claude Code slash commands in favor of MCP tools and skill
- Updated documentation with MCP integration guide

## [0.8.7] - 2025-09-04

### 🐛 Bug Fixes
- **Default Resolutions**: Updated default iPhone resolution from 1284x2778 to 1290x2796 to match current App Store requirements (iPhone 6.9" display)
- **Watch Resolution**: Updated default Apple Watch resolution from 368x448 to 410x502 (Apple Watch Ultra) for latest devices
- **Caption Structure**: Fixed issue where caption command was creating incorrect file structure with language keys at top level

### 🛠️ Improvements
- **App Store Compliance**: All default device resolutions now match the latest App Store screenshot specifications
- **Test Updates**: Updated all test files to use the new correct resolutions
- **Documentation**: Updated README and CLAUDE.md with corrected resolution values

## [0.8.6] - 2025-09-04

### ✨ New Features

#### 🎨 Background Images System
- **Custom Backgrounds**: Replace gradients with static images for unique, branded screenshots
- **Auto-Detection**: Automatically finds `background.png` in device folders
- **Multiple Formats**: Support for PNG, JPEG, and JPG formats
- **Fit Modes**: Four scaling modes - cover, contain, fill, and scale-down
- **Dimension Validation**: Warns about size mismatches with App Store specifications
- **Fallback Chain**: Device image → Global image → Gradient → Solid color

#### 🎮 Background Commands
- `appshot backgrounds set` - Configure background images for devices
- `appshot backgrounds validate` - Check dimensions against App Store specs
- `appshot backgrounds list` - Show all configured and auto-detected backgrounds
- `appshot backgrounds clear` - Remove background configurations
- `appshot backgrounds preview` - Generate preview with backgrounds

#### 🚀 Build Options
- `--auto-background` - Auto-detect background.png files in device folders
- `--background <path>` - Use specific background image for all devices
- `--background-fit <mode>` - Set scaling mode (cover/contain/fill/scale-down)
- `--no-background` - Disable backgrounds for transparent output

### 🛠️ Improvements
- **Mixed Configurations**: Different devices can use backgrounds or gradients independently
- **Smart Fit Detection**: Automatically suggests best fit mode based on dimensions
- **File Size Warnings**: Alerts for images over 10MB with optimization suggestions
- **Watch Centering Fix**: Fixed Apple Watch device positioning to be properly centered
- **Background Exclusion**: Background files no longer counted as screenshots

### 🐛 Bug Fixes
- Fixed Watch device being offset instead of centered
- Fixed background.png files being processed as screenshots
- Removed special Watch positioning that caused misalignment
- Adjusted Watch scale from 130% to 90% for proper sizing

### 📚 Documentation
- Added comprehensive Background System section to README
- Included ImageMagick examples for creating custom backgrounds
- Added configuration examples for mixed background/gradient setups
- Created dimension validation guidelines

### 🧪 Testing
- Added 54 new tests across 5 test files
- Test coverage for background exclusion, fallback chain, and dimension validation
- Integration tests for all fit modes and configurations
- CLI command tests for backgrounds management

### 📦 Technical Details
- New `background.ts` module with rendering and validation logic
- `BackgroundConfig` type in TypeScript definitions
- Integration with existing compose pipeline
- Backwards compatible - gradients still work as before

## [0.8.5] - 2025-09-02

### ✨ New Features

#### 📱 Device Capture (macOS only)
- Capture screenshots directly from iOS simulators with `appshot device capture`
- List available simulators with `appshot device list`
- Auto-detect device types from screenshot dimensions
- Direct integration with processing pipeline
- Boot simulators with `appshot device prepare`
- Smart routing to project directories based on device type

#### 👁️ Watch Mode (macOS only)
- File system monitoring for automatic screenshot processing
- Background service with PID management using `--background` flag
- Duplicate detection using MD5 hashing to prevent reprocessing
- Processing queue with retry logic (3 attempts per file)
- Commands: `watch start`, `watch stop`, `watch status`, `watch setup`
- Multi-directory monitoring with `--dirs` option
- Interactive configuration with `watch setup`

### 🛠️ Improvements
- Added npm downloads and Node.js version badges to README
- Improved test coverage with platform-specific test skipping
- Enhanced error messages for macOS-only features
- Better handling of simulator environments in CI

### 📦 Technical Details
- 7 new service modules for watch and device functionality
- 4 new CLI commands with comprehensive help documentation
- Processing queue with SHA256 hash-based duplicate detection
- PID management for clean service lifecycle
- Platform-specific features with graceful fallbacks

### 📊 Stats
- 29 new tests across 4 test files
- All 528 tests passing
- 3,489 lines of new functionality

## [0.8.0] - 2025-09-01

### ✨ New Features

#### 🎭 Frame-Only Mode
- New `appshot frame` command for standalone device framing without gradients/captions
- Outputs transparent PNGs perfect for design workflows
- Auto-detects device type using intelligent heuristics based on aspect ratios and pixel counts
- Supports batch processing of entire directories with `--recursive`
- No configuration required - works instantly

#### 🤖 Intelligent Device Detection
- `detectDeviceTypeFromDimensions()` function for automatic device type detection
- Supports iPhone, iPad, Mac, and Apple Watch detection
- Uses aspect ratios and pixel count thresholds for accurate classification

### 🔧 Usage Examples
```bash
# Frame a single screenshot
appshot frame screenshot.png

# Batch process a directory
appshot frame ./screenshots --recursive

# Force device type
appshot frame screenshot.png --device iphone
```

### 📊 Testing
- 46 new tests added for device detection logic and frame command
- Visual tests for frame composition quality

## [0.7.0] - 2025-08-25

### ✨ New Features

#### 🎨 Caption Styling System
- **Text Colors**: Configurable via hex values
- **Backgrounds**: Color, opacity (0-1), and padding support
- **Borders**: Color, width (1-10px), and rounded corners (radius 0-30px)
- **Full-width styling**: Professional, uniform appearance across all devices
- **Device-specific overrides**: Customize styling per device type

#### 📍 Caption Positioning
- **Three modes**: `above` (default), `below`, and `overlay`
- **Interactive configuration**: Via enhanced `style` command
- **Device-specific overrides**: Different positions for different devices
- **Complete implementation**: All three modes fully functional

#### 🔤 Enhanced Font Support
- **JetBrains Mono**: 4 variants for code/technical content
- **Fira Code**: 4 variants for developer-focused screenshots
- **Total**: 10 embedded fonts with 50+ variants available

### 🔧 Improvements
- **Fixed**: `--config` parameter now accepts custom config files
- Enhanced `style` command with interactive prompts for all new features
- Updated help text with comprehensive styling options
- **SVG-based rendering**: Crisp text at any resolution
- **Optimized compose pipeline**: Better performance
- **Consistent margins**: 30px side margins for all caption styling

### 📸 Example Configuration
```json
{
  "caption": {
    "color": "#FFFFFF",
    "position": "below",
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
```

### 📊 Testing
- Added **45+ new tests** for caption styling and positioning
- All tests passing (400+ tests)
- New test files: `caption-styling.test.ts`, `caption-positioning.test.ts`

## [0.6.0] - 2025-08-23

### ✨ New Features

#### 🎨 Embedded Fonts with Variants
- Bundled 8 popular font families (32 font files total)
- Each family includes Regular, Italic, Bold, and BoldItalic variants
- Fonts: Poppins, Montserrat, Roboto, Lato, Inter, Open Sans, DM Sans, Work Sans
- Automatic variant detection from font names
- Proper SVG rendering with font-style and font-weight attributes
- Works consistently across all platforms

#### 🔍 Dry-Run Mode
- `--dry-run` flag for build command
- Preview what would be generated without creating files
- Shows file mappings and metadata
- Useful for validation and CI/CD pipelines

#### 🐛 Verbose Debugging
- `--verbose` flag for detailed output
- Step-by-step logging of image composition
- Helpful for troubleshooting rendering issues

### 📚 Enhanced Documentation
- Comprehensive help text for all commands
- Added examples and usage patterns
- Documented all command options
- Improved command descriptions

### 🚀 Quick Start Examples
```bash
# Try embedded fonts
appshot fonts --embedded

# Use font variants
appshot fonts --set "Poppins Italic"

# Preview build without generating files
appshot build --dry-run

# Debug with verbose output
appshot build --verbose
```

## [0.5.0] - 2025-08-22

### ✨ New Features

#### 🩺 Doctor Command
New comprehensive diagnostic command for troubleshooting and verifying system requirements:

```bash
appshot doctor              # Run all diagnostics
appshot doctor --json       # Output as JSON for CI/CD
appshot doctor --verbose    # Detailed troubleshooting info
appshot doctor --category system,fonts  # Run specific checks
```

**Diagnostic Categories:**
- **System**: Node.js version (≥18.0.0), npm, OS compatibility
- **Dependencies**: Sharp module and native bindings
- **Fonts**: Platform-specific font detection
- **Filesystem**: Write permissions and directory access
- **Frames**: Asset validation and missing frame identification

#### 📊 Enhanced Specs Command
Now outputs Apple's exact App Store screenshot specifications:

```bash
appshot specs               # View formatted specifications
appshot specs --json        # Output as JSON for diffing
```

**Features:**
- Mirrors official Apple developer documentation
- Includes "Last Updated" date (2024-12-01)
- JSON output perfect for tracking specification changes
- Direct from Apple's official specifications

### 📊 Testing
- ✅ All 384 tests passing
- ✅ 45+ new tests for doctor and specs commands
- ✅ Full integration test coverage

## [0.4.0] - 2025-08-22

### ✨ New Features

#### 🔍 Font Validation System
- **Font Service** (`src/services/fonts.ts`) with proper system font detection
- System font detection for macOS, Linux, and Windows
- Font validation against actual installed fonts
- Intelligent fallback chain generation
- Categorized font recommendations

#### 🔤 Enhanced Font Commands
- `appshot fonts --all` - List all system fonts
- `appshot fonts --validate <name>` - Check font availability
- `appshot fonts --set <name>` - Set fonts with validation
- `appshot fonts --json` - Machine-readable output
- Visual indicators: ✓ for installed, ⚠ for not installed

### 🐛 Bug Fixes
- **Critical Fix**: Users can no longer select fonts that aren't installed on their system
- Fixed silent fallback to system fonts without user awareness
- Added warnings and confirmation prompts for uninstalled fonts

### 📊 Comprehensive Testing Infrastructure
- **Integration Tests** (22 scenarios) with full CLI command testing
- **CI/CD Workflows** with multi-OS testing (Ubuntu, macOS, Windows)
- Multi-Node version testing (18.x, 20.x, 22.x)
- Added **50+ new tests** covering font system validation

### 🌍 Multi-Language Support
- Language detection utilities
- Migration command for language directories
- Font localization in multi-language builds

### 📚 Documentation Updates
- Reorganized README.md structure for better clarity
- Enhanced CLAUDE.md with testing strategy documentation
- Updated command examples and font feature documentation

## [0.3.0] - 2025-08-20

### 🤖 AI-Powered Translation System

#### ✨ New Features
- **Translation Service** (`src/services/translation.ts`) for managing all translation operations
- **OpenAI Integration** supporting GPT-4o, GPT-5, o1, and o3 models
- **Real-time Translation** in caption command with `--translate` flag
- **Batch Translation** with new `localize` command for processing all existing captions
- **Smart Caching** with composite keys to avoid duplicate API calls and reduce costs
- **25+ Language Support** with ISO codes

#### 🔧 Model Configuration
- **Dynamic Parameter Selection**: 
  - GPT-4o: Uses `max_tokens`, temperature 0.3
  - GPT-5: Uses `max_completion_tokens`, temperature 1.0
  - o1/o3: Uses `max_completion_tokens`, temperature 1.0
- **Marketing-optimized** translation prompts for App Store context

#### 🚀 Usage Examples
```bash
# Real-time translation during caption entry
appshot caption --device iphone --translate --langs es,fr

# Batch translate all existing captions
appshot localize --langs es,fr,de --model gpt-4o
```

### 📚 Documentation
- Added comprehensive AI-Powered Translation section to README.md
- Complete architecture documentation in CLAUDE.md
- Setup instructions, supported models, and workflow examples

### 🐛 Bug Fixes
- Fixed CLI version number to match package.json (0.1.0 → 0.3.0)

### 📊 Testing
- All 229 tests passing
- Added translation functionality test coverage

## [0.2.2] - 2025-08-20

### 🤖 Agent-First Design Release

This release transforms appshot into a fully agent-compatible CLI tool with structured JSON output for all specification and validation commands.

#### ✨ New Features

##### JSON Output Support
- `appshot specs --json` - Output device specifications as JSON
- `appshot presets --json` - Output App Store presets as JSON (**NEW**)
- `appshot validate --json` - Output validation results as JSON with summary stats (**NEW**)
- All JSON commands respect their respective filters (`--required`, `--category`, `--strict`)

##### 📚 Agent Integration Documentation
- Added comprehensive "Agent-First Design" section to README
- MCP (Model Context Protocol) integration examples
- Python and Node.js automation workflow examples
- Enhanced CLAUDE.md with agent-specific guidance

#### 🔧 Example Usage
```bash
# Get all iPhone presets as JSON
appshot presets --json --category iphone

# Validate screenshots with structured output
appshot validate --json --strict

# Parse with jq or other tools
appshot presets --json --required | jq '.iphone'
```

#### 🤖 Python Automation Example
```python
import json
import subprocess

# Get validation results
result = subprocess.run(['appshot', 'validate', '--json'], 
                       capture_output=True, text=True)
validation = json.loads(result.stdout)

# Check for issues
if validation['summary']['invalid'] > 0:
    print(f"Found {validation['summary']['invalid']} invalid screenshots")
```

#### 🧪 Testing
- All 203 tests passing
- Manually tested all JSON output modes

## [0.2.0] - 2025-08-20

### 🎨 Gradient Presets System

#### ✨ New Features

##### **Gradient Presets** 
- 24+ built-in gradient presets across 6 categories:
  - 🔥 **Warm** - Sunset, autumn, golden, coral
  - ❄️ **Cool** - Ocean, arctic, mint, twilight  
  - 🎨 **Vibrant** - Neon, tropical, rainbow, vivid
  - 🕊️ **Subtle** - Pastel, lavender, peach, sky
  - ⚫⚪ **Monochrome** - Noir, silver, charcoal, pearl
  - 🏢 **Brand-Inspired** - Instagram, Spotify, Twitter, Slack

##### **New Commands**
- `appshot gradients` - Browse all gradient presets with color previews
- `appshot gradients --apply <id>` - Apply a gradient to your project
- `appshot gradients select` - Interactive gradient selection
- `appshot gradients --preview <id>` - Generate preview image
- `appshot gradients --sample` - Generate samples with HTML gallery
- `appshot style` - Configure device positioning and caption styling

### 🛠️ Improvements
- **Fixed Caption Box Sizing** - Consistent device positioning across screenshots
- **Better Text Wrapping** - Improved caption text wrapping for all devices
- **Enhanced Frame Registry** - Added 51 device frames including iPhone 16 series

### 🔧 Technical Changes
- Added `src/core/gradient-presets.ts` with gradient definitions
- New `src/commands/gradients.ts` CLI command
- New `src/commands/style.ts` for device styling
- Added `src/core/text-utils.ts` for text wrapping utilities
- Fixed `escapeXml` function hoisting issue
- Replaced magic numbers with named constants

### 🚀 Quick Start
```bash
# Browse available gradients
appshot gradients

# Apply a gradient
appshot gradients --apply ocean

# Interactive selection
appshot gradients select
```

### 📊 Testing
- Comprehensive test coverage (203 tests)
- All tests passing

## [0.1.0] - 2025-08-20

### 🎉 Initial Release - Now on NPM!

#### Installation
```bash
npm install -g appshot-cli
```

### ✨ Features

#### Core Functionality
- 🖼️ **Smart Frame Selection** - Automatically detects portrait/landscape orientation
- 🎨 **Beautiful Gradients** - Customizable gradient backgrounds
- ✏️ **Smart Captions** - With autocomplete and learning system
- 🌍 **Multi-Language Support** - Build for multiple locales
- 📱 **Multi-Device Support** - iPhone, iPad, Mac, Apple TV, Vision Pro, and Apple Watch

#### Caption System
- 🔍 **Intelligent Autocomplete** - Suggests captions as you type
- 📊 **Frequency Tracking** - Prioritizes commonly used captions
- 🎯 **Device-Specific Suggestions** - Tailored to each device type
- 🔤 **Fuzzy Search** - Finds captions even with typos

#### App Store Ready
- 📏 **Official Specifications** - All App Store required resolutions
- ✅ **Validation** - Verify screenshots meet requirements
- 🎯 **Presets** - Quick setup for standard configurations

#### Device Optimizations
- ⌚ **Apple Watch** - Special handling for watch screenshots
  - Caption in top 1/3 of screen
  - Two-line text wrapping
  - Optimized scaling and positioning
- 📱 **Smart Orientation** - Automatic frame selection based on screenshot dimensions
- 🖼️ **Partial Frames** - Option to cut off device bottom for dynamic look

### 📦 What's Included
- 151 automated tests
- Comprehensive documentation
- All Apple device frames
- TypeScript source code
- Example configurations

### 🚀 Quick Start
```bash
# Install globally
npm install -g appshot-cli

# Initialize project
appshot init

# Add captions interactively
appshot caption --device iphone

# Build screenshots
appshot build
```

### 📝 Notes
- Package name is `appshot-cli` on NPM
- Command is still `appshot` for better UX
- Requires Node.js >= 18

---

## Links

- **NPM Package**: https://www.npmjs.com/package/appshot-cli
- **GitHub Repository**: https://github.com/chrisvanbuskirk/appshot
- **Documentation**: https://github.com/chrisvanbuskirk/appshot#readme
## [0.9.0] - 2025-09-09

### ⚠ Behavior Notice
- Refined caption placement logic. Results may differ from 0.8.x in edge cases:
  - Overlay captions anchor to the bottom of their outer box (padding/border included). Explicit `0` values are respected for bottom spacing.
  - Above/Below captions enforce a small optical gap from the device and remain fully on‑canvas. When device + caption cannot both fit, the engine adapts placement while preserving order.

### ✨ Additions & Fixes
- Overlay: bottom anchoring uses full box metrics (text + padding + border).
- Watch: improved below placement around bands; safer caption/device ordering.
- Template applier: template `caption.fontsize` now takes effect unless a device override sets `captionSize`; zeros respected with `??` fallbacks.
