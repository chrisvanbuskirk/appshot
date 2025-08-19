import sharp from 'sharp';
import { promises as fs } from 'fs';
import type { GradientConfig, CaptionConfig, DeviceConfig } from '../types.js';
import { renderGradient } from './render.js';
import { applyRoundedCorners } from './mask-generator.js';

export interface ComposeOptions {
  screenshot: Buffer;
  frame?: Buffer | null;
  frameMetadata?: {
    frameWidth: number;
    frameHeight: number;
    screenRect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    maskPath?: string;
    deviceType?: 'iphone' | 'ipad' | 'mac' | 'watch';
    displayName?: string;
    name?: string;
  };
  caption?: string;
  captionConfig: CaptionConfig;
  gradientConfig: GradientConfig;
  deviceConfig: DeviceConfig;
  outputWidth: number;
  outputHeight: number;
}

/**
 * Compose a complete App Store screenshot with gradient, caption, and framed device
 */
export async function composeAppStoreScreenshot(options: ComposeOptions): Promise<Buffer> {
  const {
    screenshot,
    frame,
    frameMetadata,
    caption,
    captionConfig,
    gradientConfig,
    deviceConfig,
    outputWidth,
    outputHeight
  } = options;


  // Determine caption position (default to 'above' for better App Store style)
  const captionPosition = captionConfig.position || 'above';
  const partialFrame = deviceConfig.partialFrame || false;
  const frameOffset = deviceConfig.frameOffset || 25; // Default 25% cut off

  // Calculate dimensions based on output

  // Calculate caption height if positioned above
  let captionHeight = 0;
  if (captionPosition === 'above' && caption) {
    // For watch devices, use top 1/3 of screen for text
    const isWatch = outputWidth < 500;
    if (isWatch) {
      captionHeight = Math.floor(outputHeight / 3); // Use top 1/3 for watch captions
    } else {
      captionHeight = captionConfig.paddingTop + captionConfig.fontsize * 2 + (captionConfig.paddingBottom || 60);
    }
  }


  // Calculate total canvas dimensions (should be output dimensions)
  const canvasWidth = outputWidth;
  const canvasHeight = outputHeight;

  // Create gradient background
  const gradient = await renderGradient(canvasWidth, canvasHeight, gradientConfig);

  // Start compositing
  const composites: sharp.OverlayOptions[] = [];

  // Add caption if positioned above
  if (caption && captionPosition === 'above') {
    try {
      // Create simple SVG text
      const isWatch = outputWidth < 500;
      const fontSize = isWatch ? 36 : captionConfig.fontsize; // Smaller font for watch

      let svgText: string;

      if (isWatch) {
        // Simple word wrapping for 2 lines ONLY for watch
        const words = caption.split(' ');
        const midPoint = Math.ceil(words.length / 2);
        const line1 = words.slice(0, midPoint).join(' ');
        const line2 = words.slice(midPoint).join(' ');

        svgText = `<svg width="${canvasWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg">
          <text x="${canvasWidth/2}" y="${captionHeight * 0.4}" 
                font-family="Arial, sans-serif" 
                font-size="${fontSize}" 
                fill="${captionConfig.color}" 
                text-anchor="middle"
                font-weight="bold">${escapeXml(line1)}</text>
          <text x="${canvasWidth/2}" y="${captionHeight * 0.7}" 
                font-family="Arial, sans-serif" 
                font-size="${fontSize}" 
                fill="${captionConfig.color}" 
                text-anchor="middle"
                font-weight="bold">${escapeXml(line2)}</text>
        </svg>`;
      } else {
        // Single line for all other devices (iPhone, iPad, etc.)
        svgText = `<svg width="${canvasWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg">
          <text x="${canvasWidth/2}" y="${captionHeight/2}" 
                font-family="Arial, sans-serif" 
                font-size="${fontSize}" 
                fill="${captionConfig.color}" 
                text-anchor="middle"
                dominant-baseline="middle"
                font-weight="bold">${escapeXml(caption)}</text>
        </svg>`;
      }

      const captionImage = await sharp(Buffer.from(svgText))
        .png()
        .toBuffer();

      composites.push({
        input: captionImage,
        top: 0,
        left: 0
      });

    } catch {
      // If text rendering fails, just add transparent area
      console.log('[INFO] Text rendering failed, reserving space for caption');
      const captionArea = await sharp({
        create: {
          width: canvasWidth,
          height: captionHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
        .png()
        .toBuffer();

      composites.push({
        input: captionArea,
        top: 0,
        left: 0
      });
    }
  }

  if (frame && frameMetadata) {
    // Validate that frame is actually a buffer
    if (!Buffer.isBuffer(frame)) {
      throw new Error(`Frame is not a valid buffer for ${frameMetadata.displayName || frameMetadata.name}`);
    }
    // Calculate scale factor if frame needs to be resized to fit output
    const originalFrameWidth = frameMetadata.frameWidth;
    const originalFrameHeight = frameMetadata.frameHeight;

    // Calculate available space for the device (accounting for caption)
    const availableWidth = outputWidth;
    const availableHeight = Math.max(100, outputHeight - captionHeight); // Ensure minimum height

    // Calculate scale to fit within available space while maintaining aspect ratio
    const scaleX = availableWidth / originalFrameWidth;
    const scaleY = availableHeight / originalFrameHeight;
    // Different scaling for different device types
    let scale;
    if (frameMetadata.deviceType === 'watch') {
      // For watch, make it larger but keep it within bounds
      scale = Math.min(scaleX * 1.3, scaleY * 1.3); // Use 130% scale for watch
    } else if (frameMetadata.deviceType === 'mac') {
      // For Mac, make it larger to be more visible
      scale = Math.min(scaleX, scaleY) * 0.95; // Use 95% scale for Mac
    } else {
      scale = Math.min(scaleX, scaleY) * 0.9; // Use 90% for other devices
    }

    // Apply scaling to optimize canvas usage
    let targetDeviceWidth = Math.min(Math.floor(originalFrameWidth * scale), outputWidth);
    let targetDeviceHeight = Math.min(Math.floor(originalFrameHeight * scale), outputHeight);

    // Scale screenshot to fit in frame's screen area
    let resizedScreenshot;
    try {
      resizedScreenshot = await sharp(screenshot)
        .resize(
          frameMetadata.screenRect.width,
          frameMetadata.screenRect.height,
          {
            fit: 'fill'
          }
        )
        .toBuffer();
    } catch (error) {
      console.error('Failed to resize screenshot:', error);
      throw error;
    }

    // If we have a mask, apply it to the screenshot to clip corners
    let maskApplied = false;

    if (frameMetadata.maskPath) {
      try {
        // Load the mask
        const maskBuffer = await fs.readFile(frameMetadata.maskPath);

        // Resize mask to match screenshot dimensions
        const resizedMask = await sharp(maskBuffer)
          .resize(frameMetadata.screenRect.width, frameMetadata.screenRect.height, {
            fit: 'fill'
          })
          .toBuffer();

        // Extract RGB from screenshot and alpha from mask's red channel
        const screenshotRgb = await sharp(resizedScreenshot)
          .removeAlpha()
          .toBuffer();

        const maskAlpha = await sharp(resizedMask)
          .extractChannel('red') // Black=0 (transparent), White=255 (opaque)
          .toBuffer();

        // Join screenshot RGB with mask as alpha channel
        resizedScreenshot = await sharp(screenshotRgb)
          .joinChannel(maskAlpha)
          .png()
          .toBuffer();

        maskApplied = true;
      } catch (error) {
        console.warn(`Could not load mask file, will use programmatic masking: ${error}`);
        // Fall through to programmatic masking
      }
    }

    // If no mask was applied and this is an iPhone, use programmatic corner masking
    if (!maskApplied && frameMetadata.deviceType === 'iphone') {
      // No mask available, create a rounded corner mask for iPhone

      // Different iPhone models have different corner radii
      let cornerRadius: number;
      const frameName = frameMetadata.displayName?.toLowerCase() || frameMetadata.name?.toLowerCase() || '';

      if (frameName.includes('16 pro') || frameName.includes('15 pro') || frameName.includes('14 pro')) {
        // Newer Pro models have larger corner radius (~12% of width)
        cornerRadius = Math.floor(frameMetadata.screenRect.width * 0.12);
      } else if (frameName.includes('se') || frameName.includes('8')) {
        // SE and iPhone 8 have no rounded corners on the screen
        cornerRadius = 0;
      } else {
        // Standard models and older Pro models (~10% of width)
        cornerRadius = Math.floor(frameMetadata.screenRect.width * 0.10);
      }

      if (cornerRadius > 0) {
        // Apply rounded corners using our custom mask generator
        resizedScreenshot = await applyRoundedCorners(
          resizedScreenshot,
          frameMetadata.screenRect.width,
          frameMetadata.screenRect.height,
          cornerRadius
        );
      }
    }

    // Create the device composite - screenshot UNDER frame

    let deviceComposite;
    try {
      // First composite: screenshot on transparent background
      const screenshotLayer = await sharp({
        create: {
          width: originalFrameWidth,
          height: originalFrameHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
        .composite([{
          input: resizedScreenshot,
          left: frameMetadata.screenRect.x,
          top: frameMetadata.screenRect.y
        }])
        .png()
        .toBuffer();

      // Second composite: add frame on top using 'over' blend (frame should cover screenshot edges)
      deviceComposite = await sharp(screenshotLayer)
        .composite([{
          input: frame,
          left: 0,
          top: 0,
          blend: 'over'
        }])
        .png()  // CRITICAL: Convert to PNG format, not raw pixels!
        .toBuffer();
    } catch (error) {
      console.error('Failed to create device composite:', error);
      throw error;
    }

    // If partial frame, crop the bottom
    if (partialFrame) {
      const cropHeight = Math.floor(originalFrameHeight * (1 - frameOffset / 100));
      try {
        deviceComposite = await sharp(deviceComposite)
          .extract({
            left: 0,
            top: 0,
            width: originalFrameWidth,
            height: cropHeight
          })
          .png()  // Ensure PNG format
          .toBuffer();
        targetDeviceHeight = Math.floor(cropHeight * scale);
      } catch (error) {
        console.error('Failed to crop:', error);
        throw error;
      }
    }

    // Scale the complete device if needed (now scales up or down)
    if (scale !== 1) {
      try {
        deviceComposite = await sharp(deviceComposite)
          .resize(targetDeviceWidth, targetDeviceHeight, {
            fit: 'inside',  // Preserve aspect ratio
            withoutEnlargement: false  // Allow scaling up
          })
          .png()  // Ensure PNG format
          .toBuffer();
      } catch (error) {
        console.error('Failed to scale:', error);
        throw error;
      }
    }

    // Calculate position for centered device
    // For watch, reduce padding to move it up
    const extraPadding = frameMetadata.deviceType === 'watch' ? -20 : 0;
    const deviceTop = captionHeight + extraPadding;
    const deviceLeft = Math.floor((canvasWidth - targetDeviceWidth) / 2);

    // Add the complete device to composites
    composites.push({
      input: deviceComposite,
      top: deviceTop,
      left: Math.max(0, deviceLeft)
    });
  } else {
    // No frame, just use the screenshot
    const deviceTop = captionHeight;
    const deviceLeft = Math.floor((canvasWidth - outputWidth) / 2);

    composites.push({
      input: screenshot,
      top: deviceTop,
      left: Math.max(0, deviceLeft)
    });
  }

  // Add overlay caption if specified (legacy support)
  // Note: Caption rendering requires librsvg to be installed
  if (caption && captionPosition === 'overlay') {
    // Skip caption rendering for now - would require librsvg
    // TODO: Implement pure bitmap text rendering in future version
  }

  // Composite everything onto the gradient
  const result = await sharp(gradient)
    .composite(composites)
    .png()  // IMPORTANT: Ensure the output is a valid PNG
    .toBuffer();

  return result;
}

/**
 * Create SVG for caption text
 */
function _createCaptionSvg(
  text: string,
  config: CaptionConfig,
  width: number,
  height: number
): string {
  const position = config.position || 'above';

  // Calculate text position
  let textY: number;
  let textX: number;
  let textAnchor: string;

  if (position === 'above') {
    // Position in the caption area
    textY = config.paddingTop + config.fontsize;
  } else {
    // Overlay position (legacy)
    textY = config.paddingTop + config.fontsize;
  }

  // Handle text alignment
  switch (config.align) {
  case 'left':
    textX = config.paddingLeft || 50;
    textAnchor = 'start';
    break;
  case 'right':
    textX = width - (config.paddingRight || 50);
    textAnchor = 'end';
    break;
  case 'center':
  default:
    textX = width / 2;
    textAnchor = 'middle';
    break;
  }

  // Use a safe font stack that Sharp can render properly
  // SF Pro is not available to Sharp's SVG renderer, so we use a fallback stack
  const fontFamily = getFontStack(config.font);

  // For watch devices, use smaller font if text is too long
  const maxCharsPerLine = Math.floor(width / (config.fontsize * 0.6));
  const needsWrapping = text.length > maxCharsPerLine;

  if (needsWrapping) {
    // Split text into multiple lines
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Create multiple text elements for each line
    const lineHeight = config.fontsize * 1.2;
    const textElements = lines.map((line, index) =>
      `<text 
        x="${textX}" 
        y="${textY + (index * lineHeight)}" 
        font-family="${fontFamily}" 
        font-size="${config.fontsize}" 
        fill="${config.color}" 
        text-anchor="${textAnchor}" 
        font-weight="600"
      >${escapeXml(line)}</text>`
    ).join('\n');

    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${textElements}
    </svg>`;
  }

  // Single line text
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text 
      x="${textX}" 
      y="${textY}" 
      font-family="${fontFamily}" 
      font-size="${config.fontsize}" 
      fill="${config.color}" 
      text-anchor="${textAnchor}" 
      font-weight="600"
    >${escapeXml(text)}</text>
  </svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Get a safe font stack that Sharp's SVG renderer can use
 */
function getFontStack(requestedFont: string): string {
  // Map common macOS fonts to web-safe alternatives
  // Note: Using single quotes inside to avoid XML attribute quote conflicts
  const fontMap: Record<string, string> = {
    'SF Pro': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'SF Pro Display': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'SF Pro Text': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'San Francisco': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'New York': "Georgia, 'Times New Roman', Times, serif"
  };

  // Return the mapped font stack or use the requested font with fallbacks
  return fontMap[requestedFont] || `'${requestedFont}', system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
}