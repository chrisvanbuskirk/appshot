import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { exec, spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { templates } from '../../src/templates/registry.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Template Commands Integration', { timeout: 60000 }, () => {
  let testDir: string;
  const originalCwd = process.cwd();
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');

  // Helper function to run appshot commands
  const runAppshot = async (args: string) => {
    return execAsync(`node ${cliPath} ${args}`, { cwd: testDir });
  };

  // Helper to create test screenshots
  const createTestScreenshot = async (device: string, name = 'test.png') => {
    const dimensions = {
      iphone: { width: 1290, height: 2796 },
      ipad: { width: 2048, height: 2732 },
      mac: { width: 2880, height: 1800 },
      watch: { width: 368, height: 448 }
    };

    const dim = dimensions[device as keyof typeof dimensions] || dimensions.iphone;
    const screenshotPath = path.join(testDir, 'screenshots', device, name);

    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await sharp({
      create: {
        width: dim.width,
        height: dim.height,
        channels: 4,
        background: { r: 100, g: 150, b: 200, alpha: 1 }
      }
    }).png().toFile(screenshotPath);

    return screenshotPath;
  };

  beforeAll(async () => {
    // Create unique test directory
    testDir = path.join('/tmp', `appshot-template-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Initialize project for each test
    await runAppshot('init --force');
  });

  describe('Template Command', () => {
    it('should list all available templates', async () => {
      const { stdout } = await runAppshot('template --list');

      // Should show all templates
      expect(stdout).toContain('modern');
      expect(stdout).toContain('minimal');
      expect(stdout).toContain('bold');
      expect(stdout).toContain('elegant');
      expect(stdout).toContain('nerdy');
      expect(stdout).toContain('showcase');
      expect(stdout).toContain('playful');
      expect(stdout).toContain('corporate');

      // Should show categories
      expect(stdout).toContain('MODERN');
      expect(stdout).toContain('MINIMAL');
      expect(stdout).toContain('PROFESSIONAL');
    });

    it('should preview a template without applying', async () => {
      const { stdout } = await runAppshot('template --preview modern');

      expect(stdout).toContain('Modern Vibrant');
      expect(stdout).toContain('Eye-catching gradient');
      expect(stdout).toContain('Preview Only');

      // Config should not be modified
      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.gradient?.preset).toBeUndefined();
    });

    it('should apply a template to configuration', async () => {
      await runAppshot('template modern');

      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));

      // Should have modern template settings
      expect(config.gradient.colors).toEqual(['#667eea', '#764ba2', '#f093fb']);
      expect(config.caption.font).toBe('Poppins');
      expect(config.caption.fontsize).toBe(72);
    });

    it('should handle invalid template gracefully', async () => {
      try {
        await runAppshot('template invalid-template');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr || error.message).toContain('Template "invalid-template" not found');
      }
    });

    it('should apply each template successfully', async () => {
      for (const template of templates) {
        // Clean config for each template
        await runAppshot('init --force');

        const { stdout, stderr } = await runAppshot(`template ${template.id}`);

        if (stderr) {
          console.error(`Error applying template ${template.id}:`, stderr);
        }

        expect(stderr).toBeFalsy();
        expect(stdout).toContain('Applied');

        // Verify config was updated
        const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
        expect(config).toBeTruthy();

        // Template-specific checks
        if (template.config.gradient) {
          expect(config.gradient).toBeDefined();
        }
        if (template.config.caption) {
          expect(config.caption.font).toBeDefined();
        }
      }
    });

    it('should preserve device-specific overrides', async () => {
      // Set device-specific config
      const configPath = path.join(testDir, '.appshot/config.json');
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      config.devices.iphone.captionFont = 'CustomFont';
      config.devices.iphone.frameScale = 0.7;
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      // Apply template
      await runAppshot('template elegant');

      // Check that device overrides are preserved
      const newConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      expect(newConfig.devices.iphone.captionFont).toBe('CustomFont');
      expect(newConfig.devices.iphone.frameScale).toBe(0.7);
      expect(newConfig.caption.font).toBe('Playfair Display'); // From template
    });
  });

  describe('Preset Command', () => {
    beforeEach(async () => {
      // Create test screenshots for preset tests
      await createTestScreenshot('iphone');
      await createTestScreenshot('ipad');
    });

    it('should run preset in dry-run mode', async () => {
      const { stdout, stderr } = await runAppshot('preset modern --devices iphone --dry-run');

      expect(stderr).toBeFalsy();
      expect(stdout).toContain('Dry Run Mode');
      expect(stdout).toContain('Modern Vibrant');
      expect(stdout).toContain('Devices: iphone');

      // Should not create output files
      const finalExists = await fs.access(path.join(testDir, 'final'))
        .then(() => true)
        .catch(() => false);
      expect(finalExists).toBe(false);
    });

    it('should apply preset and build screenshots', async () => {
      // Add caption to test build
      const captionPath = path.join(testDir, '.appshot/captions/iphone.json');
      await fs.writeFile(captionPath, JSON.stringify({
        'test.png': 'Test Caption'
      }, null, 2));

      const { stdout, stderr } = await runAppshot('preset minimal --devices iphone --verbose');

      if (stderr) {
        console.error('Preset stderr:', stderr);
      }

      expect(stdout).toContain('Applying template: minimal');
      expect(stdout).toContain('Building screenshots');

      // Check output was created
      const outputFile = path.join(testDir, 'final/iphone/en/test.png');
      const outputExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(outputExists).toBe(true);

      if (outputExists) {
        // Verify it's a valid image with the right dimensions
        const meta = await sharp(outputFile).metadata();
        expect(meta.width).toBeGreaterThan(0);
        expect(meta.height).toBeGreaterThan(0);
      }
    });

    it('should handle multiple devices', async () => {
      await createTestScreenshot('ipad');

      // Add captions
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'test.png': 'iPhone Test' }, null, 2));
      await fs.writeFile(path.join(testDir, '.appshot/captions/ipad.json'),
        JSON.stringify({ 'test.png': 'iPad Test' }, null, 2));

      const { stdout } = await runAppshot('preset bold --devices iphone,ipad');

      expect(stdout).toContain('Bold Impact');

      // Check both device outputs
      const iphoneOutput = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      const ipadOutput = await fs.access(path.join(testDir, 'final/ipad/en/test.png'))
        .then(() => true).catch(() => false);

      expect(iphoneOutput).toBe(true);
      expect(ipadOutput).toBe(true);
    });

    it('should handle multiple languages', async () => {
      // Set up multi-language captions
      const captionPath = path.join(testDir, '.appshot/captions/iphone.json');
      await fs.writeFile(captionPath, JSON.stringify({
        'test.png': {
          en: 'English Caption',
          es: 'Spanish Caption',
          fr: 'French Caption'
        }
      }, null, 2));

      const { stdout } = await runAppshot('preset elegant --devices iphone --langs en,es,fr');

      // Check all language outputs
      const enOutput = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
        .then(() => true).catch(() => false);
      const esOutput = await fs.access(path.join(testDir, 'final/iphone/es/test.png'))
        .then(() => true).catch(() => false);
      const frOutput = await fs.access(path.join(testDir, 'final/iphone/fr/test.png'))
        .then(() => true).catch(() => false);

      expect(enOutput).toBe(true);
      expect(esOutput).toBe(true);
      expect(frOutput).toBe(true);
    });

    it('should add caption to all screenshots', async () => {
      const { stdout } = await runAppshot('preset modern --devices iphone --caption "Universal Caption"');

      // Check caption was added to config
      const captions = JSON.parse(
        await fs.readFile(path.join(testDir, '.appshot/captions/iphone.json'), 'utf-8')
      );

      expect(captions['test.png']).toBe('Universal Caption');
    });

    it('should handle invalid preset gracefully', async () => {
      try {
        await runAppshot('preset invalid-preset --devices iphone');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.stderr || error.message).toContain('Preset "invalid-preset" not found');
      }
    });

    it('should sanitize malicious device input', async () => {
      try {
        await runAppshot('preset modern --devices "iphone; rm -rf /" --dry-run');
        expect.fail('Command should have failed with invalid device');
      } catch (error: any) {
        const output = error.stderr || error.stdout || error.message;
        expect(output).toContain('No valid devices');
      }
      // System should still be intact (quick filesystem check)
      const systemOk = await fs.access('/tmp').then(() => true).catch(() => false);
      expect(systemOk).toBe(true);
    });

    it('should sanitize malicious language input', async () => {
      try {
        await runAppshot('preset modern --devices iphone --langs "en; echo hacked" --dry-run');
        expect.fail('Command should have failed with invalid language');
      } catch (error: any) {
        const output = error.stderr || error.stdout || error.message;
        expect(output).toContain('No valid language codes');
        expect(output).not.toContain('hacked');
      }
    });
  });

  describe('Quickstart Command', () => {
    it('should handle non-interactive force mode', async () => {
      const { stdout } = await runAppshot('quickstart --force --template modern --no-interactive');

      expect(stdout).toContain('modern');

      // Check that template was applied
      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.gradient.colors).toEqual(['#667eea', '#764ba2', '#f093fb']);
    });

    it.skip('should handle existing configuration prompt', async () => {
      // Quickstart should detect existing config and ask to overwrite
      const child = spawn('node', [cliPath, 'quickstart'], {
        cwd: testDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Wait for prompt and answer No
      await new Promise(resolve => setTimeout(resolve, 500));
      child.stdin.write('n\n');

      await new Promise((resolve, reject) => {
        child.on('exit', (code) => {
          if (code === 0) resolve(code);
          else reject(new Error(`Process exited with code ${code}`));
        });
      });

      expect(output).toContain('Configuration already exists');
      expect(output).toContain('cancelled');
    });

    it.skip('should complete full interactive flow', async () => {
      // Remove existing config for fresh start
      await fs.rm(path.join(testDir, '.appshot'), { recursive: true, force: true });

      const child = spawn('node', [cliPath, 'quickstart'], {
        cwd: testDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Answer prompts
      setTimeout(() => child.stdin.write('1\n'), 500);    // Choose first template
      setTimeout(() => child.stdin.write('iphone\n'), 1000); // Select device
      setTimeout(() => child.stdin.write('n\n'), 1500);    // No AI translation
      setTimeout(() => child.stdin.write('\n'), 2000);     // Finish

      await new Promise((resolve) => {
        child.on('exit', resolve);
        setTimeout(resolve, 3000); // Timeout fallback
      });

      // Check that config was created
      const configExists = await fs.access(path.join(testDir, '.appshot/config.json'))
        .then(() => true)
        .catch(() => false);
      expect(configExists).toBe(true);
    });

    it('should apply selected template', async () => {
      const { stdout } = await runAppshot('quickstart --force --template nerdy --no-interactive');

      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));

      // Should have nerdy template settings
      expect(config.caption.font).toBe('JetBrains Mono');
      expect(config.caption.position).toBe('overlay');
      expect(config.gradient.colors).toEqual(['#1e3c72', '#2a5298']);
    });

    it('should handle all valid template options', async () => {
      for (const template of templates) {
        // Fresh init for each template
        await fs.rm(path.join(testDir, '.appshot'), { recursive: true, force: true });

        const { stdout, stderr } = await runAppshot(`quickstart --force --template ${template.id} --no-interactive`);

        if (stderr) {
          console.error(`Error with template ${template.id}:`, stderr);
        }

        expect(stderr).toBeFalsy();

        const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
        expect(config).toBeTruthy();
      }
    });
  });

  describe('End-to-End Template Workflow', () => {
    it('should complete full workflow: quickstart → add screenshots → build', async () => {
      // Step 1: Quickstart with template
      await runAppshot('quickstart --force --template modern --no-interactive');

      // Step 2: Add test screenshots
      await createTestScreenshot('iphone', 'home.png');
      await createTestScreenshot('iphone', 'features.png');

      // Step 3: Add captions
      const captions = {
        'home.png': 'Welcome Home',
        'features.png': 'Amazing Features'
      };
      await fs.writeFile(
        path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify(captions, null, 2)
      );

      // Step 4: Build
      const { stdout, stderr } = await runAppshot('build --devices iphone');

      if (stderr) {
        console.error('Build error:', stderr);
      }

      // Verify outputs
      const homeExists = await fs.access(path.join(testDir, 'final/iphone/en/home.png'))
        .then(() => true).catch(() => false);
      const featuresExists = await fs.access(path.join(testDir, 'final/iphone/en/features.png'))
        .then(() => true).catch(() => false);

      expect(homeExists).toBe(true);
      expect(featuresExists).toBe(true);

      // Verify images have template styling
      if (homeExists) {
        const meta = await sharp(path.join(testDir, 'final/iphone/en/home.png')).metadata();
        expect(meta.width).toBeGreaterThan(1290); // Should have frame
        expect(meta.height).toBeGreaterThan(2796);
      }
    });

    it('should handle preset → validate workflow', async () => {
      await createTestScreenshot('iphone');

      // Apply preset and build
      await runAppshot('preset elegant --devices iphone --caption "Elegant App"');

      // Validate output
      const { stdout } = await runAppshot('validate');

      // Should pass validation or show helpful messages
      expect(stdout.toLowerCase()).toMatch(/valid|resolution|check/);
    });
  });
});
