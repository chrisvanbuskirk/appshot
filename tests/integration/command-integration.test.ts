import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Command Integration Tests', { timeout: 30000 }, () => {
  let testDir: string;
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');

  // Helper to run commands
  const run = async (args: string) => {
    return execAsync(`node ${cliPath} ${args}`, { cwd: testDir });
  };

  beforeAll(async () => {
    testDir = path.join('/tmp', `appshot-cmd-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Template Command', () => {
    it('should initialize and apply a template', async () => {
      // Initialize
      await run('init --force');

      // Apply template
      const { stdout, stderr } = await run('template modern');
      expect(stderr || '').toBe('');
      expect(stdout.toLowerCase()).toContain('applied');

      // Verify config was updated
      const config = JSON.parse(
        await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8')
      );
      expect(config.background?.gradient?.colors).toEqual(['#667eea', '#764ba2', '#f093fb']);
      expect(config.caption.font).toBe('SF Pro Display');
    });

    it('should list templates', async () => {
      await run('init --force');
      const { stdout } = await run('template --list');

      expect(stdout).toContain('modern');
      expect(stdout).toContain('minimal');
      expect(stdout).toContain('bold');
      expect(stdout).toContain('nerdy');
    });

    it('should handle invalid template', async () => {
      await run('init --force');

      try {
        await run('template invalid-template');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr || error.message).toContain('not found');
      }
    });
  });

  describe('Preset Command', () => {
    it('should run preset in dry-run mode', async () => {
      await run('init --force');

      // Create a test screenshot
      const screenshotPath = path.join(testDir, 'screenshots/iphone/test.png');
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 }
        }
      }).png().toFile(screenshotPath);

      const { stdout, stderr } = await run('preset modern --devices iphone --dry-run');

      expect(stderr || '').toBe('');
      expect(stdout).toContain('Dry Run Mode');
      expect(stdout).toContain('Modern Vibrant');

      // Should not create output files
      const finalExists = await fs.access(path.join(testDir, 'final'))
        .then(() => true).catch(() => false);
      expect(finalExists).toBe(false);
    });

    it('should sanitize malicious input', async () => {
      await run('init --force');

      try {
        await run('preset modern --devices "iphone; rm -rf /" --dry-run');
        expect.fail('Should have failed');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('No valid devices');
      }

      // Verify system is intact
      const tmpExists = await fs.access('/tmp').then(() => true).catch(() => false);
      expect(tmpExists).toBe(true);
    });
  });

  describe('Quickstart Command', () => {
    it('should work in non-interactive mode', async () => {
      const { stdout, stderr } = await run('quickstart --force --template modern --no-interactive');

      expect(stderr || '').toBe('');
      expect(stdout).toContain('modern');

      // Verify config was created
      const config = JSON.parse(
        await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8')
      );
      expect(config.background?.gradient?.colors || config.gradient?.colors).toBeDefined();
    });
  });

  describe('Font Fallback', () => {
    it('should handle non-existent font gracefully', async () => {
      await run('init --force');

      // Set non-existent font
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.caption.font = 'NonExistentFont123';
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Create screenshot
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 50, g: 100, b: 150, alpha: 1 }
        }
      }).png().toFile(path.join(testDir, 'screenshots/iphone/test.png'));

      // Add caption
      await fs.writeFile(
        path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'test.png': 'Test Caption' }, null, 2)
      );

      // Build should succeed with fallback
      const { stderr } = await run('build --devices iphone');

      // Should complete without fatal error
      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);
    });

    it('should validate fonts', async () => {
      await run('init --force');
      const { stdout } = await run('fonts --validate "FakeFont999"');

      expect(stdout.toLowerCase()).toMatch(/not installed|not available|fallback/);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete basic workflow', async () => {
      // Initialize with template
      await run('quickstart --force --template minimal --no-interactive');

      // Create screenshot
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 100, b: 200, alpha: 1 }
        }
      }).png().toFile(path.join(testDir, 'screenshots/iphone/home.png'));

      // Add caption
      await fs.writeFile(
        path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'home.png': 'Welcome' }, null, 2)
      );

      // Build
      const { stderr } = await run('build --devices iphone');

      // Verify output
      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/home.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);

      if (outputExists) {
        // Verify it's a valid image
        const meta = await sharp(path.join(testDir, 'final/iphone/en/home.png')).metadata();
        expect(meta.width).toBeGreaterThanOrEqual(1290);  // May or may not have frame
        expect(meta.height).toBeGreaterThanOrEqual(2796);
      }
    });
  });

  describe('Security Validation', () => {
    it('should prevent path traversal', async () => {
      await run('init --force');

      try {
        await run('template ../../../etc/passwd');
        expect.fail('Should have rejected');
      } catch (error: any) {
        expect(error.stderr || error.message).toContain('not found');
      }
    });

    it('should sanitize preset device input', async () => {
      await run('init --force');

      try {
        await run('preset modern --devices "../../etc" --dry-run');
        expect.fail('Should have failed');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('No valid devices');
      }
    });
  });
});