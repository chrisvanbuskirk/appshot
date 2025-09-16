# /export Command

Exports Appshot-generated screenshots for Fastlane upload to App Store Connect.

## Usage

```bash
/export [options]
```

## Common Options

- `--devices iphone,ipad` - Export specific devices only
- `--copy` - Copy files instead of symlinks (for CI/CD)
- `--clean` - Clean output directory before export
- `--dry-run` - Preview what will be exported
- `--generate-config` - Generate Fastlane configuration files

## What it does

1. **Auto-detects** - Finds all languages in your screenshots
2. **Maps languages** - Converts to Fastlane format (en → en-US)
3. **Validates** - Checks for required devices and resolutions
4. **Reorganizes** - Creates Fastlane directory structure
5. **Special handling** - Renames iPad Pro files for Fastlane
6. **Config generation** - Creates Deliverfile and Fastfile (optional)

## Examples

### Basic Export
```bash
/export
```
Auto-detects languages and creates symlinks in `fastlane/screenshots/`

### Export for CI/CD
```bash
/export --copy --clean
```
Copies files (instead of symlinks) and cleans old exports first

### Export Specific Devices
```bash
/export --devices iphone,ipad
```
Only exports iPhone and iPad screenshots

### Generate Fastlane Config
```bash
/export --generate-config
```
Creates Deliverfile, Fastfile, README, and .gitignore

### Preview Export
```bash
/export --dry-run
```
Shows what would be exported without creating files

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

## After Export

Upload to App Store Connect:
```bash
cd fastlane
fastlane deliver --skip_metadata --skip_app_version_update
```

## Prerequisites

- Run `appshot build` first to generate screenshots
- Fastlane installed (`gem install fastlane`)
- App Store Connect API key configured

## Related Commands

- `appshot build --preset iphone-6-9,ipad-13` - Generate screenshots
- `appshot validate` - Check App Store compliance
- `/build` - Build and install appshot locally