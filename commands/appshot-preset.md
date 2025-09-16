# appshot preset

Quick preset commands for instant professional App Store screenshots.

## Overview

The `preset` command provides ultra-simple one-line commands to generate App Store screenshots with professional templates. Perfect for CI/CD and automation.

## Usage

```bash
# Apply preset and build in one command
appshot preset <preset-name> [options]

# Examples
appshot preset modern                    # Modern vibrant gradient
appshot preset bold                      # Bold dark impact
appshot preset minimal                   # Minimal clean design
appshot preset elegant                   # Elegant professional
appshot preset corporate                 # Corporate business style
appshot preset playful                   # Playful bright colors
appshot preset showcase                  # Use custom backgrounds
appshot preset nerdy                     # Developer-focused dark theme

# With caption
appshot preset modern --caption "Amazing Features"

# Multiple devices
appshot preset bold --devices iphone,ipad,watch

# Multiple languages  
appshot preset minimal --langs en,es,fr

# Custom output
appshot preset elegant --output ./marketing/screenshots
```

## Available Presets

### Modern
- Vibrant purple/pink gradient
- Floating device (85% scale)
- Clean white captions above device
- Best for: Consumer apps, social media

### Bold
- Dark blue/purple gradient
- Large device (100% scale)
- Overlay captions with border
- Best for: Gaming, entertainment

### Minimal
- Soft pastel gradients
- Smaller device (75% scale)
- Elegant typography
- Best for: Productivity, wellness

### Elegant
- Sophisticated monochrome
- Floating device (80% scale)
- Serif fonts, captions below
- Best for: Premium, luxury apps

### Corporate
- Professional blue gradient
- Standard sizing (85% scale)
- Clean business aesthetic
- Best for: Business, finance

### Playful
- Bright pink/yellow gradient
- Large device (95% scale)
- Fun, energetic style
- Best for: Games, kids apps

### Showcase
- Uses your custom backgrounds
- Auto-detects background images
- Falls back to gradient if none
- Best for: Branded campaigns

### Nerdy
- Dark theme with green accents
- Terminal-inspired aesthetic
- Monospace fonts
- Best for: Developer tools, technical apps

## Options

```bash
--caption, -c <text>      Add caption to all screenshots
--devices, -d <list>      Comma-separated device list
--langs, -l <list>        Comma-separated language codes
--output, -o <path>       Output directory (default: ./final)
--dry-run                 Preview without building
--verbose                 Show detailed output
```

## Quick Examples

### Launch Day Screenshots
```bash
# Generate hero screenshots for launch
appshot preset bold --caption "Launching Today!" --devices iphone,ipad
```

### App Store Update
```bash
# Update screenshots for new feature
appshot preset modern --caption "New: Dark Mode" --langs en,es,fr,de
```

### Marketing Campaign
```bash
# Brand-specific campaign with custom background
cp marketing/background.png screenshots/iphone/
appshot preset showcase --caption "Summer Sale"
```

### CI/CD Pipeline
```bash
# Automated screenshot generation
appshot preset corporate \
  --devices iphone,ipad \
  --langs en,es,fr,de,ja,zh \
  --output ./app-store-assets
```

## Preset Details

Each preset automatically configures:
- Background gradients or images
- Device frame scale and position
- Caption styling and placement
- Font selection
- Color schemes
- Device-specific optimizations

## Tips

1. **Quick Test**: Use `--dry-run` to preview settings
2. **Batch Processing**: Process multiple languages at once
3. **CI/CD Ready**: All options can be scripted
4. **Override**: Apply preset, then use `style` command for tweaks

## See Also

- `appshot template` - More detailed template configuration
- `appshot quickstart` - Initial project setup
- `appshot build` - Manual build with full control
- `appshot style` - Customize positioning and styling