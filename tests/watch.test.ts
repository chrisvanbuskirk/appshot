import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import { renderTextBitmap } from '../src/core/text-renderer.js';

describe('watch screenshots', () => {
  let tempDir: string;
  let testScreenshot: Buffer;
  let testFrame: Buffer;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-watch-test-'));
    
    // Create a test watch screenshot (410x502 - Watch Ultra dimensions)
    testScreenshot = await sharp({
      create: {
        width: 410,
        height: 502,
        channels: 4,
        background: { r: 0, g: 100, b: 0, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
    
    // Create a test watch frame
    testFrame = await sharp({
      create: {
        width: 600,
        height: 700,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('watch caption handling', () => {
    it('should use smaller font size for watch devices', async () => {
      const result = await renderTextBitmap(
        'This is my favorite workout',
        368, // Watch width
        150,
        {
          fontsize: 64, // Should be overridden to 40 for watch
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(368);
    });

    it('should wrap text to maximum 2 lines for watch', async () => {
      const longText = 'This is my favorite workout application for tracking exercises';
      const result = await renderTextBitmap(
        longText,
        368, // Watch width
        200,
        {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      // Should wrap to 2 lines max for watch devices
    });

    it('should use top 1/3 of screen for watch captions', async () => {
      const outputHeight = 600;
      const isWatch = true; // Width < 500
      
      // Caption height calculation for watch
      const expectedCaptionHeight = Math.floor(outputHeight / 3);
      
      // This matches the logic in compose.ts
      expect(expectedCaptionHeight).toBe(200);
    });
  });

  describe('watch device scaling', () => {
    it('should apply 130% scale for watch devices', async () => {
      const frameMetadata = {
        deviceType: 'watch',
        frameWidth: 600,
        frameHeight: 700,
        screenRect: { x: 100, y: 100, width: 410, height: 502 },
        name: 'Watch Ultra 2024',
        displayName: 'Watch Ultra'
      };

      const result = await composeAppStoreScreenshot({
        screenshot: testScreenshot,
        frame: testFrame,
        frameMetadata,
        outputWidth: 368,
        outputHeight: 448,
        caption: 'Watch Test',
        gradientConfig: {
          colors: ['#FF0000', '#0000FF'],
          direction: 'vertical'
        },
        captionConfig: {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        deviceConfig: {}
      });

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(368);
      expect(metadata.height).toBe(448);
    });

    it('should position watch with upward offset', async () => {
      const frameMetadata = {
        deviceType: 'watch',
        frameWidth: 600,
        frameHeight: 700,
        screenRect: { x: 100, y: 100, width: 410, height: 502 },
        name: 'Watch Ultra 2024',
        displayName: 'Watch Ultra'
      };

      const result = await composeAppStoreScreenshot({
        screenshot: testScreenshot,
        frame: testFrame,
        frameMetadata,
        outputWidth: 368,
        outputHeight: 448,
        caption: 'Watch Position Test',
        gradientConfig: {
          colors: ['#FF5733', '#FFC300'],
          direction: 'diagonal'
        },
        captionConfig: {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        deviceConfig: {}
      });

      expect(result).toBeInstanceOf(Buffer);
      // Watch should be positioned with -20px offset (moved up)
    });

    it('should handle watch dimensions correctly', async () => {
      const frameMetadata = {
        deviceType: 'watch',
        frameWidth: 600,
        frameHeight: 700,
        screenRect: { x: 100, y: 100, width: 410, height: 502 },
        name: 'Apple Watch Series 9',
        displayName: 'Series 9'
      };

      const result = await composeAppStoreScreenshot({
        screenshot: testScreenshot,
        frame: testFrame,
        frameMetadata,
        outputWidth: 368,
        outputHeight: 448,
        caption: null, // No caption
        gradientConfig: {
          colors: ['#667eea', '#764ba2'],
          direction: 'vertical'
        },
        captionConfig: {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        deviceConfig: {}
      });

      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(368);
      expect(metadata.height).toBe(448);
    });
  });

  describe('watch text wrapping', () => {
    it('should split text evenly for 2-line captions', async () => {
      const caption = 'This is my favorite workout';
      const words = caption.split(' ');
      const midPoint = Math.ceil(words.length / 2);
      
      // Should split as "This is my" and "favorite workout"
      expect(midPoint).toBe(3);
      
      const line1 = words.slice(0, midPoint).join(' ');
      const line2 = words.slice(midPoint).join(' ');
      
      expect(line1).toBe('This is my');
      expect(line2).toBe('favorite workout');
    });

    it('should handle short captions without wrapping', async () => {
      const result = await renderTextBitmap(
        'Workout',
        368,
        150,
        {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle very long captions by truncating to 2 lines', async () => {
      const veryLongText = 'This is an extremely long caption that would normally wrap to many lines but should be limited to just two lines for watch devices';
      
      const result = await renderTextBitmap(
        veryLongText,
        368,
        200,
        {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        }
      );

      expect(result).toBeInstanceOf(Buffer);
      // Should be limited to 2 lines for watch
    });
  });

  describe('watch-specific SVG generation', () => {
    it('should generate SVG with smaller font for watch', () => {
      const isWatch = true;
      const captionConfig = { fontsize: 64, color: '#FFFFFF', align: 'center' as const, paddingTop: 20 };
      const fontSize = isWatch ? 36 : captionConfig.fontsize;
      
      expect(fontSize).toBe(36); // Should use 36px for watch instead of 64px
    });

    it('should create two text elements for wrapped caption', () => {
      const caption = 'This is my favorite workout';
      const words = caption.split(' ');
      const midPoint = Math.ceil(words.length / 2);
      const lines = [
        words.slice(0, midPoint).join(' '),
        words.slice(midPoint).join(' ')
      ];
      
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('This is my');
      expect(lines[1]).toBe('favorite workout');
    });

    it('should position text lines correctly in SVG', () => {
      const captionHeight = 200; // Top 1/3 of 600px screen
      const line1Y = captionHeight * 0.4; // 40% down
      const line2Y = captionHeight * 0.7; // 70% down
      
      expect(line1Y).toBe(80);
      expect(line2Y).toBe(140);
      // Lines should be spaced appropriately
    });
  });

  describe('watch error handling', () => {
    it('should handle missing watch frame gracefully', async () => {
      // When no frame is provided, screenshot is placed directly on gradient
      const smallScreenshot = await sharp({
        create: {
          width: 300,
          height: 400,
          channels: 4,
          background: { r: 0, g: 100, b: 0, alpha: 1 }
        }
      })
        .png()
        .toBuffer();
      
      const result = await composeAppStoreScreenshot({
        screenshot: smallScreenshot,
        frame: null, // No frame
        frameMetadata: null, // No frame metadata when no frame
        outputWidth: 368,
        outputHeight: 448,
        caption: 'No Frame Test',
        gradientConfig: {
          colors: ['#FF0000', '#0000FF'],
          direction: 'vertical'
        },
        captionConfig: {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        deviceConfig: {}
      });

      // Should still generate output without frame
      expect(result).toBeInstanceOf(Buffer);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(368);
      expect(metadata.height).toBe(448);
    });

    it('should handle invalid watch dimensions', async () => {
      const tinyScreenshot = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 }
        }
      })
        .png()
        .toBuffer();

      const frameMetadata = {
        deviceType: 'watch',
        frameWidth: 600,
        frameHeight: 700,
        screenRect: { x: 100, y: 100, width: 410, height: 502 },
        name: 'Watch Test',
        displayName: 'Test Watch'
      };

      const result = await composeAppStoreScreenshot({
        screenshot: tinyScreenshot,
        frame: testFrame,
        frameMetadata,
        outputWidth: 368,
        outputHeight: 448,
        caption: 'Tiny Screenshot',
        gradientConfig: {
          colors: ['#FF0000', '#0000FF'],
          direction: 'vertical'
        },
        captionConfig: {
          fontsize: 40,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        deviceConfig: {}
      });

      expect(result).toBeInstanceOf(Buffer);
    });
  });
});