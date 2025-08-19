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

  // Calculate dimensions
  let finalWidth = outputWidth;

  // If we have a frame, determine the appropriate dimensions
  let frameWidth = frameMetadata?.frameWidth || outputWidth;
  let frameHeight = frameMetadata?.frameHeight || outputHeight;

  // Ensure canvas is at least as large as the output dimensions
  frameWidth = Math.max(frameWidth, outputWidth);
  frameHeight = Math.max(frameHeight, outputHeight);

  // Calculate caption height if positioned above
  const captionHeight = captionPosition === 'above' && caption ?
    captionConfig.paddingTop + captionConfig.fontsize + (captionConfig.paddingBottom || 60) : 0;

  // If partial frame, we'll crop the bottom
  let frameCropBottom = 0;
  if (partialFrame && frameMetadata) {
    frameCropBottom = Math.floor(frameHeight * (frameOffset / 100));
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

    // Composite screenshot into frame at original size
    let deviceComposite = await sharp({
      create: {
        width: originalFrameWidth,
        height: originalFrameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .png()
      .composite([
        {
          input: resizedScreenshot,
          left: frameMetadata.screenRect.x,
          top: frameMetadata.screenRect.y
        },
        {
          input: frame,
          left: 0,
          top: 0
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

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="${textX}"
        y="${textY}"
        font-family="${config.font}"
        font-size="${config.fontsize}"
        fill="${config.color}"
        text-anchor="${textAnchor}"
        font-weight="600"
      >${escapeXml(text)}</text>
    </svg>
  `;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}