import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { buildFrameRegistry } from './frames-loader.js';

export type Orientation = 'portrait' | 'landscape';

export interface DeviceFrame {
  name: string;
  displayName: string;
  orientation: Orientation;
  frameWidth: number;
  frameHeight: number;
  screenRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  deviceType: 'iphone' | 'ipad' | 'mac' | 'watch';
  originalName?: string;
  maskPath?: string;
}

// Dynamic frame registry - will be populated from Frames.json
export let frameRegistry: DeviceFrame[] = [
  // iPhone frames
  {
    name: 'iphone-15-pro-max-portrait',
    displayName: 'iPhone 15 Pro Max',
    orientation: 'portrait',
    frameWidth: 1490,
    frameHeight: 3096,
    screenRect: { x: 100, y: 150, width: 1290, height: 2796 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-15-pro-max-landscape',
    displayName: 'iPhone 15 Pro Max',
    orientation: 'landscape',
    frameWidth: 3096,
    frameHeight: 1490,
    screenRect: { x: 150, y: 100, width: 2796, height: 1290 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-15-pro-portrait',
    displayName: 'iPhone 15 Pro',
    orientation: 'portrait',
    frameWidth: 1379,
    frameHeight: 2856,
    screenRect: { x: 100, y: 150, width: 1179, height: 2556 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-se-portrait',
    displayName: 'iPhone SE',
    orientation: 'portrait',
    frameWidth: 950,
    frameHeight: 1634,
    screenRect: { x: 100, y: 150, width: 750, height: 1334 },
    deviceType: 'iphone'
  },

  // iPad frames
  {
    name: 'ipad-pro-12-portrait',
    displayName: 'iPad Pro 12.9"',
    orientation: 'portrait',
    frameWidth: 2248,
    frameHeight: 3032,
    screenRect: { x: 100, y: 150, width: 2048, height: 2732 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-12-landscape',
    displayName: 'iPad Pro 12.9"',
    orientation: 'landscape',
    frameWidth: 3032,
    frameHeight: 2248,
    screenRect: { x: 150, y: 100, width: 2732, height: 2048 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-11-portrait',
    displayName: 'iPad Pro 11"',
    orientation: 'portrait',
    frameWidth: 1868,
    frameHeight: 2688,
    screenRect: { x: 100, y: 150, width: 1668, height: 2388 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-11-landscape',
    displayName: 'iPad Pro 11"',
    orientation: 'landscape',
    frameWidth: 2688,
    frameHeight: 1868,
    screenRect: { x: 150, y: 100, width: 2388, height: 1668 },
    deviceType: 'ipad'
  },

  // Mac frames (always landscape)
  {
    name: 'macbook-pro-16',
    displayName: 'MacBook Pro 16"',
    orientation: 'landscape',
    frameWidth: 3856,
    frameHeight: 2434,
    screenRect: { x: 200, y: 100, width: 3456, height: 2234 },
    deviceType: 'mac'
  },
  {
    name: 'macbook-air-15',
    displayName: 'MacBook Air 15"',
    orientation: 'landscape',
    frameWidth: 3280,
    frameHeight: 2064,
    screenRect: { x: 200, y: 100, width: 2880, height: 1864 },
    deviceType: 'mac'
  },
  {
    name: 'imac-24',
    displayName: 'iMac 24"',
    orientation: 'landscape',
    frameWidth: 4880,
    frameHeight: 2920,
    screenRect: { x: 200, y: 200, width: 4480, height: 2520 },
    deviceType: 'mac'
  },

  // Watch frames (always portrait)
  {
    name: 'watch-ultra-2',
    displayName: 'Apple Watch Ultra 2',
    orientation: 'portrait',
    frameWidth: 610,
    frameHeight: 702,
    screenRect: { x: 100, y: 100, width: 410, height: 502 },
    deviceType: 'watch'
  },
  {
    name: 'watch-series-9-45mm',
    displayName: 'Apple Watch Series 9 (45mm)',
    orientation: 'portrait',
    frameWidth: 596,
    frameHeight: 684,
    screenRect: { x: 100, y: 100, width: 396, height: 484 },
    deviceType: 'watch'
  }
];

/**
 * Detect orientation from image dimensions
 */
export function detectOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number; orientation: Orientation }> {
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const orientation = detectOrientation(width, height);

  return { width, height, orientation };
}

// Map exact resolutions to specific devices
const RESOLUTION_TO_DEVICE: Record<string, string> = {
  // iPhone resolutions (portrait)
  '1320x2868': 'iphone-16-pro-max',
  '1206x2622': 'iphone-16-pro',
  '1290x2796': 'iphone-15-pro-max',
  '1179x2556': 'iphone-15-pro',
  '1284x2778': 'iphone-14-plus',
  '1170x2532': 'iphone-14',
  '1125x2436': 'iphone-11-pro',
  '1242x2688': 'iphone-11-pro-max',
  '828x1792': 'iphone-11',
  '1080x2340': 'iphone-12-mini',
  '750x1334': 'iphone-8-and-2020-se',

  // iPhone resolutions (landscape)
  '2868x1320': 'iphone-16-pro-max-landscape',
  '2622x1206': 'iphone-16-pro-landscape',
  '2796x1290': 'iphone-15-pro-max-landscape',
  '2556x1179': 'iphone-15-pro-landscape',
  '2778x1284': 'iphone-14-plus-landscape',
  '2532x1170': 'iphone-14-landscape',
  '2436x1125': 'iphone-11-pro-landscape',
  '2688x1242': 'iphone-11-pro-max-landscape',
  '1792x828': 'iphone-11-landscape',
  '2340x1080': 'iphone-12-mini-landscape',

  // iPad resolutions (portrait)
  '2048x2732': 'ipad pro 2018 2021',  // iPad Pro 12.9"
  '1668x2388': 'ipad pro 2018 2021 11',  // iPad Pro 11"
  '1640x2360': 'ipad air 2020',     // iPad Air
  '1620x2160': 'ipad 2021',         // Regular iPad & iPad mini (same resolution)
  '2064x2752': 'ipad pro 2024 11',  // iPad Pro 11" M4
  '2420x3212': 'ipad pro 2024 13',  // iPad Pro 13" M4

  // iPad resolutions (landscape)
  '2732x2048': 'ipad pro 2018 2021',  // iPad Pro 12.9"
  '2388x1668': 'ipad pro 2018 2021 11',  // iPad Pro 11"
  '2360x1640': 'ipad air 2020',     // iPad Air
  '2160x1620': 'ipad 2021',         // Regular iPad & iPad mini (same resolution)
  '2752x2064': 'ipad pro 2024 13',  // iPad Pro 13" M4
  '3212x2420': 'ipad pro 2024 13',  // iPad Pro 13" M4

  // Mac resolutions
  '3456x2234': 'macbook-pro-16',
  '3024x1964': 'macbook-pro-14',
  '2880x1864': 'macbook-air-15',
  '2560x1664': 'macbook-air-13',
  '4480x2520': 'imac-24',

  // Watch resolutions
  '410x502': 'watch-ultra',
  '396x484': 'watch-series-9-45mm',
  '368x448': 'watch-series-9-41mm'
};

/**
 * Detect exact device from screenshot resolution
 */
function detectExactDevice(width: number, height: number): string | null {
  const key = `${width}x${height}`;
  return RESOLUTION_TO_DEVICE[key] || null;
}

/**
 * Find best matching frame for a screenshot
 */
export function findBestFrame(
  screenshotWidth: number,
  screenshotHeight: number,
  deviceType: 'iphone' | 'ipad' | 'mac' | 'watch',
  preferredFrame?: string
): DeviceFrame | null {
  const orientation = detectOrientation(screenshotWidth, screenshotHeight);

  // If preferred frame specified, check if it matches orientation first
  if (preferredFrame) {
    const preferred = frameRegistry.find(f => f.name === preferredFrame);
    if (preferred) {
      // Warn if orientation mismatch
      if (preferred.orientation !== orientation) {
        console.warn(
          `Warning: Preferred frame '${preferredFrame}' is ${preferred.orientation} but screenshot is ${orientation}`
        );
        // Don't use mismatched frame
      } else if (preferred.deviceType === deviceType) {
        return preferred;
      }
    }
  }

  // Try exact resolution matching
  const exactDevice = detectExactDevice(screenshotWidth, screenshotHeight);
  if (exactDevice) {
    console.log(`    Detected exact device: ${exactDevice} from resolution ${screenshotWidth}x${screenshotHeight}`);

    // Find frame that matches this exact device AND orientation
    let exactFrame = frameRegistry.find(f => {
      const normalizedName = f.name.toLowerCase().replace(/-/g, ' ');
      const searchName = exactDevice.toLowerCase().replace(/-/g, ' ');
      const nameMatches = normalizedName.includes(searchName) ||
                          (f.originalName && f.originalName.toLowerCase().includes(searchName));
      // Must match both name AND orientation
      return nameMatches && f.orientation === orientation;
    });

    // Special case: For 2752x2064 (iPad Pro 13" M4), ensure we don't get the 11" frame
    if (screenshotWidth === 2752 && screenshotHeight === 2064) {
      // Try to find iPad Pro 2024 13 Landscape frame first
      const ipad13Frame = frameRegistry.find(f =>
        (f.displayName === 'iPad Pro 2024 13 Landscape' ||
         f.originalName === 'iPad Pro 2024 13 Landscape') &&
        f.orientation === 'landscape'
      );

      if (ipad13Frame) {
        exactFrame = ipad13Frame;
      } else {
        // Fall back to the larger 12.9" frame if 13" not found
        exactFrame = frameRegistry.find(f =>
          f.displayName === 'iPad Pro 2018-2021 Landscape' &&
          f.orientation === 'landscape' &&
          !f.displayName.includes('11')
        );
      }
    }

    if (exactFrame) {
      console.log(`    Found exact frame: ${exactFrame.displayName}`);
      return exactFrame;
    }
  }


  // Find frames matching device type and orientation
  const candidates = frameRegistry.filter(f =>
    f.deviceType === deviceType &&
    f.orientation === orientation
  );

  if (candidates.length === 0) {
    console.warn(
      `No ${orientation} frames found for ${deviceType}. Frame will be skipped.`
    );
    return null;
  }

  // Calculate aspect ratio of screenshot
  const aspectRatio = screenshotWidth / screenshotHeight;

  // Find frame with exact resolution match first
  for (const frame of candidates) {
    if (frame.screenRect.width === screenshotWidth &&
        frame.screenRect.height === screenshotHeight) {
      console.log(`    Found exact resolution match: ${frame.displayName}`);
      return frame;
    }
  }

  // Otherwise find frame with closest aspect ratio match
  let bestFrame = candidates[0];
  let bestDiff = Math.abs((bestFrame.screenRect.width / bestFrame.screenRect.height) - aspectRatio);

  for (const frame of candidates) {
    const frameAspectRatio = frame.screenRect.width / frame.screenRect.height;
    const diff = Math.abs(frameAspectRatio - aspectRatio);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestFrame = frame;
    }
  }

  // Warn if aspect ratio is significantly different (>10% difference)
  const finalAspectRatio = bestFrame.screenRect.width / bestFrame.screenRect.height;
  const percentDiff = Math.abs(finalAspectRatio - aspectRatio) / aspectRatio * 100;
  if (percentDiff > 10) {
    console.warn(
      `Warning: Best matching frame has ${percentDiff.toFixed(1)}% aspect ratio difference`
    );
  }

  return bestFrame;
}

/**
 * Get the bundled frames directory path
 */
function getBundledFramesPath(): string {
  // When running from installed package, frames are in node_modules/appshot/frames
  // When running in development, frames are in the project root
  const dirname = path.dirname(new URL(import.meta.url).pathname);
  const projectRoot = path.resolve(dirname, '..', '..');
  return path.join(projectRoot, 'frames');
}

/**
 * Initialize frame registry from Frames.json if available
 */
export async function initializeFrameRegistry(framesDir: string): Promise<void> {
  let effectiveFramesDir = framesDir;

  try {
    // First try the configured frames directory
    const framesJsonPath = path.join(framesDir, 'Frames.json');
    await fs.access(framesJsonPath);
    console.log('Loading frames from project directory...');
  } catch {
    // Fall back to bundled frames
    const bundledFramesDir = getBundledFramesPath();
    try {
      const bundledFramesJsonPath = path.join(bundledFramesDir, 'Frames.json');
      await fs.access(bundledFramesJsonPath);
      effectiveFramesDir = bundledFramesDir;
      console.log('Using bundled frames (project frames not found)...');
    } catch {
      // No frames available, use default registry
      console.log('Using default frame registry');
      return;
    }
  }

  // Load frames from the effective directory
  try {
    const dynamicRegistry = await buildFrameRegistry(effectiveFramesDir);
    if (dynamicRegistry.length > 0) {
      frameRegistry = dynamicRegistry;
      console.log(`Loaded ${frameRegistry.length} frames from ${effectiveFramesDir === framesDir ? 'project' : 'bundled'} Frames.json`);
    }
  } catch (error) {
    console.error('Failed to build frame registry:', error);
    console.log('Using default frame registry');
  }
}

/**
 * Load frame image from disk
 */
export async function loadFrame(framePath: string, frameName: string): Promise<Buffer | null> {
  // First try to find frame by originalName (for Frames.json compatibility)
  const frame = frameRegistry.find(f => f.name === frameName);
  const fileName = frame?.originalName || frameName;

  // Try loading from provided path first
  const tryLoadFrom = async (basePath: string): Promise<Buffer | null> => {
    try {
      // Try with .png extension
      let fullPath = path.join(basePath, `${fileName}.png`);
      try {
        const buffer = await fs.readFile(fullPath);
        return buffer;
      } catch {
        // Try without modification (in case the name already has extension)
        fullPath = path.join(basePath, fileName);
        const buffer = await fs.readFile(fullPath);
        return buffer;
      }
    } catch {
      return null;
    }
  };

  // Try provided frames directory first
  let result = await tryLoadFrom(framePath);
  if (result) return result;

  // Fall back to bundled frames
  const bundledFramesDir = getBundledFramesPath();
  if (bundledFramesDir !== framePath) {
    result = await tryLoadFrom(bundledFramesDir);
    if (result) return result;
  }

  console.error(`ERROR: Could not load frame image: ${frameName} (tried as ${fileName})`);
  console.error(`  Looked in: ${framePath}`);
  console.error(`  Also tried: ${getBundledFramesPath()}`);
  return null;
}

/**
 * Auto-detect and load appropriate frame for a screenshot
 */
export async function autoSelectFrame(
  screenshotPath: string,
  framesDir: string,
  deviceType: 'iphone' | 'ipad' | 'mac' | 'watch',
  preferredFrame?: string
): Promise<{ frame: Buffer | null; metadata: DeviceFrame | null }> {
  try {
    // Get screenshot dimensions
    const { width, height } = await getImageDimensions(screenshotPath);

    // Find best matching frame
    const frameMetadata = findBestFrame(width, height, deviceType, preferredFrame);

    if (!frameMetadata) {
      return { frame: null, metadata: null };
    }

    // Try to load the frame image
    const frame = await loadFrame(framesDir, frameMetadata.name);

    return { frame, metadata: frameMetadata };
  } catch (error) {
    console.error('Error auto-selecting frame:', error);
    return { frame: null, metadata: null };
  }
}