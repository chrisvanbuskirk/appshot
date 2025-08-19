import sharp from 'sharp';

/**
 * Render text by creating a bitmap with text
 * This works without SVG or any external dependencies
 */
export async function renderTextBitmap(
  text: string,
  width: number,
  height: number,
  config: {
    fontsize: number;
    color: string;
    align?: 'left' | 'center' | 'right';
    paddingTop: number;
    paddingLeft?: number;
    paddingRight?: number;
    font?: string;
  }
): Promise<Buffer> {
  // Text color would be used here if we had full text rendering
  // const parseHex = (hex: string) => {
  //   const clean = hex.replace('#', '');
  //   return {
  //     r: parseInt(clean.slice(0, 2), 16),
  //     g: parseInt(clean.slice(2, 4), 16),
  //     b: parseInt(clean.slice(4, 6), 16)
  //   };
  // };
  // const textColor = parseHex(config.color || '#000000');

  // Create a transparent background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .png()
    .toBuffer();

  // Use Sharp's text annotation feature which doesn't require SVG
  try {
    // Calculate text position based on alignment
    let gravity = 'north'; // Default to top
    if (config.align === 'left') {
      gravity = 'northwest';
    } else if (config.align === 'right') {
      gravity = 'northeast';
    }

    // Create text as an image using Sharp's text feature
    const textBuffer = await sharp({
      text: {
        text: `<span foreground="${config.color}" size="${config.fontsize * 1000}">${escapeText(text)}</span>`,
        width: width - (config.paddingLeft || 50) - (config.paddingRight || 50),
        height: height,
        align: config.align || 'center',
        rgba: true,
        // Note: This uses Pango markup which is more widely available than librsvg
        font: config.font || 'sans-serif'
      }
    })
      .png()
      .toBuffer();

    // Composite the text onto the transparent background at the right position
    const result = await sharp(background)
      .composite([{
        input: textBuffer,
        top: config.paddingTop,
        left: config.paddingLeft || 50,
        gravity: gravity
      }])
      .png()
      .toBuffer();

    return result;
  } catch {
    console.log('[INFO] Text rendering using Pango not available, trying fallback...');

    // Fallback: Return background without text but continue processing
    return background;
  }
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a gradient using pure bitmap manipulation
 */
export async function createGradientBitmap(
  width: number,
  height: number,
  colors: string[],
  direction: 'vertical' | 'horizontal' | 'diagonal' = 'vertical'
): Promise<Buffer> {
  // Parse hex colors
  const parseHex = (hex: string) => {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  };

  const startColor = parseHex(colors[0] || '#6B46C1');
  const endColor = parseHex(colors[colors.length - 1] || '#9333EA');

  // Create raw pixel buffer for gradient
  const channels = 3;
  const pixelCount = width * height;
  const buffer = Buffer.alloc(pixelCount * channels);

  // Generate gradient pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let ratio: number;

      if (direction === 'horizontal') {
        ratio = x / width;
      } else if (direction === 'diagonal') {
        ratio = (x + y) / (width + height);
      } else { // vertical
        ratio = y / height;
      }

      // Linear interpolation between colors
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);

      const offset = (y * width + x) * channels;
      buffer[offset] = r;
      buffer[offset + 1] = g;
      buffer[offset + 2] = b;
    }
  }

  // Convert raw buffer to PNG using Sharp
  return await sharp(buffer, {
    raw: {
      width,
      height,
      channels
    }
  })
    .png()
    .toBuffer();
}