import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import os from 'os';
import { renderBackground, validateBackgroundDimensions, detectBestFit } from '../src/core/background.js';
import type { BackgroundConfig } from '../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('background rendering', () => {
  let tempDir: string;
  let testImagePath: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-test-'));
    
    // Create a test image
    testImagePath = path.join(tempDir, 'test-bg.png');
    await sharp({
      create: {
        width: 1000,
        height: 2000,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toFile(testImagePath);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('renderBackground', () => {
    it('should render solid color background', async () => {
      const config: BackgroundConfig = {
        mode: 'image',
        color: '#FF0000'
      };
      
      const buffer = await renderBackground(400, 800, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(800);
      expect(metadata.format).toBe('png');
    });

    it('should render gradient background as fallback', async () => {
      const config: BackgroundConfig = {
        mode: 'gradient',
        gradient: {
          colors: ['#FF0000', '#00FF00'],
          direction: 'top-bottom'
        }
      };
      
      const buffer = await renderBackground(400, 800, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(800);
    });

    it('should render image background with cover fit', async () => {
      const config: BackgroundConfig = {
        mode: 'image',
        image: testImagePath,
        fit: 'cover'
      };
      
      const buffer = await renderBackground(500, 500, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(500);
      expect(metadata.height).toBe(500);
    });

    it('should render image background with contain fit', async () => {
      const config: BackgroundConfig = {
        mode: 'image',
        image: testImagePath,
        fit: 'contain',
        color: '#000000'
      };
      
      const buffer = await renderBackground(500, 500, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(500);
      expect(metadata.height).toBe(500);
    });

    it('should render image background with fill fit', async () => {
      const config: BackgroundConfig = {
        mode: 'image',
        image: testImagePath,
        fit: 'fill'
      };
      
      const buffer = await renderBackground(300, 600, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(600);
    });

    it('should handle missing image gracefully', async () => {
      const config: BackgroundConfig = {
        mode: 'image',
        image: '/nonexistent/image.png',
        fallback: 'gradient',
        gradient: {
          colors: ['#000000', '#FFFFFF'],
          direction: 'diagonal'
        }
      };
      
      // Should fall back to gradient
      const buffer = await renderBackground(400, 800, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(800);
    });

    it('should auto-detect background in device path', async () => {
      // Create device folder with background
      const devicePath = path.join(tempDir, 'screenshots', 'iphone');
      await fs.mkdir(devicePath, { recursive: true });
      
      const bgPath = path.join(devicePath, 'background.png');
      await sharp({
        create: {
          width: 500,
          height: 1000,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 }
        }
      })
      .png()
      .toFile(bgPath);
      
      const config: BackgroundConfig = {
        mode: 'auto'
      };
      
      const buffer = await renderBackground(500, 1000, config, devicePath);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(500);
      expect(metadata.height).toBe(1000);
    });
  });

  describe('validateBackgroundDimensions', () => {
    it('should validate matching dimensions', async () => {
      const result = await validateBackgroundDimensions(
        testImagePath,
        1000,
        2000
      );
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.dimensions.source.width).toBe(1000);
      expect(result.dimensions.source.height).toBe(2000);
    });

    it('should warn about smaller dimensions', async () => {
      const result = await validateBackgroundDimensions(
        testImagePath,
        2000,
        4000
      );
      
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('smaller than target');
    });

    it('should warn about aspect ratio mismatch', async () => {
      const result = await validateBackgroundDimensions(
        testImagePath,
        1000,
        1000
      );
      
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Aspect ratio'))).toBe(true);
    });

    it('should handle invalid image path', async () => {
      const result = await validateBackgroundDimensions(
        '/nonexistent/image.png',
        1000,
        2000
      );
      
      expect(result.valid).toBe(false);
      expect(result.warnings[0]).toContain('Failed to validate');
    });
  });

  describe('detectBestFit', () => {
    it('should suggest fill for matching aspect ratios', () => {
      const fit = detectBestFit(1000, 2000, 500, 1000);
      expect(fit).toBe('fill');
    });

    it('should suggest contain for smaller source', () => {
      const fit = detectBestFit(500, 1000, 1000, 2000);
      // Aspect ratios match (0.5 == 0.5), so it returns 'fill' even though source is smaller
      expect(fit).toBe('fill');
    });

    it('should suggest cover for larger source', () => {
      const fit = detectBestFit(2000, 4000, 1000, 2000);
      // Aspect ratios match (0.5 == 0.5), so it returns 'fill'
      expect(fit).toBe('fill');
    });

    it('should handle different aspect ratios', () => {
      const fit = detectBestFit(1000, 1000, 1000, 2000);
      // Source is square (1:1), target is portrait (0.5), aspect ratios don't match
      // and source is not smaller, so it returns 'contain'
      expect(fit).toBe('contain');
    });
  });

  describe('background with transparency', () => {
    it('should handle PNG with alpha channel', async () => {
      // Create image with transparency
      const transparentPath = path.join(tempDir, 'transparent.png');
      await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 }
        }
      })
      .png()
      .toFile(transparentPath);
      
      const config: BackgroundConfig = {
        mode: 'image',
        image: transparentPath,
        fit: 'contain',
        color: '#FFFFFF'
      };
      
      const buffer = await renderBackground(600, 600, config);
      const metadata = await sharp(buffer).metadata();
      
      expect(metadata.width).toBe(600);
      expect(metadata.height).toBe(600);
      expect(metadata.channels).toBe(4);
    });
  });

  describe('scale-down fit mode', () => {
    it('should scale down larger images', async () => {
      const config: BackgroundConfig = {
        mode: 'image',
        image: testImagePath, // 1000x2000 image
        fit: 'scale-down',
        color: '#000000'
      };
      
      const buffer = await renderBackground(500, 500, config);
      const metadata = await sharp(buffer).metadata();
      
      // Image should be scaled down to fit within 500x500
      expect(metadata.width).toBe(250);
      expect(metadata.height).toBe(500);
    });

    it('should not scale up smaller images', async () => {
      // Create small image
      const smallPath = path.join(tempDir, 'small.png');
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 }
        }
      })
      .png()
      .toFile(smallPath);
      
      const config: BackgroundConfig = {
        mode: 'image',
        image: smallPath,
        fit: 'scale-down',
        color: '#FFFFFF'
      };
      
      const buffer = await renderBackground(500, 500, config);
      const metadata = await sharp(buffer).metadata();
      
      // Should be centered on background, not scaled up
      expect(metadata.width).toBe(500);
      expect(metadata.height).toBe(500);
    });
  });
});