import sharp from 'sharp';
import type { GradientConfig, CaptionConfig, DeviceConfig } from '../types.js';
import { renderGradient } from './render.js';

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
  const captionHeight = captionPosition === 'above' && caption ?
    captionConfig.paddingTop + captionConfig.fontsize + (captionConfig.paddingBottom || 60) : 0;


  // Calculate total canvas dimensions (should be output dimensions)
  const canvasWidth = outputWidth;
  const canvasHeight = outputHeight;

  // Create gradient background
  const gradient = await renderGradient(canvasWidth, canvasHeight, gradientConfig);

  // Start compositing
  const composites: sharp.OverlayOptions[] = [];

  // Add caption if positioned above
  if (caption && captionPosition === 'above') {
    const captionSvg = createCaptionSvg(
      caption,
      captionConfig,
      canvasWidth,
      captionHeight
    );

    composites.push({
      input: Buffer.from(captionSvg),
      top: 0,
      left: 0
    });
  }

  if (frame && frameMetadata) {
    // Calculate scale factor if frame needs to be resized to fit output
    const originalFrameWidth = frameMetadata.frameWidth;
    const originalFrameHeight = frameMetadata.frameHeight;

    // Calculate available space for the device (accounting for caption)
    const availableWidth = outputWidth;
    const availableHeight = outputHeight - captionHeight;

    // Calculate scale to fit within available space while maintaining aspect ratio
    const scaleX = availableWidth / originalFrameWidth;
    const scaleY = availableHeight / originalFrameHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // Scale to 90% to leave some padding

    // Apply scaling to optimize canvas usage
    let targetDeviceWidth = Math.floor(originalFrameWidth * scale);
    let targetDeviceHeight = Math.floor(originalFrameHeight * scale);

    // Scale screenshot to fit in frame's screen area
    const resizedScreenshot = await sharp(screenshot)
      .resize(
        frameMetadata.screenRect.width,
        frameMetadata.screenRect.height,
        {
          fit: 'fill'
        }
      )
      .toBuffer();

    // Create the device composite by starting with the frame
    // Then place the screenshot UNDER it using dest-over blend mode
    // This ensures the frame bezels cover the screenshot edges
    let deviceComposite = await sharp(frame)
      .composite([
        {
          input: resizedScreenshot,
          left: frameMetadata.screenRect.x,
          top: frameMetadata.screenRect.y,
          blend: 'dest-over'  // Place screenshot behind frame
        }
      ])
      .toBuffer();

    // If partial frame, crop the bottom
    if (partialFrame) {
      const cropHeight = Math.floor(originalFrameHeight * (1 - frameOffset / 100));
      deviceComposite = await sharp(deviceComposite)
        .extract({
          left: 0,
          top: 0,
          width: originalFrameWidth,
          height: cropHeight
        })
        .toBuffer();
      targetDeviceHeight = Math.floor(cropHeight * scale);
    }

    // Scale the complete device if needed (now scales up or down)
    if (scale !== 1) {
      deviceComposite = await sharp(deviceComposite)
        .resize(targetDeviceWidth, targetDeviceHeight, {
          fit: 'inside',  // Preserve aspect ratio
          withoutEnlargement: false  // Allow scaling up
        })
        .toBuffer();
    }

    // Calculate position for centered device
    const deviceTop = captionHeight;
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
  if (caption && captionPosition === 'overlay') {
    const overlayCaptionSvg = createCaptionSvg(
      caption,
      captionConfig,
      canvasWidth,
      canvasHeight
    );

    composites.push({
      input: Buffer.from(overlayCaptionSvg),
      top: 0,
      left: 0
    });
  }

  // Composite everything onto the gradient
  const result = await sharp(gradient)
    .composite(composites)
    .toBuffer();

  return result;
}

/**
 * Create SVG for caption text
 */
function createCaptionSvg(
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

  // Create SVG with proper text rendering attributes
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