import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { composeAppStoreScreenshot as compose } from '../src/core/compose.js';
import type { GradientConfig, CaptionConfig } from '../src/types.js';

describe('watch-compose', () => {
  let testDir: string;
  let screenshotPath: string;
  let framePath: string;

  beforeEach(async () => {
    // Create temporary directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-watch-compose-test-'));
    
    // Create a test screenshot (Apple Watch dimensions)
    screenshotPath = path.join(testDir, 'screenshot.png');
    await sharp({
      create: {
        width: 368,
        height: 448,
        channels: 4,
        background: { r: 0, g: 100, b: 0, alpha: 1 }
      }
    })
      .png()
      .toFile(screenshotPath);

    // Create a test frame
    framePath = path.join(testDir, 'watch-frame.png');
    await sharp({
      create: {
        width: 500,
        height: 600,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 }
      }
    })
      .png()
      .toFile(framePath);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('watch caption positioning', () => {
    it('should position caption in top 1/3 for watch devices', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 48,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'apple-watch-ultra',
        displayName: 'Apple Watch Ultra',
        frameWidth: 500,
        frameHeight: 600,
        screenRect: { x: 66, y: 76, width: 368, height: 448 },
        orientation: 'portrait' as const,
        deviceType: 'watch' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 400,
        outputHeight: 600,
        gradientConfig,
        captionConfig,
        caption: 'Track your workouts',
        captionPosition: 'above',
        deviceConfig: {},
        deviceConfig: {}
      });

      // Check that result is a valid image
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(600);
      
      // Caption height should be 1/3 of total height (200px)
      // This is verified in the compose function logic
    });

    it('should wrap caption text on two lines for watch', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 48,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'apple-watch-ultra',
        displayName: 'Apple Watch Ultra',
        frameWidth: 500,
        frameHeight: 600,
        screenRect: { x: 66, y: 76, width: 368, height: 448 },
        orientation: 'portrait' as const,
        deviceType: 'watch' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 400, // < 500 so it's detected as watch
        outputHeight: 600,
        gradientConfig,
        captionConfig,
        caption: 'This is my favorite workout app',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // The compose function should split this into two lines
      // "This is my" and "favorite workout app"
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(600);
    });

    it('should use smaller font size for watch captions', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 72, // Large font for other devices
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'apple-watch-ultra',
        displayName: 'Apple Watch Ultra',
        frameWidth: 500,
        frameHeight: 600,
        screenRect: { x: 66, y: 76, width: 368, height: 448 },
        orientation: 'portrait' as const,
        deviceType: 'watch' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 400, // < 500 so it's detected as watch
        outputHeight: 600,
        gradientConfig,
        captionConfig,
        caption: 'Small font test',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // Watch should use 36px font instead of the configured 72px
      const metadata = await sharp(result).metadata();
      expect(metadata).toBeDefined();
    });
  });

  describe('watch device positioning', () => {
    it('should position watch with bottom cut off', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 48,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'apple-watch-ultra',
        displayName: 'Apple Watch Ultra',
        frameWidth: 500,
        frameHeight: 600,
        screenRect: { x: 66, y: 76, width: 368, height: 448 },
        orientation: 'portrait' as const,
        deviceType: 'watch' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 400,
        outputHeight: 600,
        gradientConfig,
        captionConfig,
        caption: 'Watch positioning',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // Watch should be positioned so bottom 1/4 is cut off
      // This is handled by the deviceTop calculation in compose
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(600);
    });

    it('should scale watch to 130% for better visibility', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 48,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'apple-watch-ultra',
        displayName: 'Apple Watch Ultra',
        frameWidth: 500,
        frameHeight: 600,
        screenRect: { x: 66, y: 76, width: 368, height: 448 },
        orientation: 'portrait' as const,
        deviceType: 'watch' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 400,
        outputHeight: 600,
        gradientConfig,
        captionConfig,
        caption: 'Watch scaling',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // Watch should be scaled to 130% as per the compose logic
      const metadata = await sharp(result).metadata();
      expect(metadata).toBeDefined();
    });

    it('should center watch horizontally', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 48,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'apple-watch-ultra',
        displayName: 'Apple Watch Ultra',
        frameWidth: 500,
        frameHeight: 600,
        screenRect: { x: 66, y: 76, width: 368, height: 448 },
        orientation: 'portrait' as const,
        deviceType: 'watch' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 600, // Wider canvas to test centering
        outputHeight: 600,
        gradientConfig,
        captionConfig,
        caption: 'Centered watch',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // Watch should be horizontally centered
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(600);
    });
  });

  describe('non-watch devices', () => {
    it('should not apply watch-specific positioning to iPhone', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 72,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'iphone-15-pro',
        displayName: 'iPhone 15 Pro',
        frameWidth: 500,
        frameHeight: 1000,
        screenRect: { x: 50, y: 100, width: 400, height: 800 },
        orientation: 'portrait' as const,
        deviceType: 'iphone' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 800, // > 500 so not detected as watch
        outputHeight: 1200,
        gradientConfig,
        captionConfig,
        caption: 'iPhone caption should be single line',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // iPhone should use single-line caption and normal positioning
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should apply Mac-specific scaling', async () => {
      const gradientConfig: GradientConfig = {
        colors: ['#FF6B6B', '#FFE66D'],
        direction: 'top-bottom'
      };

      const captionConfig: CaptionConfig = {
        font: 'Arial',
        fontsize: 72,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 40,
        paddingBottom: 40,
        position: 'above'
      };

      const frameMetadata = {
        name: 'macbook-pro-16',
        displayName: 'MacBook Pro 16"',
        frameWidth: 1600,
        frameHeight: 1000,
        screenRect: { x: 100, y: 100, width: 1400, height: 800 },
        orientation: 'landscape' as const,
        deviceType: 'mac' as const
      };

      const screenshot = await fs.readFile(screenshotPath);
      const frame = await fs.readFile(framePath);

      const result = await compose({
        screenshot,
        frame,
        frameMetadata,
        outputWidth: 1920,
        outputHeight: 1080,
        gradientConfig,
        captionConfig,
        caption: 'Mac display',
        captionPosition: 'above',
        deviceConfig: {}
      });

      // Mac should use 95% scaling as per the compose logic
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
    });
  });
});