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

describe.skip('Performance Benchmarks - SLOW TESTS', { timeout: 120000 }, () => {
  let testDir: string;
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');

  // Helper to run commands and measure time
  const runWithTiming = async (args: string) => {
    const start = Date.now();
    const result = await execAsync(`node ${cliPath} ${args}`, { cwd: testDir });
    const duration = Date.now() - start;
    return { ...result, duration };
  };

  // Helper to create multiple test screenshots
  const createMultipleScreenshots = async (device: string, count: number) => {
    const dimensions = {
      iphone: { width: 1290, height: 2796 },
      ipad: { width: 2048, height: 2732 },
      mac: { width: 2880, height: 1800 },
      watch: { width: 368, height: 448 }
    };

    const dim = dimensions[device as keyof typeof dimensions] || dimensions.iphone;
    const screenshotDir = path.join(testDir, 'screenshots', device);
    await fs.mkdir(screenshotDir, { recursive: true });

    const promises = [];
    for (let i = 0; i < count; i++) {
      promises.push(
        sharp({
          create: {
            width: dim.width,
            height: dim.height,
            channels: 4,
            background: {
              r: Math.floor(Math.random() * 255),
              g: Math.floor(Math.random() * 255),
              b: Math.floor(Math.random() * 255),
              alpha: 1
            }
          }
        }).png().toFile(path.join(screenshotDir, `screen${i}.png`))
      );
    }

    await Promise.all(promises);
  };

  beforeAll(async () => {
    testDir = path.join('/tmp', `appshot-perf-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await runWithTiming('init --force');
  });

  describe('Template Application Performance', () => {
    it('should apply template within 3 seconds', async () => {
      const { duration } = await runWithTiming('template modern');

      expect(duration).toBeLessThan(3000);

      // Verify template was actually applied
      const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf-8'));
      expect(config.gradient.colors).toBeDefined();
    });

    it('should apply all templates quickly', async () => {
      const templates = ['modern', 'minimal', 'bold', 'elegant', 'nerdy', 'showcase', 'playful', 'corporate'];
      const times: number[] = [];

      for (const template of templates) {
        const { duration } = await runWithTiming(`template ${template}`);
        times.push(duration);
        expect(duration).toBeLessThan(3000); // Each template under 3s
      }

      // Average should be well under 2 seconds
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(2000);
    });
  });

  describe('Build Performance', () => {
    it('should build single screenshot quickly', async () => {
      await createMultipleScreenshots('iphone', 1);

      // Add caption
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify({ 'screen0.png': 'Test Caption' }, null, 2));

      const { duration } = await runWithTiming('build --devices iphone');

      // Single screenshot should build in under 5 seconds
      expect(duration).toBeLessThan(5000);

      // Verify output
      const outputExists = await fs.access(path.join(testDir, 'final/iphone/en/screen0.png'))
        .then(() => true).catch(() => false);
      expect(outputExists).toBe(true);
    });

    it.skip('should handle 10 screenshots efficiently', async () => {
      const screenshotCount = 10;
      await createMultipleScreenshots('iphone', screenshotCount);

      // Add captions for all
      const captions: Record<string, string> = {};
      for (let i = 0; i < screenshotCount; i++) {
        captions[`screen${i}.png`] = `Caption ${i}`;
      }
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify(captions, null, 2));

      const { duration } = await runWithTiming('build --devices iphone');

      // 10 screenshots should build in under 30 seconds (3s each)
      expect(duration).toBeLessThan(30000);

      // Verify all outputs
      for (let i = 0; i < screenshotCount; i++) {
        const outputExists = await fs.access(path.join(testDir, `final/iphone/en/screen${i}.png`))
          .then(() => true).catch(() => false);
        expect(outputExists).toBe(true);
      }
    });

    it('should handle multiple devices in parallel efficiently', async () => {
      await createMultipleScreenshots('iphone', 3);
      await createMultipleScreenshots('ipad', 3);

      // Add captions
      const iphoneCaptions: Record<string, string> = {};
      const ipadCaptions: Record<string, string> = {};
      for (let i = 0; i < 3; i++) {
        iphoneCaptions[`screen${i}.png`] = `iPhone ${i}`;
        ipadCaptions[`screen${i}.png`] = `iPad ${i}`;
      }

      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify(iphoneCaptions, null, 2));
      await fs.writeFile(path.join(testDir, '.appshot/captions/ipad.json'),
        JSON.stringify(ipadCaptions, null, 2));

      const { duration } = await runWithTiming('build --devices iphone,ipad');

      // Multiple devices should still be reasonably fast
      expect(duration).toBeLessThan(20000); // 20 seconds for 6 total screenshots

      // Verify outputs
      const iphoneOutputs = await fs.readdir(path.join(testDir, 'final/iphone/en'));
      const ipadOutputs = await fs.readdir(path.join(testDir, 'final/ipad/en'));

      expect(iphoneOutputs.length).toBe(3);
      expect(ipadOutputs.length).toBe(3);
    });

    it('should handle multi-language builds efficiently', async () => {
      await createMultipleScreenshots('iphone', 2);

      // Multi-language captions
      const captions = {
        'screen0.png': {
          en: 'English Caption',
          es: 'Spanish Caption',
          fr: 'French Caption',
          de: 'German Caption'
        },
        'screen1.png': {
          en: 'Second English',
          es: 'Second Spanish',
          fr: 'Second French',
          de: 'Second German'
        }
      };

      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify(captions, null, 2));

      const { duration } = await runWithTiming('build --devices iphone --langs en,es,fr,de');

      // 2 screenshots × 4 languages = 8 outputs, should be under 15 seconds
      expect(duration).toBeLessThan(15000);

      // Verify all language outputs
      const languages = ['en', 'es', 'fr', 'de'];
      for (const lang of languages) {
        const outputs = await fs.readdir(path.join(testDir, `final/iphone/${lang}`));
        expect(outputs.length).toBe(2);
      }
    });
  });

  describe('Preset Command Performance', () => {
    it('should complete preset with build quickly', async () => {
      await createMultipleScreenshots('iphone', 3);

      // Add captions
      const captions: Record<string, string> = {};
      for (let i = 0; i < 3; i++) {
        captions[`screen${i}.png`] = `Screen ${i}`;
      }
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify(captions, null, 2));

      const { duration } = await runWithTiming('preset modern --devices iphone');

      // Preset (template + build) should complete reasonably fast
      expect(duration).toBeLessThan(15000); // 15 seconds for template + 3 screenshots

      // Verify outputs
      const outputs = await fs.readdir(path.join(testDir, 'final/iphone/en'));
      expect(outputs.length).toBe(3);
    });

    it('should handle dry-run instantly', async () => {
      const { duration } = await runWithTiming('preset modern --devices iphone --dry-run');

      // Dry run should be nearly instant
      expect(duration).toBeLessThan(1000);
    });

    it.skip('should handle all devices preset efficiently', async () => {
      // Create screenshots for all devices
      await createMultipleScreenshots('iphone', 2);
      await createMultipleScreenshots('ipad', 2);
      await createMultipleScreenshots('watch', 2);

      // Add captions for all
      const devices = ['iphone', 'ipad', 'watch'];
      for (const device of devices) {
        const captions: Record<string, string> = {};
        for (let i = 0; i < 2; i++) {
          captions[`screen${i}.png`] = `${device} ${i}`;
        }
        await fs.writeFile(path.join(testDir, `.appshot/captions/${device}.json`),
          JSON.stringify(captions, null, 2));
      }

      const { duration } = await runWithTiming('preset elegant --devices iphone,ipad,watch');

      // 6 total screenshots across 3 devices
      expect(duration).toBeLessThan(25000); // 25 seconds total

      // Verify all outputs
      for (const device of devices) {
        const outputs = await fs.readdir(path.join(testDir, `final/${device}/en`));
        expect(outputs.length).toBe(2);
      }
    });
  });

  describe('Large-scale Operations', () => {
    it.skip('should handle 20+ screenshots without crashing', async () => {
      const count = 20;
      await createMultipleScreenshots('iphone', count);

      // Add captions
      const captions: Record<string, string> = {};
      for (let i = 0; i < count; i++) {
        captions[`screen${i}.png`] = `Caption ${i}`;
      }
      await fs.writeFile(path.join(testDir, '.appshot/captions/iphone.json'),
        JSON.stringify(captions, null, 2));

      // This test has longer timeout
      const { duration, stderr } = await runWithTiming('build --devices iphone');

      // Should complete without errors
      expect(stderr || '').toBe('');

      // 20 screenshots might take time but should be under 60 seconds
      expect(duration).toBeLessThan(60000);

      // Verify at least some outputs were created
      const outputs = await fs.readdir(path.join(testDir, 'final/iphone/en'));
      expect(outputs.length).toBeGreaterThan(0);
    });
  });

  describe('Initialization Performance', () => {
    it('should initialize project quickly', async () => {
      // Remove existing .appshot
      await fs.rm(path.join(testDir, '.appshot'), { recursive: true, force: true });

      const { duration } = await runWithTiming('init --force');

      // Init should be very fast
      expect(duration).toBeLessThan(2000);

      // Verify initialization
      const configExists = await fs.access(path.join(testDir, '.appshot/config.json'))
        .then(() => true).catch(() => false);
      expect(configExists).toBe(true);
    });

    it('should run quickstart quickly', async () => {
      const { duration } = await runWithTiming('quickstart --force --template modern');

      // Quickstart should be fast
      expect(duration).toBeLessThan(3000);
    });
  });
});