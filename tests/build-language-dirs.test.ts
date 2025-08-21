import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

describe('Build Language Directory Structure', () => {
  let testDir: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Create a temp directory for testing
    testDir = path.join(process.cwd(), 'test-build-lang-dirs');
    await fs.mkdir(testDir, { recursive: true });
    
    // Change to test directory
    process.chdir(testDir);
    
    // Initialize project
    execSync('appshot init --force', { stdio: 'ignore' });
    
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Return to original directory
    process.chdir(path.dirname(testDir));
    
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
    
    // Restore environment
    process.env = originalEnv;
  });

  it('should create language subdirectory for single language build', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 100, g: 100, b: 100, alpha: 1 }
      }
    }).png().toBuffer();
    
    await fs.writeFile('screenshots/iphone/test.png', screenshotBuffer);
    
    // Set up simple string captions
    const captions = {
      'test.png': 'Welcome to our App'
    };
    
    await fs.writeFile(
      '.appshot/captions/iphone.json',
      JSON.stringify(captions, null, 2)
    );
    
    // Build with single language explicitly
    execSync('appshot build --devices iphone --langs en --no-frame', { stdio: 'ignore' });
    
    // Check that language subdirectory was created
    const enDirExists = await fs.access('final/iphone/en').then(() => true).catch(() => false);
    const enFileExists = await fs.access('final/iphone/en/test.png').then(() => true).catch(() => false);
    
    // Should NOT have file at root level
    const rootFileExists = await fs.access('final/iphone/test.png').then(() => true).catch(() => false);
    
    expect(enDirExists).toBe(true);
    expect(enFileExists).toBe(true);
    expect(rootFileExists).toBe(false);
  });

  it('should use system language when --langs not specified', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 50, g: 150, b: 50, alpha: 1 }
      }
    }).png().toBuffer();
    
    await fs.writeFile('screenshots/iphone/home.png', screenshotBuffer);
    
    // Simple captions
    const captions = {
      'home.png': 'Home Screen'
    };
    
    await fs.writeFile(
      '.appshot/captions/iphone.json',
      JSON.stringify(captions, null, 2)
    );
    
    // Set French locale
    process.env.LANG = 'fr_FR.UTF-8';
    
    // Build without specifying language
    execSync('appshot build --devices iphone --no-frame', { stdio: 'ignore' });
    
    // Should create fr/ directory based on system locale
    const frDirExists = await fs.access('final/iphone/fr').then(() => true).catch(() => false);
    const frFileExists = await fs.access('final/iphone/fr/home.png').then(() => true).catch(() => false);
    
    expect(frDirExists).toBe(true);
    expect(frFileExists).toBe(true);
  });

  it('should detect languages from caption objects', async () => {
    // Create test screenshots
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 200, g: 100, b: 50, alpha: 1 }
      }
    }).png().toBuffer();
    
    await fs.writeFile('screenshots/iphone/feature.png', screenshotBuffer);
    
    // Multi-language captions
    const captions = {
      'feature.png': {
        en: 'Amazing Feature',
        es: 'Función Increíble',
        fr: 'Fonctionnalité Incroyable'
      }
    };
    
    await fs.writeFile(
      '.appshot/captions/iphone.json',
      JSON.stringify(captions, null, 2)
    );
    
    // Build without specifying languages
    execSync('appshot build --devices iphone --no-frame', { stdio: 'ignore' });
    
    // Should create directories for all detected languages
    const enExists = await fs.access('final/iphone/en/feature.png').then(() => true).catch(() => false);
    const esExists = await fs.access('final/iphone/es/feature.png').then(() => true).catch(() => false);
    const frExists = await fs.access('final/iphone/fr/feature.png').then(() => true).catch(() => false);
    
    expect(enExists).toBe(true);
    expect(esExists).toBe(true);
    expect(frExists).toBe(true);
  });

  it('should use config defaultLanguage when set', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 100, g: 200, b: 100, alpha: 1 }
      }
    }).png().toBuffer();
    
    await fs.writeFile('screenshots/iphone/settings.png', screenshotBuffer);
    
    // Simple captions
    const captions = {
      'settings.png': 'Settings'
    };
    
    await fs.writeFile(
      '.appshot/captions/iphone.json',
      JSON.stringify(captions, null, 2)
    );
    
    // Load config and set defaultLanguage
    const config = JSON.parse(await fs.readFile('.appshot/config.json', 'utf8'));
    config.defaultLanguage = 'ja';
    await fs.writeFile('.appshot/config.json', JSON.stringify(config, null, 2));
    
    // Build without specifying language
    execSync('appshot build --devices iphone --no-frame', { stdio: 'ignore' });
    
    // Should use Japanese from config
    const jaDirExists = await fs.access('final/iphone/ja').then(() => true).catch(() => false);
    const jaFileExists = await fs.access('final/iphone/ja/settings.png').then(() => true).catch(() => false);
    
    expect(jaDirExists).toBe(true);
    expect(jaFileExists).toBe(true);
  });

  it('should maintain consistent structure for multi-device builds', async () => {
    // Create screenshots for multiple devices
    const iphoneBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    }).png().toBuffer();
    
    const ipadBuffer = await sharp({
      create: {
        width: 2048,
        height: 2732,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 }
      }
    }).png().toBuffer();
    
    await fs.writeFile('screenshots/iphone/app.png', iphoneBuffer);
    await fs.writeFile('screenshots/ipad/app.png', ipadBuffer);
    
    // Set up captions for both devices
    await fs.writeFile(
      '.appshot/captions/iphone.json',
      JSON.stringify({ 'app.png': 'iPhone App' }, null, 2)
    );
    
    await fs.writeFile(
      '.appshot/captions/ipad.json',
      JSON.stringify({ 'app.png': 'iPad App' }, null, 2)
    );
    
    // Build multiple devices with single language
    execSync('appshot build --devices iphone,ipad --langs en --no-frame', { stdio: 'ignore' });
    
    // Both should have language subdirectories
    const iphoneEnExists = await fs.access('final/iphone/en/app.png').then(() => true).catch(() => false);
    const ipadEnExists = await fs.access('final/ipad/en/app.png').then(() => true).catch(() => false);
    
    expect(iphoneEnExists).toBe(true);
    expect(ipadEnExists).toBe(true);
  });
});