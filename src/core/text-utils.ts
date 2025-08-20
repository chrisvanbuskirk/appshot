/**
 * Text utilities for caption rendering
 */

/**
 * Estimate text width in pixels for SVG rendering
 * This is an approximation based on average character widths
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  // Average character width is roughly 0.6 of font size for most fonts
  // Adjust for bold text (slightly wider)
  const avgCharWidth = fontSize * 0.65;
  return text.length * avgCharWidth;
}

/**
 * Calculate how many characters fit in a given width
 */
export function calculateCharsPerLine(width: number, fontSize: number, padding: number = 40): number {
  // For very narrow widths (watch), use moderate padding
  const actualPadding = width < 500 ? 30 : padding;
  const availableWidth = width - (actualPadding * 2);
  // For watch (narrow width), use smaller character width factor since font is smaller
  const avgCharWidth = width < 500 ? fontSize * 0.5 : fontSize * 0.65;
  return Math.floor(availableWidth / avgCharWidth);
}

/**
 * Smart word wrapping algorithm
 * Wraps text to fit within specified width, returning array of lines
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  maxLines?: number
): string[] {
  if (!text) return [];

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  const charsPerLine = calculateCharsPerLine(maxWidth, fontSize);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= charsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;

        // Check if we've reached max lines
        if (maxLines && lines.length >= maxLines - 1) {
          // Add remaining text with ellipsis if needed
          const wordIndex = words.indexOf(word);
          const remainingWords = words.slice(wordIndex);
          const remainingText = remainingWords.join(' ');

          if (remainingText.length > charsPerLine) {
            const truncated = remainingText.substring(0, charsPerLine - 3) + '...';
            lines.push(truncated);
          } else {
            lines.push(remainingText);
          }
          return lines; // Return immediately
        }
      } else {
        // Single word is too long, truncate it
        const truncated = word.substring(0, charsPerLine - 3) + '...';
        lines.push(truncated);
        currentLine = '';
      }
    }
  }

  // Add any remaining text
  if (currentLine && (!maxLines || lines.length < maxLines)) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate optimal caption height based on content and constraints
 */
export function calculateCaptionHeight(
  text: string,
  fontSize: number,
  canvasWidth: number,
  options: {
    lineHeight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    minHeight?: number;
    maxHeight?: number;
    maxLines?: number;
  } = {}
): { height: number; lines: string[] } {
  const {
    lineHeight = 1.4,
    paddingTop = 40,
    paddingBottom = 40,
    minHeight = 100,
    maxHeight = 500,
    maxLines = 3
  } = options;

  // Wrap text to get actual lines needed
  const lines = wrapText(text, canvasWidth, fontSize, maxLines);

  // Calculate height based on number of lines
  const textHeight = lines.length * fontSize * lineHeight;
  const totalHeight = paddingTop + textHeight + paddingBottom;

  // Apply constraints
  const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, totalHeight));

  return {
    height: Math.ceil(constrainedHeight),
    lines
  };
}

/**
 * Calculate dynamic caption height based on device position
 */
export function calculateAdaptiveCaptionHeight(
  text: string,
  fontSize: number,
  canvasWidth: number,
  canvasHeight: number,
  deviceTop: number,
  deviceHeight: number,
  framePosition: string | number | undefined
): { height: number; lines: string[] } {
  // Calculate available space based on device position
  let availableSpace: number;

  if (framePosition === 'top' || framePosition === 0) {
    // Device at top, limited caption space
    availableSpace = canvasHeight * 0.15;
  } else if (framePosition === 'bottom' || framePosition === 100) {
    // Device at bottom, maximum caption space
    availableSpace = Math.max(deviceTop - 20, canvasHeight * 0.5); // Use significant space
  } else if (typeof framePosition === 'number') {
    // Custom position, calculate available space
    availableSpace = deviceTop - 20;
  } else {
    // Default centered or unspecified
    // Use space above device or default calculation
    if (deviceTop > canvasHeight * 0.3) {
      availableSpace = deviceTop - 20;
    } else {
      availableSpace = canvasHeight * 0.25;
    }
  }

  // Calculate with constraints
  return calculateCaptionHeight(text, fontSize, canvasWidth, {
    maxHeight: availableSpace,
    minHeight: fontSize * 2,
    maxLines: Math.floor(availableSpace / (fontSize * 1.4))
  });
}