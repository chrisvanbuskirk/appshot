import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface FrameMetadata {
  x: string;
  y: string;
  name: string;
  width?: number;
  height?: number;
}

export interface FramesData {
  Mac?: Record<string, any>;
  iPhone?: Record<string, any>;
  iPad?: Record<string, any>;
  Watch?: Record<string, any>;
  version?: string;
}

// Device screenshot resolutions based on Apple's official specifications
const DEVICE_RESOLUTIONS: Record<string, { portrait: { width: number; height: number }; landscape?: { width: number; height: number } }> = {
  // iPhone 16 Series
  'iphone 16 pro max': { portrait: { width: 1320, height: 2868 }, landscape: { width: 2868, height: 1320 } },
  'iphone 16 pro': { portrait: { width: 1206, height: 2622 }, landscape: { width: 2622, height: 1206 } },
  'iphone 16 plus': { portrait: { width: 1290, height: 2796 }, landscape: { width: 2796, height: 1290 } },
  'iphone 16': { portrait: { width: 1179, height: 2556 }, landscape: { width: 2556, height: 1179 } },

  // iPhone 15 Series
  'iphone 15 pro max': { portrait: { width: 1290, height: 2796 }, landscape: { width: 2796, height: 1290 } },
  'iphone 15 pro': { portrait: { width: 1179, height: 2556 }, landscape: { width: 2556, height: 1179 } },
  'iphone 15 plus': { portrait: { width: 1290, height: 2796 }, landscape: { width: 2796, height: 1290 } },
  'iphone 15': { portrait: { width: 1179, height: 2556 }, landscape: { width: 2556, height: 1179 } },

  // iPhone 14 Series
  'iphone 14 pro max': { portrait: { width: 1290, height: 2796 }, landscape: { width: 2796, height: 1290 } },
  'iphone 14 pro': { portrait: { width: 1179, height: 2556 }, landscape: { width: 2556, height: 1179 } },
  'iphone 14 plus': { portrait: { width: 1284, height: 2778 }, landscape: { width: 2778, height: 1284 } },
  'iphone 14': { portrait: { width: 1170, height: 2532 }, landscape: { width: 2532, height: 1170 } },

  // iPhone 13 Series
  'iphone 13 pro max': { portrait: { width: 1284, height: 2778 }, landscape: { width: 2778, height: 1284 } },
  'iphone 13 pro': { portrait: { width: 1170, height: 2532 }, landscape: { width: 2532, height: 1170 } },
  'iphone 13': { portrait: { width: 1170, height: 2532 }, landscape: { width: 2532, height: 1170 } },
  'iphone 13 mini': { portrait: { width: 1080, height: 2340 }, landscape: { width: 2340, height: 1080 } },

  // iPhone 12 Series
  'iphone 12 pro max': { portrait: { width: 1284, height: 2778 }, landscape: { width: 2778, height: 1284 } },
  'iphone 12 pro': { portrait: { width: 1170, height: 2532 }, landscape: { width: 2532, height: 1170 } },
  'iphone 12': { portrait: { width: 1170, height: 2532 }, landscape: { width: 2532, height: 1170 } },
  'iphone 12 mini': { portrait: { width: 1080, height: 2340 }, landscape: { width: 2340, height: 1080 } },

  // Grouped models (from Frames.json naming)
  'iphone 12-13 pro max': { portrait: { width: 1284, height: 2778 }, landscape: { width: 2778, height: 1284 } },
  'iphone 12-13 pro': { portrait: { width: 1170, height: 2532 }, landscape: { width: 2532, height: 1170 } },
  'iphone 12-13 mini': { portrait: { width: 1080, height: 2340 }, landscape: { width: 2340, height: 1080 } },

  // iPhone 11 Series
  'iphone 11 pro max': { portrait: { width: 1242, height: 2688 }, landscape: { width: 2688, height: 1242 } },
  'iphone 11 pro': { portrait: { width: 1125, height: 2436 }, landscape: { width: 2436, height: 1125 } },
  'iphone 11': { portrait: { width: 828, height: 1792 }, landscape: { width: 1792, height: 828 } },

  // iPhone SE/8
  'iphone 8 and 2020 se': { portrait: { width: 750, height: 1334 } },
  'iphone se': { portrait: { width: 750, height: 1334 } },

  // iPad resolutions
  'ipad pro 2018-2021': { portrait: { width: 2048, height: 2732 }, landscape: { width: 2732, height: 2048 } },
  'ipad pro 2018-2021 11': { portrait: { width: 1668, height: 2388 }, landscape: { width: 2388, height: 1668 } },
  'ipad pro 2024 11': { portrait: { width: 2064, height: 2752 }, landscape: { width: 2752, height: 2064 } },
  'ipad pro 2024 13': { portrait: { width: 2064, height: 2752 }, landscape: { width: 2752, height: 2064 } },
  'ipad air 2020': { portrait: { width: 1640, height: 2360 }, landscape: { width: 2360, height: 1640 } },
  'ipad mini 2021': { portrait: { width: 1620, height: 2160 }, landscape: { width: 2160, height: 1620 } },
  'ipad 2021': { portrait: { width: 1620, height: 2160 }, landscape: { width: 2160, height: 1620 } },

  // Mac resolutions
  'macbook pro 2021 16': { portrait: { width: 3456, height: 2234 } },
  'macbook pro 2021 14': { portrait: { width: 3024, height: 1964 } },
  'macbook air 2022': { portrait: { width: 2560, height: 1664 } },
  'imac 2021': { portrait: { width: 4480, height: 2520 } },

  // Default fallback
  'default': { portrait: { width: 0, height: 0 } }
};

/**
 * Get screenshot dimensions for a specific device and orientation
 */
function getScreenshotDimensions(frameName: string, orientation: 'portrait' | 'landscape'): { width: number; height: number } {
  const normalizedName = frameName.toLowerCase();

  // Find matching device resolution
  for (const [key, res] of Object.entries(DEVICE_RESOLUTIONS)) {
    if (normalizedName.includes(key)) {
      if (orientation === 'landscape' && res.landscape) {
        return res.landscape;
      }
      return res.portrait;
    }
  }

  // Return 0,0 to indicate we need to fall back to calculation
  return { width: 0, height: 0 };
}

/**
 * Load and parse the Frames.json metadata
 */
export async function loadFramesMetadata(framesDir: string): Promise<FramesData> {
  const metadataPath = path.join(framesDir, 'Frames.json');
  try {
    const content = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(content) as FramesData;
  } catch (error) {
    console.error('Failed to load Frames.json:', error);
    return {};
  }
}

/**
 * Get frame dimensions from the actual PNG file
 */
async function getFrameDimensions(framePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(framePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  } catch {
    return null;
  }
}

/**
 * Parse a frame entry with proper type checking
 */
function parseFrameEntry(entry: any): FrameMetadata | null {
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.name || typeof entry.name !== 'string') return null;

  return {
    name: entry.name,
    x: entry.x || '0',
    y: entry.y || '0'
  };
}

/**
 * Convert Frames.json structure to our frame registry format
 */
export async function buildFrameRegistry(framesDir: string) {
  const framesData = await loadFramesMetadata(framesDir);
  const registry = [];

  // Process iPhones
  if (framesData.iPhone) {
    for (const [_model, variants] of Object.entries(framesData.iPhone)) {
      if (!variants || typeof variants !== 'object') continue;

      // Check for direct Portrait/Landscape
      const processOrientation = async (orientation: 'Portrait' | 'Landscape') => {
        const orientationKey = orientation.toLowerCase() as 'portrait' | 'landscape';

        if ((variants as any)[orientation]) {
          const frame = parseFrameEntry((variants as any)[orientation]);
          if (!frame) return;

          const framePath = path.join(framesDir, `${frame.name}.png`);
          const dimensions = await getFrameDimensions(framePath);

          if (dimensions) {
            // Get the actual screenshot dimensions for this device
            const screenshotDims = getScreenshotDimensions(frame.name, orientationKey);
            const screenWidth = screenshotDims.width || (dimensions.width - (parseInt(frame.x) || 0) * 2);
            const screenHeight = screenshotDims.height || (dimensions.height - (parseInt(frame.y) || 0) * 2);

            // Check if mask file exists
            const maskPath = path.join(framesDir, `${frame.name}_mask.png`);
            const maskExists = await fs.access(maskPath).then(() => true).catch(() => false);

            registry.push({
              name: frame.name.toLowerCase().replace(/ /g, '-'),
              displayName: frame.name,
              orientation: orientationKey,
              frameWidth: dimensions.width,
              frameHeight: dimensions.height,
              screenRect: {
                x: parseInt(frame.x) || 0,
                y: parseInt(frame.y) || 0,
                width: screenWidth,
                height: screenHeight
              },
              deviceType: 'iphone' as const,
              originalName: frame.name,
              maskPath: maskExists ? maskPath : undefined
            });
          }
        }
      };

      // Process nested variants (like Pro, Plus, etc.)
      for (const [_variant, orientations] of Object.entries(variants)) {
        if (!orientations || typeof orientations !== 'object') continue;

        await processOrientation('Portrait');
        await processOrientation('Landscape');

        // Also check nested orientations
        if ((orientations as any).Portrait) {
          const frame = parseFrameEntry((orientations as any).Portrait);
          if (frame) {
            const framePath = path.join(framesDir, `${frame.name}.png`);
            const dimensions = await getFrameDimensions(framePath);

            if (dimensions) {
              // Get the actual screenshot dimensions for this device
              const screenshotDims = getScreenshotDimensions(frame.name, 'portrait');
              const screenWidth = screenshotDims.width || (dimensions.width - (parseInt(frame.x) || 0) * 2);
              const screenHeight = screenshotDims.height || (dimensions.height - (parseInt(frame.y) || 0) * 2);

              // Check if mask file exists
              const maskPath = path.join(framesDir, `${frame.name}_mask.png`);
              const maskExists = await fs.access(maskPath).then(() => true).catch(() => false);

              registry.push({
                name: frame.name.toLowerCase().replace(/ /g, '-'),
                displayName: frame.name,
                orientation: 'portrait' as const,
                frameWidth: dimensions.width,
                frameHeight: dimensions.height,
                screenRect: {
                  x: parseInt(frame.x) || 0,
                  y: parseInt(frame.y) || 0,
                  width: screenWidth,
                  height: screenHeight
                },
                deviceType: 'iphone' as const,
                originalName: frame.name,
                maskPath: maskExists ? maskPath : undefined
              });
            }
          }
        }

        if ((orientations as any).Landscape) {
          const frame = parseFrameEntry((orientations as any).Landscape);
          if (frame) {
            const framePath = path.join(framesDir, `${frame.name}.png`);
            const dimensions = await getFrameDimensions(framePath);

            if (dimensions) {
              // Get the actual screenshot dimensions for this device
              const screenshotDims = getScreenshotDimensions(frame.name, 'landscape');
              const screenWidth = screenshotDims.width || (dimensions.width - (parseInt(frame.x) || 0) * 2);
              const screenHeight = screenshotDims.height || (dimensions.height - (parseInt(frame.y) || 0) * 2);

              // Check if mask file exists
              const maskPath = path.join(framesDir, `${frame.name}_mask.png`);
              const maskExists = await fs.access(maskPath).then(() => true).catch(() => false);

              registry.push({
                name: frame.name.toLowerCase().replace(/ /g, '-'),
                displayName: frame.name,
                orientation: 'landscape' as const,
                frameWidth: dimensions.width,
                frameHeight: dimensions.height,
                screenRect: {
                  x: parseInt(frame.x) || 0,
                  y: parseInt(frame.y) || 0,
                  width: screenWidth,
                  height: screenHeight
                },
                deviceType: 'iphone' as const,
                originalName: frame.name,
                maskPath: maskExists ? maskPath : undefined
              });
            }
          }
        }
      }
    }
  }

  // Process iPads
  if (framesData.iPad) {
    for (const [_model, orientations] of Object.entries(framesData.iPad)) {
      if (!orientations || typeof orientations !== 'object') continue;

      if ((orientations as any).Portrait) {
        const frame = parseFrameEntry((orientations as any).Portrait);
        if (frame) {
          const framePath = path.join(framesDir, `${frame.name}.png`);
          const dimensions = await getFrameDimensions(framePath);

          if (dimensions) {
            // Get the actual screenshot dimensions for this device
            const screenshotDims = getScreenshotDimensions(frame.name, 'portrait');
            const screenWidth = screenshotDims.width || (dimensions.width - (parseInt(frame.x) || 0) * 2);
            const screenHeight = screenshotDims.height || (dimensions.height - (parseInt(frame.y) || 0) * 2);

            // Check if mask file exists
            const maskPath = path.join(framesDir, `${frame.name}_mask.png`);
            const maskExists = await fs.access(maskPath).then(() => true).catch(() => false);

            registry.push({
              name: frame.name.toLowerCase().replace(/ /g, '-'),
              displayName: frame.name,
              orientation: 'portrait' as const,
              frameWidth: dimensions.width,
              frameHeight: dimensions.height,
              screenRect: {
                x: parseInt(frame.x) || 0,
                y: parseInt(frame.y) || 0,
                width: screenWidth,
                height: screenHeight
              },
              deviceType: 'ipad' as const,
              originalName: frame.name,
              maskPath: maskExists ? maskPath : undefined
            });
          }
        }
      }

      if ((orientations as any).Landscape) {
        const frame = parseFrameEntry((orientations as any).Landscape);
        if (frame) {
          const framePath = path.join(framesDir, `${frame.name}.png`);
          const dimensions = await getFrameDimensions(framePath);

          if (dimensions) {
            // Get the actual screenshot dimensions for this device
            const screenshotDims = getScreenshotDimensions(frame.name, 'landscape');
            const screenWidth = screenshotDims.width || (dimensions.width - (parseInt(frame.x) || 0) * 2);
            const screenHeight = screenshotDims.height || (dimensions.height - (parseInt(frame.y) || 0) * 2);

            // Check if mask file exists
            const maskPath = path.join(framesDir, `${frame.name}_mask.png`);
            const maskExists = await fs.access(maskPath).then(() => true).catch(() => false);

            registry.push({
              name: frame.name.toLowerCase().replace(/ /g, '-'),
              displayName: frame.name,
              orientation: 'landscape' as const,
              frameWidth: dimensions.width,
              frameHeight: dimensions.height,
              screenRect: {
                x: parseInt(frame.x) || 0,
                y: parseInt(frame.y) || 0,
                width: screenWidth,
                height: screenHeight
              },
              deviceType: 'ipad' as const,
              originalName: frame.name,
              maskPath: maskExists ? maskPath : undefined
            });
          }
        }
      }
    }
  }

  // Process Macs
  if (framesData.Mac) {
    for (const [_model, frameData] of Object.entries(framesData.Mac)) {
      if (!frameData || typeof frameData !== 'object') continue;

      const frame = parseFrameEntry(frameData);
      if (frame) {
        const framePath = path.join(framesDir, `${frame.name}.png`);
        const dimensions = await getFrameDimensions(framePath);

        if (dimensions) {
          registry.push({
            name: frame.name.toLowerCase().replace(/ /g, '-'),
            displayName: frame.name,
            orientation: 'landscape' as const,
            frameWidth: dimensions.width,
            frameHeight: dimensions.height,
            screenRect: {
              x: parseInt(frame.x) || 0,
              y: parseInt(frame.y) || 0,
              width: dimensions.width - (parseInt(frame.x) || 0) * 2,
              height: dimensions.height - (parseInt(frame.y) || 0) * 2
            },
            deviceType: 'mac' as const,
            originalName: frame.name
          });
        }
      } else {
        // Handle nested Mac models like "2021 MacBook Pro" with 14" and 16" variants
        for (const [_size, sizeData] of Object.entries(frameData)) {
          const sizeFrame = parseFrameEntry(sizeData);
          if (sizeFrame) {
            const framePath = path.join(framesDir, `${sizeFrame.name}.png`);
            const dimensions = await getFrameDimensions(framePath);

            if (dimensions) {
              registry.push({
                name: sizeFrame.name.toLowerCase().replace(/ /g, '-'),
                displayName: sizeFrame.name,
                orientation: 'landscape' as const,
                frameWidth: dimensions.width,
                frameHeight: dimensions.height,
                screenRect: {
                  x: parseInt(sizeFrame.x) || 0,
                  y: parseInt(sizeFrame.y) || 0,
                  width: dimensions.width - (parseInt(sizeFrame.x) || 0) * 2,
                  height: dimensions.height - (parseInt(sizeFrame.y) || 0) * 2
                },
                deviceType: 'mac' as const,
                originalName: sizeFrame.name
              });
            }
          }
        }
      }
    }
  }

  // Process Watches
  if (framesData.Watch) {
    for (const [_model, variants] of Object.entries(framesData.Watch)) {
      if (!variants || typeof variants !== 'object') continue;

      const frame = parseFrameEntry(variants);
      if (frame) {
        // Direct watch model like Ultra
        const framePath = path.join(framesDir, `${frame.name}.png`);
        const dimensions = await getFrameDimensions(framePath);

        if (dimensions) {
          registry.push({
            name: frame.name.toLowerCase().replace(/ /g, '-'),
            displayName: frame.name,
            orientation: 'portrait' as const,
            frameWidth: dimensions.width,
            frameHeight: dimensions.height,
            screenRect: {
              x: parseInt(frame.x) || 0,
              y: parseInt(frame.y) || 0,
              width: dimensions.width - (parseInt(frame.x) || 0) * 2,
              height: dimensions.height - (parseInt(frame.y) || 0) * 2
            },
            deviceType: 'watch' as const,
            originalName: frame.name
          });
        }
      } else {
        // Watch with size variants
        for (const [_size, sizeData] of Object.entries(variants)) {
          const sizeFrame = parseFrameEntry(sizeData);
          if (sizeFrame) {
            const framePath = path.join(framesDir, `${sizeFrame.name}.png`);
            const dimensions = await getFrameDimensions(framePath);

            if (dimensions) {
              registry.push({
                name: sizeFrame.name.toLowerCase().replace(/ /g, '-'),
                displayName: sizeFrame.name,
                orientation: 'portrait' as const,
                frameWidth: dimensions.width,
                frameHeight: dimensions.height,
                screenRect: {
                  x: parseInt(sizeFrame.x) || 0,
                  y: parseInt(sizeFrame.y) || 0,
                  width: dimensions.width - (parseInt(sizeFrame.x) || 0) * 2,
                  height: dimensions.height - (parseInt(sizeFrame.y) || 0) * 2
                },
                deviceType: 'watch' as const,
                originalName: sizeFrame.name
              });
            }
          }
        }
      }
    }
  }

  return registry;
}