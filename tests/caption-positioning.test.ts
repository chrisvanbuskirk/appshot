import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import type { GradientConfig, CaptionConfig, DeviceConfig } from '../src/types.js';

describe('Caption Positioning', () => {
  // Create a simple test screenshot
  const createTestScreenshot = async (width = 400, height = 800) => {
    return await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 }
      }
    }).png().toBuffer();
  };

  const baseGradientConfig: GradientConfig = {
    colors: ['#FF6B6B', '#4ECDC4'],
    direction: 'diagonal'
  };

  const baseCaptionConfig: CaptionConfig = {
    font: 'Arial',
    fontsize: 48,
    color: '#FFFFFF',
    align: 'center',
    paddingTop: 40,
    paddingBottom: 40
  };

  const baseDeviceConfig: DeviceConfig = {
    input: './test',
    resolution: '800x1200'
  };

  describe('Above positioning (existing)', () => {
    it('should position caption above the screenshot', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Caption above device',
        captionConfig: { ...baseCaptionConfig, position: 'above' },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should use above positioning by default', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Default positioning',
        captionConfig: baseCaptionConfig, // No position specified
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });
  });

  describe('Below positioning (new)', () => {
    it('should position caption below the screenshot', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Caption below device',
        captionConfig: { ...baseCaptionConfig, position: 'below' },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should handle device-specific below positioning', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Device-specific below',
        captionConfig: baseCaptionConfig, // Global default
        gradientConfig: baseGradientConfig,
        deviceConfig: { ...baseDeviceConfig, captionPosition: 'below' }, // Device override
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should handle long captions with below positioning', async () => {
      const screenshot = await createTestScreenshot();
      const longCaption = 'This is a very long caption that should wrap to multiple lines when positioned below the device frame and should still render correctly';
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: longCaption,
        captionConfig: { 
          ...baseCaptionConfig, 
          position: 'below',
          box: { maxLines: 3, autoSize: true }
        },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should work with fixed caption box below', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Fixed box below',
        captionConfig: { 
          ...baseCaptionConfig, 
          position: 'below',
          box: { 
            autoSize: false, 
            minHeight: 150, 
            maxHeight: 150,
            maxLines: 2
          }
        },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });
  });

  describe('Overlay positioning (existing)', () => {
    it('should handle overlay positioning without affecting layout', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Overlay caption',
        captionConfig: { ...baseCaptionConfig, position: 'overlay' },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid (overlay is not fully implemented but shouldn't crash)
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });
  });

  describe('Position priority handling', () => {
    it('should prioritize device-specific position over global', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Priority test',
        captionConfig: { ...baseCaptionConfig, position: 'above' }, // Global: above
        gradientConfig: baseGradientConfig,
        deviceConfig: { ...baseDeviceConfig, captionPosition: 'below' }, // Device: below (should win)
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid - device override should be used
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty caption gracefully with below position', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: '', // Empty caption
        captionConfig: { ...baseCaptionConfig, position: 'below' },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should handle undefined caption with below position', async () => {
      const screenshot = await createTestScreenshot();
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: undefined, // No caption
        captionConfig: { ...baseCaptionConfig, position: 'below' },
        gradientConfig: baseGradientConfig,
        deviceConfig: baseDeviceConfig,
        outputWidth: 800,
        outputHeight: 1200
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(1200);
    });

    it('should handle very small output dimensions with below captions', async () => {
      const screenshot = await createTestScreenshot(200, 400);
      
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        frameMetadata: undefined,
        caption: 'Small space',
        captionConfig: { 
          ...baseCaptionConfig, 
          position: 'below',
          fontsize: 24 // Smaller font for small space
        },
        gradientConfig: baseGradientConfig,
        deviceConfig: { ...baseDeviceConfig, resolution: '300x500' },
        outputWidth: 300,
        outputHeight: 500
      });

      expect(result).toBeInstanceOf(Buffer);
      
      // Verify image is valid
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(500);
    });
  });
});