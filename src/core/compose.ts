import sharp from 'sharp';
import { promises as fs } from 'fs';
import type { GradientConfig, CaptionConfig, DeviceConfig } from '../types.js';
import { renderGradient } from './render.js';
import { applyRoundedCorners } from './mask-generator.js';
import { calculateAdaptiveCaptionHeight, wrapText } from './text-utils.js';

/**
 * Escape special XML/HTML characters in text
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
  // Check for device-specific override first
  const captionPosition = deviceConfig.captionPosition || captionConfig.position || 'above';
  const partialFrame = deviceConfig.partialFrame || false;
  const frameOffset = deviceConfig.frameOffset || 25; // Default 25% cut off
  const framePosition = deviceConfig.framePosition || 'center';
  const deviceFrameScale = deviceConfig.frameScale;

  // Calculate dimensions based on output

  // Pre-calculate device dimensions for caption height calculation
  let targetDeviceHeight = 0;
  let deviceTop = 0;

  if (frame && frameMetadata) {
    const originalFrameHeight = frameMetadata.frameHeight;
    const availableHeight = Math.max(100, outputHeight - 100); // Temporary estimate
    const scaleY = availableHeight / originalFrameHeight;
    const scale = deviceConfig.frameScale ? scaleY * deviceConfig.frameScale : scaleY * 0.9;
    targetDeviceHeight = Math.floor(originalFrameHeight * scale);

    // Calculate preliminary device position
    if (typeof framePosition === 'number') {
      const availableSpace = outputHeight - targetDeviceHeight;
      deviceTop = Math.floor(availableSpace * (framePosition / 100));
    } else if (framePosition === 'top') {
      deviceTop = 100; // Temporary estimate
    } else if (framePosition === 'bottom') {
      deviceTop = outputHeight - targetDeviceHeight;
    } else {
      deviceTop = Math.floor((outputHeight - targetDeviceHeight) / 2);
    }
  }

  // Calculate caption height if positioned above
  let captionHeight = 0;
  let captionLines: string[] = [];

  if (captionPosition === 'above' && caption) {
    const isWatch = outputWidth < 500;
    const captionFontSize = deviceConfig.captionSize || captionConfig.fontsize;

    // Get caption box config (device-specific or global)
    const captionBoxConfig = deviceConfig.captionBox || captionConfig.box || {};
    const autoSize = captionBoxConfig.autoSize !== false; // Default true

    if (isWatch) {
      // Use proper text wrapping for watch with padding
      captionHeight = Math.floor(outputHeight / 3);
      // Use smaller font size for watch (36px max)
      const watchFontSize = Math.min(36, captionFontSize);
      // Use wrapText which now accounts for watch padding - allow 3 lines for watch
      captionLines = wrapText(caption, outputWidth, watchFontSize, 3);
    } else if (autoSize) {
      // Use adaptive caption height
      const result = calculateAdaptiveCaptionHeight(
        caption,
        captionFontSize,
        outputWidth,
        outputHeight,
        deviceTop,
        targetDeviceHeight,
        framePosition
      );
      captionHeight = result.height;
      captionLines = result.lines;
    } else {
      // Use fixed height with text wrapping
      const maxLines = captionBoxConfig.maxLines || 3;
      captionLines = wrapText(caption, outputWidth, captionFontSize, maxLines);
      const lineHeight = captionBoxConfig.lineHeight || 1.4;
      const textHeight = captionLines.length * captionFontSize * lineHeight;
      captionHeight = captionConfig.paddingTop + textHeight + (captionConfig.paddingBottom || 60);

      // Apply min/max constraints
      if (captionBoxConfig.minHeight) {
        captionHeight = Math.max(captionBoxConfig.minHeight, captionHeight);
      }
      if (captionBoxConfig.maxHeight) {
        captionHeight = Math.min(captionBoxConfig.maxHeight, captionHeight);
      }
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
      // Use device-specific caption size if provided
      const baseFontSize = deviceConfig.captionSize || captionConfig.fontsize;
      const fontSize = isWatch ? Math.min(36, baseFontSize) : baseFontSize; // Smaller font for watch

      let svgText: string;

      // Get caption box config
      const captionBoxConfig = deviceConfig.captionBox || captionConfig.box || {};
      const lineHeight = captionBoxConfig.lineHeight || 1.4;

      if (captionLines.length === 0) {
        // Fallback if no lines were calculated
        captionLines = [caption];
      }

      // Calculate vertical positioning for centered text block
      const totalTextHeight = captionLines.length * fontSize * lineHeight;
      const startY = (captionHeight - totalTextHeight) / 2 + fontSize;

      // Create SVG with multiple text lines
      // Use device-specific font if available, otherwise use global caption font
      const fontToUse = deviceConfig.captionFont || captionConfig.font;
      const textElements = captionLines.map((line, index) => {
        const y = startY + (index * fontSize * lineHeight);
        return `<text x="${canvasWidth/2}" y="${y}" 
                font-family="${getFontStack(fontToUse)}" 
                font-size="${fontSize}" 
                fill="${captionConfig.color}" 
                text-anchor="middle"
                font-weight="bold">${escapeXml(line)}</text>`;
      }).join('\n');

      svgText = `<svg width="${canvasWidth}" height="${captionHeight}" xmlns="http://www.w3.org/2000/svg">
        ${textElements}
      </svg>`;

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

    // Calculate available space for the device
    const availableWidth = outputWidth;
    let availableHeight = Math.max(100, outputHeight - captionHeight); // Default: account for caption

    // If frameScale is explicitly set, use total output height for consistent sizing
    if (deviceFrameScale !== undefined) {
      availableHeight = outputHeight; // Use full height for consistent scale
    }

    // Calculate scale to fit within available space while maintaining aspect ratio
    const scaleX = availableWidth / originalFrameWidth;
    const scaleY = availableHeight / originalFrameHeight;
    // Use device-specific scale if provided, otherwise use defaults
    let scale;
    if (deviceFrameScale !== undefined) {
      scale = Math.min(scaleX, scaleY) * deviceFrameScale;
    } else if (frameMetadata.deviceType === 'watch') {
      // For watch, make it larger since bottom will be cut off
      scale = Math.min(scaleX, scaleY) * 1.3; // Use 130% scale for watch
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

    // Recalculate position with actual caption height
    if (typeof framePosition === 'number') {
      // Custom position as percentage from top (0-100)
      const availableSpace = canvasHeight - captionHeight - targetDeviceHeight;
      deviceTop = captionHeight + Math.floor(availableSpace * (framePosition / 100));
    } else if (framePosition === 'top') {
      deviceTop = captionHeight;
    } else if (framePosition === 'bottom') {
      deviceTop = canvasHeight - targetDeviceHeight;
    } else if (framePosition === 'center') {
      // Default centered positioning
      if (frameMetadata.deviceType === 'watch' && !deviceConfig.framePosition) {
        // Special watch positioning (unless explicitly overridden)
        deviceTop = canvasHeight - Math.floor(targetDeviceHeight * 0.75) - 25;
      } else {
        const availableSpace = canvasHeight - captionHeight;
        deviceTop = captionHeight + Math.floor((availableSpace - targetDeviceHeight) / 2);
      }
    } else {
      // Default to centered
      deviceTop = captionHeight;
    }

    // Ensure device doesn't go off canvas
    deviceTop = Math.floor(Math.max(captionHeight, Math.min(deviceTop, canvasHeight - targetDeviceHeight)));
    const deviceLeft = Math.floor((canvasWidth - targetDeviceWidth) / 2);

    // Add the complete device to composites
    composites.push({
      input: deviceComposite,
      top: deviceTop,
      left: Math.max(0, deviceLeft)
    });
  } else {
    // No frame, resize screenshot to fit within the canvas
    const screenshotMeta = await sharp(screenshot).metadata();
    const screenshotWidth = screenshotMeta.width || outputWidth;
    const screenshotHeight = screenshotMeta.height || outputHeight;

    // Calculate available space for the screenshot
    const availableWidth = outputWidth;
    const availableHeight = outputHeight - captionHeight;

    // Calculate scale to fit within available space while maintaining aspect ratio
    const scaleX = availableWidth / screenshotWidth;
    const scaleY = availableHeight / screenshotHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale, only downscale if needed

    const targetWidth = Math.floor(screenshotWidth * scale);
    const targetHeight = Math.floor(screenshotHeight * scale);

    // Resize screenshot if needed
    let resizedScreenshot = screenshot;
    if (scale < 1) {
      resizedScreenshot = await sharp(screenshot)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
    }

    // Center the screenshot horizontally
    const deviceTop = Math.floor(captionHeight);
    const deviceLeft = Math.floor((canvasWidth - targetWidth) / 2);

    composites.push({
      input: resizedScreenshot,
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

/**
 * Get a safe font stack that Sharp's SVG renderer can use
 */
function getFontStack(requestedFont: string): string {
  // Map common fonts to web-safe alternatives with appropriate fallbacks
  // Note: Using single quotes inside to avoid XML attribute quote conflicts
  const fontMap: Record<string, string> = {
    // Apple System Fonts
    'SF Pro': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'SF Pro Display': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'SF Pro Text': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'San Francisco': "system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif",
    'New York': "Georgia, 'Times New Roman', Times, serif",

    // Popular Sans-Serif Fonts
    'Helvetica': "Helvetica, 'Helvetica Neue', Arial, sans-serif",
    'Helvetica Neue': "'Helvetica Neue', Helvetica, Arial, sans-serif",
    'Arial': 'Arial, Helvetica, sans-serif',
    'Roboto': "Roboto, 'Helvetica Neue', Arial, sans-serif",
    'Open Sans': "'Open Sans', 'Helvetica Neue', Arial, sans-serif",
    'Montserrat': "Montserrat, 'Helvetica Neue', Arial, sans-serif",
    'Lato': "Lato, 'Helvetica Neue', Arial, sans-serif",
    'Poppins': "Poppins, 'Helvetica Neue', Arial, sans-serif",
    'Inter': "Inter, system-ui, 'Helvetica Neue', Arial, sans-serif",
    'Segoe UI': "'Segoe UI', system-ui, Tahoma, Geneva, sans-serif",
    'Ubuntu': "Ubuntu, system-ui, 'Helvetica Neue', Arial, sans-serif",
    'Fira Sans': "'Fira Sans', 'Helvetica Neue', Arial, sans-serif",
    'Source Sans Pro': "'Source Sans Pro', 'Helvetica Neue', Arial, sans-serif",

    // Serif Fonts
    'Georgia': "Georgia, 'Times New Roman', Times, serif",
    'Times New Roman': "'Times New Roman', Times, serif",
    'Times': "Times, 'Times New Roman', serif",
    'Playfair Display': "'Playfair Display', Georgia, serif",
    'Merriweather': 'Merriweather, Georgia, serif',
    'Lora': 'Lora, Georgia, serif',
    'PT Serif': "'PT Serif', Georgia, serif",
    'Baskerville': "Baskerville, 'Times New Roman', serif",
    'Garamond': "Garamond, 'Times New Roman', serif",

    // Monospace Fonts
    'Courier': "Courier, 'Courier New', monospace",
    'Courier New': "'Courier New', Courier, monospace",
    'Monaco': "Monaco, 'Courier New', monospace",
    'Consolas': "Consolas, Monaco, 'Courier New', monospace",
    'Menlo': "Menlo, Monaco, Consolas, 'Courier New', monospace",
    'Fira Code': "'Fira Code', Consolas, Monaco, monospace",
    'Source Code Pro': "'Source Code Pro', Consolas, Monaco, monospace",
    'JetBrains Mono': "'JetBrains Mono', Consolas, Monaco, monospace",

    // Display & Decorative Fonts
    'Impact': "Impact, 'Arial Black', sans-serif",
    'Arial Black': "'Arial Black', Impact, sans-serif",
    'Comic Sans MS': "'Comic Sans MS', cursive, sans-serif",
    'Bebas Neue': "'Bebas Neue', Impact, sans-serif",
    'Oswald': "Oswald, 'Arial Narrow', sans-serif",
    'Raleway': "Raleway, 'Helvetica Neue', Arial, sans-serif",

    // Windows Fonts
    'Calibri': "Calibri, 'Helvetica Neue', Arial, sans-serif",
    'Cambria': 'Cambria, Georgia, serif',
    'Verdana': 'Verdana, Geneva, sans-serif',
    'Tahoma': 'Tahoma, Geneva, Verdana, sans-serif',
    'Trebuchet MS': "'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif"
  };

  // Check if font name needs normalization (case-insensitive lookup)
  const normalizedFont = Object.keys(fontMap).find(
    key => key.toLowerCase() === requestedFont.toLowerCase()
  );

  if (normalizedFont) {
    return fontMap[normalizedFont];
  }

  // Determine fallback based on font characteristics
  const lowerFont = requestedFont.toLowerCase();

  if (lowerFont.includes('serif') && !lowerFont.includes('sans')) {
    // Serif font
    return `'${requestedFont}', Georgia, 'Times New Roman', Times, serif`;
  } else if (lowerFont.includes('mono') || lowerFont.includes('code') || lowerFont.includes('console')) {
    // Monospace font
    return `'${requestedFont}', Monaco, Consolas, 'Courier New', monospace`;
  } else if (lowerFont.includes('display') || lowerFont.includes('headline')) {
    // Display font
    return `'${requestedFont}', Impact, 'Arial Black', sans-serif`;
  } else {
    // Default to sans-serif
    return `'${requestedFont}', system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  }
}