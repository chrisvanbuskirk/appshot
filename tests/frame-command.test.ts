import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('frame command integration', () => {
  const testDir = path.join(process.cwd(), 'test-temp-frame');
  const inputDir = path.join(testDir, 'input');
  const outputDir = path.join(testDir, 'output');

  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directories
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function createTestImage(width: number, height: number, filename: string) {
    const buffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 }
      }
    }).png().toBuffer();
    
    await fs.writeFile(path.join(inputDir, filename), buffer);
  }

  describe('single file processing', () => {
    it('should frame an iPhone screenshot', async () => {
      await createTestImage(1290, 2796, 'iphone.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'iphone.png')} --dry-run`
      );
      
      expect(stdout).toContain('iphone');
      expect(stdout).toContain('portrait');
    });

    it('should frame an iPad screenshot', async () => {
      await createTestImage(2064, 2752, 'ipad.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'ipad.png')} --dry-run`
      );
      
      expect(stdout).toContain('ipad');
    });

    it('should frame a Mac screenshot', async () => {
      await createTestImage(2560, 1600, 'mac.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'mac.png')} --dry-run`
      );
      
      expect(stdout).toContain('mac');
    });

    it('should frame a Watch screenshot', async () => {
      await createTestImage(396, 484, 'watch.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'watch.png')} --dry-run`
      );
      
      expect(stdout).toContain('watch');
    });

    it('should detect landscape orientation', async () => {
      await createTestImage(2796, 1290, 'iphone-landscape.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'iphone-landscape.png')} --dry-run`
      );
      
      expect(stdout).toContain('landscape');
    });

    it('should fail gracefully for undetectable device', async () => {
      await createTestImage(100, 100, 'tiny.png');
      
      try {
        await execAsync(
          `npm run dev -- frame ${path.join(inputDir, 'tiny.png')}`
        );
      } catch (error: any) {
        expect(error.stderr).toContain('Unable to detect device type');
      }
    });

    it('should force device type when specified', async () => {
      await createTestImage(1000, 1000, 'square.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'square.png')} --device iphone --dry-run`
      );
      
      expect(stdout).toContain('iphone');
    });
  });

  describe('batch processing', () => {
    it('should process multiple files in a directory', async () => {
      await createTestImage(1290, 2796, 'screen1.png');
      await createTestImage(1179, 2556, 'screen2.png');
      await createTestImage(2064, 2752, 'screen3.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${inputDir} --dry-run`
      );
      
      expect(stdout).toContain('3 images would be framed');
    });

    it('should process files recursively', async () => {
      const subDir = path.join(inputDir, 'nested');
      await fs.mkdir(subDir, { recursive: true });
      
      await createTestImage(1290, 2796, 'screen1.png');
      await createTestImage(1179, 2556, path.join('nested', 'screen2.png'));
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${inputDir} --recursive --dry-run`
      );
      
      expect(stdout).toContain('2 images would be framed');
    });

    it('should skip non-image files', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      await fs.writeFile(path.join(inputDir, 'readme.txt'), 'Not an image');
      await fs.writeFile(path.join(inputDir, 'data.json'), '{}');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${inputDir} --dry-run`
      );
      
      expect(stdout).toContain('1 images would be framed');
    });

    it('should handle empty directories gracefully', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${emptyDir}`
      );
      
      expect(stdout).toContain('No images found');
    });
  });

  describe('output options', () => {
    it('should respect output directory option', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'screen.png')} -o ${outputDir} --dry-run`
      );
      
      expect(stdout).toContain('screen');
    });

    it('should handle suffix option', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'screen.png')} --suffix "-with-frame" --dry-run`
      );
      
      expect(stdout).toContain('screen');
    });

    it('should support PNG format', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'screen.png')} --format png --dry-run`
      );
      
      expect(stdout).toContain('screen');
    });

    it('should support JPEG format', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'screen.png')} --format jpeg --dry-run`
      );
      
      expect(stdout).toContain('screen');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent input file', async () => {
      try {
        await execAsync(
          `npm run dev -- frame ${path.join(inputDir, 'nonexistent.png')}`
        );
      } catch (error: any) {
        expect(error.stderr).toContain('Error');
      }
    });

    it('should handle invalid device type', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      
      try {
        await execAsync(
          `npm run dev -- frame ${path.join(inputDir, 'screen.png')} --device invalid`
        );
      } catch (error: any) {
        expect(error.stderr).toContain('Invalid --device value');
      }
    });

    it('should handle corrupted image files', async () => {
      await fs.writeFile(path.join(inputDir, 'corrupted.png'), 'not a real png');
      
      try {
        await execAsync(
          `npm run dev -- frame ${path.join(inputDir, 'corrupted.png')}`
        );
      } catch (error: any) {
        expect(error.stderr).toContain('Error');
      }
    });
  });

  describe('verbose mode', () => {
    it('should show detailed information in verbose mode', async () => {
      await createTestImage(1290, 2796, 'screen.png');
      
      const { stdout } = await execAsync(
        `npm run dev -- frame ${path.join(inputDir, 'screen.png')} --verbose --dry-run`
      );
      
      expect(stdout).toContain('Source:');
      expect(stdout).toContain('Frame:');
      expect(stdout).toContain('1290x2796');
    });
  });
});