---
description: Complete AppShot configuration reference with every option explained
allowed-tools: Edit, Write
---

# Complete AppShot Configuration Reference

## Full Configuration Schema with All Options

```json
{
  "output": "./final",
  "frames": "./frames",
  
  "background": {
    "mode": "gradient",          // "gradient" | "image" | "auto"
    "image": "./background.png", // Path to background image
    "fit": "cover",              // "cover" | "contain" | "fill" | "scale-down"
    "position": "center",        // "center" | "top" | "bottom" | "left" | "right"
    "color": "#000000",          // Solid color fallback
    "gradient": {
      "colors": ["#FF5733", "#FFC300"],
      "direction": "top-bottom"  // "top-bottom" | "bottom-top" | "left-right" | "right-left" | "diagonal"
    },
    "fallback": "gradient",     // "gradient" | "solid"
    "warnOnMismatch": true      // Warn if image size doesn't match device
  },
  
  "gradient": {                  // Legacy - use background.gradient instead
    "colors": ["#FF5733", "#FFC300"],
    "direction": "top-bottom"
  },
  
  "caption": {
    "font": "Montserrat Bold",  // Font name (embedded or system)
    "fontsize": 64,              // Size in pixels
    "color": "#FFFFFF",          // Hex color for text
    "align": "center",           // "left" | "center" | "right"
    "position": "above",         // "above" | "below" | "overlay"
    "paddingTop": 100,           // Space above device/caption
    "paddingBottom": 60,         // Space below device/caption
    "paddingLeft": 30,           // Horizontal padding
    "paddingRight": 30,
    
    "box": {                     // Caption area settings
      "autoSize": true,          // Auto-height based on text
      "maxLines": 3,             // Max lines before truncation
      "lineHeight": 1.4,         // Line spacing multiplier
      "minHeight": 100,          // Minimum caption area height
      "maxHeight": 400           // Maximum caption area height
    },
    
    "background": {              // Caption background box
      "color": "#000000",        // Background color
      "opacity": 0.8,            // 0=transparent, 1=solid
      "padding": 20              // Padding inside background
    },
    
    "border": {                  // Caption border
      "color": "#FFFFFF",        // Border color
      "width": 2,                // 1-10 pixels thickness
      "radius": 12               // 0-30 corner radius
    }
  },
  
  "devices": {
    "[device-name]": {           // iphone, ipad, mac, watch, or custom
      "input": "./screenshots/[device]",
      "resolution": "WIDTHxHEIGHT",
      "frame": "frame-name",     // Specific frame to use
      "autoFrame": true,         // Auto-detect frame from resolution
      "preferredFrame": "iphone-15-pro-portrait",
      
      "partialFrame": false,     // Cut bottom portion of frame
      "frameOffset": 25,         // How much to cut (percentage)
      "framePosition": "center", // "top" | "center" | "bottom" | 0-100
      "frameScale": 0.9,         // Device size multiplier (0.5-2.0)
      
      "captionPosition": "above",      // Override global caption position
      "captionFont": "Poppins Bold",   // Override global font
      "captionSize": 72,               // Override global size
      "captionBox": {                  // Override caption box
        "autoSize": false,
        "minHeight": 320,
        "maxHeight": 320
      },
      
      "captionBackground": {     // Override caption background
        "color": "#0000FF",
        "opacity": 0.5,
        "padding": 25
      },
      
      "captionBorder": {         // Override caption border
        "color": "#FFFF00",
        "width": 3,
        "radius": 15
      },
      
      "background": {            // Device-specific background
        "mode": "image",
        "image": "./device-bg.png",
        "fit": "cover",
        "warnOnMismatch": false
      }
    }
  },
  
  "defaultLanguage": "en",       // Override system language detection
  "useEmbeddedFonts": true,      // Prefer bundled fonts over system
  
  "watch": {                     // Watch mode configuration
    "directories": ["./screenshots", "./Downloads"],
    "devices": ["iPhone 15 Pro", "iPad Pro"],
    "process": true,             // Auto-process new screenshots
    "frameOnly": false,          // Frame-only mode (no gradient/caption)
    "verbose": false,            // Detailed output
    "autoStart": false           // Start watch on init
  }
}
```

## Common Configuration Examples

### Minimal (Single Device)
```json
{
  "output": "./final",
  "gradient": {
    "colors": ["#FF5733", "#FFC300"]
  },
  "caption": {
    "font": "SF Pro",
    "fontsize": 64,
    "color": "#FFFFFF"
  },
  "devices": {
    "iphone": {
      "input": "./screenshots",
      "resolution": "1290x2796",
      "autoFrame": true
    }
  }
}
```

### App Store Marketing (Professional)
```json
{
  "output": "./app-store",
  "background": {
    "gradient": {
      "colors": ["#0077BE", "#33CCCC"],
      "direction": "diagonal"
    }
  },
  "caption": {
    "font": "Montserrat Bold",
    "fontsize": 96,
    "color": "#FFFFFF",
    "position": "above",
    "paddingTop": 120,
    "paddingBottom": 60,
    "background": {
      "color": "#000000",
      "opacity": 0.65,
      "padding": 25
    },
    "border": {
      "color": "#FFFFFF",
      "width": 1,
      "radius": 20
    }
  },
  "devices": {
    "iphone": {
      "input": "./screenshots/iphone",
      "resolution": "1290x2796",
      "autoFrame": true,
      "captionBox": {
        "autoSize": false,
        "minHeight": 350,
        "maxHeight": 350
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

### Custom Backgrounds Per Device
```json
{
  "background": {
    "mode": "auto",  // Auto-detect background.png
    "fallback": "gradient"
  },
  "devices": {
    "iphone": {
      "background": {
        "mode": "image",
        "image": "./assets/iphone-bg.png",
        "fit": "cover"
      }
    },
    "ipad": {
      "background": {
        "mode": "image",
        "image": "./assets/ipad-bg.png",
        "fit": "contain"
      }
    }
  }
}
```

### Multi-Language with Fixed Layouts
```json
{
  "defaultLanguage": "en",
  "caption": {
    "font": "Inter Bold",
    "fontsize": 72,
    "position": "above",
    "box": {
      "autoSize": false,
      "minHeight": 300,
      "maxHeight": 300
    }
  },
  "devices": {
    "iphone": {
      "resolution": "1290x2796",
      "captionBox": {
        "minHeight": 320,
        "maxHeight": 320
      }
    },
    "ipad": {
      "resolution": "2048x2732",
      "captionBox": {
        "minHeight": 250,
        "maxHeight": 250
      }
    }
  }
}
```

## Configuration Field Reference

### Root Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `output` | string | `"./final"` | Output directory for generated screenshots |
| `frames` | string | `"./frames"` | Custom frames directory (optional) |
| `gradient` | object | - | Legacy gradient config (use background.gradient) |
| `background` | object | - | Background system configuration |
| `caption` | object | Required | Global caption configuration |
| `devices` | object | Required | Device-specific configurations |
| `defaultLanguage` | string | System | Override language detection |
| `useEmbeddedFonts` | boolean | `true` | Prefer bundled fonts |
| `watch` | object | - | Watch mode settings |

### Background Configuration

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `mode` | string | `"gradient"`, `"image"`, `"auto"` | Background type |
| `image` | string | - | Path to background image |
| `fit` | string | `"cover"`, `"contain"`, `"fill"`, `"scale-down"` | Image scaling |
| `position` | string | `"center"`, `"top"`, `"bottom"`, `"left"`, `"right"` | Image position |
| `gradient.colors` | array | - | Array of hex colors |
| `gradient.direction` | string | See gradient directions | Gradient angle |
| `fallback` | string | `"gradient"`, `"solid"` | Fallback if image missing |

### Caption Configuration

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `font` | string | - | Font family name |
| `fontsize` | number | 12-200 | Text size in pixels |
| `color` | string | - | Hex color (#RRGGBB) |
| `align` | string | `"left"`, `"center"`, `"right"` | Text alignment |
| `position` | string | `"above"`, `"below"`, `"overlay"` | Caption position |
| `paddingTop` | number | 0-500 | Top spacing |
| `paddingBottom` | number | 0-500 | Bottom spacing |
| `background.opacity` | number | 0-1 | Background transparency |
| `border.width` | number | 1-10 | Border thickness |
| `border.radius` | number | 0-30 | Corner rounding |

### Device Configuration

| Field | Type | Description |
|-------|------|-------------|
| `input` | string | Screenshot source directory |
| `resolution` | string | Exact dimensions (WIDTHxHEIGHT) |
| `autoFrame` | boolean | Auto-detect device frame |
| `frameScale` | number | Device size (0.5-2.0) |
| `framePosition` | string/number | Vertical position |
| `captionBox.autoSize` | boolean | Dynamic vs fixed height |
| `captionBox.minHeight` | number | Minimum caption area |
| `captionBox.maxHeight` | number | Maximum caption area |

## Configuration Tips and Best Practices

### 1. Consistent Device Positioning
Always use fixed caption box for uniform layouts:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 320,
  "maxHeight": 320
}
```

### 2. Resolution Must Match Exactly
Screenshots must be EXACTLY the resolution specified:
```json
"resolution": "1290x2796"  // Screenshot must be exactly 1290x2796
```

### 3. Background Priority Order
1. Device-specific background
2. Global background configuration  
3. Gradient (configured or default)
4. Solid color fallback

### 4. Font Fallback Chain
1. Device-specific font override
2. Global caption font
3. System default (SF Pro on Mac, Segoe UI on Windows)

### 5. Language Detection Priority
1. CLI `--langs` flag
2. Languages in caption files
3. `defaultLanguage` config
4. System locale
5. Fallback to "en"

## Programmatic Configuration

### Read and Modify with Node.js
```javascript
const fs = require('fs');

// Read config
const config = JSON.parse(
  fs.readFileSync('.appshot/config.json', 'utf8')
);

// Modify settings
config.caption.fontsize = 72;
config.devices.iphone.captionBox = {
  autoSize: false,
  minHeight: 300,
  maxHeight: 300
};

// Add new device
config.devices.custom = {
  input: "./screenshots/custom",
  resolution: "1080x1920",
  autoFrame: false
};

// Save config
fs.writeFileSync('.appshot/config.json', 
  JSON.stringify(config, null, 2)
);
```

### Validate Configuration
```bash
# Check if config is valid JSON
cat .appshot/config.json | jq . > /dev/null

# Verify required fields exist
cat .appshot/config.json | jq '.devices.iphone.resolution'
```

### Environment-Specific Configs
```javascript
// Load different configs based on environment
const env = process.env.NODE_ENV || 'development';
const configFile = `.appshot/config.${env}.json`;

if (fs.existsSync(configFile)) {
  const config = JSON.parse(fs.readFileSync(configFile));
  // Use environment-specific config
}
```

## Migration from Older Versions

### v0.8.6 → v0.8.7
Default resolutions updated:
- iPhone: `1284x2778` → `1290x2796`
- Watch: `368x448` → `410x502`

### Adding Background System (v0.8.6+)
Replace gradient with background:
```json
// Old
"gradient": { "colors": ["#FF5733", "#FFC300"] }

// New
"background": {
  "gradient": { "colors": ["#FF5733", "#FFC300"] }
}
```

### Caption Box (v0.7.0+)
Add for consistent layouts:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 320,
  "maxHeight": 320
}
```

## Troubleshooting Config Issues

### Config Not Loading
- Check JSON syntax: `cat .appshot/config.json | jq .`
- Ensure file exists: `ls -la .appshot/config.json`
- Verify permissions: `chmod 644 .appshot/config.json`

### Device Not Building
- Check device is in config: `cat .appshot/config.json | jq '.devices'`
- Verify input directory exists: `ls screenshots/[device]/`
- Ensure resolution matches: `identify screenshots/[device]/*.png`

### Styling Not Applied
- Check caption config exists: `cat .appshot/config.json | jq '.caption'`
- Verify font is available: `appshot fonts --validate "Font Name"`
- Ensure colors are valid hex: `#RRGGBB` format

### Background Not Showing
- Check mode setting: `"mode": "image"` or `"mode": "gradient"`
- Verify image path: File must exist relative to project root
- Check fallback setting if image missing