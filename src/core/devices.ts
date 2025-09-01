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
  // iPhone 16 Pro Max
  {
    name: 'iphone-16-pro-max-portrait',
    displayName: 'iPhone 16 Pro Max',
    orientation: 'portrait',
    frameWidth: 1458,
    frameHeight: 3054,
    screenRect: { x: 75, y: 66, width: 1320, height: 2868 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Pro Max Portrait_mask.png'
  },
  {
    name: 'iphone-16-pro-max-landscape',
    displayName: 'iPhone 16 Pro Max',
    orientation: 'landscape',
    frameWidth: 3054,
    frameHeight: 1458,
    screenRect: { x: 66, y: 75, width: 2868, height: 1320 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Pro Max Landscape_mask.png'
  },
  // iPhone 16 Pro
  {
    name: 'iphone-16-pro-portrait',
    displayName: 'iPhone 16 Pro',
    orientation: 'portrait',
    frameWidth: 1350,
    frameHeight: 2844,
    screenRect: { x: 72, y: 69, width: 1206, height: 2622 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Pro Portrait_mask.png'
  },
  {
    name: 'iphone-16-pro-landscape',
    displayName: 'iPhone 16 Pro',
    orientation: 'landscape',
    frameWidth: 2844,
    frameHeight: 1350,
    screenRect: { x: 69, y: 72, width: 2622, height: 1206 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Pro Landscape_mask.png'
  },
  // iPhone 16 Plus
  {
    name: 'iphone-16-plus-portrait',
    displayName: 'iPhone 16 Plus',
    orientation: 'portrait',
    frameWidth: 1458,
    frameHeight: 3054,
    screenRect: { x: 90, y: 87, width: 1284, height: 2778 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Plus Portrait_mask.png'
  },
  {
    name: 'iphone-16-plus-landscape',
    displayName: 'iPhone 16 Plus',
    orientation: 'landscape',
    frameWidth: 3054,
    frameHeight: 1458,
    screenRect: { x: 87, y: 90, width: 2778, height: 1284 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Plus Landscape_mask.png'
  },
  // iPhone 16
  {
    name: 'iphone-16-portrait',
    displayName: 'iPhone 16',
    orientation: 'portrait',
    frameWidth: 1350,
    frameHeight: 2844,
    screenRect: { x: 90, y: 90, width: 1170, height: 2532 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Portrait_mask.png'
  },
  {
    name: 'iphone-16-landscape',
    displayName: 'iPhone 16',
    orientation: 'landscape',
    frameWidth: 2844,
    frameHeight: 1350,
    screenRect: { x: 90, y: 90, width: 2532, height: 1170 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 16 Landscape_mask.png'
  },
  // iPhone 15 frames
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
    frameHeight: 1700,
    screenRect: { x: 125, y: 334, width: 750, height: 1334 },
    deviceType: 'iphone'
  },
  // iPhone 12-13 Pro Max
  {
    name: 'iphone-12-13-pro-max-portrait',
    displayName: 'iPhone 12-13 Pro Max',
    orientation: 'portrait',
    frameWidth: 1392,
    frameHeight: 2940,
    screenRect: { x: 108, y: 111, width: 1284, height: 2778 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 12-13 Pro Max Portrait_mask.png'
  },
  {
    name: 'iphone-12-13-pro-max-landscape',
    displayName: 'iPhone 12-13 Pro Max',
    orientation: 'landscape',
    frameWidth: 2940,
    frameHeight: 1392,
    screenRect: { x: 111, y: 108, width: 2778, height: 1284 },
    deviceType: 'iphone',
    maskPath: 'frames/iPhone 12-13 Pro Max Landscape_mask.png'
  },
  // iPhone 12-13 Pro
  {
    name: 'iphone-12-13-pro-portrait',
    displayName: 'iPhone 12-13 Pro',
    orientation: 'portrait',
    frameWidth: 1286,
    frameHeight: 2726,
    screenRect: { x: 115, y: 84, width: 1170, height: 2532 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-12-13-pro-landscape',
    displayName: 'iPhone 12-13 Pro',
    orientation: 'landscape',
    frameWidth: 2726,
    frameHeight: 1286,
    screenRect: { x: 84, y: 115, width: 2532, height: 1170 },
    deviceType: 'iphone'
  },
  // iPhone 12-13 mini
  {
    name: 'iphone-12-13-mini-portrait',
    displayName: 'iPhone 12-13 mini',
    orientation: 'portrait',
    frameWidth: 1220,
    frameHeight: 2520,
    screenRect: { x: 80, y: 80, width: 1080, height: 2340 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-12-13-mini-landscape',
    displayName: 'iPhone 12-13 mini',
    orientation: 'landscape',
    frameWidth: 2520,
    frameHeight: 1220,
    screenRect: { x: 80, y: 80, width: 2340, height: 1080 },
    deviceType: 'iphone'
  },
  // iPhone 11 Pro Max
  {
    name: 'iphone-11-pro-max-portrait',
    displayName: 'iPhone 11 Pro Max',
    orientation: 'portrait',
    frameWidth: 1392,
    frameHeight: 2940,
    screenRect: { x: 108, y: 108, width: 1242, height: 2688 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-11-pro-max-landscape',
    displayName: 'iPhone 11 Pro Max',
    orientation: 'landscape',
    frameWidth: 2940,
    frameHeight: 1392,
    screenRect: { x: 108, y: 108, width: 2688, height: 1242 },
    deviceType: 'iphone'
  },
  // iPhone 11 Pro
  {
    name: 'iphone-11-pro-portrait',
    displayName: 'iPhone 11 Pro',
    orientation: 'portrait',
    frameWidth: 1255,
    frameHeight: 2616,
    screenRect: { x: 100, y: 100, width: 1125, height: 2436 },
    deviceType: 'iphone'
  },
  // iPhone 11
  {
    name: 'iphone-11-portrait',
    displayName: 'iPhone 11',
    orientation: 'portrait',
    frameWidth: 1025,
    frameHeight: 2102,
    screenRect: { x: 125, y: 110, width: 828, height: 1792 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-11-landscape',
    displayName: 'iPhone 11',
    orientation: 'landscape',
    frameWidth: 2102,
    frameHeight: 1025,
    screenRect: { x: 110, y: 125, width: 1792, height: 828 },
    deviceType: 'iphone'
  },
  // iPhone 8 Plus
  {
    name: 'iphone-8-plus-portrait',
    displayName: 'iPhone 8 Plus',
    orientation: 'portrait',
    frameWidth: 1392,
    frameHeight: 2510,
    screenRect: { x: 120, y: 300, width: 1242, height: 2208 },
    deviceType: 'iphone'
  },
  {
    name: 'iphone-8-plus-landscape',
    displayName: 'iPhone 8 Plus',
    orientation: 'landscape',
    frameWidth: 2510,
    frameHeight: 1392,
    screenRect: { x: 300, y: 120, width: 2208, height: 1242 },
    deviceType: 'iphone'
  },

  // iPad frames
  // iPad Pro 2024 13"
  {
    name: 'ipad-pro-2024-13-portrait',
    displayName: 'iPad Pro 2024 13"',
    orientation: 'portrait',
    frameWidth: 2264,
    frameHeight: 3144,
    screenRect: { x: 108, y: 132, width: 2064, height: 2752 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-2024-13-landscape',
    displayName: 'iPad Pro 2024 13"',
    orientation: 'landscape',
    frameWidth: 3144,
    frameHeight: 2264,
    screenRect: { x: 132, y: 108, width: 2752, height: 2064 },
    deviceType: 'ipad'
  },
  // iPad Pro 2024 11"
  {
    name: 'ipad-pro-2024-11-portrait',
    displayName: 'iPad Pro 2024 11"',
    orientation: 'portrait',
    frameWidth: 1858,
    frameHeight: 2678,
    screenRect: { x: 95, y: 95, width: 1668, height: 2388 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-2024-11-landscape',
    displayName: 'iPad Pro 2024 11"',
    orientation: 'landscape',
    frameWidth: 2678,
    frameHeight: 1858,
    screenRect: { x: 110, y: 106, width: 2388, height: 1668 },
    deviceType: 'ipad'
  },
  // iPad Pro 2018-2021 12.9"
  {
    name: 'ipad-pro-12-portrait',
    displayName: 'iPad Pro 12.9" (2018-2021)',
    orientation: 'portrait',
    frameWidth: 2248,
    frameHeight: 3032,
    screenRect: { x: 100, y: 150, width: 2048, height: 2732 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-12-landscape',
    displayName: 'iPad Pro 12.9" (2018-2021)',
    orientation: 'landscape',
    frameWidth: 3032,
    frameHeight: 2248,
    screenRect: { x: 150, y: 100, width: 2732, height: 2048 },
    deviceType: 'ipad'
  },
  // iPad Pro 2018-2021 11"
  {
    name: 'ipad-pro-11-portrait',
    displayName: 'iPad Pro 11" (2018-2021)',
    orientation: 'portrait',
    frameWidth: 1868,
    frameHeight: 2688,
    screenRect: { x: 100, y: 150, width: 1668, height: 2388 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-pro-11-landscape',
    displayName: 'iPad Pro 11" (2018-2021)',
    orientation: 'landscape',
    frameWidth: 2688,
    frameHeight: 1868,
    screenRect: { x: 150, y: 100, width: 2388, height: 1668 },
    deviceType: 'ipad'
  },
  // iPad Air 2020
  {
    name: 'ipad-air-2020-portrait',
    displayName: 'iPad Air 2020',
    orientation: 'portrait',
    frameWidth: 1880,
    frameHeight: 2660,
    screenRect: { x: 106, y: 106, width: 1668, height: 2224 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-air-2020-landscape',
    displayName: 'iPad Air 2020',
    orientation: 'landscape',
    frameWidth: 2660,
    frameHeight: 1880,
    screenRect: { x: 106, y: 106, width: 2224, height: 1668 },
    deviceType: 'ipad'
  },
  // iPad 2021
  {
    name: 'ipad-2021-portrait',
    displayName: 'iPad 2021',
    orientation: 'portrait',
    frameWidth: 1960,
    frameHeight: 2620,
    screenRect: { x: 106, y: 116, width: 1640, height: 2160 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-2021-landscape',
    displayName: 'iPad 2021',
    orientation: 'landscape',
    frameWidth: 2620,
    frameHeight: 1960,
    screenRect: { x: 116, y: 106, width: 2160, height: 1640 },
    deviceType: 'ipad'
  },
  // iPad mini 2021
  {
    name: 'ipad-mini-2021-portrait',
    displayName: 'iPad mini 2021',
    orientation: 'portrait',
    frameWidth: 1700,
    frameHeight: 2380,
    screenRect: { x: 106, y: 106, width: 1488, height: 2266 },
    deviceType: 'ipad'
  },
  {
    name: 'ipad-mini-2021-landscape',
    displayName: 'iPad mini 2021',
    orientation: 'landscape',
    frameWidth: 2380,
    frameHeight: 1700,
    screenRect: { x: 106, y: 106, width: 2266, height: 1488 },
    deviceType: 'ipad'
  },

  // Mac frames (always landscape)
  {
    name: 'macbook-pro-2021-16',
    displayName: 'MacBook Pro 2021 16"',
    orientation: 'landscape',
    frameWidth: 3910,
    frameHeight: 2419,
    screenRect: { x: 442, y: 313, width: 3024, height: 1890 },
    deviceType: 'mac'
  },
  {
    name: 'macbook-pro-2021-14',
    displayName: 'MacBook Pro 2021 14"',
    orientation: 'landscape',
    frameWidth: 3624,
    frameHeight: 2234,
    screenRect: { x: 460, y: 300, width: 2704, height: 1734 },
    deviceType: 'mac'
  },
  {
    name: 'macbook-air-2022',
    displayName: 'MacBook Air 2022',
    orientation: 'landscape',
    frameWidth: 3000,
    frameHeight: 1892,
    screenRect: { x: 330, y: 218, width: 2340, height: 1456 },
    deviceType: 'mac'
  },
  {
    name: 'macbook-air-2020',
    displayName: 'MacBook Air 2020',
    orientation: 'landscape',
    frameWidth: 3180,
    frameHeight: 2052,
    screenRect: { x: 620, y: 652, width: 1940, height: 1400 },
    deviceType: 'mac'
  },
  {
    name: 'macbook-pro-13',
    displayName: 'MacBook Pro 13"',
    orientation: 'landscape',
    frameWidth: 3180,
    frameHeight: 1821,
    screenRect: { x: 620, y: 261, width: 1940, height: 1300 },
    deviceType: 'mac'
  },
  {
    name: 'imac-2021',
    displayName: 'iMac 2021',
    orientation: 'landscape',
    frameWidth: 4621,
    frameHeight: 3361,
    screenRect: { x: 141, y: 161, width: 4480, height: 2520 },
    deviceType: 'mac'
  },

  // Watch frames (always portrait)
  {
    name: 'watch-ultra-2024',
    displayName: 'Watch Ultra 2024',
    orientation: 'portrait',
    frameWidth: 605,
    frameHeight: 819,
    screenRect: { x: 95, y: 219, width: 410, height: 502 },
    deviceType: 'watch'
  },
  {
    name: 'watch-series-10-46',
    displayName: 'Watch Series 10 (46mm)',
    orientation: 'portrait',
    frameWidth: 570,
    frameHeight: 784,
    screenRect: { x: 72, y: 192, width: 416, height: 496 },
    deviceType: 'watch',
    maskPath: 'frames/Watch Series 10 46_mask.png'
  },
  {
    name: 'watch-series-10-42',
    displayName: 'Watch Series 10 (42mm)',
    orientation: 'portrait',
    frameWidth: 513,
    frameHeight: 711,
    screenRect: { x: 63, y: 167, width: 374, height: 446 },
    deviceType: 'watch',
    maskPath: 'frames/Watch Series 10 42_mask.png'
  },
  {
    name: 'watch-series-7-45',
    displayName: 'Watch Series 7 (45mm)',
    orientation: 'portrait',
    frameWidth: 560,
    frameHeight: 764,
    screenRect: { x: 72, y: 188, width: 396, height: 484 },
    deviceType: 'watch'
  },
  {
    name: 'watch-series-7-41',
    displayName: 'Watch Series 7 (41mm)',
    orientation: 'portrait',
    frameWidth: 516,
    frameHeight: 701,
    screenRect: { x: 64, y: 165, width: 352, height: 430 },
    deviceType: 'watch'
  },
  {
    name: 'watch-series-4-44',
    displayName: 'Watch Series 4 (44mm)',
    orientation: 'portrait',
    frameWidth: 500,
    frameHeight: 790,
    screenRect: { x: 66, y: 222, width: 368, height: 448 },
    deviceType: 'watch'
  },
  {
    name: 'watch-series-4-40',
    displayName: 'Watch Series 4 (40mm)',
    orientation: 'portrait',
    frameWidth: 538,
    frameHeight: 732,
    screenRect: { x: 114, y: 308, width: 324, height: 394 },
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
 * Best-effort device type detection from raw dimensions.
 * Uses simple heuristics and pixel thresholds; not perfect but fast.
 */
export function detectDeviceTypeFromDimensions(
  width: number,
  height: number
): 'iphone' | 'ipad' | 'mac' | 'watch' | null {
  if (!width || !height) return null;

  const w = Math.max(width, height);
  const h = Math.min(width, height);
  const aspect = w / h; // normalized >= 1
  const pixels = width * height;

  // Watch: small and close to square
  if (pixels <= 600_000 && aspect >= 0.75 && aspect <= 1.3) {
    return 'watch';
  }

  // iPad: around 4:3 (1.33) in either orientation
  if (aspect >= 1.20 && aspect <= 1.40) {
    // ensure it's not too tiny (exclude watches) and not huge like Macs
    if (pixels >= 1_500_000 && pixels <= 8_000_000) {
      return 'ipad';
    }
  }

  // Mac: typically 16:10 (~1.6) or 16:9 (~1.78) and large pixel counts
  if (aspect >= 1.50 && aspect <= 1.85 && pixels >= 2_000_000) {
    return 'mac';
  }

  // iPhone: taller ratios (19.5:9 ≈ 2.17) or older 16:9 ≈ 1.78 at phone pixel counts
  if (aspect >= 1.60 && aspect <= 2.40 && pixels <= 5_000_000) {
    return 'iphone';
  }

  // Fallbacks: try to guess based on size alone
  if (pixels < 1_200_000) return 'iphone';
  if (pixels > 8_000_000) return 'mac';

  return null;
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
  let dirname = path.dirname(new URL(import.meta.url).pathname);
  
  // On Windows, URL pathname starts with '/' which needs to be removed
  // e.g., '/D:/path/to/file' should be 'D:/path/to/file'
  if (process.platform === 'win32' && dirname.startsWith('/')) {
    dirname = dirname.slice(1);
  }
  
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
  preferredFrame?: string,
  dryRun: boolean = false
): Promise<{ frame: Buffer | null; metadata: DeviceFrame | null }> {
  try {
    // Get screenshot dimensions
    const { width, height } = await getImageDimensions(screenshotPath);

    // Find best matching frame
    const frameMetadata = findBestFrame(width, height, deviceType, preferredFrame);

    if (!frameMetadata) {
      return { frame: null, metadata: null };
    }

    // In dry-run mode, skip loading the actual frame image
    if (dryRun) {
      return { frame: null, metadata: frameMetadata };
    }

    // Try to load the frame image
    const frame = await loadFrame(framesDir, frameMetadata.name);

    return { frame, metadata: frameMetadata };
  } catch (error) {
    console.error('Error auto-selecting frame:', error);
    return { frame: null, metadata: null };
  }
}
