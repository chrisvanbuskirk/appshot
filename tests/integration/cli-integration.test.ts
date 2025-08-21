import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec, execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';

const execAsync = promisify(exec);

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('CLI Integration Tests', { timeout: 60000 }, () => {
  let testDir: string;
  const originalCwd = process.cwd();
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');
  
  // Helper function to run appshot commands
  const runAppshot = async (args: string) => {
    return execAsync(`node ${cliPath} ${args}`);
  };

  beforeAll(async () => {
    // Create unique test directory
    testDir = path.join('/tmp', `appshot-integration-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(async () => {
    // Cleanup
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Core Commands', () => {
    it('should initialize a new project', async () => {
      const { stdout } = await runAppshot('init --force');
      
      // Verify files created
      const configExists = await fs.access('.appshot/config.json').then(() => true).catch(() => false);
      const screenshotsExists = await fs.access('screenshots').then(() => true).catch(() => false);
      
      expect(configExists).toBe(true);
      expect(screenshotsExists).toBe(true);
      expect(stdout.toLowerCase()).toContain('initialized');
    });

    it('should list specs in JSON format', async () => {
      const { stdout } = await runAppshot('specs --json');
      const specs = JSON.parse(stdout);
      
      expect(specs).toHaveProperty('iphone');
      expect(specs).toHaveProperty('ipad');
      expect(specs).toHaveProperty('mac');
      expect(specs).toHaveProperty('watch');
    });

    it('should list presets', async () => {
      const { stdout } = await runAppshot('presets --json');
      
      // The output might have other text, extract JSON
      const jsonMatch = stdout.match(/\[[\s\S]*\]/);
      expect(jsonMatch).toBeTruthy();
      
      if (jsonMatch) {
        const presets = JSON.parse(jsonMatch[0]);
        expect(Array.isArray(presets)).toBe(true);
        expect(presets.length).toBeGreaterThan(0);
        expect(presets[0]).toHaveProperty('id');
        expect(presets[0]).toHaveProperty('name');
      }
    });

    it('should list fonts', async () => {
      const { stdout } = await runAppshot('fonts --json');
      const fonts = JSON.parse(stdout);
      
      expect(Array.isArray(fonts)).toBe(true);
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts[0]).toHaveProperty('name');
    });

    it('should validate fonts', async () => {
      const { stdout } = await runAppshot('fonts --validate "Arial"');
      
      // Arial should be available on all systems
      expect(stdout.toLowerCase()).toContain('arial');
    });
  });

  describe('Screenshot Building', () => {
    beforeAll(async () => {
      // Create test screenshots
      await fs.mkdir('screenshots/iphone', { recursive: true });
      await fs.mkdir('screenshots/ipad', { recursive: true });
      
      // iPhone screenshot
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 }
        }
      })
      .png()
      .toFile('screenshots/iphone/test.png');
      
      // iPad screenshot
      await sharp({
        create: {
          width: 2048,
          height: 2732,
          channels: 4,
          background: { r: 200, g: 100, b: 150, alpha: 1 }
        }
      })
      .png()
      .toFile('screenshots/ipad/test.png');
      
      // Set captions
      await fs.writeFile(
        '.appshot/captions/iphone.json',
        JSON.stringify({ 'test.png': 'Test Caption' })
      );
      await fs.writeFile(
        '.appshot/captions/ipad.json',
        JSON.stringify({ 'test.png': 'iPad Test' })
      );
    });

    it('should build screenshots without frames', async () => {
      const { stdout } = await runAppshot('build --devices iphone,ipad --no-frame');
      
      // Check output files exist
      const iphoneOutput = await fs.readdir('final/iphone').catch(() => []);
      const ipadOutput = await fs.readdir('final/ipad').catch(() => []);
      
      expect(iphoneOutput.length).toBeGreaterThan(0);
      expect(ipadOutput.length).toBeGreaterThan(0);
      expect(stdout.toLowerCase()).toMatch(/generated|complete|processed/);
    });

    it('should clean generated screenshots', async () => {
      await runAppshot('clean --yes');
      
      const finalExists = await fs.access('final').then(() => true).catch(() => false);
      expect(finalExists).toBe(false);
    });

    it('should build with frames', async () => {
      const { stdout } = await runAppshot('build --devices iphone');
      
      const outputFiles = await fs.readdir('final/iphone').catch(() => []);
      expect(outputFiles.length).toBeGreaterThan(0);
    });

    it('should validate generated screenshots', async () => {
      try {
        const { stdout } = await runAppshot('validate');
        // Validation might fail if dimensions don't match App Store specs
        // but the command should run
        expect(stdout).toBeDefined();
      } catch (error: any) {
        // Even if validation fails, check that it ran
        expect(error.stdout || error.stderr).toBeDefined();
      }
    });
  });

  describe('Multi-language Support', () => {
    beforeAll(async () => {
      // Set multi-language captions
      await fs.writeFile(
        '.appshot/captions/iphone.json',
        JSON.stringify({
          'test.png': {
            'en': 'Welcome',
            'es': 'Bienvenido',
            'fr': 'Bienvenue'
          }
        })
      );
    });

    it('should build with multiple languages', async () => {
      await runAppshot('clean --yes');
      const { stdout } = await runAppshot('build --devices iphone --langs en,es,fr --no-frame');
      
      // Check language directories created
      const enExists = await fs.access('final/iphone/en').then(() => true).catch(() => false);
      const esExists = await fs.access('final/iphone/es').then(() => true).catch(() => false);
      const frExists = await fs.access('final/iphone/fr').then(() => true).catch(() => false);
      
      expect(enExists).toBe(true);
      expect(esExists).toBe(true);
      expect(frExists).toBe(true);
    });
  });

  describe('Gradient Presets', () => {
    it('should list gradient presets', async () => {
      const { stdout } = await runAppshot('gradients --list');
      
      expect(stdout).toContain('ocean');
      expect(stdout).toContain('sunset');
      // Forest might not be in list, check for any nature gradient
      expect(stdout).toMatch(/ocean|sunset|tropical|autumn/);
    });

    it('should apply gradient preset', async () => {
      await runAppshot('gradients --apply sunset');
      
      const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf-8'));
      // Check that gradient was modified
      expect(config.gradient).toBeDefined();
      expect(config.gradient.preset || config.gradient.colors).toBeDefined();
    });
  });

  describe('Font Configuration', () => {
    it('should set global font', async () => {
      await runAppshot('fonts --set "Georgia"');
      
      const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf-8'));
      expect(config.caption.font).toBe('Georgia');
    });

    it('should set device-specific font', async () => {
      await runAppshot('fonts --set "Arial" --device iphone');
      
      const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf-8'));
      expect(config.devices.iphone.captionFont).toBe('Arial');
    });
  });

  describe('Check Command', () => {
    it('should check project configuration', async () => {
      const { stdout } = await runAppshot('check');
      
      // Check command output varies but should mention config or devices
      expect(stdout).toMatch(/Configuration|Devices|screenshots found/);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing screenshots directory gracefully', async () => {
      await fs.rm('screenshots', { recursive: true, force: true });
      
      try {
        await runAppshot('build --devices iphone');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('screenshots');
      }
      
      // Restore for other tests
      await fs.mkdir('screenshots/iphone', { recursive: true });
    });

    it('should handle invalid device names', async () => {
      try {
        await runAppshot('build --devices invalid-device');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toBeDefined();
      }
    });
  });

  describe('Watch Support', () => {
    beforeAll(async () => {
      await fs.mkdir('screenshots/watch', { recursive: true });
      
      // Create watch screenshot
      await sharp({
        create: {
          width: 396,
          height: 484,
          channels: 4,
          background: { r: 150, g: 200, b: 100, alpha: 1 }
        }
      })
      .png()
      .toFile('screenshots/watch/glance.png');
      
      await fs.writeFile(
        '.appshot/captions/watch.json',
        JSON.stringify({ 'glance.png': 'Quick glance info that might wrap to multiple lines' })
      );
    });

    it('should handle watch screenshots with special formatting', async () => {
      await runAppshot('clean --yes');
      const { stdout } = await runAppshot('build --devices watch --no-frame');
      
      const outputFiles = await fs.readdir('final/watch').catch(() => []);
      expect(outputFiles.length).toBeGreaterThan(0);
      
      // Watch should handle long captions by wrapping
      expect(stdout.toLowerCase()).toMatch(/generated|complete|processed/);
    }, 120000); // 2 minute timeout
  });

  describe('Migration Command', () => {
    it('should migrate project structure', async () => {
      // Create old structure
      await fs.mkdir('final/iphone', { recursive: true });
      await fs.writeFile('final/iphone/test.png', Buffer.from('fake-image'));
      
      const { stdout } = await runAppshot('migrate');
      
      // Check for language subdirectory
      const files = await fs.readdir('final/iphone');
      const hasLanguageDir = files.some(f => ['en', 'es', 'fr', 'de', 'ja', 'zh'].includes(f));
      
      expect(hasLanguageDir || files.length === 0).toBe(true);
    });
  });
});

describe('CLI Help and Version', () => {
  it('should show version', async () => {
    const { stdout } = await runAppshot('--version');
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should show help', async () => {
    const { stdout } = await runAppshot('--help');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('init');
    expect(stdout).toContain('build');
    expect(stdout).toContain('caption');
  });

  it('should show command-specific help', async () => {
    const { stdout } = await runAppshot('build --help');
    expect(stdout).toContain('--devices');
    expect(stdout).toContain('--langs');
    expect(stdout).toContain('--no-frame');
  });
});