import sharp from 'sharp';
import { promises as fs } from 'fs';
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
    let resizedScreenshot = await sharp(screenshot)
      .resize(
        frameMetadata.screenRect.width,
        frameMetadata.screenRect.height,
        {
          fit: 'fill'
        }
      )
      .toBuffer();

    // If we have a mask, apply it to the screenshot to clip corners
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
        
        // Apply mask to screenshot using composite with dest-in blend mode
        // This keeps only the parts of the screenshot where the mask is white
        resizedScreenshot = await sharp(resizedScreenshot)
          .composite([{
            input: resizedMask,
            blend: 'dest-in'
          }])
          .toBuffer();
      } catch (error) {
        console.warn(`Could not load mask: ${error}`);
      }
    } else if (frameMetadata.deviceType === 'iphone') {
      // No mask available, create a rounded corner mask for iPhone
      // iPhone screens have significant corner radius
      // Different iPhone models have different corner radii
      let cornerRadius: number;
      
      // Detect iPhone model from frame name for accurate corner radius
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
        // Create SVG mask with rounded rectangle
        const maskSvg = `
          <svg width="${frameMetadata.screenRect.width}" height="${frameMetadata.screenRect.height}" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" 
                  width="${frameMetadata.screenRect.width}" 
                  height="${frameMetadata.screenRect.height}" 
                  rx="${cornerRadius}" 
                  ry="${cornerRadius}" 
                  fill="white"/>
          </svg>`;
        
        const maskBuffer = Buffer.from(maskSvg);
        
        // Apply the rounded corner mask
        resizedScreenshot = await sharp(resizedScreenshot)
          .composite([{
            input: maskBuffer,
            blend: 'dest-in'
          }])
          .toBuffer();
      }
    }

    // Create the device composite - screenshot on transparent background, then add frame
    let deviceComposite = await sharp({
      create: {
        width: originalFrameWidth,
        height: originalFrameHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
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