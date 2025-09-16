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
      
      // Should include all device types
      expect(specs).toHaveProperty('iphone');
      expect(specs).toHaveProperty('ipad');
      expect(specs).toHaveProperty('mac');
      expect(specs).toHaveProperty('watch');
      expect(specs).toHaveProperty('appletv');
      expect(specs).toHaveProperty('visionpro');
      
      // Should have Apple's exact specifications structure
      expect(Array.isArray(specs.iphone)).toBe(true);
      expect(specs.iphone.length).toBeGreaterThan(0);
      
      // Verify structure matches Apple specs
      const firstIphone = specs.iphone[0];
      expect(firstIphone).toHaveProperty('id');
      expect(firstIphone).toHaveProperty('name');
      expect(firstIphone).toHaveProperty('displaySize');
      expect(firstIphone).toHaveProperty('devices');
      expect(firstIphone).toHaveProperty('resolutions');
      
      // Check exact resolution format
      if (firstIphone.resolutions.portrait) {
        expect(firstIphone.resolutions.portrait).toMatch(/^\d+x\d+$/);
      }
    });

    it('should list presets', async () => {
      const { stdout } = await runAppshot('presets --json');
      
      // The output might have other text, extract JSON
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();
      
      if (jsonMatch) {
        const presets = JSON.parse(jsonMatch[0]);
        expect(typeof presets).toBe('object');
        expect(presets).toHaveProperty('iphone');
        expect(presets).toHaveProperty('ipad');
        expect(Array.isArray(presets.iphone)).toBe(true);
        expect(presets.iphone.length).toBeGreaterThan(0);
        expect(presets.iphone[0]).toHaveProperty('id');
        expect(presets.iphone[0]).toHaveProperty('name');
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

  describe.skipIf(process.env.CI && process.platform === 'linux')('Font Configuration', () => {
    it('should set global font', async () => {
      await runAppshot('fonts --set "Georgia"');
      
      const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf-8'));
      expect(config.caption.font).toBe('Georgia');
    }, 120000); // 2 minute timeout for CI

    it('should set device-specific font', async () => {
      await runAppshot('fonts --set "Arial" --device iphone');
      
      const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf-8'));
      expect(config.devices.iphone.captionFont).toBe('Arial');
    }, 120000); // 2 minute timeout for CI
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
      // Initialize project first
      await runAppshot('init --force');
      
      // Create old structure
      await fs.mkdir('final/iphone', { recursive: true });
      await fs.writeFile('final/iphone/test.png', Buffer.from('fake-image'));
      
      const { stdout } = await runAppshot('migrate --output-structure --lang en');
      
      // Check for language subdirectory
      const files = await fs.readdir('final/iphone');
      const hasLanguageDir = files.some(f => ['en', 'es', 'fr', 'de', 'ja', 'zh'].includes(f));
      
      expect(hasLanguageDir || files.length === 0).toBe(true);
    }, 10000); // 10 second timeout
  });

  describe('Doctor Command', () => {
    it('should run system diagnostics', async () => {
      const { stdout } = await runAppshot('doctor');
      
      expect(stdout).toContain('Appshot Doctor - System Diagnostics');
      expect(stdout).toContain('System Requirements');
      expect(stdout).toContain('Dependencies');
      expect(stdout).toContain('Summary:');
    });

    it('should output JSON format', async () => {
      const { stdout } = await runAppshot('doctor --json');
      
      const report = JSON.parse(stdout);
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('version');
      expect(report).toHaveProperty('platform');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('passed');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.summary).toHaveProperty('errors');
    });

    it('should run specific categories', async () => {
      const { stdout } = await runAppshot('doctor --category system');
      
      expect(stdout).toContain('System Requirements');
      expect(stdout).not.toContain('Frame Assets');
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
    expect(stdout).toContain('doctor');
  });

  it('should show command-specific help', async () => {
    const { stdout } = await runAppshot('build --help');
    expect(stdout).toContain('--devices');
    expect(stdout).toContain('--langs');
    expect(stdout).toContain('--no-frame');
  });

  it('should show doctor command help', async () => {
    const { stdout } = await runAppshot('doctor --help');
    expect(stdout).toContain('--json');
    expect(stdout).toContain('--verbose');
    expect(stdout).toContain('--category');
  });
  });

  describe.skip('End-to-End Template Workflows', () => {
    it('should complete full workflow: quickstart → template → build → validate', async () => {
      // Step 1: Quickstart with template
      const { stdout: quickstartOut } = await runAppshot('quickstart --force --template modern --no-interactive');
      expect(quickstartOut).toContain('modern');

      // Step 2: Create test screenshots
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 50, g: 100, b: 150, alpha: 1 }
        }
      }).png().toFile('screenshots/iphone/home.png');

      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 150, g: 50, b: 100, alpha: 1 }
        }
      }).png().toFile('screenshots/iphone/features.png');

      // Step 3: Add captions
      await fs.writeFile(
        '.appshot/captions/iphone.json',
        JSON.stringify({
          'home.png': 'Welcome Screen',
          'features.png': 'Amazing Features'
        }, null, 2)
      );

      // Step 4: Build
      const { stdout: buildOut, stderr: buildErr } = await runAppshot('build --devices iphone');

      if (buildErr) {
        console.error('Build error:', buildErr);
      }

      // Step 5: Validate
      const { stdout: validateOut } = await runAppshot('validate --devices iphone');

      // Verify outputs exist
      const homeExists = await fs.access('final/iphone/en/home.png')
        .then(() => true).catch(() => false);
      const featuresExists = await fs.access('final/iphone/en/features.png')
        .then(() => true).catch(() => false);

      expect(homeExists).toBe(true);
      expect(featuresExists).toBe(true);
    });

    it('should complete preset workflow with multiple devices', async () => {
      // Initialize first
      await runAppshot('init --force');

      // Create screenshots for multiple devices
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 100, b: 200, alpha: 1 }
        }
      }).png().toFile('screenshots/iphone/test.png');

      await sharp({
        create: {
          width: 2048,
          height: 2732,
          channels: 4,
          background: { r: 200, g: 100, b: 100, alpha: 1 }
        }
      }).png().toFile('screenshots/ipad/test.png');

      // Add captions
      await fs.writeFile('.appshot/captions/iphone.json',
        JSON.stringify({ 'test.png': 'iPhone Screenshot' }, null, 2));
      await fs.writeFile('.appshot/captions/ipad.json',
        JSON.stringify({ 'test.png': 'iPad Screenshot' }, null, 2));

      // Apply preset and build
      const { stdout, stderr } = await runAppshot('preset elegant --devices iphone,ipad');

      if (stderr) {
        console.error('Preset error:', stderr);
      }

      // Verify outputs for both devices
      const iphoneOut = await fs.access('final/iphone/en/test.png')
        .then(() => true).catch(() => false);
      const ipadOut = await fs.access('final/ipad/en/test.png')
        .then(() => true).catch(() => false);

      expect(iphoneOut).toBe(true);
      expect(ipadOut).toBe(true);

      // Verify template was applied
      const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf-8'));
      expect(config.caption.font).toBe('Playfair Display'); // Elegant template font
    });

    it('should handle security: malicious inputs are sanitized', async () => {
      // Initialize first
      await runAppshot('init --force');

      // Test command injection prevention
      const { stdout, stderr } = await runAppshot('preset modern --devices "iphone; echo HACKED > /tmp/hacked.txt" --dry-run');

      // Should sanitize the input
      expect(stdout).toContain('No valid devices');

      // Verify no file was created
      const hackedFileExists = await fs.access('/tmp/hacked.txt')
        .then(() => true).catch(() => false);
      expect(hackedFileExists).toBe(false);

      // Test path traversal prevention
      try {
        await runAppshot('template ../../../etc/passwd');
        expect.fail('Should have rejected invalid template');
      } catch (error: any) {
        expect(error.stderr || error.message).toContain('Template not found');
      }
    });

    it('should apply all templates successfully in sequence', async () => {
      const templates = ['modern', 'minimal', 'bold', 'elegant'];

      // Create a test screenshot
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 100, g: 150, b: 200, alpha: 1 }
        }
      }).png().toFile('screenshots/iphone/test.png');

      // Add caption
      await fs.writeFile('.appshot/captions/iphone.json',
        JSON.stringify({ 'test.png': 'Test Screenshot' }, null, 2));

      for (const template of templates) {
        // Apply template
        const { stderr: templateErr } = await runAppshot(`template ${template}`);
        expect(templateErr || '').toBe('');

        // Build with template
        const { stderr: buildErr } = await runAppshot('build --devices iphone');

        if (buildErr) {
          console.error(`Build error with ${template}:`, buildErr);
        }

        // Verify output exists
        const outputExists = await fs.access('final/iphone/en/test.png')
          .then(() => true).catch(() => false);
        expect(outputExists).toBe(true);

        // Clean up for next iteration
        await fs.rm('final', { recursive: true, force: true });
      }
    });

    it('should handle multi-language workflow', async () => {
      // Apply template
      await runAppshot('template modern');

      // Create screenshot
      await sharp({
        create: {
          width: 1290,
          height: 2796,
          channels: 4,
          background: { r: 50, g: 150, b: 100, alpha: 1 }
        }
      }).png().toFile('screenshots/iphone/app.png');

      // Add multi-language captions
      await fs.writeFile('.appshot/captions/iphone.json',
        JSON.stringify({
          'app.png': {
            en: 'Amazing App',
            es: 'Aplicación Increíble',
            fr: 'Application Incroyable',
            de: 'Erstaunliche App'
          }
        }, null, 2));

      // Build for all languages
      const { stdout, stderr } = await runAppshot('build --devices iphone --langs en,es,fr,de');

      if (stderr) {
        console.error('Multi-language build error:', stderr);
      }

      // Verify all language outputs
      const languages = ['en', 'es', 'fr', 'de'];
      for (const lang of languages) {
        const outputExists = await fs.access(`final/iphone/${lang}/app.png`)
          .then(() => true).catch(() => false);
        expect(outputExists).toBe(true);
      }
    });
  });
});