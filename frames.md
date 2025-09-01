# AppShot Frame Command Plan

## Overview
Create a new `appshot frame` command that applies device frames to screenshots without backgrounds or captions - just the frame with transparent background. This will be a lightweight, focused tool for quick framing operations.

## Command Structure

### Single File Mode
```bash
appshot frame <input-file> [options]
appshot frame screenshot.png                  # Auto-detect device, output to same directory
appshot frame screenshot.png -o framed/        # Specify output directory
appshot frame screenshot.png --device iphone   # Force specific device type
```

### Batch Mode
```bash
appshot frame <input-directory> [options]
appshot frame ./screenshots                   # Frame all images in directory
appshot frame ./screenshots -o ./framed        # Batch with output directory
appshot frame ./screenshots --recursive        # Include subdirectories
```

## Implementation Details

### 1. New Command File: `src/commands/frame.ts`
- Command registration with Commander.js
- Options parsing for input/output/device
- Single file vs directory detection
- Batch processing logic

### 2. Auto Device Detection Function
Create `detectDeviceTypeFromDimensions()` in `src/core/devices.ts`:
- Analyze width/height ratios
- Check against known resolution patterns
- Return device type: 'iphone' | 'ipad' | 'mac' | 'watch'
- Priority order: exact match → aspect ratio → size range

### 3. Frame Composition Function
Create `composeFrameOnly()` in `src/core/compose.ts`:
- Take screenshot buffer and frame metadata
- Create transparent background canvas
- Place screenshot at screen coordinates
- Apply frame overlay
- Handle masks and rounded corners
- Return PNG buffer with transparency

### 4. Command Options
- `-o, --output <dir>`: Output directory (default: same as input)
- `-d, --device <type>`: Force device type (iphone/ipad/mac/watch)
- `-r, --recursive`: Process subdirectories
- `-f, --format <type>`: Output format (png/jpeg, default: png)
- `--suffix <text>`: Add suffix to filename (default: '-framed')
- `--overwrite`: Replace original files
- `--verbose`: Show processing details
- `--dry-run`: Preview what would be processed

## File Processing Logic

### Single File
1. Read image and get dimensions
2. Auto-detect or use specified device type
3. Find best matching frame
4. Compose frame with transparent background
5. Save to output location

### Batch Processing
1. Scan directory for image files (png, jpg, jpeg)
2. Process each file individually
3. Maintain directory structure if recursive
4. Show progress indicator
5. Summary of processed files

## Device Type Detection Algorithm

```typescript
function detectDeviceTypeFromDimensions(width: number, height: number): 'iphone' | 'ipad' | 'mac' | 'watch' | null {
  // Check exact resolutions first
  const exactMatch = RESOLUTION_TO_DEVICE[`${width}x${height}`];
  if (exactMatch) return extractDeviceType(exactMatch);
  
  // Analyze aspect ratio and size
  const aspectRatio = width / height;
  const pixels = width * height;
  
  // Mac: typically 16:10 ratio, large resolution
  if (aspectRatio > 1.5 && aspectRatio < 1.7 && pixels > 3000000) return 'mac';
  
  // iPad: 4:3 ratio or close
  if ((aspectRatio > 1.2 && aspectRatio < 1.4) || (aspectRatio > 0.7 && aspectRatio < 0.85)) {
    if (pixels > 2000000) return 'ipad';
  }
  
  // Watch: small, nearly square
  if (pixels < 500000 && aspectRatio > 0.75 && aspectRatio < 1.3) return 'watch';
  
  // iPhone: tall aspect ratio
  if ((aspectRatio < 0.6 || aspectRatio > 1.8) && pixels < 4000000) return 'iphone';
  
  return null; // Unable to detect
}
```

## Error Handling
- Unknown device type: Prompt user to specify
- No matching frame: Show available options
- Invalid input: Clear error messages
- Missing frames: Check and download if needed

## Testing Strategy
1. Unit tests for device detection function
2. Integration tests for frame composition
3. E2E tests for command execution
4. Test various image formats and sizes
5. Test batch processing with mixed devices
6. Test error scenarios

## Performance Considerations
- Use Sharp's streaming API for large images
- Process files in parallel (configurable concurrency)
- Cache frame loading for batch operations
- Memory-efficient buffer handling

## Example Usage Scenarios

```bash
# Quick frame for App Store upload
appshot frame screenshot.png

# Batch process marketing materials
appshot frame ./raw-screenshots -o ./framed --suffix ""

# Process specific device types
appshot frame ./iphone-screens --device iphone -o ./output

# Preview without processing
appshot frame ./screenshots --dry-run --verbose
```

## Benefits
1. **Simplicity**: Single-purpose tool for framing
2. **Speed**: No gradient/caption overhead
3. **Flexibility**: Works with any image, not just project structure
4. **Automation**: Perfect for CI/CD pipelines
5. **Intelligence**: Auto-detects device type

## Implementation Phases

### Phase 1: Core Functionality
- Basic frame command with single file support
- Device type detection
- Frame composition with transparency
- Basic output options

### Phase 2: Batch Processing
- Directory scanning
- Recursive processing
- Progress indicators
- Parallel processing

### Phase 3: Enhanced Features
- Advanced device detection
- Frame caching
- Custom frame support
- Integration with existing AppShot config

## Code Structure

### File Organization
```
src/
├── commands/
│   └── frame.ts          # New command implementation
├── core/
│   ├── devices.ts        # Add detectDeviceTypeFromDimensions()
│   ├── compose.ts        # Add composeFrameOnly()
│   └── frame-utils.ts    # New file for frame-specific utilities
└── tests/
    └── frame.test.ts     # Comprehensive test suite
```

### Key Functions

#### `detectDeviceTypeFromDimensions()`
```typescript
export function detectDeviceTypeFromDimensions(
  width: number, 
  height: number
): 'iphone' | 'ipad' | 'mac' | 'watch' | null
```

#### `composeFrameOnly()`
```typescript
export async function composeFrameOnly(options: {
  screenshot: Buffer;
  frame: Buffer;
  frameMetadata: DeviceFrame;
  outputFormat?: 'png' | 'jpeg';
  jpegQuality?: number;
}): Promise<Buffer>
```

#### `processFrameCommand()`
```typescript
async function processFrameCommand(
  input: string,
  options: FrameCommandOptions
): Promise<void>
```

## Integration Points

### With Existing AppShot Features
- Reuse frame loading logic from `frames-loader.ts`
- Leverage existing device detection from `devices.ts`
- Use Sharp compositing patterns from `compose.ts`
- Maintain consistent CLI patterns from other commands

### Future Enhancements
- Integration with `appshot build` workflow
- Support for custom frames
- Frame preview mode
- Web API endpoint for frame service
- Frame marketplace integration

## Success Metrics
- Processing speed: < 500ms per image
- Device detection accuracy: > 95%
- Memory usage: < 100MB for batch of 100 images
- User satisfaction: Simplified workflow
- Code coverage: > 90% test coverage

This plan provides a clean, focused implementation that complements the existing AppShot features while serving the specific use case of simple frame application.