import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';
import os from 'os';

describe('Build Language Directory Structure', () => {
  let testDir: string;
  let originalCwd: string;
  const originalEnv = process.env;

  beforeEach(async () => {
    // Create a temp directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-build-lang-dirs-'));
    originalCwd = process.cwd();

    // Mock process.cwd to return our temp directory
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);

    // Initialize project using the built CLI directly
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} init --force`, { stdio: 'ignore', cwd: testDir });

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    // Restore mocks
    vi.restoreAllMocks();

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

    await fs.writeFile(path.join(testDir, 'screenshots/iphone/test.png'), screenshotBuffer);

    // Set up captions for a single language (default 'en')
    const captions = {
      'test.png': 'Welcome to our App'
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Build
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --no-frame`, { stdio: 'ignore', cwd: testDir });

    // Check that output was created in en/ subdirectory
    const enDirExists = await fs.access(path.join(testDir, 'final/iphone/en'))
      .then(() => true)
      .catch(() => false);
    const enFileExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
      .then(() => true)
      .catch(() => false);

    expect(enDirExists).toBe(true);
    expect(enFileExists).toBe(true);
  });

  it('should create multiple language subdirectories for multi-language build', async () => {
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
        fr: 'Bienvenue dans notre App'
      }
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Build with multiple languages
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --langs en,es,fr --no-frame`, { stdio: 'ignore', cwd: testDir });

    // Check that all language directories were created
    const enExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
      .then(() => true)
      .catch(() => false);
    const esExists = await fs.access(path.join(testDir, 'final/iphone/es/test.png'))
      .then(() => true)
      .catch(() => false);
    const frExists = await fs.access(path.join(testDir, 'final/iphone/fr/test.png'))
      .then(() => true)
      .catch(() => false);

    expect(enExists).toBe(true);
    expect(esExists).toBe(true);
    expect(frExists).toBe(true);
  });

  it('should use default language when no language is specified', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 150, g: 150, b: 150, alpha: 1 }
      }
    }).png().toBuffer();

    await fs.writeFile(path.join(testDir, 'screenshots/iphone/test.png'), screenshotBuffer);

    // Set up captions without language (implies default 'en')
    const captions = {
      'test.png': 'Default language caption'
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Build without specifying language
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --no-frame`, { stdio: 'ignore', cwd: testDir });

    // Should create en/ directory by default
    const enFileExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
      .then(() => true)
      .catch(() => false);

    expect(enFileExists).toBe(true);
  });

  it('should handle missing translations by falling back to default', async () => {
    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 50, g: 150, b: 50, alpha: 1 }
      }
    }).png().toBuffer();

    await fs.writeFile(path.join(testDir, 'screenshots/iphone/test.png'), screenshotBuffer);

    // Set up captions with incomplete translations
    const captions = {
      'test.png': {
        en: 'English caption',
        es: 'Spanish caption'
        // Missing 'fr'
      }
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Build with all three languages (fr will fall back to en)
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --langs en,es,fr --no-frame`, { stdio: 'ignore', cwd: testDir });

    // All three directories should exist
    const enExists = await fs.access(path.join(testDir, 'final/iphone/en/test.png'))
      .then(() => true)
      .catch(() => false);
    const esExists = await fs.access(path.join(testDir, 'final/iphone/es/test.png'))
      .then(() => true)
      .catch(() => false);
    const frExists = await fs.access(path.join(testDir, 'final/iphone/fr/test.png'))
      .then(() => true)
      .catch(() => false);

    expect(enExists).toBe(true);
    expect(esExists).toBe(true);
    expect(frExists).toBe(true); // Should exist with English caption as fallback
  });

  it('should respect APPSHOT_LANG environment variable', async () => {
    // Set environment variable
    process.env.APPSHOT_LANG = 'de';

    // Create a test screenshot
    const screenshotBuffer = await sharp({
      create: {
        width: 1242,
        height: 2208,
        channels: 4,
        background: { r: 100, g: 50, b: 150, alpha: 1 }
      }
    }).png().toBuffer();

    await fs.writeFile(path.join(testDir, 'screenshots/iphone/test.png'), screenshotBuffer);

    // Set up caption for German
    const captions = {
      'test.png': {
        en: 'English caption',
        de: 'Deutsche Beschriftung'
      }
    };

    await fs.writeFile(
      path.join(testDir, '.appshot/captions/iphone.json'),
      JSON.stringify(captions, null, 2)
    );

    // Build without specifying language (should use APPSHOT_LANG)
    const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
    execSync(`node ${cliPath} build --no-frame`, {
      stdio: 'ignore',
      cwd: testDir,
      env: { ...process.env, APPSHOT_LANG: 'de' }
    });

    // Should create de/ directory from environment variable
    const deFileExists = await fs.access(path.join(testDir, 'final/iphone/de/test.png'))
      .then(() => true)
      .catch(() => false);

    expect(deFileExists).toBe(true);
  });
});