---
description: Quick AppShot reference for common tasks and troubleshooting
---

# Quick AppShot Reference

## Complete Workflow (Copy-Paste Ready)
```bash
# 1. Initialize project
appshot init

# 2. Add screenshots to folders
cp ~/Desktop/screenshots/*.png screenshots/iphone/

# 3. Add captions
appshot caption --device iphone

# 4. Apply styling
appshot gradients --apply ocean
appshot fonts --set "Montserrat Bold"

# 5. Build final screenshots
appshot build
```

## All Non-Interactive Commands (Agent-Friendly)
```bash
# Project setup
appshot init --force                    # Create/overwrite project structure

# Styling
appshot gradients --apply ocean          # Apply gradient preset
appshot gradients --apply sunset
appshot fonts --set "Montserrat Bold"   # Set font
appshot fonts --set "Inter"

# Backgrounds
appshot backgrounds set iphone ./bg.png # Set background image
appshot backgrounds clear iphone        # Remove background

# Building
appshot build                            # Build all devices/languages
appshot build --devices iphone          # Specific device
appshot build --devices iphone,ipad     # Multiple devices
appshot build --langs en,es,fr          # Specific languages
appshot build --preset iphone-6-9        # App Store preset

# Frame only
appshot frame ./input.png               # Apply frame only
appshot frame ./screenshots --recursive # Batch frame

# Validation
appshot validate                        # Check App Store compliance
appshot doctor                          # System diagnostics
appshot doctor --json                   # JSON output
appshot specs                           # Show specifications
appshot specs --json                    # JSON specifications

# Cleanup
appshot clean                           # Remove output
appshot clean --all                     # Remove all generated files
```

## File Structure Reference
```
Project Root/
├── .appshot/
│   ├── config.json                    # Main configuration (EDIT THIS)
│   ├── captions/
│   │   ├── iphone.json               # iPhone captions (EDIT THIS)
│   │   ├── ipad.json                 # iPad captions
│   │   └── [device].json
│   └── caption-history.json          # Autocomplete data (auto-generated)
├── screenshots/
│   ├── iphone/                       # PUT SCREENSHOTS HERE
│   │   ├── home.png                  # Must match resolution in config
│   │   ├── features.png
│   │   └── background.png            # Optional background (auto-detected)
│   └── [device]/
└── final/                             # OUTPUT APPEARS HERE
    ├── iphone/
    │   ├── en/
    │   │   └── *.png                  # Final screenshots
    │   └── [lang]/
    └── [device]/
```

## Quick Configuration Fixes

### Wrong Dimensions Error
Edit `.appshot/config.json`:
```json
"devices": {
  "iphone": {
    "resolution": "1290x2796"  // Must match screenshot exactly
  }
}
```

### Caption Cut Off
Add to device config:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 400,
  "maxHeight": 400
}
```

### Change Gradient
```bash
appshot gradients --apply sunset
# Or edit config.json:
"background": {
  "gradient": {
    "colors": ["#FF5733", "#FFC300"]
  }
}
```

### Change Font
```bash
appshot fonts --set "Poppins Bold"
# Or edit config.json:
"caption": {
  "font": "Poppins Bold"
}
```

### No Frame Showing
```json
"autoFrame": true
```

### Device Position Changes
Use fixed caption height:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 320,
  "maxHeight": 320
}
```

## Essential Configurations

### iPhone App Store (Current Standard)
```json
{
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1290x2796",     // 6.9" display
      "autoFrame": true,
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320
      }
    }
  }
}
```

### iPad App Store
```json
{
  "devices": {
    "ipad": {
      "input": "./screenshots/ipad",
      "resolution": "2048x2732",     // 12.9" display
      "autoFrame": true
    }
  }
}
```

### Both iPhone + iPad
```json
{
  "devices": {
    "iphone": {
      "resolution": "1290x2796",
      "autoFrame": true,
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320
      }
    },
    "ipad": {
      "resolution": "2048x2732",
      "autoFrame": true
    }
  }
}
```

## App Store Requirements

### Required Resolutions
- **iPhone 6.9"**: `1290×2796` or `1320×2868` (REQUIRED)
- **iPhone 6.5"**: `1284×2778` or `1242×2688` (Alternative)
- **iPad 13"**: `2064×2752` or `2048×2732` (REQUIRED)
- **Mac**: `2880×1800` (16:10 ratio)
- **Watch**: `410×502` (Ultra) or `396×484` (Series 9)

### Quick Validation
```bash
appshot validate  # Shows if resolutions are correct
```

## Available Gradient Presets (24 Total)
```bash
# Warm
appshot gradients --apply sunset    # #FF5733 → #FFC300
appshot gradients --apply sunrise   # #F37335 → #FDC830

# Cool
appshot gradients --apply ocean     # #0077BE → #33CCCC
appshot gradients --apply arctic    # #72EDF2 → #5151E5

# Vibrant
appshot gradients --apply fire      # #FF0099 → #493240
appshot gradients --apply electric  # #7F00FF → #E100FF

# Subtle
appshot gradients --apply grayscale # #434343 → #000000
appshot gradients --apply pastel    # #FFDEE9 → #B5FFFC

# Brand
appshot gradients --apply instagram # Purple-Red-Orange
appshot gradients --apply spotify   # Green to Black
```

## Embedded Fonts (Always Available)
```bash
# Modern UI
appshot fonts --set "Inter"
appshot fonts --set "Poppins Bold"
appshot fonts --set "Montserrat Bold"

# Web Safe
appshot fonts --set "Roboto"
appshot fonts --set "Open Sans"

# Monospace
appshot fonts --set "JetBrains Mono"
```

## Test Commands

### Test Single Screenshot
```bash
appshot frame ./test.png --output ./framed.png
```

### Clean and Rebuild
```bash
appshot clean --all
appshot build
```

### Dry Run (Preview)
```bash
appshot build --dry-run
```

## Common Workflows

### New iPhone-Only Project
```bash
appshot init
# Edit .appshot/config.json - remove ipad, mac, watch
appshot caption --device iphone
appshot gradients --apply ocean
appshot build --devices iphone
```

### Multi-Language App Store
```bash
appshot init
appshot caption --device iphone --translate --langs es,fr,de,it,pt,ja,ko,zh-CN
appshot caption --device ipad --translate --langs es,fr,de,it,pt,ja,ko,zh-CN
appshot build
```

### Custom Background Project
```bash
appshot init
# Add background.png to screenshots/iphone/
# Add background.png to screenshots/ipad/
appshot build --auto-background
```

## Environment Variables
```bash
# For translations
export OPENAI_API_KEY="sk-..."

# For CI/CD
export APPSHOT_DISABLE_FONT_SCAN=1  # Skip font detection
```

## Exit Codes
- `0` - Success
- `1` - Error (check output for details)

## Debug Information
```bash
# System check
appshot doctor

# Verbose output
appshot build --verbose

# Version
appshot --version
```

## Quick JSON Edits

### Change Font Size
```json
"caption": {
  "fontsize": 96
}
```

### Change Caption Position
```json
"caption": {
  "position": "above"  // or "below", "overlay"
}
```

### Add Caption Background
```json
"caption": {
  "background": {
    "color": "#000000",
    "opacity": 0.65,
    "padding": 20
  }
}
```

### Add Caption Border
```json
"caption": {
  "border": {
    "color": "#FFFFFF",
    "width": 1,
    "radius": 20
  }
}
```

## Argument Reference for Commands
- `$1` - First argument passed to command
- `$2` - Second argument
- `$ARGUMENTS` - All arguments as string

## Need More Details?
Use other AppShot commands:
- `/appshot-init` - Project initialization details
- `/appshot-style` - Complete styling options
- `/appshot-caption` - Caption and translation guide
- `/appshot-build` - Build process and troubleshooting
- `/appshot-config` - Full configuration reference