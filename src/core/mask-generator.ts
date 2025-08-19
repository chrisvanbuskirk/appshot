import sharp from 'sharp';

/**
 * Generate a rounded rectangle mask without using SVG
 * This creates a mask where white pixels are visible and black pixels are transparent
 */
export async function generateRoundedRectMask(
  width: number,
  height: number,
  cornerRadius: number
): Promise<Buffer> {
  // Create a raw pixel buffer for the mask
  const channels = 4; // RGBA
  const pixelCount = width * height;
  const buffer = Buffer.alloc(pixelCount * channels);

  // Fill the buffer with white pixels, making corners transparent
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;

      // Check if pixel is in a corner region
      let inCorner = false;

      // Top-left corner
      if (x < cornerRadius && y < cornerRadius) {
        const dx = cornerRadius - x;
        const dy = cornerRadius - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        inCorner = distance > cornerRadius;
      }
      // Top-right corner
      else if (x >= width - cornerRadius && y < cornerRadius) {
        const dx = x - (width - cornerRadius);
        const dy = cornerRadius - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        inCorner = distance > cornerRadius;
      }
      // Bottom-left corner
      else if (x < cornerRadius && y >= height - cornerRadius) {
        const dx = cornerRadius - x;
        const dy = y - (height - cornerRadius);
        const distance = Math.sqrt(dx * dx + dy * dy);
        inCorner = distance > cornerRadius;
      }
      // Bottom-right corner
      else if (x >= width - cornerRadius && y >= height - cornerRadius) {
        const dx = x - (width - cornerRadius);
        const dy = y - (height - cornerRadius);
        const distance = Math.sqrt(dx * dx + dy * dy);
        inCorner = distance > cornerRadius;
      }

      if (inCorner) {
        // Transparent (black in mask)
        buffer[offset] = 0;     // R
        buffer[offset + 1] = 0; // G
        buffer[offset + 2] = 0; // B
        buffer[offset + 3] = 0; // A
      } else {
        // Visible (white in mask)
        buffer[offset] = 255;     // R
        buffer[offset + 1] = 255; // G
        buffer[offset + 2] = 255; // B
        buffer[offset + 3] = 255; // A
      }
    }
  }

  // Convert raw buffer to PNG using Sharp
  const mask = await sharp(buffer, {
    raw: {
      width: width,
      height: height,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  return mask;
}

/**
 * Apply a rounded rectangle mask to an image
 */
export async function applyRoundedCorners(
  imageBuffer: Buffer,
  width: number,
  height: number,
  cornerRadius: number
): Promise<Buffer> {
  if (cornerRadius <= 0) {
    return imageBuffer;
  }

  try {
    // Generate the mask
    const mask = await generateRoundedRectMask(width, height, cornerRadius);

    // Apply the mask using composite
    const result = await sharp(imageBuffer)
      .ensureAlpha()
      .composite([{
        input: mask,
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.warn('Failed to apply rounded corners:', error);
    return imageBuffer;
  }
}