import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

import {
  organizeScreenshots,
  type OrganizeOptions
} from '../src/services/screenshot-organizer.js';

let tempDir: string;
let sourceDir: string;
let outputDir: string;

async function createScreenshot(
  device: string,
  language: string,
  filename: string,
  size: { width: number; height: number }
) {
  const deviceDir = path.join(sourceDir, device, language);
  await fs.mkdir(deviceDir, { recursive: true });

  await sharp({
    create: {
      width: size.width,
      height: size.height,
      channels: 4,
      background: { r: 100, g: 150, b: 200, alpha: 1 }
    }
  })
    .png()
    .toFile(path.join(deviceDir, filename));
}

describe('screenshot-organizer', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-organizer-'));
    sourceDir = path.join(tempDir, 'final');
    outputDir = path.join(tempDir, 'fastlane', 'screenshots');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('creates symlinks by default and counts processed files', async () => {
    await createScreenshot('iphone', 'en', 'home.png', { width: 1290, height: 2796 });

    const options: OrganizeOptions = {
      source: sourceDir,
      output: outputDir,
      languageMap: new Map([[ 'en', 'en-US' ]]),
      dryRun: false
    };

    const result = await organizeScreenshots(options);

    expect(result.processed).toBe(1);
    expect(result.byLanguage['en-US']).toBe(1);
    expect(result.byDevice.iphone).toBe(1);

    const exported = path.join(outputDir, 'en-US', 'iphone', 'home.png');
    const stat = await fs.lstat(exported);
    expect(stat.isSymbolicLink()).toBe(true);

    const target = await fs.readlink(exported);
    expect(path.resolve(path.dirname(exported), target)).toBe(
      path.join(sourceDir, 'iphone', 'en', 'home.png')
    );
  });

  it('copies files when copy mode and flatten are enabled', async () => {
    await createScreenshot('mac', 'en', 'desktop.png', { width: 2880, height: 1800 });

    const options: OrganizeOptions = {
      source: sourceDir,
      output: outputDir,
      languageMap: new Map([[ 'en', 'en-US' ]]),
      flatten: true,
      copy: true
    };

    const result = await organizeScreenshots(options);

    expect(result.processed).toBe(1);
    const exported = path.join(outputDir, 'en-US', 'desktop.png');
    const stat = await fs.lstat(exported);
    expect(stat.isFile()).toBe(true);
  });

  it('applies device prefixes and iPad Pro renaming', async () => {
    await createScreenshot('ipad', 'en', 'scene.png', { width: 2048, height: 2732 });

    const options: OrganizeOptions = {
      source: sourceDir,
      output: outputDir,
      languageMap: new Map([[ 'en', 'en-US' ]]),
      prefixDevice: true
    };

    await organizeScreenshots(options);

    const exportedDir = path.join(outputDir, 'en-US', 'ipad');
    const files = await fs.readdir(exportedDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^IPAD_PRO_3GEN_129_/);
  });

  it('returns dry-run actions without touching filesystem', async () => {
    await createScreenshot('watch', 'en', 'watch.png', { width: 368, height: 448 });

    const options: OrganizeOptions = {
      source: sourceDir,
      output: outputDir,
      languageMap: new Map([[ 'en', 'en-US' ]]),
      dryRun: true
    };

    const result = await organizeScreenshots(options);

    expect(result.actions).toBeDefined();
    expect(result.actions).toHaveLength(1);
    expect(result.actions?.[0].device).toBe('watch');
    expect(result.processed).toBe(0);

    await expect(fs.access(outputDir)).rejects.toThrow();
  });

  it('honors device filters', async () => {
    await createScreenshot('iphone', 'en', 'home.png', { width: 1290, height: 2796 });
    await createScreenshot('watch', 'en', 'watch.png', { width: 368, height: 448 });

    const options: OrganizeOptions = {
      source: sourceDir,
      output: outputDir,
      languageMap: new Map([[ 'en', 'en-US' ]]),
      devices: ['watch'],
      copy: true
    };

    const result = await organizeScreenshots(options);

    expect(result.byDevice.watch).toBe(1);
    expect(result.byDevice.iphone).toBe(0);

    const watchExport = path.join(outputDir, 'en-US', 'watch', 'watch.png');
    const iphoneDir = path.join(outputDir, 'en-US', 'iphone');

    await expect(fs.lstat(watchExport)).resolves.toBeDefined();
    await expect(fs.access(iphoneDir)).rejects.toThrow();
  });
});
