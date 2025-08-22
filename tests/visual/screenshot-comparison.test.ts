import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEST_DIR = path.join(__dirname, '../../.visual-test');
const SCREENSHOTS_DIR = path.join(TEST_DIR, 'screenshots');
const FINAL_DIR = path.join(TEST_DIR, 'final');
const REFERENCE_DIR = path.join(__dirname, 'references');

// Skip visual tests unless explicitly running visual test suite
const shouldRunVisualTests = process.env.RUN_VISUAL_TESTS === 'true' || 
                            process.argv.some(arg => arg.includes('visual'));

describe.skipIf(!shouldRunVisualTests)('Visual Screenshot Tests', () => {
  beforeAll(async () => {
    // Clean up and create test directories
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    await fs.mkdir(path.join(SCREENSHOTS_DIR, 'iphone'), { recursive: true });
    await fs.mkdir(path.join(SCREENSHOTS_DIR, 'ipad'), { recursive: true });
    await fs.mkdir(path.join(SCREENSHOTS_DIR, 'watch'), { recursive: true });
    
    // Initialize appshot project
    const cliPath = path.join(__dirname, '../../dist/cli.js');
    await execAsync(`node ${cliPath} init --force`, { cwd: TEST_DIR });
  });

  afterAll(async () => {
    // Clean up test directory
    if (process.env.KEEP_VISUAL_TESTS !== '1') {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Screenshot Generation', () => {
    it('should generate consistent screenshots for solid colors', async () => {
      // Create a solid color screenshot
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 }
        }
      })
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'iphone', 'solid.png'));

      // Add caption
      const captionsPath = path.join(TEST_DIR, '.appshot/captions/iphone.json');
      await fs.writeFile(captionsPath, JSON.stringify({
        'solid.png': 'Test Caption'
      }));

      // Build screenshot
      const cliPath = path.join(__dirname, '../../dist/cli.js');
      await execAsync(`node ${cliPath} build --devices iphone --no-frame`, { 
        cwd: TEST_DIR,
        env: { ...process.env, APPSHOT_DISABLE_FONT_SCAN: '1' }
      });

      // Verify output exists
      const outputFiles = await fs.readdir(path.join(FINAL_DIR, 'iphone')).catch(() => []);
      expect(outputFiles.length).toBeGreaterThan(0);

      // Check image dimensions
      const outputPath = path.join(FINAL_DIR, 'iphone', 'solid.png');
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1290);
      expect(metadata.height).toBe(2796);
    });

    it('should produce identical outputs for same inputs', async () => {
      // Create test screenshot
      const testImage = await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 50, g: 100, b: 150, alpha: 1 }
        }
      }).png().toBuffer();

      const screenshotPath = path.join(SCREENSHOTS_DIR, 'iphone', 'test.png');
      await fs.writeFile(screenshotPath, testImage);

      // Add caption
      const captionsPath = path.join(TEST_DIR, '.appshot/captions/iphone.json');
      await fs.writeFile(captionsPath, JSON.stringify({
        'test.png': 'Consistent Output Test'
      }));

      // Build first time
      const cliPath = path.join(__dirname, '../../dist/cli.js');
      await execAsync(`node ${cliPath} clean --yes`, { cwd: TEST_DIR });
      await execAsync(`node ${cliPath} build --devices iphone --no-frame`, { 
        cwd: TEST_DIR,
        env: { ...process.env, APPSHOT_DISABLE_FONT_SCAN: '1' }
      });

      const output1 = await fs.readFile(path.join(FINAL_DIR, 'iphone', 'test.png'));

      // Build second time
      await execAsync(`node ${cliPath} clean --yes`, { cwd: TEST_DIR });
      await execAsync(`node ${cliPath} build --devices iphone --no-frame`, { 
        cwd: TEST_DIR,
        env: { ...process.env, APPSHOT_DISABLE_FONT_SCAN: '1' }
      });

      const output2 = await fs.readFile(path.join(FINAL_DIR, 'iphone', 'test.png'));

      // Compare file sizes (should be very close)
      expect(Math.abs(output1.length - output2.length)).toBeLessThan(100);

      // Compare image dimensions
      const meta1 = await sharp(output1).metadata();
      const meta2 = await sharp(output2).metadata();
      expect(meta1.width).toBe(meta2.width);
      expect(meta1.height).toBe(meta2.height);
    });

    it('should handle gradient backgrounds correctly', async () => {
      // Create gradient test pattern
      const width = 1290;
      const height = 2796;
      const gradient = Buffer.alloc(width * height * 4);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          gradient[idx] = Math.floor((x / width) * 255);      // R
          gradient[idx + 1] = Math.floor((y / height) * 255); // G
          gradient[idx + 2] = 128;                            // B
          gradient[idx + 3] = 255;                            // A
        }
      }

      await sharp(gradient, {
        raw: { width, height, channels: 4 }
      })
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'iphone', 'gradient.png'));

      // Add caption
      const captionsPath = path.join(TEST_DIR, '.appshot/captions/iphone.json');
      await fs.writeFile(captionsPath, JSON.stringify({
        'gradient.png': 'Gradient Test'
      }));

      // Apply ocean gradient
      const cliPath = path.join(__dirname, '../../dist/cli.js');
      await execAsync(`node ${cliPath} gradients --apply ocean`, { cwd: TEST_DIR });

      // Build
      await execAsync(`node ${cliPath} clean --yes`, { cwd: TEST_DIR });
      await execAsync(`node ${cliPath} build --devices iphone --no-frame`, { 
        cwd: TEST_DIR,
        env: { ...process.env, APPSHOT_DISABLE_FONT_SCAN: '1' }
      });

      // Verify output
      const outputPath = path.join(FINAL_DIR, 'iphone', 'gradient.png');
      const metadata = await sharp(outputPath).metadata();
      expect(metadata.width).toBe(1290);
      expect(metadata.height).toBe(2796);
      expect(metadata.channels).toBe(4); // Should have alpha channel
    });

    it('should format watch screenshots correctly', async () => {
      // Create watch screenshot
      await sharp({
        create: {
          width: 396,
          height: 484,
          channels: 4,
          background: { r: 100, g: 150, b: 100, alpha: 1 }
        }
      })
      .png()
      .toFile(path.join(SCREENSHOTS_DIR, 'watch', 'watch.png'));

      // Add caption
      const captionsPath = path.join(TEST_DIR, '.appshot/captions/watch.json');
      await fs.writeFile(captionsPath, JSON.stringify({
        'watch.png': 'Quick glance at important information'
      }));

      // Build
      const cliPath = path.join(__dirname, '../../dist/cli.js');
      await execAsync(`node ${cliPath} build --devices watch --no-frame`, { 
        cwd: TEST_DIR,
        env: { ...process.env, APPSHOT_DISABLE_FONT_SCAN: '1' }
      });

      // Verify output
      const outputPath = path.join(FINAL_DIR, 'watch', 'watch.png');
      const exists = await fs.access(outputPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const metadata = await sharp(outputPath).metadata();
      // Watch screenshots get scaled up by 130%
      expect(metadata.width).toBeGreaterThan(396);
    });
  });

  describe('Pixel Comparison', () => {
    it('should detect differences in screenshots', async () => {
      // Create two slightly different images
      const image1 = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 100, g: 100, b: 100, alpha: 1 }
        }
      }).png().toBuffer();

      const image2 = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 101, g: 100, b: 100, alpha: 1 } // Slightly different
        }
      }).png().toBuffer();

      // Compare pixel data
      const data1 = await sharp(image1).raw().toBuffer();
      const data2 = await sharp(image2).raw().toBuffer();

      let diffPixels = 0;
      for (let i = 0; i < data1.length; i += 4) {
        const r1 = data1[i];
        const r2 = data2[i];
        if (Math.abs(r1 - r2) > 0) {
          diffPixels++;
        }
      }

      // Should detect the difference
      expect(diffPixels).toBeGreaterThan(0);
    });

    it('should pass for identical images', async () => {
      // Create identical images
      const imageBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 100, g: 100, b: 100, alpha: 1 }
        }
      }).png().toBuffer();

      const data1 = await sharp(imageBuffer).raw().toBuffer();
      const data2 = await sharp(imageBuffer).raw().toBuffer();

      // Compare - should be identical
      expect(data1.equals(data2)).toBe(true);
    });
  });
});