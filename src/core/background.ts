import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { renderGradient } from './render.js';
import type { BackgroundConfig, GradientConfig } from '../types.js';

export type BackgroundFit = 'cover' | 'contain' | 'fill' | 'scale-down';

interface BackgroundOptions {
  width: number;
  height: number;
  fit?: BackgroundFit;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  backgroundColor?: string;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  dimensions: {
    source: { width: number; height: number };
    target: { width: number; height: number };
  };
  aspectRatioDiff: number;
}

/**
 * Load and render a background (image or gradient)
 */
export async function renderBackground(
  width: number,
  height: number,
  config: BackgroundConfig,
  devicePath?: string
): Promise<Buffer> {
  // Check for background image in priority order
  const backgroundPath = await findBackgroundImage(config, devicePath);

  if (backgroundPath) {
    // Use image background
    return await renderImageBackground(backgroundPath, { width, height, fit: config.fit, position: config.position });
  } else if (config.gradient) {
    // Use gradient background
    return await renderGradient(width, height, config.gradient);
  } else if (config.color) {
    // Use solid color background
    return await renderSolidBackground(width, height, config.color);
  } else {
    // Default gradient fallback
    const defaultGradient: GradientConfig = {
      colors: ['#4A90E2', '#7B68EE'],
      direction: 'top-bottom'
    };
    return await renderGradient(width, height, defaultGradient);
  }
}

/**
 * Find background image based on priority
 */
async function findBackgroundImage(config: BackgroundConfig, devicePath?: string): Promise<string | null> {
  const candidates: string[] = [];

  // 1. Explicit path in config
  if (config.image) {
    candidates.push(config.image);
  }

  // 2. Device-specific background
  if (devicePath) {
    candidates.push(path.join(devicePath, 'background.png'));
    candidates.push(path.join(devicePath, 'background.jpg'));
    candidates.push(path.join(devicePath, 'background.jpeg'));
  }

  // 3. Global background in screenshots folder
  candidates.push(path.join('screenshots', 'background.png'));
  candidates.push(path.join('screenshots', 'background.jpg'));
  candidates.push(path.join('screenshots', 'background.jpeg'));

  // Check each candidate
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // File doesn't exist, try next
    }
  }

  return null;
}

/**
 * Render an image as background with specified fit
 */
async function renderImageBackground(imagePath: string, options: BackgroundOptions): Promise<Buffer> {
  const { width, height, fit = 'cover', position = 'center', backgroundColor = '#000000' } = options;

  try {
    let image = sharp(imagePath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    // Calculate how to fit the image
    const fitOptions = calculateFitOptions(
      { width: metadata.width, height: metadata.height },
      { width, height },
      fit,
      position
    );

    // Apply the fit
    if (fit === 'cover') {
      // Scale to cover entire area (may crop)
      image = image.resize(width, height, {
        fit: 'cover',
        position: fitOptions.position
      });
    } else if (fit === 'contain') {
      // Scale to fit within area (may add bars)
      image = image.resize(width, height, {
        fit: 'contain',
        background: backgroundColor,
        position: fitOptions.position
      });
    } else if (fit === 'fill') {
      // Stretch to exact dimensions (may distort)
      image = image.resize(width, height, {
        fit: 'fill'
      });
    } else if (fit === 'scale-down') {
      // Only scale down if larger, never scale up
      const needsScaling = metadata.width > width || metadata.height > height;
      if (needsScaling) {
        image = image.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
          background: backgroundColor
        });
      } else {
        // Center the image on a colored background
        const background = await renderSolidBackground(width, height, backgroundColor);
        const left = Math.floor((width - metadata.width) / 2);
        const top = Math.floor((height - metadata.height) / 2);

        return await sharp(background)
          .composite([{
            input: await image.toBuffer(),
            left,
            top
          }])
          .toBuffer();
      }
    }

    return await image.toBuffer();
  } catch (error) {
    console.error(pc.red(`Failed to load background image: ${imagePath}`));
    throw error;
  }
}

/**
 * Render a solid color background
 */
async function renderSolidBackground(width: number, height: number, color: string): Promise<Buffer> {
  // Create solid color as SVG
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
    </svg>
  `;

  return await sharp(Buffer.from(svg))
    .resize(width, height)
    .png()
    .toBuffer();
}

/**
 * Calculate fit options based on position
 */
function calculateFitOptions(
  source: { width: number; height: number },
  target: { width: number; height: number },
  fit: BackgroundFit,
  position: string
): { position: string } {
  const positionMap: Record<string, string> = {
    'center': 'center',
    'top': 'top',
    'bottom': 'bottom',
    'left': 'left',
    'right': 'right'
  };

  return {
    position: positionMap[position] || 'center'
  };
}

/**
 * Validate background dimensions against target
 */
export async function validateBackgroundDimensions(
  imagePath: string,
  targetWidth: number,
  targetHeight: number
): Promise<ValidationResult> {
  try {
    const metadata = await sharp(imagePath).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        warnings: ['Cannot determine image dimensions'],
        dimensions: {
          source: { width: 0, height: 0 },
          target: { width: targetWidth, height: targetHeight }
        },
        aspectRatioDiff: 100
      };
    }

    const warnings: string[] = [];
    const sourceAspect = metadata.width / metadata.height;
    const targetAspect = targetWidth / targetHeight;
    const aspectRatioDiff = Math.abs((sourceAspect - targetAspect) / targetAspect) * 100;

    // Check dimensions
    if (metadata.width < targetWidth || metadata.height < targetHeight) {
      warnings.push(
        `Background smaller than target resolution (${metadata.width}x${metadata.height} < ${targetWidth}x${targetHeight})`
      );
      warnings.push('Image will be stretched or upscaled, which may reduce quality');
    }

    // Check aspect ratio
    if (aspectRatioDiff > 10) {
      warnings.push(
        `Aspect ratio mismatch (${aspectRatioDiff.toFixed(1)}% difference)`
      );
      warnings.push('Image may be cropped or distorted to fit');
    }

    // Check file size
    const stats = await fs.stat(imagePath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > 50) {
      warnings.push(`Large file size (${sizeMB.toFixed(1)}MB) may impact performance`);
    } else if (sizeMB > 10) {
      warnings.push(`Consider optimizing file size (${sizeMB.toFixed(1)}MB)`);
    }

    return {
      valid: warnings.length === 0,
      warnings,
      dimensions: {
        source: { width: metadata.width, height: metadata.height },
        target: { width: targetWidth, height: targetHeight }
      },
      aspectRatioDiff
    };
  } catch (error) {
    return {
      valid: false,
      warnings: [`Failed to validate image: ${error instanceof Error ? error.message : 'Unknown error'}`],
      dimensions: {
        source: { width: 0, height: 0 },
        target: { width: targetWidth, height: targetHeight }
      },
      aspectRatioDiff: 100
    };
  }
}

/**
 * Auto-detect the best fit mode based on image and target dimensions
 */
export function detectBestFit(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): BackgroundFit {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  const aspectDiff = Math.abs(sourceAspect - targetAspect) / targetAspect;

  // If aspect ratios are very close, use fill
  if (aspectDiff < 0.05) {
    return 'fill';
  }

  // If source is smaller than target, use contain to avoid upscaling
  if (sourceWidth < targetWidth || sourceHeight < targetHeight) {
    return 'contain';
  }

  // Default to cover for larger images
  return 'cover';
}
