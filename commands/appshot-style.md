---
description: Complete styling guide with all gradients, fonts, and configurations
allowed-tools: Bash, Edit
---

# Style AppShot Screenshots

## Quick Gradient Application (Non-Interactive)
```bash
appshot gradients --apply ocean  # Instant, no prompts
appshot gradients --apply sunset # Changes gradient immediately
```

## All 24 Gradient Presets with Exact Hex Colors

### 🔥 Warm Gradients
- **sunset**: `#FF5733` → `#FFC300` (orange to gold, top-bottom)
- **sunrise**: `#F37335` → `#FDC830` (golden morning, diagonal)
- **autumn**: `#D38312` → `#A83279` (fall colors, top-bottom)
- **peach**: `#FFCCCC` → `#FF6B6B` (soft coral, top-bottom)

### 💙 Cool Gradients  
- **ocean**: `#0077BE` → `#33CCCC` (deep blue waves, top-bottom)
- **arctic**: `#72EDF2` → `#5151E5` (ice blue, diagonal)
- **mint**: `#00B09B` → `#96C93D` (fresh green, left-right)
- **lavender**: `#9796F0` → `#FBC7D4` (soft purple, top-bottom)

### ⚡ Vibrant Gradients
- **fire**: `#FF0099` → `#493240` (hot pink to dark, diagonal)
- **electric**: `#7F00FF` → `#E100FF` (neon purple, left-right)
- **cosmic**: `#C33764` → `#1D2671` (space colors, diagonal)
- **rainbow**: `#FF0080` → `#FF8C00` → `#40E0D0` (multi-color, diagonal)

### 🎨 Subtle Gradients
- **grayscale**: `#434343` → `#000000` (professional dark, top-bottom)
- **pastel**: `#FFDEE9` → `#B5FFFC` (soft pink to blue, diagonal)
- **muted**: `#4B6CB7` → `#182848` (corporate blue, top-bottom)
- **professional**: `#232526` → `#414345` (business gray, top-bottom)

### ⚫ Monochrome Gradients
- **blue-mono**: `#1E3C72` → `#2A5298` (single tone blue, top-bottom)
- **green-mono**: `#134E5E` → `#71B280` (nature green, diagonal)
- **purple-mono**: `#6A0572` → `#AB83A1` (elegant purple, top-bottom)
- **gray-mono**: `#8E9EAB` → `#EEF2F3` (minimal gray, top-bottom)

### 🏢 Brand Gradients
- **instagram**: `#833AB4` → `#FD1D1D` → `#FCB045` (purple-red-orange, diagonal)
- **twitter**: `#1DA1F2` → `#14171A` (blue to black, top-bottom)
- **spotify**: `#1DB954` → `#191414` (green to black, top-bottom)
- **discord**: `#7289DA` → `#2C2F33` (purple to dark, top-bottom)

## Font Configuration

### Set Font (Non-Interactive)
```bash
appshot fonts --set "Montserrat Bold"
appshot fonts --set "Poppins Italic"
appshot fonts --set "Inter"
```

### Embedded Fonts (Always Available - No Installation Needed)

**Modern UI Fonts:**
- `Inter` - Clean, modern sans-serif
- `Inter Italic` - Emphasized variant
- `Inter Bold` - Strong headlines
- `Poppins` - Geometric, friendly
- `Poppins Italic` - Stylish emphasis
- `Poppins Bold` - Eye-catching headers
- `Montserrat` - Elegant, professional
- `Montserrat Italic` - Sophisticated
- `Montserrat Bold` - Premium feel
- `DM Sans` - Geometric simplicity
- `DM Sans Italic` - Subtle emphasis
- `DM Sans Bold` - Clear hierarchy

**Web-Safe Fonts:**
- `Roboto` - Android system font
- `Open Sans` - Highly readable
- `Lato` - Friendly and warm
- `Work Sans` - Modern grotesque
- All available in regular, italic, and bold

**Monospace Fonts:**
- `JetBrains Mono` - Developer-focused
- `Fira Code` - With ligatures support

**System Fonts (Platform-Specific):**
- `SF Pro` - Apple system font
- `SF Pro Display` - Large text variant
- `Helvetica` - Classic choice
- `Arial` - Universal fallback

### Caption Styling Configuration
Edit `.appshot/config.json`:
```json
"caption": {
  "font": "Montserrat Bold",
  "fontsize": 96,              // Larger for marketing impact
  "color": "#FFFFFF",           // White text
  "align": "center",            // left, center, right
  "position": "above",          // above, below, overlay
  "paddingTop": 120,            // Space above device
  "paddingBottom": 60,          // Space below device
  "background": {
    "color": "#000000",         // Background box color
    "opacity": 0.65,            // 0=transparent, 1=solid
    "padding": 20               // Padding inside background box
  },
  "border": {
    "color": "#FFFFFF",         // Border color
    "width": 1,                 // 1-10 pixels thickness
    "radius": 20                // 0-30 for rounded corners
  }
}
```

## Device-Specific Styling
Override any caption setting per device:
```json
"devices": {
  "iphone": {
    "captionFont": "Poppins Bold",      // Different font for iPhone
    "captionPosition": "above",         // Override position
    "captionSize": 72,                  // Different size
    "frameScale": 0.85,                 // Smaller device (0.5-2.0)
    "framePosition": "center",          // top, center, bottom, or 0-100
    "captionBackground": {
      "color": "#0000FF",
      "opacity": 0.5
    },
    "captionBorder": {
      "color": "#FFFF00",
      "width": 3,
      "radius": 15
    }
  },
  "ipad": {
    "captionFont": "Inter",             // Different font for iPad
    "captionSize": 64
  }
}
```

## Background Images Instead of Gradients

### Set Background Image
```bash
appshot backgrounds set iphone ./assets/background.png
appshot backgrounds set ipad ./assets/ipad-bg.jpg
```

### Configure in JSON
```json
"background": {
  "mode": "image",
  "image": "./assets/background.png",
  "fit": "cover"    // cover, contain, fill, scale-down
}
```

### Auto-Detection
Place `background.png` in `screenshots/[device]/` folder for automatic use.

## Quick Style Recipes

### 📱 App Store Marketing Style
```bash
appshot gradients --apply ocean
appshot fonts --set "Montserrat Bold"
```
Then edit config:
```json
{
  "caption": {
    "fontsize": 96,
    "position": "above",
    "paddingTop": 120,
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
  }
}
```

### 💼 Minimal Professional
```bash
appshot gradients --apply grayscale
appshot fonts --set "Inter"
```
Config adjustments:
```json
{
  "caption": {
    "fontsize": 48,
    "position": "below",
    "color": "#FFFFFF"
  }
}
```

### 🎮 Gaming/Entertainment
```bash
appshot gradients --apply fire
appshot fonts --set "Poppins Bold Italic"
```
Config adjustments:
```json
{
  "caption": {
    "fontsize": 72,
    "color": "#FFFF00",
    "background": {
      "color": "#FF0000",
      "opacity": 0.8
    }
  }
}
```

### 🌿 Nature/Health App
```bash
appshot gradients --apply mint
appshot fonts --set "DM Sans"
```

### 🚀 Tech/Startup
```bash
appshot gradients --apply electric
appshot fonts --set "JetBrains Mono"
```

## Complete Styling Workflow

### 1. Choose Gradient
```bash
# View all gradients
appshot gradients

# Apply chosen gradient
appshot gradients --apply ocean
```

### 2. Select Font
```bash
# List available fonts
appshot fonts

# Set font
appshot fonts --set "Montserrat Bold"
```

### 3. Fine-Tune in Config
Edit `.appshot/config.json` for:
- Font size adjustment
- Caption positioning
- Background/border styling
- Device-specific overrides

### 4. Preview
```bash
appshot build --devices iphone
# Check final/iphone/en/ for results
```

## Interactive Style Command
For guided setup:
```bash
appshot style --device iphone  # Interactive wizard
```

## Style Reset
To reset to defaults:
```bash
appshot style --device iphone --reset
```

## Caption Box for Consistency
Always add for uniform device positioning:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 320,
  "maxHeight": 320
}
```

## Gradient Direction Options
- `top-bottom` - Vertical gradient (default)
- `bottom-top` - Inverted vertical
- `left-right` - Horizontal gradient
- `right-left` - Inverted horizontal
- `diagonal` - Corner to corner

## Color Psychology for App Categories

### Social/Communication
- Gradients: `ocean`, `twitter`, `discord`
- Fonts: `Poppins`, `Open Sans`

### Finance/Business  
- Gradients: `professional`, `grayscale`, `muted`
- Fonts: `Inter`, `DM Sans`

### Entertainment/Media
- Gradients: `instagram`, `spotify`, `fire`
- Fonts: `Montserrat Bold`, `Poppins Bold`

### Health/Wellness
- Gradients: `mint`, `lavender`, `pastel`
- Fonts: `Work Sans`, `Lato`

### Education/Productivity
- Gradients: `blue-mono`, `arctic`, `professional`
- Fonts: `Inter`, `Roboto`