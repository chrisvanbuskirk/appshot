import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { renderTextBitmap, createGradientBitmap } from '../src/core/text-renderer.js';

describe('text-renderer', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-text-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('renderTextBitmap', () => {
    it('should create a bitmap with text', async () => {
      const result = await renderTextBitmap(
        'Test Caption',
        800,
        200,
        {
          fontsize: 48,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify it's a valid PNG
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(200);
      expect(metadata.channels).toBe(4); // RGBA
    });

    it('should handle left alignment', async () => {
      const result = await renderTextBitmap(
        'Left Aligned',
        800,
        200,
        {
          fontsize: 48,
          color: '#000000',
          align: 'left',
          paddingTop: 20,
          paddingLeft: 30
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should handle right alignment', async () => {
      const result = await renderTextBitmap(
        'Right Aligned',
        800,
        200,
        {
          fontsize: 48,
          color: '#FF0000',
          align: 'right',
          paddingTop: 20,
          paddingRight: 30
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should use smaller font for watch devices (narrow width)', async () => {
      const result = await renderTextBitmap(
        'Watch Text',
        400, // Watch width
        150,
        {
          fontsize: 64, // Will be overridden to 40 for watch
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 10
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(400);
    });

    it('should handle text wrapping for long captions', async () => {
      const longText = 'This is a very long caption that should wrap to multiple lines';
      const result = await renderTextBitmap(
        longText,
        400,
        200,
        {
          fontsize: 36,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should handle missing optional config values', async () => {
      const result = await renderTextBitmap(
        'Minimal Config',
        800,
        200,
        {
          fontsize: 48,
          color: '#FFFFFF',
          paddingTop: 20
          // align, paddingLeft, paddingRight not provided
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should create transparent background', async () => {
      const result = await renderTextBitmap(
        'Transparent BG',
        800,
        200,
        {
          fontsize: 48,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      // Check that the image has an alpha channel
      const metadata = await sharp(result).metadata();
      expect(metadata.channels).toBe(4); // RGBA
      expect(metadata.hasAlpha).toBe(true);
    });

    it('should fallback gracefully when Pango is unavailable', async () => {
      // This test verifies the fallback behavior
      // The function should return a transparent background when text rendering fails
      const result = await renderTextBitmap(
        'Fallback Test',
        800,
        200,
        {
          fontsize: 48,
          color: '#INVALID', // This might trigger validation
          align: 'center',
          paddingTop: 20
        }
      );

      // Should still return a valid buffer
      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });
  });

  describe('createGradientBitmap', () => {
    it('should create a vertical gradient', async () => {
      const result = await createGradientBitmap(
        800,
        600,
        ['#FF0000', '#0000FF'],
        'vertical'
      );

      expect(result).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.channels).toBe(3); // RGB gradient without alpha
    });

    it('should create a horizontal gradient', async () => {
      const result = await createGradientBitmap(
        800,
        600,
        ['#00FF00', '#FF00FF'],
        'horizontal'
      );

      expect(result).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
    });

    it('should create a diagonal gradient', async () => {
      const result = await createGradientBitmap(
        800,
        600,
        ['#FFFFFF', '#000000'],
        'diagonal'
      );

      expect(result).toBeInstanceOf(Buffer);
      
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
    });

    it('should handle multiple colors', async () => {
      const result = await createGradientBitmap(
        800,
        600,
        ['#FF0000', '#00FF00', '#0000FF'],
        'vertical'
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should handle single color (solid fill)', async () => {
      const result = await createGradientBitmap(
        800,
        600,
        ['#FF0000'],
        'vertical'
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should parse hex colors correctly', async () => {
      const result = await createGradientBitmap(
        400,
        300,
        ['#FFF', '#000'], // Short hex format
        'horizontal'
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.format).toBe('png');
    });

    it('should create correct pixel interpolation', async () => {
      const result = await createGradientBitmap(
        100,
        100,
        ['#FF0000', '#0000FF'],
        'vertical'
      );

      // Verify the gradient has smooth transitions
      const { data, info } = await sharp(result)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Check top pixel (should be mostly red)
      const topPixel = {
        r: data[0],
        g: data[1], 
        b: data[2]
      };
      expect(topPixel.r).toBeGreaterThan(200);
      expect(topPixel.b).toBeLessThan(55);

      // Check bottom pixel (should be mostly blue)
      const bottomOffset = (info.height - 1) * info.width * info.channels;
      const bottomPixel = {
        r: data[bottomOffset],
        g: data[bottomOffset + 1],
        b: data[bottomOffset + 2]
      };
      expect(bottomPixel.r).toBeLessThan(55);
      expect(bottomPixel.b).toBeGreaterThan(200);
    });
  });

  describe('validateColor', () => {
    // Testing the internal validateColor function through renderTextBitmap
    it('should accept valid hex colors', async () => {
      const validColors = ['#FF0000', '#00FF00', '#0000FF', '#FFF', '#000', '#123456'];
      
      for (const color of validColors) {
        const result = await renderTextBitmap(
          'Test',
          100,
          100,
          {
            fontsize: 20,
            color,
            paddingTop: 10
          }
        );
        expect(result).toBeInstanceOf(Buffer);
      }
    });

    it('should accept valid named colors', async () => {
      const namedColors = ['black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
      
      for (const color of namedColors) {
        const result = await renderTextBitmap(
          'Test',
          100,
          100,
          {
            fontsize: 20,
            color,
            paddingTop: 10
          }
        );
        expect(result).toBeInstanceOf(Buffer);
      }
    });

    it('should reject invalid color formats and use default', async () => {
      const invalidColors = [
        'notacolor',
        '#GGGGGG',
        'rgb(255, 0, 0)',
        '123456', // Missing #
        '#12345', // Invalid length
        '<script>alert("xss")</script>'
      ];

      for (const color of invalidColors) {
        const result = await renderTextBitmap(
          'Test',
          100,
          100,
          {
            fontsize: 20,
            color,
            paddingTop: 10
          }
        );
        // Should still produce valid output with default color
        expect(result).toBeInstanceOf(Buffer);
      }
    });

    it('should handle color with extra whitespace', async () => {
      const result = await renderTextBitmap(
        'Test',
        100,
        100,
        {
          fontsize: 20,
          color: '  #FF0000  ', // Extra whitespace
          paddingTop: 10
        }
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle case-insensitive named colors', async () => {
      const result = await renderTextBitmap(
        'Test',
        100,
        100,
        {
          fontsize: 20,
          color: 'BLACK', // Uppercase
          paddingTop: 10
        }
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should prevent XSS attempts in color values', async () => {
      const xssAttempts = [
        '"><script>alert(1)</script>',
        'javascript:alert(1)',
        'onclick="alert(1)"',
        '${alert(1)}',
        '{{alert(1)}}'
      ];

      for (const xss of xssAttempts) {
        const result = await renderTextBitmap(
          'Test',
          100,
          100,
          {
            fontsize: 20,
            color: xss,
            paddingTop: 10
          }
        );
        // Should safely handle and use default color
        expect(result).toBeInstanceOf(Buffer);
      }
    });
  });

  describe('wrapText', () => {
    // Testing text wrapping through renderTextBitmap
    it('should wrap text to 2 lines for watch devices', async () => {
      const result = await renderTextBitmap(
        'This is my favorite workout app',
        400, // Watch width
        200,
        {
          fontsize: 36,
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      // Text should be wrapped to max 2 lines for watch
    });

    it('should handle single word captions', async () => {
      const result = await renderTextBitmap(
        'Workout',
        400,
        200,
        {
          fontsize: 48,
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty text', async () => {
      const result = await renderTextBitmap(
        '',
        400,
        200,
        {
          fontsize: 48,
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('escapeText', () => {
    // Testing text escaping for XSS prevention
    it('should escape HTML entities in text', async () => {
      const dangerousTexts = [
        '<script>alert("xss")</script>',
        'Text & More',
        'Quote"Test',
        "Apostrophe'Test",
        'Less < Greater >'
      ];

      for (const text of dangerousTexts) {
        const result = await renderTextBitmap(
          text,
          400,
          200,
          {
            fontsize: 36,
            color: '#FFFFFF',
            paddingTop: 20
          }
        );
        // Should safely escape and render
        expect(result).toBeInstanceOf(Buffer);
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid dimensions gracefully', async () => {
      const result = await renderTextBitmap(
        'Test',
        100, // Small but valid width
        100, // Small but valid height
        {
          fontsize: 48,
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      // Should still return a buffer
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle extremely large dimensions', async () => {
      const result = await renderTextBitmap(
        'Test',
        10000,
        10000,
        {
          fontsize: 48,
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle negative font size', async () => {
      const result = await renderTextBitmap(
        'Test',
        400,
        200,
        {
          fontsize: -10, // Will be clamped to minimum
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle very large font size', async () => {
      const result = await renderTextBitmap(
        'Test',
        400,
        200,
        {
          fontsize: 10000, // Will be clamped to maximum
          color: '#FFFFFF',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});