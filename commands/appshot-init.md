---
description: Initialize and configure AppShot project with complete device specifications
allowed-tools: Bash, Edit, Write
---

# Initialize AppShot Project for $1

## Quick Start
```bash
appshot init  # Creates all 4 devices (iphone, ipad, mac, watch)
```

## What Gets Created
```
.appshot/
├── config.json          # Main configuration file
└── captions/
    ├── iphone.json      # Empty caption files ready for content
    ├── ipad.json
    ├── mac.json
    └── watch.json
screenshots/
├── iphone/              # Put your 1290x2796 or 1320x2868 screenshots here
├── ipad/                # Put your 2048x2732 or 2064x2752 screenshots here
├── mac/                 # Put your 2880x1800 screenshots here
└── watch/               # Put your 410x502 screenshots here
```

## Default Resolutions (App Store Compliant - v0.8.7+)
- **iPhone**: `1290x2796` (6.9" display) - REQUIRED for App Store
  - Alternative: `1320x2868` (also accepted for 6.9")
  - Legacy: `1284x2778` (older 6.5" devices - not recommended)
- **iPad**: `2048x2732` (12.9") - REQUIRED for App Store
  - Alternative: `2064x2752` (13" display)
- **Mac**: `2880x1800` (16:10 aspect ratio)
- **Watch**: `410x502` (Ultra) 
  - Alternative: `396x484` (Series 9)
  - Legacy: `368x448` (Series 6/5/4)

## Configure for Specific Devices Only

### iPhone Only Setup
After running `appshot init`, edit `.appshot/config.json`:
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
    "paddingTop": 100,
    "position": "above"
  },
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1290x2796",
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
Remove the ipad, mac, and watch sections from devices.

### Multiple Devices (iPhone + iPad for App Store)
Keep both devices, remove mac and watch:
```json
{
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1290x2796",
      "autoFrame": true,
      "captionBox": {
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320
      }
    },
    "ipad": {
      "input": "./screenshots/ipad",
      "resolution": "2048x2732",
      "autoFrame": true
    }
  }
}
```

## Important Configuration Tips

### 1. Caption Box for Consistent Device Positioning
Add `captionBox` to ensure the device frame stays in the same position across all screenshots:
```json
"captionBox": {
  "autoSize": false,      // Don't auto-size based on text
  "minHeight": 320,       // Fixed height for all screenshots
  "maxHeight": 320        // Same as minHeight for consistency
}
```
This prevents the device from jumping up/down when captions have different lengths.

### 2. Screenshot Requirements
- **Must be EXACT resolution** specified in config (e.g., exactly 1290x2796 for iPhone)
- **PNG format** recommended (JPEG also supported)
- **Place in** `screenshots/[device]/` folder
- **Filename becomes caption key** (e.g., `home.png` → `"home.png"` in captions file)

### 3. Background Images (Optional)
Auto-detection method:
- Place `background.png` in device folder (e.g., `screenshots/iphone/background.png`)
- AppShot automatically uses it and excludes from screenshot processing

Manual configuration:
```json
"background": {
  "mode": "image",
  "image": "./assets/background.png",
  "fit": "cover"
}
```

### 4. Gradient vs Background Priority
1. Device-specific background (if configured)
2. Global background image (if configured)
3. Gradient (default or configured)
4. Solid color fallback

## Complete Workflow After Init

### Step 1: Add Screenshots
```bash
# Copy your screenshots to the appropriate folders
cp ~/Desktop/iphone-screens/*.png screenshots/iphone/
cp ~/Desktop/ipad-screens/*.png screenshots/ipad/

# Verify dimensions match config
identify screenshots/iphone/*.png
# Should show: 1290x2796 or 1320x2868
```

### Step 2: Add Captions
```bash
# Interactive caption entry
appshot caption --device iphone

# With AI translation
appshot caption --device iphone --translate --langs es,fr,de
```

### Step 3: Style Your Screenshots
```bash
# Apply a gradient preset
appshot gradients --apply ocean

# Set a font
appshot fonts --set "Montserrat Bold"
```

### Step 4: Build Final Screenshots
```bash
# Build all devices
appshot build

# Build specific devices
appshot build --devices iphone,ipad

# Build with specific languages
appshot build --langs en,es,fr
```

## Troubleshooting Common Issues

### "Dimensions are wrong" Error
Your screenshots must EXACTLY match the resolution in config:
- Check with: `identify screenshots/iphone/*.png`
- Update config if needed: `"resolution": "1290x2796"`

### "No frame found" Error
Enable auto-framing in config:
```json
"autoFrame": true
```

### Caption Text Cut Off
Increase the caption box height:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 400,  // Increase this
  "maxHeight": 400
}
```

### Device Position Inconsistent
Use fixed caption box height (see tip #1 above)

### Background Image Not Showing
Check the path and mode:
```json
"background": {
  "mode": "image",
  "image": "./path/to/background.png",
  "fit": "cover"
}
```

## Device-Specific Init Examples

### For iPhone 6.9" (Current Standard)
```json
"resolution": "1290x2796"  // or "1320x2868"
```

### For iPad 13"
```json
"resolution": "2064x2752"  // or "2048x2732"
```

### For Apple Watch Ultra
```json
"resolution": "410x502"
```

## Non-Interactive Init (CI/CD)
```bash
# Force overwrite existing config
appshot init --force

# Then programmatically edit config
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('.appshot/config.json'));
delete config.devices.mac;
delete config.devices.watch;
config.devices.iphone.captionBox = {autoSize: false, minHeight: 320, maxHeight: 320};
fs.writeFileSync('.appshot/config.json', JSON.stringify(config, null, 2));
"
```

## Validation After Init
```bash
# Check system setup
appshot doctor

# Validate against App Store requirements
appshot validate

# Show all App Store specifications
appshot specs
```