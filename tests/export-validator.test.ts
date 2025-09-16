import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import {
  validateExport,
  validateOutputDirectory,
  isSafeToClean
} from '../src/services/export-validator.js';

describe('export-validator', () => {
  let tempDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-validator-'));
    sourceDir = path.join(tempDir, 'final');
    await fs.mkdir(sourceDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeScreenshot(device: string, language: string, filename: string) {
    const targetDir = path.join(sourceDir, device, language);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, filename), 'fake image');
  }

  it('collects stats for detected screenshots', async () => {
    await writeScreenshot('iphone', 'en', 'home.png');

    const languageMap = new Map([[ 'en', 'en-US' ]]);
    const result = await validateExport(sourceDir, languageMap);

    expect(result.valid).toBe(true);
    expect(result.stats?.totalScreenshots).toBe(1);
    expect(result.stats?.deviceCounts.iphone).toBe(1);
    expect(result.stats?.languageCounts.en).toBe(1);
    expect(result.warnings).toContain(
      'Consider using `appshot build --preset iphone-6-9,ipad-13` for required App Store resolutions.'
    );
  });

  it('fails when requested devices have no screenshots', async () => {
    const languageMap = new Map([[ 'en', 'en-US' ]]);
    const result = await validateExport(sourceDir, languageMap, ['watch']);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('No screenshots found for requested devices: watch');
    expect(result.warnings).toContain('No watch directory found - requested device will be skipped');
  });

  it('warns when requested device folder exists but is empty', async () => {
    const watchDir = path.join(sourceDir, 'watch', 'en');
    await fs.mkdir(watchDir, { recursive: true });

    const languageMap = new Map([[ 'en', 'en-US' ]]);
    const result = await validateExport(sourceDir, languageMap, ['watch']);

    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('No screenshots found for requested device: watch');
  });

  it('emits warning for unmapped Fastlane code', async () => {
    await writeScreenshot('iphone', 'custom', 'custom.png');
    const languageMap = new Map([[ 'custom', 'xx-YY' ]]);
    const result = await validateExport(sourceDir, languageMap);

    expect(result.warnings.some(w => w.includes('xx-YY'))).toBe(true);
  });

  describe('validateOutputDirectory', () => {
    it('passes when parent directory is writable', async () => {
      const outputPath = path.join(tempDir, 'fastlane', 'screenshots');
      const result = await validateOutputDirectory(outputPath);
      expect(result.valid).toBe(true);
    });

    it('fails when nearest parent is not writable', async () => {
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true, mode: 0o555 });

      // Remove write permission for the current user
      await fs.chmod(readOnlyDir, 0o555);

      try {
        const outputPath = path.join(readOnlyDir, 'screenshots');
        const result = await validateOutputDirectory(outputPath);

        expect(result.valid).toBe(false);
        expect(result.issues).toContain(`Cannot write to directory: ${readOnlyDir}`);
      } finally {
        await fs.chmod(readOnlyDir, 0o755).catch(() => {});
      }
    });
  });

  describe('isSafeToClean', () => {
    it('rejects system directories and shallow paths', () => {
      expect(isSafeToClean('/')).toBe(false);
      expect(isSafeToClean(path.resolve('.'))).toBe(false);
    });

    it('accepts project subdirectories', () => {
      const safePath = path.join(process.cwd(), 'tmp', 'screenshots');
      expect(isSafeToClean(safePath)).toBe(true);
    });
  });
});
