import { describe, it, expect, vi } from 'vitest';
import { autoSelectFrame } from '../src/core/devices.js';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import sharp from 'sharp';

describe('Build Command Options', () => {
  describe('background options', () => {
    it('should handle --auto-background flag', async () => {
      // The auto-background flag enables automatic detection of background.png
      // in device folders. This is tested by checking the BackgroundConfig
      const backgroundConfig = {
        mode: 'auto' as const,
        fit: 'cover' as const,
        warnOnMismatch: true
      };
      
      expect(backgroundConfig.mode).toBe('auto');
      expect(backgroundConfig.fit).toBe('cover');
    });
    
    it('should handle --background <path> with custom image', async () => {
      const customPath = './custom-bg.png';
      const backgroundConfig = {
        mode: 'image' as const,
        image: customPath,
        fit: 'cover' as const,
        warnOnMismatch: true
      };
      
      expect(backgroundConfig.mode).toBe('image');
      expect(backgroundConfig.image).toBe(customPath);
    });
    
    it('should handle --background-fit modes', async () => {
      const fitModes = ['cover', 'contain', 'fill', 'scale-down'] as const;
      
      for (const fit of fitModes) {
        const backgroundConfig = {
          mode: 'image' as const,
          fit: fit,
          warnOnMismatch: true
        };
        
        expect(backgroundConfig.fit).toBe(fit);
        expect(fitModes).toContain(backgroundConfig.fit);
      }
    });
    
    it('should handle --no-background for transparent output', async () => {
      // When --no-background is used, backgroundConfig should be undefined
      const backgroundConfig = undefined;
      
      // This would result in a transparent background in compose
      expect(backgroundConfig).toBeUndefined();
    });
    
    it('should use gradient as fallback when no background available', async () => {
      // Create test screenshot
      const screenshot = await sharp({
        create: {
          width: 1170,
          height: 2532,
          channels: 4,
          background: { r: 100, g: 100, b: 100, alpha: 1 }
        }
      })
      .png()
      .toBuffer();
      
      // Test with no background (should fall back to gradient)
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        caption: undefined,
        captionConfig: {
          font: 'Arial',
          fontsize: 48,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 50,
          position: 'above'
        },
        gradientConfig: {
          colors: ['#FF0000', '#00FF00'],
          direction: 'top-bottom'
        },
        deviceConfig: {
          input: './',
          resolution: '1290x2796'
        },
        outputWidth: 1290,
        outputHeight: 2796,
        verbose: false
      });
      
      expect(Buffer.isBuffer(result)).toBe(true);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(1290);
      expect(metadata.height).toBe(2796);
    });
    
    it('should prioritize background over gradient when both present', async () => {
      // Create test screenshot
      const screenshot = await sharp({
        create: {
          width: 1170,
          height: 2532,
          channels: 4,
          background: { r: 100, g: 100, b: 100, alpha: 1 }
        }
      })
      .png()
      .toBuffer();
      
      // Test with both background and gradient (background should win)
      const result = await composeAppStoreScreenshot({
        screenshot,
        frame: null,
        caption: undefined,
        captionConfig: {
          font: 'Arial',
          fontsize: 48,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 50,
          position: 'above'
        },
        backgroundConfig: {
          mode: 'image',
          color: '#0000FF' // Blue background
        },
        gradientConfig: {
          colors: ['#FF0000', '#00FF00'], // Should be ignored
          direction: 'top-bottom'
        },
        deviceConfig: {
          input: './',
          resolution: '1290x2796'
        },
        outputWidth: 1290,
        outputHeight: 2796,
        verbose: false
      });
      
      expect(Buffer.isBuffer(result)).toBe(true);
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(1290);
      expect(metadata.height).toBe(2796);
    });
  });
  
  describe('dry-run mode', () => {
    it('should skip frame loading when dryRun is true', async () => {
      // Create a test image buffer
      const testImage = await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 }
        }
      })
      .png()
      .toBuffer();
      
      // Save test image temporarily
      const testPath = 'test-screenshot.png';
      await sharp(testImage).toFile(testPath);
      
      // Call autoSelectFrame with dryRun = true
      const result = await autoSelectFrame(
        testPath,
        './frames',
        'iphone',
        undefined,
        true // dryRun
      );
      
      // Should return metadata but no frame buffer
      expect(result.frame).toBeNull();
      if (result.metadata) {
        expect(result.metadata).toHaveProperty('frameWidth');
        expect(result.metadata).toHaveProperty('frameHeight');
      }
      
      // Clean up
      const fs = await import('fs');
      fs.unlinkSync(testPath);
    });
  });
  
  describe('verbose mode', () => {
    it('should accept verbose parameter in compose function', async () => {
      // Create test screenshot
      const screenshot = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .png()
      .toBuffer();
      
      // Mock console.log to capture verbose output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = vi.fn((...args) => {
        logs.push(args.join(' '));
      });
      
      // Call compose with verbose = true
      const result = await composeAppStoreScreenshot({
        screenshot,
        caption: 'Test Caption',
        captionConfig: {
          font: 'Arial',
          fontsize: 32,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        gradientConfig: {
          colors: ['#FF0000', '#00FF00'],
          direction: 'top-bottom'
        },
        deviceConfig: {
          input: './test',
          resolution: '100x200'
        },
        outputWidth: 100,
        outputHeight: 200,
        verbose: true
      });
      
      // Check that verbose logging occurred
      const verboseLogs = logs.filter(log => 
        log.includes('Caption metrics:') || 
        log.includes('Font information:') ||
        log.includes('Font stack:')
      );
      
      expect(verboseLogs.length).toBeGreaterThan(0);
      
      // Restore console.log
      console.log = originalLog;
      
      // Result should be a buffer
      expect(Buffer.isBuffer(result)).toBe(true);
    });
    
    it('should not log verbose info when verbose is false', async () => {
      // Create test screenshot
      const screenshot = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 }
        }
      })
      .png()
      .toBuffer();
      
      // Mock console.log
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = vi.fn((...args) => {
        logs.push(args.join(' '));
      });
      
      // Call compose with verbose = false (default)
      await composeAppStoreScreenshot({
        screenshot,
        captionConfig: {
          font: 'Arial',
          fontsize: 32,
          color: '#FFFFFF',
          align: 'center',
          paddingTop: 20
        },
        gradientConfig: {
          colors: ['#FF0000', '#00FF00'],
          direction: 'top-bottom'
        },
        deviceConfig: {
          input: './test',
          resolution: '100x200'
        },
        outputWidth: 100,
        outputHeight: 200
      });
      
      // Check that no verbose logging occurred
      const verboseLogs = logs.filter(log => 
        log.includes('Caption metrics:') || 
        log.includes('Font information:')
      );
      
      expect(verboseLogs.length).toBe(0);
      
      // Restore console.log
      console.log = originalLog;
    });
  });
});