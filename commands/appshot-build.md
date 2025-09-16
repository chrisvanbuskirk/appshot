---
description: Build screenshots with all options and complete troubleshooting
allowed-tools: Bash
---

# Build AppShot Screenshots

## Quick Build Commands

### Build Everything
```bash
appshot build
# Builds all configured devices with all detected languages
```

### Build Specific Devices
```bash
appshot build --devices iphone
appshot build --devices iphone,ipad
appshot build --devices iphone,ipad,mac,watch
```

### Build Specific Languages
```bash
appshot build --langs en
appshot build --langs en,es,fr
appshot build --langs en,es,fr,de,it,pt,ja,ko,zh-CN
```

### Build with App Store Presets
```bash
# Use official App Store size requirements
appshot build --preset iphone-6-9
appshot build --preset iphone-6-9,ipad-13
appshot build --preset iphone-6-9,iphone-6-5,ipad-13,ipad-12-9
```

### Frame-Only Mode (No Gradient/Caption)
```bash
# Single file
appshot frame ./screenshots/iphone/home.png

# Batch process
appshot frame ./screenshots --recursive

# With specific output
appshot frame ./input.png --output ./framed.png
```

## Output Structure

### Single Language
```
final/
├── iphone/
│   └── en/
│       ├── home.png      # 1290x2796 with frame, gradient, caption
│       ├── features.png
│       └── settings.png
├── ipad/
│   └── en/
│       └── [iPad screenshots 2048x2732]
```

### Multiple Languages
```
final/
├── iphone/
│   ├── en/
│   │   └── [English versions]
│   ├── es/
│   │   └── [Spanish versions]
│   ├── fr/
│   │   └── [French versions]
│   └── [other languages]/
```

## Build Process Explained

1. **Reads Configuration** from `.appshot/config.json`
   - Device settings, resolutions, styling options
   
2. **Loads Screenshots** from `screenshots/[device]/`
   - Must match exact resolution in config
   - Excludes `background.png` if present
   
3. **Detects Device Frame** based on resolution
   - Automatic frame selection (e.g., 1290x2796 → iPhone 15 Pro Max)
   - Uses `autoFrame: true` setting
   
4. **Applies Background**
   - Priority: Device background → Global background → Gradient → Solid color
   
5. **Composites Device Frame** 
   - Positions device based on `framePosition` setting
   - Scales based on `frameScale` (default 1.0)
   
6. **Overlays Caption** from `.appshot/captions/[device].json`
   - Positions based on `position` (above/below/overlay)
   - Applies styling (font, size, color, background, border)
   
7. **Outputs to** `final/[device]/[language]/`
   - Creates directory structure automatically
   - Overwrites existing files

## Validation Commands

### Check App Store Compliance
```bash
appshot validate
```
Shows:
```
✓ iPhone: 1290x2796 (Valid for 6.9" display)
✗ iPad: 2000x2000 (Invalid - must be 2048x2732 or 2064x2752)
⚠ Mac: Not configured
```

### Check System Setup
```bash
appshot doctor
```
Shows:
```
✓ Node.js: v18.0.0 or higher
✓ Sharp module: Installed
✓ Fonts: 15 embedded fonts available
✓ Frames: 51 device frames loaded
✗ OPENAI_API_KEY: Not set (required for translations)
```

### Show App Store Requirements
```bash
appshot specs        # Human-readable format
appshot specs --json # For parsing/automation
```

## Common Build Issues and Solutions

### Issue: "Dimensions are wrong"
**Cause**: Screenshots don't match config resolution
**Solution**: 
```bash
# Check actual dimensions
identify screenshots/iphone/*.png

# Update config to match
"resolution": "1290x2796"  # Must be exact
```

### Issue: "No frame found for device"
**Cause**: Frame detection failed
**Solution**:
```json
"autoFrame": true  # Enable auto-framing
```

### Issue: "Caption text cut off"
**Cause**: Caption area too small
**Solution**:
```json
"captionBox": {
  "autoSize": false,
  "minHeight": 400,  // Increase this
  "maxHeight": 400
}
```

### Issue: "No output files created"
**Checklist**:
1. Screenshots exist: `ls screenshots/iphone/`
2. Captions file exists: `cat .appshot/captions/iphone.json`
3. Config has device: `cat .appshot/config.json | jq '.devices.iphone'`
4. No build errors: Check terminal output

### Issue: "Background image not showing"
**Solution**:
```json
"background": {
  "mode": "image",
  "image": "./assets/background.png",
  "fit": "cover"
}
```

### Issue: "Device position inconsistent"
**Cause**: Variable caption heights
**Solution**: Use fixed caption box (see caption cut off solution)

### Issue: "Wrong language in output"
**Check**:
```json
"defaultLanguage": "en"  // Set correct default
```

## Advanced Build Options

### No Background (Transparent)
```bash
appshot build --no-background
```

### Custom Output Directory
```bash
appshot build --output ./app-store-screenshots
```

### Auto-detect Background Images
```bash
appshot build --auto-background
# Looks for background.png in each device folder
```

### Skip Specific Devices
Remove from config or:
```bash
appshot build --devices iphone,ipad  # Only these, skip others
```

### Development/Testing
```bash
# Clean previous builds
appshot clean
appshot clean --all  # Also removes caption history

# Build single file for testing
appshot frame ./test.png --output ./test-framed.png

# Dry run (show what would be built)
appshot build --dry-run
```

## Build for App Store Submission

### Complete Workflow
```bash
# 1. Validate setup
appshot validate

# 2. Ensure correct resolutions
cat .appshot/config.json | jq '.devices.iphone.resolution'
# Should show: "1290x2796" or "1320x2868"

# 3. Build with presets
appshot build --preset iphone-6-9,ipad-13

# 4. Verify output
ls -la final/iphone/en/
# Should show PNG files at 1290x2796 or 1320x2868

# 5. Check all languages
ls final/iphone/
# Should show: en/ es/ fr/ etc.
```

### Required Resolutions for App Store
- **iPhone 6.9"**: `1290×2796` or `1320×2868` (Required)
- **iPhone 6.5"**: `1284×2778` or `1242×2688` (If no 6.9")
- **iPad 13"**: `2064×2752` or `2048×2732` (Required)
- **Mac**: `2880×1800` (16:10 aspect ratio)
- **Watch**: `410×502` (Ultra) or `396×484` (Series 9)

### Important App Store Rules
1. Must provide same screenshots for ALL languages
2. Can't mix portrait and landscape in same set
3. Maximum 10 screenshots per device size
4. Minimum 1 screenshot required

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build App Store Screenshots
  run: |
    appshot init --force
    appshot gradients --apply ocean
    appshot fonts --set "Montserrat Bold"
    appshot build --devices iphone,ipad --langs en,es,fr,de
    
- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: app-store-screenshots
    path: final/
```

### Shell Script
```bash
#!/bin/bash
set -e

# Non-interactive build
appshot init --force
appshot build --devices iphone,ipad --langs en,es,fr

# Check exit code
if [ $? -eq 0 ]; then
  echo "Build successful"
  # Upload to App Store Connect
else
  echo "Build failed"
  exit 1
fi
```

## Build Performance Tips

### Parallel Processing
AppShot automatically processes screenshots in parallel when possible.

### Memory Usage
For large batches (100+ screenshots):
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" appshot build
```

### Caching
Translation results are cached in memory during build to avoid duplicate API calls.

## Debugging Build Issues

### Verbose Output
```bash
appshot build --verbose
# Shows detailed processing information
```

### Check Individual Components
```bash
# Test gradient rendering
appshot gradients --preview ocean

# Test frame application
appshot frame ./test.png --verbose

# Test font availability
appshot fonts --validate "Montserrat Bold"
```

### Common Error Messages

**"ENOENT: no such file or directory"**
- Check file paths in config
- Ensure screenshots directory exists

**"Sharp: Input file is missing"**
- Screenshot file not found
- Check exact filename match

**"Invalid image dimensions"**
- Screenshot size doesn't match config
- Use `identify` command to check

**"Cannot read property 'en' of undefined"**
- Caption file is malformed
- Check JSON syntax in caption file

## Build Artifacts

### What Gets Created
```
final/
├── [device]/
│   └── [language]/
│       └── [filename].png  # Final composed screenshot
```

### What Gets Preserved
- Original screenshots remain unchanged
- Config and captions untouched
- Only `final/` directory is modified

### Cleaning Up
```bash
# Remove final output only
appshot clean

# Remove everything (output, history, cache)
appshot clean --all
```