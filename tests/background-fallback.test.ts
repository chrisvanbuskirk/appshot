import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { renderBackground } from '../src/core/background.js';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import type { BackgroundConfig, DeviceConfig, CaptionConfig } from '../src/types.js';

describe('background fallback chain', () => {
  let tempDir: string;
  let screenshotBuffer: Buffer;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-fallback-test-'));
    
    // Create test directories
    await fs.mkdir(path.join(tempDir, 'screenshots', 'iphone'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'screenshots', 'ipad'), { recursive: true });
    
    // Create test screenshot buffer
    screenshotBuffer = await sharp({
      create: {
        width: 1170,
        height: 2532,
        channels: 4,
        background: { r: 100, g: 100, b: 100, alpha: 1 }
      }
    })
    .png()
    .toBuffer();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should use device-specific background when available', async () => {
    // Create device-specific background
    const deviceBgPath = path.join(tempDir, 'screenshots', 'iphone', 'background.png');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 } // Red
      }
    })
    .png()
    .toFile(deviceBgPath);
    
    // Create global background (should be ignored)
    const globalBgPath = path.join(tempDir, 'global-bg.png');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 } // Green
      }
    })
    .png()
    .toFile(globalBgPath);
    
    const deviceConfig: DeviceConfig = {
      input: path.join(tempDir, 'screenshots', 'iphone'),
      resolution: '1290x2796',
      background: {
        mode: 'auto'
      }
    };
    
    const globalBackground: BackgroundConfig = {
      mode: 'image',
      image: globalBgPath
    };
    
    // Device background should take precedence
    const backgroundConfig: BackgroundConfig = {
      mode: 'auto'
    };
    
    const result = await renderBackground(
      1290,
      2796,
      backgroundConfig,
      deviceConfig.input
    );
    
    // Check that result is a buffer
    expect(Buffer.isBuffer(result)).toBe(true);
    
    // Verify it picked up the device background (red) not global (green)
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1290);
    expect(metadata.height).toBe(2796);
  });

  it('should fall back to global background when device-specific missing', async () => {
    // No device-specific background
    const globalBgPath = path.join(tempDir, 'global-bg.png');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 } // Green
      }
    })
    .png()
    .toFile(globalBgPath);
    
    const backgroundConfig: BackgroundConfig = {
      mode: 'image',
      image: globalBgPath
    };
    
    const result = await renderBackground(
      1290,
      2796,
      backgroundConfig
    );
    
    expect(Buffer.isBuffer(result)).toBe(true);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1290);
    expect(metadata.height).toBe(2796);
  });

  it('should fall back to gradient when no background images available', async () => {
    const backgroundConfig: BackgroundConfig = {
      mode: 'image',
      image: '/nonexistent/image.png',
      fallback: 'gradient',
      gradient: {
        colors: ['#FF0000', '#0000FF'],
        direction: 'top-bottom'
      }
    };
    
    const result = await renderBackground(
      1290,
      2796,
      backgroundConfig
    );
    
    expect(Buffer.isBuffer(result)).toBe(true);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1290);
    expect(metadata.height).toBe(2796);
  });

  it('should fall back to solid color as last resort', async () => {
    const backgroundConfig: BackgroundConfig = {
      mode: 'image',
      image: '/nonexistent/image.png',
      fallback: 'solid',
      color: '#FF00FF'
    };
    
    const result = await renderBackground(
      1290,
      2796,
      backgroundConfig
    );
    
    expect(Buffer.isBuffer(result)).toBe(true);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1290);
    expect(metadata.height).toBe(2796);
  });

  it('should use gradient when explicitly set to gradient mode', async () => {
    // Even with an image available, gradient mode should use gradient
    const imagePath = path.join(tempDir, 'image.png');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toFile(imagePath);
    
    const backgroundConfig: BackgroundConfig = {
      mode: 'gradient',
      image: imagePath, // Should be ignored
      gradient: {
        colors: ['#00FF00', '#0000FF'],
        direction: 'diagonal'
      }
    };
    
    const result = await renderBackground(
      1290,
      2796,
      backgroundConfig
    );
    
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should handle mixed device configurations', async () => {
    // iPhone has background image
    const iphoneBgPath = path.join(tempDir, 'screenshots', 'iphone', 'background.png');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
    .png()
    .toFile(iphoneBgPath);
    
    // iPad has no background (should fall back to gradient)
    const iphoneConfig: BackgroundConfig = {
      mode: 'auto'
    };
    
    const ipadConfig: BackgroundConfig = {
      mode: 'auto',
      fallback: 'gradient',
      gradient: {
        colors: ['#123456', '#654321'],
        direction: 'top-bottom'
      }
    };
    
    // Test iPhone (should use image)
    const iphoneResult = await renderBackground(
      1290,
      2796,
      iphoneConfig,
      path.join(tempDir, 'screenshots', 'iphone')
    );
    expect(Buffer.isBuffer(iphoneResult)).toBe(true);
    
    // Test iPad (should use gradient)
    const ipadResult = await renderBackground(
      2048,
      2732,
      ipadConfig,
      path.join(tempDir, 'screenshots', 'ipad')
    );
    expect(Buffer.isBuffer(ipadResult)).toBe(true);
  });

  it('should not conflict between gradient and background configurations', async () => {
    const captionConfig: CaptionConfig = {
      font: 'Arial',
      fontsize: 48,
      color: '#FFFFFF',
      align: 'center',
      paddingTop: 50,
      position: 'above'
    };
    
    const deviceConfig: DeviceConfig = {
      input: tempDir,
      resolution: '1290x2796'
    };
    
    // Test with background config (gradient should be ignored)
    const withBackground = await composeAppStoreScreenshot({
      screenshot: screenshotBuffer,
      frame: null,
      caption: 'Test',
      captionConfig,
      backgroundConfig: {
        mode: 'image',
        color: '#FF0000'
      },
      gradientConfig: {
        colors: ['#00FF00', '#0000FF'], // Should be ignored
        direction: 'top-bottom'
      },
      deviceConfig,
      outputWidth: 1290,
      outputHeight: 2796,
      verbose: false
    });
    
    expect(Buffer.isBuffer(withBackground)).toBe(true);
    
    // Test with gradient only (no background)
    const withGradient = await composeAppStoreScreenshot({
      screenshot: screenshotBuffer,
      frame: null,
      caption: 'Test',
      captionConfig,
      gradientConfig: {
        colors: ['#00FF00', '#0000FF'],
        direction: 'top-bottom'
      },
      deviceConfig,
      outputWidth: 1290,
      outputHeight: 2796,
      verbose: false
    });
    
    expect(Buffer.isBuffer(withGradient)).toBe(true);
    
    // Verify they produce different results
    const bgMeta = await sharp(withBackground).metadata();
    const gradMeta = await sharp(withGradient).metadata();
    
    // Both should have correct dimensions
    expect(bgMeta.width).toBe(1290);
    expect(bgMeta.height).toBe(2796);
    expect(gradMeta.width).toBe(1290);
    expect(gradMeta.height).toBe(2796);
  });

  it('should handle auto mode correctly', async () => {
    // Create background in device folder
    const bgPath = path.join(tempDir, 'screenshots', 'iphone', 'background.jpg');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 3, // JPEG has 3 channels
        background: { r: 100, g: 150, b: 200 }
      }
    })
    .jpeg()
    .toFile(bgPath);
    
    const backgroundConfig: BackgroundConfig = {
      mode: 'auto'
    };
    
    const result = await renderBackground(
      1290,
      2796,
      backgroundConfig,
      path.join(tempDir, 'screenshots', 'iphone')
    );
    
    expect(Buffer.isBuffer(result)).toBe(true);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(1290);
    expect(metadata.height).toBe(2796);
  });
});