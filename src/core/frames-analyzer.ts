import sharp from 'sharp';

/**
 * Analyze a frame image to detect the transparent/screen area
 * This helps us automatically determine where the screenshot should be placed
 */
export async function analyzeFrameScreenArea(framePath: string): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null> {
  try {
    const image = sharp(framePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return null;
    }

    // Get raw pixel data
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // Find the bounds of the transparent/white area
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    // Sample the image to find transparent or near-white pixels
    // We'll check every 10th pixel for performance
    const step = 10;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * channels;

        if (channels === 4) {
          // RGBA - check for transparency
          const alpha = data[idx + 3];
          if (alpha < 128) { // Mostly transparent
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        } else if (channels === 3) {
          // RGB - check for white/light gray (common screen placeholder color)
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Check if it's near white
          if (r > 240 && g > 240 && b > 240) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
    }

    // Validate we found a reasonable screen area
    if (minX >= maxX || minY >= maxY) {
      return null;
    }

    // Refine the bounds by checking edges more precisely
    // This is important for accurate placement

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  } catch (error) {
    console.error('Error analyzing frame:', error);
    return null;
  }
}

/**
 * Get screen area from Frames.json data or analyze the frame
 */
export async function getScreenArea(
  framePath: string,
  frameData: { x?: string; y?: string; name: string }
): Promise<{ x: number; y: number; width: number; height: number }> {

  // First try to analyze the actual frame image
  const analyzed = await analyzeFrameScreenArea(framePath);

  if (analyzed) {
    return analyzed;
  }

  // Fallback to using the x,y offsets from Frames.json
  // These represent the padding/margins
  const frameMetadata = await sharp(framePath).metadata();
  const frameWidth = frameMetadata.width || 0;
  const frameHeight = frameMetadata.height || 0;

  const x = parseInt(frameData.x || '0');
  const y = parseInt(frameData.y || '0');

  return {
    x,
    y,
    width: frameWidth - x * 2,
    height: frameHeight - y * 2
  };
}