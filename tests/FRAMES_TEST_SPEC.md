# Frames.json Test Specification

This document describes the validation tests for `frames/Frames.json` to ensure compatibility when replacing the frame collection.

## Test Coverage

### 1. Structure Validation
- ✅ Valid top-level structure with device categories (iPhone, iPad, Mac, Watch)
- ✅ Version field present and valid
- ✅ Each device category has proper nested structure
- ✅ Frame entries have required properties: `name`, `x`, `y`

### 2. Device-Specific Requirements

#### iPhone Frames
- Must support both Portrait and Landscape orientations
- Can have model variants (Pro, Pro Max, Plus, mini)
- Each frame needs: `name`, `x`, `y` coordinates

#### iPad Frames  
- Must support both Portrait and Landscape orientations
- Each orientation needs: `name`, `x`, `y` coordinates

#### Mac Frames
- Landscape orientation only
- Can have size variants (14", 16", etc.)
- Each frame needs: `name`, `x`, `y` coordinates

#### Watch Frames
- Portrait orientation only
- Can have size variants (40mm, 44mm, etc.)
- Each frame needs: `name`, `x`, `y` coordinates

### 3. File Existence Validation
- ✅ At least 80% of frames in Frames.json have corresponding PNG files
- ✅ Less than 50% of PNG files are orphaned (not referenced in Frames.json)
- ⚠️ Mask files (`_mask.png`) and variant files (`_frame_no_island.png`) are excluded

### 4. Coordinate Validation
- ✅ All `x` and `y` values are valid positive integers
- ✅ Coordinates are within reasonable bounds (< 10000)
- ✅ Consistent orientation naming (Portrait/Landscape)

### 5. Frame Registry Building
- ✅ Successfully builds registry from Frames.json
- ✅ All registry entries have required fields
- ✅ Frames available for all device types
- ✅ Both orientations available for iPhone and iPad

### 6. Screen Dimension Validation
- ✅ Screen area is smaller than frame dimensions
- ✅ Screen area is at least 30% of frame size
- ✅ Screen position + size doesn't exceed frame bounds

### 7. PNG File Validation
- ✅ Frame files are valid PNG format
- ✅ Dimensions are reasonable (< 10000px)
- ✅ Key frames load successfully

## Replacing Frames.json

When replacing the frame collection, ensure:

1. **Maintain the JSON structure**:
   ```json
   {
     "iPhone": { /* models with Portrait/Landscape */ },
     "iPad": { /* models with Portrait/Landscape */ },
     "Mac": { /* models (landscape only) */ },
     "Watch": { /* models (portrait only) */ },
     "version": "x.x"
   }
   ```

2. **Include PNG files** for each frame referenced in Frames.json

3. **Use consistent naming**:
   - Orientation keys: `Portrait`, `Landscape` (capital first letter)
   - Frame names match PNG filenames exactly

4. **Provide x,y coordinates** representing the padding/margin from frame edge to screen area

5. **Test compatibility** by running:
   ```bash
   npm test -- frames.test.ts
   ```

## Test Results Summary

Running the tests will provide:
- ✅ Structure validation results
- ⚠️ Missing frame file warnings
- ⚠️ Orphaned file warnings  
- ✅ Coordinate validation
- ✅ Registry building success
- ✅ Screen dimension calculations

Any failures indicate incompatibility with the appshot CLI.