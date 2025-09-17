import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  mapToFastlaneCode,
  mapLanguages,
  isValidFastlaneCode,
  getSupportedLanguages
} from '../src/services/fastlane-language-mapper.js';

let originalCwd: string;
let tempDir: string;

describe('fastlane-language-mapper', () => {
  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-lang-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('maps common language codes to Fastlane equivalents', () => {
    expect(mapToFastlaneCode('en')).toBe('en-US');
    expect(mapToFastlaneCode('en-US')).toBe('en-US');
    expect(mapToFastlaneCode('zh-cn')).toBe('zh-Hans');
    expect(mapToFastlaneCode('en-gb')).toBe('en-GB');
    expect(mapToFastlaneCode('unknown')).toBe('unknown');
  });

  it('returns mapped values in insertion order', async () => {
    const languages = ['en', 'es', 'fr'];
    const map = await mapLanguages(languages);
    expect(Array.from(map.entries())).toEqual([
      ['en', 'en-US'],
      ['es', 'es-ES'],
      ['fr', 'fr-FR']
    ]);
  });

  it('honors user-defined mappings from config file', async () => {
    await fs.mkdir(path.join(tempDir, '.appshot'), { recursive: true });
    const configPath = path.join(tempDir, '.appshot', 'export-config.json');
    await fs.writeFile(configPath, JSON.stringify({
      languageMappings: {
        en: 'en-GB',
        custom: 'x-custom'
      }
    }));

    const languages = ['en', 'custom', 'pt'];
    const map = await mapLanguages(languages);

    expect(Array.from(map.entries())).toEqual([
      ['en', 'en-GB'],
      ['custom', 'x-custom'],
      ['pt', 'pt-PT']
    ]);
  });

  it('validates against the Fastlane language set', () => {
    expect(isValidFastlaneCode('en-US')).toBe(true);
    expect(isValidFastlaneCode('es-MX')).toBe(true);
    expect(isValidFastlaneCode('xx-YY')).toBe(false);
  });

  it('exposes the supported language list', () => {
    const supported = getSupportedLanguages();
    expect(supported).toContain('en-US');
    expect(supported).toContain('es-ES');
    expect(supported).not.toContain('xx-YY');
    expect([...supported].sort()).toEqual(supported);
  });
});
