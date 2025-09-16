# appshot-export

Export Appshot screenshots for Fastlane upload to App Store Connect.

## Quick Export

```bash
# Basic export (auto-detects languages)
appshot export

# Export for CI/CD (copy files)
appshot export --copy --clean

# Export specific devices
appshot export --devices iphone,ipad

# Generate Fastlane config
appshot export --generate-config

# Preview without creating files
appshot export --dry-run
```

## Complete Workflow

```bash
# 1. Generate screenshots
appshot build --preset iphone-6-9,ipad-13

# 2. Export for Fastlane
appshot export --generate-config

# 3. Upload to App Store
cd fastlane
fastlane deliver --skip_metadata --skip_app_version_update
```

## Export Options

| Option | Description |
|--------|------------|
| `--source <dir>` | Source directory (default: ./final) |
| `--output <dir>` | Output directory (default: ./fastlane/screenshots) |
| `--langs <list>` | Override auto-detected languages |
| `--devices <list>` | Export specific devices only |
| `--copy` | Copy files instead of symlinks |
| `--flatten` | Put all screenshots in language folders |
| `--prefix-device` | Prefix filenames with device type |
| `--clean` | Clean output directory first |
| `--generate-config` | Generate Deliverfile and Fastfile |
| `--dry-run` | Preview without creating files |
| `--json` | Output results as JSON |

## Language Mapping

Appshot automatically maps language codes:
- `en` → `en-US`
- `es` → `es-ES`
- `fr` → `fr-FR`
- `de` → `de-DE`
- `zh` → `zh-Hans`
- `pt` → `pt-PT`

Custom mappings via `.appshot/export-config.json`:
```json
{
  "languageMappings": {
    "en": "en-GB",
    "custom": "x-special"
  }
}
```

## Directory Structure

**Input (Appshot):**
```
final/
├── iphone/
│   ├── en/
│   └── es/
└── ipad/
    └── en/
```

**Output (Fastlane):**
```
fastlane/screenshots/
├── en-US/
│   ├── iphone/
│   └── ipad/
└── es-ES/
    └── iphone/
```

## Special Features

### iPad Pro Handling
iPad Pro 12.9" screenshots are automatically renamed with `IPAD_PRO_3GEN_129_` prefix for Fastlane recognition.

### Validation
- Checks output directory permissions
- Validates language codes
- Warns about missing devices
- Suggests required App Store presets

### Generated Config Files
With `--generate-config`:
- **Deliverfile** - Screenshot paths and languages
- **Fastfile** - Upload lanes
- **README.md** - Instructions
- **.gitignore** - Excludes screenshots

## CI/CD Example

```yaml
# GitHub Actions
- name: Generate Screenshots
  run: |
    npm install -g appshot-cli
    appshot build --preset iphone-6-9,ipad-13

- name: Export for Fastlane
  run: appshot export --copy --clean

- name: Upload to App Store
  env:
    APP_STORE_CONNECT_API_KEY: ${{ secrets.ASC_API_KEY }}
  run: |
    cd fastlane
    fastlane deliver --api_key_path api_key.json
```

## Tips

1. **Auto-detect languages** - Let Appshot find languages automatically
2. **Device filtering** - Export only what you need with `--devices`
3. **Dry run first** - Always preview with `--dry-run`
4. **Validate first** - Run `appshot validate` before export
5. **Clean exports** - Use `--clean` for fresh exports

## Related Commands

- `appshot build` - Generate screenshots
- `appshot validate` - Check App Store compliance
- `appshot presets` - View App Store requirements
- `appshot init` - Initialize project