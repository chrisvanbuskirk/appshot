import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import gradientsCmd from '../src/commands/gradients.js';
import { gradientPresets } from '../src/core/gradient-presets.js';

describe('gradients command', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create .appshot directory with config
    await fs.mkdir('.appshot', { recursive: true });
    await fs.writeFile('.appshot/config.json', JSON.stringify({
      output: './final',
      frames: './frames',
      gradient: {
        colors: ['#FF0000', '#00FF00'],
        direction: 'top-bottom'
      },
      caption: {
        fontsize: 64,
        color: '#FFFFFF'
      },
      devices: {
        iphone: {
          input: './screenshots/iphone',
          resolution: '1284x2778'
        }
      }
    }, null, 2));
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('gradient application', () => {
    it('should apply gradient preset to config', async () => {
      const cmd = gradientsCmd();
      
      // Simulate applying ocean gradient
      await cmd.parseAsync(['node', 'appshot', '--apply', 'ocean']);

      // Read updated config
      const configContent = await fs.readFile('.appshot/config.json', 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.gradient.colors).toEqual(['#0077BE', '#33CCCC']);
      expect(config.gradient.direction).toBe('top-bottom');
    });

    it('should handle invalid gradient ID', async () => {
      const cmd = gradientsCmd();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit');
      });

      try {
        await cmd.parseAsync(['node', 'appshot', '--apply', 'invalid-gradient']);
      } catch (error) {
        // Expected to throw due to process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gradient "invalid-gradient" not found')
      );

      consoleSpy.mockRestore();
      processSpy.mockRestore();
    });
  });

  describe('gradient preview', () => {
    it('should generate preview image for valid gradient', async () => {
      const cmd = gradientsCmd();
      
      await cmd.parseAsync(['node', 'appshot', '--preview', 'sunset']);

      // Check if preview file was created
      const files = await fs.readdir(tempDir);
      expect(files).toContain('gradient-sunset.png');

      // Verify file exists and has content
      const stats = await fs.stat(path.join(tempDir, 'gradient-sunset.png'));
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('gradient samples', () => {
    it('should generate samples for all gradients', async () => {
      const cmd = gradientsCmd();
      
      await cmd.parseAsync(['node', 'appshot', '--sample']);

      // Check if samples directory was created
      const dirs = await fs.readdir(tempDir);
      expect(dirs).toContain('gradient-samples');

      // Check if sample files were created
      const sampleFiles = await fs.readdir(path.join(tempDir, 'gradient-samples'));
      
      // Should have PNG for each gradient plus HTML preview
      expect(sampleFiles).toContain('preview.html');
      
      // Check for some specific gradient samples
      expect(sampleFiles).toContain('sunset.png');
      expect(sampleFiles).toContain('ocean.png');
      expect(sampleFiles).toContain('neon.png');
      
      // Should have at least as many PNGs as gradients
      const pngFiles = sampleFiles.filter(f => f.endsWith('.png'));
      expect(pngFiles.length).toBe(gradientPresets.length);
    });

    it('should generate valid HTML preview', async () => {
      const cmd = gradientsCmd();
      
      await cmd.parseAsync(['node', 'appshot', '--sample']);

      // Read HTML file
      const htmlContent = await fs.readFile(
        path.join(tempDir, 'gradient-samples', 'preview.html'),
        'utf-8'
      );

      // Check HTML structure
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Appshot Gradient Presets');
      
      // Check for gradient references
      expect(htmlContent).toContain('sunset.png');
      expect(htmlContent).toContain('ocean.png');
      
      // Check for categories
      expect(htmlContent).toContain('Warm');
      expect(htmlContent).toContain('Cool');
      expect(htmlContent).toContain('Vibrant');
    });
  });

  describe('gradient listing', () => {
    it('should list gradients when no options provided', async () => {
      const cmd = gradientsCmd();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cmd.parseAsync(['node', 'appshot']);

      // Check that gradient info was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Gradient Presets')
      );

      // Check for categories
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Warm Gradients|Cool Gradients|Vibrant Gradients/)
      );

      consoleSpy.mockRestore();
    });

    it('should filter by category', async () => {
      const cmd = gradientsCmd();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await cmd.parseAsync(['node', 'appshot', '--category', 'warm']);

      // Should show warm gradients
      const logCalls = consoleSpy.mock.calls.map(call => call[0]);
      const output = logCalls.join('\n');
      
      expect(output).toContain('Warm Gradients');
      expect(output).toContain('sunset');
      expect(output).toContain('autumn');
      
      // Should not show other categories
      expect(output).not.toContain('Cool Gradients');
      expect(output).not.toContain('ocean');

      consoleSpy.mockRestore();
    });
  });
});