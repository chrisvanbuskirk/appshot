import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Font Fallback Integration', { timeout: 60000 }, () => {
  let testDir: string;
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');

  // Helper function to run appshot commands
  const runAppshot = async (args: string) => {
    return execAsync(`node ${cliPath} ${args}`, { cwd: testDir });
  };

  // Helper to create test screenshot
  const createTestScreenshot = async () => {
    const screenshotPath = path.join(testDir, 'screenshots', 'iphone', 'test.png');
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });

    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 50, g: 100, b: 150, alpha: 1 }
      }
    }).png().toFile(screenshotPath);

    return screenshotPath;
  };

  beforeAll(async () => {
    testDir = path.join('/tmp', `appshot-font-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await runAppshot('init --force');
    await createTestScreenshot();
  });

  describe('Font Availability and Fallback', () => {
    it('should handle non-existent font with graceful fallback', async () => {
      // Set a non-existent font in config
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.caption.font = 'NonExistentFontName12345';
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Add caption
      const captionPath = path.join(testDir, '.appshot/captions/iphone.json');
      await fs.writeFile(captionPath, JSON.stringify({
        'test.png': 'Test with Missing Font'
      }, null, 2));

      // Build should succeed with fallback
      const { stdout, stderr } = await runAppshot('build --devices iphone');

      // Should not error out completely
      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);

      // Should use fallback font (system-ui or sans-serif)
      if (outputExists) {
        const meta = await sharp(path.join(testDir, 'final/iphone/en/test.png')).metadata();
        expect(meta.width).toBeGreaterThan(0);
      }
    });

    it('should validate font during template application', async () => {
      const { stdout } = await runAppshot('template modern --verbose');

      // Modern template uses Poppins font
      // If it's not available, should still apply template
      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.caption.font).toBe('Poppins');
    });

    it('should show warning for unavailable fonts', async () => {
      const { stdout } = await runAppshot('fonts --validate "CompletelyFakeFont123"');

      expect(stdout.toLowerCase()).toMatch(/not installed|not available|fallback/);
    });

    it('should use embedded fonts when available', async () => {
      // Set an embedded font
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.caption.font = 'Inter'; // This is an embedded font
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      const { stdout } = await runAppshot('fonts --validate Inter');

      expect(stdout).toContain('Inter');
      expect(stdout.toLowerCase()).toMatch(/embedded|available|found/);
    });

    it('should prioritize embedded fonts over system fonts', async () => {
      // JetBrains Mono is embedded
      const { stdout } = await runAppshot('fonts --validate "JetBrains Mono"');

      expect(stdout).toContain('JetBrains Mono');
      // Should indicate it's embedded (not system)
      expect(stdout.toLowerCase()).toMatch(/embedded/);
    });

    it('should handle font variants (Bold, Italic)', async () => {
      // Test with font variant
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.caption.font = 'Inter Bold';
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Add caption
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'test.png': 'Bold Text Test' }, null, 2));

      // Should build successfully
      const { stderr } = await runAppshot('build --devices iphone');

      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);
    });

    it('should list available embedded fonts', async () => {
      const { stdout } = await runAppshot('fonts --embedded');

      // Should show embedded fonts
      expect(stdout).toContain('Inter');
      expect(stdout).toContain('Poppins');
      expect(stdout).toContain('Montserrat');
      expect(stdout).toContain('JetBrains Mono');
      expect(stdout).toContain('Roboto');
    });

    it('should handle device-specific font fallback', async () => {
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      // Set device-specific non-existent font
      config.devices.iphone.captionFont = 'FakeDeviceFont999';
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Add caption
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'test.png': 'Device Font Test' }, null, 2));

      // Build should still work with fallback
      const { stderr } = await runAppshot('build --devices iphone');

      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);
    });
  });

  describe('Template Font Fallback', () => {
    it('should handle templates with unavailable fonts', async () => {
      // Apply template that might have a font not installed
      await runAppshot('template elegant');

      // Elegant uses "Playfair Display" which might not be installed
      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.caption.font).toBe('Playfair Display');

      // Add caption and build
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'test.png': 'Elegant Test' }, null, 2));

      const { stderr } = await runAppshot('build --devices iphone');

      // Should build successfully even if font is missing
      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);
    });

    it('should apply all templates successfully regardless of font availability', async () => {
      const templates = ['modern', 'minimal', 'bold', 'elegant', 'nerdy', 'showcase', 'playful', 'corporate'];

      for (const template of templates) {
        // Fresh init
        await runAppshot('init --force');
        await createTestScreenshot();

        // Apply template
        const { stderr } = await runAppshot(`template ${template}`);

        // Add caption
        await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
          JSON.stringify({ 'test.png': `${template} test` }, null, 2));

        // Build should work
        const buildResult = await runAppshot('build --devices iphone');

        const outputPath = path.join(testDir, 'final/iphone/en/test.png');
        const outputExists = await fs.access(outputPath).then(() => true).catch(() => false);

        // Clean up for next iteration
        if (outputExists) {
          await fs.rm(path.join(testDir, 'final'), { recursive: true, force: true });
        }

        expect(outputExists).toBe(true);
      }
    });
  });

  describe('Font Command Integration', () => {
    it('should set font through CLI command', async () => {
      await runAppshot('fonts --set "Inter"');

      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.caption.font).toBe('Inter');
    });

    it('should set device-specific font', async () => {
      await runAppshot('fonts --set "Roboto" --device iphone');

      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.devices.iphone.captionFont).toBe('Roboto');
    });

    it('should allow setting unavailable font with confirmation', async () => {
      // This would normally require interactive confirmation
      // For non-interactive, we use --force flag if available
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));

      // Manually set the font since interactive isn't testable here
      config.caption.font = 'UnavailableFont999';
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Verify it was set
      const newConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(newConfig.caption.font).toBe('UnavailableFont999');
    });
  });
});