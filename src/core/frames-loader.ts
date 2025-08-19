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
            registry.push({
              name: frame.name.toLowerCase().replace(/ /g, '-'),
              displayName: frame.name,
              orientation: orientationKey,
              frameWidth: dimensions.width,
              frameHeight: dimensions.height,
              screenRect: {
                x: parseInt(frame.x) || 0,
                y: parseInt(frame.y) || 0,
                width: dimensions.width - (parseInt(frame.x) || 0) * 2,
                height: dimensions.height - (parseInt(frame.y) || 0) * 2
              },
              deviceType: 'iphone' as const,
              originalName: frame.name
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
                deviceType: 'iphone' as const,
                originalName: frame.name
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
                deviceType: 'iphone' as const,
                originalName: frame.name
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
              deviceType: 'ipad' as const,
              originalName: frame.name
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
              deviceType: 'ipad' as const,
              originalName: frame.name
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