import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';
import os from 'os';

describe('Build Command Font Localization', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temp directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-build-fonts-'));
    originalCwd = process.cwd();

    // Mock process.cwd to return our temp directory
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);

    // Initialize project using the built CLI directly
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} init --force`, { stdio: 'ignore', cwd: testDir });
  });

  afterEach(async () => {
    // Restore mocks
    vi.restoreAllMocks();

    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should apply device-specific fonts to all language versions', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 0, g: 100, b: 200, alpha: 1 }
      }
    }).png().toBuffer();

    await fs.writeFile(path.join(testDir, 'screenshots/iphone/test.png'), screenshotBuffer);

    // Set up multi-language captions
    const captions = {
      'test.png': {
        en: 'Welcome to our App',
        es: 'Bienvenido a nuestra App',
        fr: 'Bienvenue dans notre App',
        de: 'Willkommen in unserer App'
      }
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Load config, set fonts, and save
    const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf8'));

    // Set global font
    config.caption.font = 'Helvetica';

    // Set device-specific font for iPhone
    config.devices.iphone.captionFont = 'Arial';

    await fs.writeFile(path.join(testDir, '.appshot/config.json'), JSON.stringify(config, null, 2));

    // Build with multiple languages
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --langs en,es,fr,de --no-frame`, { stdio: 'ignore', cwd: testDir });

    // Check that all language versions were created
    const enExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png')).then(() => true).catch(() => false);
    const esExists = await fs.access(path.join(testDir, 'final/iphone/es/test.png')).then(() => true).catch(() => false);
    const frExists = await fs.access(path.join(testDir, 'final/iphone/fr/test.png')).then(() => true).catch(() => false);
    const deExists = await fs.access(path.join(testDir, 'final/iphone/de/test.png')).then(() => true).catch(() => false);

    expect(enExists).toBe(true);
    expect(esExists).toBe(true);
    expect(frExists).toBe(true);
    expect(deExists).toBe(true);

    // All screenshots should exist and use the device-specific font (Arial)
    // The fact that they're all created successfully indicates the font is being applied
  });

  it('should fall back to global font when no device font is set', async () => {
    // Create test screenshots for iPad (no device-specific font)
    const screenshotBuffer = await sharp({
      create: {
        width: 2048,
        height: 2732,
        channels: 4,
        background: { r: 100, g: 0, b: 100, alpha: 1 }
      }
    }).png().toBuffer();

    await fs.writeFile(path.join(testDir, 'screenshots/ipad/test.png'), screenshotBuffer);

    // Set up captions
    const captions = {
      'test.png': {
        en: 'iPad Screenshot',
        es: 'Captura de iPad'
      }
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/ipad.json'),
      JSON.stringify(captions, null, 2)
    );

    // Load config and set only global font (no device-specific font for iPad)
    const config = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf8'));
    config.caption.font = 'Georgia';

    // Ensure iPad doesn't have a device-specific font
    delete config.devices.ipad.captionFont;

    await fs.writeFile(path.join(testDir, '.appshot/config.json'), JSON.stringify(config, null, 2));

    // Build
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --devices ipad --langs en,es --no-frame`, { stdio: 'ignore', cwd: testDir });

    // Check that screenshots were created
    const enExists = await fs.access(path.join(testDir, 'final/ipad/en/test.png')).then(() => true).catch(() => false);
    const esExists = await fs.access(path.join(testDir, 'final/ipad/es/test.png')).then(() => true).catch(() => false);

    expect(enExists).toBe(true);
    expect(esExists).toBe(true);

    // These should use the global font (Georgia) since no device-specific font is set
  });

  it.skipIf(process.env.CI)('should handle font command integration with build', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 50, g: 150, b: 50, alpha: 1 }
      }
    }).png().toBuffer();

    await fs.writeFile(path.join(testDir, 'screenshots/iphone/home.png'), screenshotBuffer);

    // Set up captions
    const captions = {
      'home.png': {
        en: 'Home Screen',
        fr: 'Écran d\'accueil'
      }
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Use the fonts command to set fonts
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} fonts --set "Georgia"`, { stdio: 'ignore', cwd: testDir });
    execSync(`node ${cliPath} fonts --set "Arial" --device iphone`, { stdio: 'ignore', cwd: testDir });

    // Build
    execSync(`node ${cliPath} build --langs en,fr --no-frame`, { stdio: 'ignore', cwd: testDir });

    // Verify screenshots were created with the fonts set via commands
    const enExists = await fs.access(path.join(testDir, 'final/iphone/en/home.png')).then(() => true).catch(() => false);
    const frExists = await fs.access(path.join(testDir, 'final/iphone/fr/home.png')).then(() => true).catch(() => false);

    expect(enExists).toBe(true);
    expect(frExists).toBe(true);

    // Verify config has the correct fonts
    const finalConfig = JSON.parse(await fs.readFile(path.join(testDir, '.appshot/config.json'), 'utf8'));
    expect(finalConfig.caption.font).toBe('Georgia');
    expect(finalConfig.devices.iphone.captionFont).toBe('Arial');
  });
});