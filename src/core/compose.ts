import sharp from 'sharp';
import { promises as fs } from 'fs';
import pc from 'picocolors';
import type { GradientConfig, CaptionConfig, DeviceConfig } from '../types.js';
import { renderGradient } from './render.js';
import { applyRoundedCorners } from './mask-generator.js';
import { calculateAdaptiveCaptionHeight, wrapText } from './text-utils.js';
import { FontService } from '../services/fonts.js';

/**
 * Parse font name to extract style and weight
 */
function parseFontName(fontName: string): { family: string; style?: string; weight?: string } {
  const parts = fontName.trim().split(/\s+/);
  let family = fontName;
  let style: string | undefined;
  let weight: string | undefined;

  // Check for italic
  if (parts[parts.length - 1]?.toLowerCase() === 'italic') {
    style = 'italic';
    parts.pop();

    // Check for bold italic
    if (parts[parts.length - 1]?.toLowerCase() === 'bold') {
      weight = 'bold';
      parts.pop();
    }

    family = parts.join(' ');
  } else if (parts[parts.length - 1]?.toLowerCase() === 'bold') {
    // Just bold
    weight = 'bold';
    parts.pop();
    family = parts.join(' ');
  }

  return { family, style, weight };
}

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

/**
 * Generate SVG with text, background, and border support
 */
function generateCaptionSVG(
  lines: string[],
  width: number,
  height: number,
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
  fontWeight: string,
  textColor: string,
  lineHeight: number,
  captionConfig: CaptionConfig
): string {
  const backgroundConfig = captionConfig.background;
  const borderConfig = captionConfig.border;

  // Calculate text positioning
  const totalTextHeight = lines.length * fontSize * lineHeight;
  const startY = (height - totalTextHeight) / 2 + fontSize;

  // SVG elements array
  const svgElements: string[] = [];

  // Add background rectangle if configured
  if (backgroundConfig?.color) {
    const bgPadding = backgroundConfig.padding || 20;
    const bgOpacity = backgroundConfig.opacity || 0.8;

    // Use full width minus margins for uniform appearance
    const sideMargin = 30; // Margin from edges
    const bgWidth = width - (sideMargin * 2);
    const bgHeight = totalTextHeight + bgPadding * 2;
    const bgX = sideMargin;
    const bgY = startY - fontSize - bgPadding;

    const bgRadius = borderConfig?.radius || 12; // Default to 12px for better visibility

    svgElements.push(
      `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" ` +
      `fill="${backgroundConfig.color}" opacity="${bgOpacity}" rx="${bgRadius}"/>`
    );
  }

  // Add border rectangle if configured
  if (borderConfig?.color && borderConfig?.width) {
    const bgPadding = backgroundConfig?.padding || 20;
    const borderWidth = borderConfig.width;
    const borderRadius = borderConfig.radius || 12;

    // Use full width minus margins for uniform appearance
    const sideMargin = 30; // Margin from edges
    const rectWidth = width - (sideMargin * 2);
    const rectHeight = totalTextHeight + bgPadding * 2;
    const rectX = sideMargin;
    const rectY = startY - fontSize - bgPadding;

    svgElements.push(
      `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" ` +
      `fill="none" stroke="${borderConfig.color}" stroke-width="${borderWidth}" rx="${borderRadius}"/>`
    );
  }

  // Add text elements
  const textElements = lines.map((line, index) => {
    const y = startY + (index * fontSize * lineHeight);
    return `<text x="${width/2}" y="${y}" ` +
           `font-family="${fontFamily}" ` +
           `font-size="${fontSize}" ` +
           `font-style="${fontStyle}" ` +
           `font-weight="${fontWeight}" ` +
           `fill="${textColor}" ` +
           `text-anchor="middle">${escapeXml(line)}</text>`;
  });

  svgElements.push(...textElements);

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${svgElements.join('\n    ')}
  </svg>`;
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
  verbose?: boolean;
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
    outputHeight,
    verbose = false
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

  // Calculate caption height based on position
  let captionHeight = 0;
  let captionLines: string[] = [];

  if ((captionPosition === 'above' || captionPosition === 'below') && caption) {
    const isWatch = outputWidth < 500;
    const captionFontSize = deviceConfig.captionSize || captionConfig.fontsize;

    // Get caption box config (device-specific or global)
    const captionBoxConfig = deviceConfig.captionBox || captionConfig.box || {};
    const autoSize = captionBoxConfig.autoSize !== false; // Default true

    if (verbose) {
      console.log(pc.dim('    Caption metrics:'));
      console.log(pc.dim(`      Text: "${caption.substring(0, 50)}${caption.length > 50 ? '...' : ''}"`));
      console.log(pc.dim(`      Base font size: ${captionFontSize}px`));
      console.log(pc.dim(`      Canvas width: ${outputWidth}px`));
      console.log(pc.dim(`      Auto-size: ${autoSize}`));
    }

    if (isWatch) {
      // Use proper text wrapping for watch with padding
      captionHeight = Math.floor(outputHeight / 3);
      // Use smaller font size for watch (36px max)
      const watchFontSize = Math.min(36, captionFontSize);
      // Use wrapText which now accounts for watch padding - allow 3 lines for watch
      captionLines = wrapText(caption, outputWidth, watchFontSize, 3);

      if (verbose) {
        console.log(pc.dim(`      Watch mode: font reduced to ${watchFontSize}px`));
        console.log(pc.dim(`      Wrap width: ${outputWidth}px (with padding)`));
      }
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

      if (verbose) {
        console.log(pc.dim(`      Adaptive height: ${captionHeight}px`));
      }
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

      if (verbose) {
        console.log(pc.dim(`      Max lines: ${maxLines}`));
        console.log(pc.dim(`      Line height: ${lineHeight}`));
        console.log(pc.dim(`      Fixed height: ${captionHeight}px`));
      }
    }

    if (verbose && captionLines.length > 0) {
      console.log(pc.dim(`      Lines wrapped: ${captionLines.length}`));
      console.log(pc.dim(`      Wrap width: ${outputWidth - 80}px`)); // Assuming 40px padding each side
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

      // Use device-specific font if available, otherwise use global caption font
      const fontToUse = deviceConfig.captionFont || captionConfig.font;

      // Parse font name for style and weight
      const parsedFont = parseFontName(fontToUse);
      const fontFamily = getFontStack(parsedFont.family);
      const fontStyle = parsedFont.style || 'normal';
      const fontWeight = parsedFont.weight === 'bold' ? '700' : '400';

      if (verbose) {
        console.log(pc.dim('    Font information:'));
        console.log(pc.dim(`      Requested: ${fontToUse}`));
        console.log(pc.dim(`      Font stack: ${fontFamily}`));
        if (parsedFont.style || parsedFont.weight) {
          console.log(pc.dim(`      Style: ${fontStyle}, Weight: ${fontWeight}`));
        }
      }

      svgText = generateCaptionSVG(
        captionLines,
        canvasWidth,
        captionHeight,
        fontSize,
        fontFamily,
        fontStyle,
        fontWeight,
        captionConfig.color,
        lineHeight,
        captionConfig
      );

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

    // Validate screenshot buffer
    if (!Buffer.isBuffer(screenshot) || screenshot.length === 0) {
      throw new Error('Screenshot is not a valid buffer or is empty');
    }

    // Calculate scale factor if frame needs to be resized to fit output
    const originalFrameWidth = frameMetadata.frameWidth;
    const originalFrameHeight = frameMetadata.frameHeight;

    // Calculate available space for the device
    const availableWidth = outputWidth;
    let availableHeight;

    // For 'above' positioning, reduce available height by caption
    // For 'below' positioning, we'll adjust positioning later but calculate scale normally
    if (captionPosition === 'above') {
      availableHeight = Math.max(100, outputHeight - captionHeight);
    } else if (captionPosition === 'below') {
      availableHeight = Math.max(100, outputHeight - captionHeight);
    } else {
      // 'overlay' positioning doesn't reduce available space
      availableHeight = outputHeight;
    }

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

    if (verbose) {
      console.log(pc.dim('    Device composition:'));
      console.log(pc.dim(`      Frame: ${frameMetadata.displayName || frameMetadata.name}`));
      console.log(pc.dim(`      Original size: ${originalFrameWidth}x${originalFrameHeight}`));
      console.log(pc.dim(`      Scale factor: ${scale.toFixed(2)}`));
      console.log(pc.dim(`      Target size: ${targetDeviceWidth}x${targetDeviceHeight}`));
    }

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

      if (verbose) {
        console.log(pc.dim(`      Partial frame: cropping ${frameOffset}% from bottom`));
        console.log(pc.dim(`      Crop height: ${cropHeight}px`));
      }

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
    if (captionPosition === 'above') {
      // Caption above: position device below caption area
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

    } else if (captionPosition === 'below') {
      // Caption below: position device in upper area, leaving space for caption at bottom
      const deviceAreaHeight = canvasHeight - captionHeight;

      if (typeof framePosition === 'number') {
        // Custom position as percentage within device area
        const availableSpace = deviceAreaHeight - targetDeviceHeight;
        deviceTop = Math.floor(availableSpace * (framePosition / 100));
      } else if (framePosition === 'top') {
        deviceTop = 0;
      } else if (framePosition === 'bottom') {
        deviceTop = deviceAreaHeight - targetDeviceHeight;
      } else if (framePosition === 'center') {
        // Default centered positioning in device area
        if (frameMetadata.deviceType === 'watch' && !deviceConfig.framePosition) {
          // Special watch positioning (unless explicitly overridden)
          deviceTop = Math.max(0, deviceAreaHeight - Math.floor(targetDeviceHeight * 0.75) - 25);
        } else {
          deviceTop = Math.floor((deviceAreaHeight - targetDeviceHeight) / 2);
        }
      } else {
        // Default to centered in device area
        deviceTop = Math.floor((deviceAreaHeight - targetDeviceHeight) / 2);
      }

      // Ensure device doesn't go off canvas or into caption area
      deviceTop = Math.floor(Math.max(0, Math.min(deviceTop, deviceAreaHeight - targetDeviceHeight)));

    } else {
      // 'overlay' positioning: position device normally without caption area considerations
      if (typeof framePosition === 'number') {
        const availableSpace = canvasHeight - targetDeviceHeight;
        deviceTop = Math.floor(availableSpace * (framePosition / 100));
      } else if (framePosition === 'top') {
        deviceTop = 0;
      } else if (framePosition === 'bottom') {
        deviceTop = canvasHeight - targetDeviceHeight;
      } else if (framePosition === 'center') {
        if (frameMetadata.deviceType === 'watch' && !deviceConfig.framePosition) {
          deviceTop = canvasHeight - Math.floor(targetDeviceHeight * 0.75) - 25;
        } else {
          deviceTop = Math.floor((canvasHeight - targetDeviceHeight) / 2);
        }
      } else {
        deviceTop = Math.floor((canvasHeight - targetDeviceHeight) / 2);
      }

      // Ensure device doesn't go off canvas
      deviceTop = Math.floor(Math.max(0, Math.min(deviceTop, canvasHeight - targetDeviceHeight)));
    }
    const deviceLeft = Math.floor((canvasWidth - targetDeviceWidth) / 2);

    if (verbose) {
      console.log(pc.dim(`      Position: ${framePosition} → top: ${deviceTop}px, left: ${deviceLeft}px`));
    }

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
    let availableHeight;
    let deviceTop;

    if (captionPosition === 'above') {
      availableHeight = outputHeight - captionHeight;
      deviceTop = Math.floor(captionHeight);
    } else if (captionPosition === 'below') {
      availableHeight = outputHeight - captionHeight;
      deviceTop = 0; // Start from top when caption is below
    } else {
      // 'overlay' positioning
      availableHeight = outputHeight;
      deviceTop = 0;
    }

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

    // For 'below' positioning, center the screenshot in the available device area
    if (captionPosition === 'below') {
      deviceTop = Math.floor((availableHeight - targetHeight) / 2);
    }

    // Center the screenshot horizontally
    const deviceLeft = Math.floor((canvasWidth - targetWidth) / 2);

    composites.push({
      input: resizedScreenshot,
      top: deviceTop,
      left: Math.max(0, deviceLeft)
    });
  }

  // Add caption if positioned below the device
  if (caption && captionPosition === 'below') {
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

      // Use device-specific font if available, otherwise use global caption font
      const fontToUse = deviceConfig.captionFont || captionConfig.font;

      // Parse font name for style and weight
      const parsedFont = parseFontName(fontToUse);
      const fontFamily = getFontStack(parsedFont.family);
      const fontStyle = parsedFont.style || 'normal';
      const fontWeight = parsedFont.weight === 'bold' ? '700' : '400';

      if (verbose) {
        console.log(pc.dim('    Caption below device:'));
        console.log(pc.dim(`      Font: ${fontToUse} → ${fontFamily}`));
        if (parsedFont.style || parsedFont.weight) {
          console.log(pc.dim(`      Style: ${fontStyle}, Weight: ${fontWeight}`));
        }
      }

      svgText = generateCaptionSVG(
        captionLines,
        canvasWidth,
        captionHeight,
        fontSize,
        fontFamily,
        fontStyle,
        fontWeight,
        captionConfig.color,
        lineHeight,
        captionConfig
      );

      const captionImage = await sharp(Buffer.from(svgText))
        .png()
        .toBuffer();

      // Position caption at bottom of canvas
      const captionTop = canvasHeight - captionHeight;
      composites.push({
        input: captionImage,
        top: captionTop,
        left: 0
      });

    } catch {
      // If text rendering fails, just add transparent area at bottom
      console.log('[INFO] Bottom caption rendering failed, reserving space');
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
        top: canvasHeight - captionHeight,
        left: 0
      });
    }
  }

  // Add overlay caption if specified
  if (caption && captionPosition === 'overlay') {
    try {
      // Create simple SVG text for overlay
      const isWatch = outputWidth < 500;
      const baseFontSize = deviceConfig.captionSize || captionConfig.fontsize;
      const fontSize = isWatch ? Math.min(36, baseFontSize) : baseFontSize;

      // Get caption box config
      const captionBoxConfig = deviceConfig.captionBox || captionConfig.box || {};
      const lineHeight = captionBoxConfig.lineHeight || 1.4;

      // For overlay, use simple single line or basic wrapping
      let overlayLines: string[] = [];
      if (captionLines.length > 0) {
        overlayLines = captionLines;
      } else {
        // Simple fallback wrapping for overlay
        const maxCharsPerLine = Math.floor(outputWidth / (fontSize * 0.6));
        if (caption.length > maxCharsPerLine) {
          overlayLines = wrapText(caption, outputWidth, fontSize, 2); // Max 2 lines for overlay
        } else {
          overlayLines = [caption];
        }
      }

      // Position overlay text based on padding settings
      const textY = captionConfig.paddingTop + fontSize;

      // Use device-specific font if available, otherwise use global caption font
      const fontToUse = deviceConfig.captionFont || captionConfig.font;

      // Parse font name for style and weight
      const parsedFont = parseFontName(fontToUse);
      const fontFamily = getFontStack(parsedFont.family);
      const fontStyle = parsedFont.style || 'normal';
      const fontWeight = parsedFont.weight === 'bold' ? '700' : '400';

      if (verbose) {
        console.log(pc.dim('    Overlay caption:'));
        console.log(pc.dim(`      Font: ${fontToUse} → ${fontFamily}`));
        console.log(pc.dim(`      Position: ${textY}px from top`));
      }

      // For overlay, we need custom SVG generation with background/border support
      const svgElements: string[] = [];

      // Add background rectangle if configured
      const backgroundConfig = captionConfig.background;
      const borderConfig = captionConfig.border;

      if (backgroundConfig?.color) {
        const bgPadding = backgroundConfig.padding || 20;
        const bgOpacity = backgroundConfig.opacity || 0.8;

        // Use full width minus margins for uniform appearance
        const totalTextHeight = overlayLines.length * fontSize * lineHeight;
        const sideMargin = 30; // Margin from edges
        const bgWidth = canvasWidth - (sideMargin * 2);
        const bgHeight = totalTextHeight + bgPadding * 2;
        const bgX = sideMargin;
        const bgY = textY - fontSize - bgPadding;

        const bgRadius = borderConfig?.radius || 12; // Default to 12px for better visibility

        svgElements.push(
          `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" ` +
          `fill="${backgroundConfig.color}" opacity="${bgOpacity}" rx="${bgRadius}"/>`
        );
      }

      // Add border rectangle if configured
      if (borderConfig?.color && borderConfig?.width) {
        const bgPadding = backgroundConfig?.padding || 20;
        const borderWidth = borderConfig.width;
        const borderRadius = borderConfig.radius || 12;

        const totalTextHeight = overlayLines.length * fontSize * lineHeight;
        const sideMargin = 30; // Margin from edges
        const rectWidth = canvasWidth - (sideMargin * 2);
        const rectHeight = totalTextHeight + bgPadding * 2;
        const rectX = sideMargin;
        const rectY = textY - fontSize - bgPadding;

        svgElements.push(
          `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" ` +
          `fill="none" stroke="${borderConfig.color}" stroke-width="${borderWidth}" rx="${borderRadius}"/>`
        );
      }

      // Add text elements
      const textElements = overlayLines.map((line, index) => {
        const y = textY + (index * fontSize * lineHeight);
        return `<text x="${canvasWidth/2}" y="${y}" ` +
               `font-family="${fontFamily}" ` +
               `font-size="${fontSize}" ` +
               `font-style="${fontStyle}" ` +
               `font-weight="${fontWeight}" ` +
               `fill="${captionConfig.color}" ` +
               `text-anchor="middle">${escapeXml(line)}</text>`;
      });

      svgElements.push(...textElements);

      const svgText = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
        ${svgElements.join('\n        ')}
      </svg>`;

      const overlayImage = await sharp(Buffer.from(svgText))
        .png()
        .toBuffer();

      // Add overlay caption on top of everything
      composites.push({
        input: overlayImage,
        top: 0,
        left: 0,
        blend: 'over'
      });

    } catch {
      console.log('[INFO] Overlay caption rendering failed, skipping caption');
    }
  }

  // Composite everything onto the gradient
  const result = await sharp(gradient)
    .composite(composites)
    .png()  // IMPORTANT: Ensure the output is a valid PNG
    .toBuffer();

  return result;
}

/**
 * Compose a framed device with a fully transparent background.
 * No gradient or captions are applied; output is frame-sized.
 */
export async function composeFrameOnly(options: {
  screenshot: Buffer;
  frame: Buffer;
  frameMetadata: {
    frameWidth: number;
    frameHeight: number;
    screenRect: { x: number; y: number; width: number; height: number };
    maskPath?: string;
    deviceType?: 'iphone' | 'ipad' | 'mac' | 'watch';
    displayName?: string;
    name?: string;
  };
  outputFormat?: 'png' | 'jpeg';
  jpegQuality?: number;
  verbose?: boolean;
}): Promise<Buffer> {
  const { screenshot, frame, frameMetadata, outputFormat = 'png', jpegQuality = 92, verbose = false } = options;

  if (!frame || !frameMetadata) {
    throw new Error('composeFrameOnly requires a frame buffer and frame metadata');
  }

  const { frameWidth, frameHeight, screenRect } = frameMetadata;

  if (verbose) {
    console.log(pc.dim('Framing with transparent background:'));
    if (frameMetadata.displayName || frameMetadata.name) {
      console.log(pc.dim(`  Frame: ${frameMetadata.displayName || frameMetadata.name}`));
    }
    console.log(pc.dim(`  Frame size: ${frameWidth}x${frameHeight}`));
    console.log(pc.dim(`  Screen rect: ${screenRect.width}x${screenRect.height} @ (${screenRect.x}, ${screenRect.y})`));
  }

  // Prepare screenshot to fit the frame's screen area
  let resizedScreenshot = await sharp(screenshot)
    .resize(screenRect.width, screenRect.height, { fit: 'fill' })
    .toBuffer();

  // Apply mask if available; otherwise add rounded corners for iPhone heuristically
  let maskApplied = false;
  if (frameMetadata.maskPath) {
    try {
      const maskBuffer = await fs.readFile(frameMetadata.maskPath);
      const resizedMask = await sharp(maskBuffer)
        .resize(screenRect.width, screenRect.height, { fit: 'fill' })
        .toBuffer();

      const screenshotRgb = await sharp(resizedScreenshot).removeAlpha().toBuffer();
      const maskAlpha = await sharp(resizedMask).extractChannel('red').toBuffer();

      resizedScreenshot = await sharp(screenshotRgb).joinChannel(maskAlpha).png().toBuffer();
      maskApplied = true;
    } catch (err) {
      if (verbose) {
        console.warn(pc.dim(`  Mask load failed, falling back to rounded corners (if applicable): ${err instanceof Error ? err.message : String(err)}`));
      }
    }
  }

  if (!maskApplied && frameMetadata.deviceType === 'iphone') {
    // Heuristic rounded corners for iPhone if mask missing
    let cornerRadius: number;
    const frameName = frameMetadata.displayName?.toLowerCase() || frameMetadata.name?.toLowerCase() || '';
    if (frameName.includes('16 pro') || frameName.includes('15 pro') || frameName.includes('14 pro')) {
      cornerRadius = Math.floor(screenRect.width * 0.12);
    } else if (frameName.includes('se') || frameName.includes('8')) {
      cornerRadius = 0;
    } else {
      cornerRadius = Math.floor(screenRect.width * 0.10);
    }
    if (cornerRadius > 0) {
      resizedScreenshot = await applyRoundedCorners(
        resizedScreenshot,
        screenRect.width,
        screenRect.height,
        cornerRadius
      );
    }
  }

  // Base transparent canvas sized to the frame
  const base = sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Composite screenshot at screen coordinates, then overlay frame image
  let composed = base.composite([
    { input: resizedScreenshot, top: screenRect.y, left: screenRect.x },
    { input: frame, top: 0, left: 0 }
  ]);

  if (outputFormat === 'png') {
    return composed.png().toBuffer();
  }

  // JPEG cannot store alpha; flatten on white
  return composed.flatten({ background: '#ffffff' }).jpeg({ quality: jpegQuality }).toBuffer();
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
export async function getFontStackAsync(requestedFont: string): Promise<{ stack: string; isEmbedded: boolean; path?: string }> {
  // Check if font is embedded
  const fontService = FontService.getInstance();
  const fontStatus = await fontService.getFontStatusWithEmbedded(requestedFont);

  if (fontStatus.embedded && fontStatus.path) {
    // Return embedded font info
    return {
      stack: getFontStack(requestedFont),
      isEmbedded: true,
      path: fontStatus.path
    };
  }

  // Return normal font stack
  return {
    stack: getFontStack(requestedFont),
    isEmbedded: false
  };
}

export function getFontStack(requestedFont: string): string {
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
    'DM Sans': "'DM Sans', system-ui, 'Helvetica Neue', Arial, sans-serif",
    'Work Sans': "'Work Sans', 'Helvetica Neue', Arial, sans-serif",
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
