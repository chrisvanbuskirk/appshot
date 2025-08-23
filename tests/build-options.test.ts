import { describe, it, expect, vi } from 'vitest';
import { autoSelectFrame } from '../src/core/devices.js';
import { composeAppStoreScreenshot } from '../src/core/compose.js';
import sharp from 'sharp';

describe('Build Command Options', () => {
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