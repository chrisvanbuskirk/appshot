import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, loadCaptions, fileExists } from '../src/core/files.js';

describe('files', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-test-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Add delay for Windows file system
    if (process.platform === 'win32') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  });

  describe('loadConfig', () => {
    it('should load valid appshot.json', async () => {
      const config = {
        output: './final',
        frames: './frames',
        gradient: { colors: ['#000', '#fff'], direction: 'top-bottom' },
        caption: { font: 'Arial', fontsize: 48, color: '#000', align: 'center', paddingTop: 50 },
        devices: {
          iphone: { input: './screenshots/iphone', resolution: '1284x2778' }
        }
      };
      
      await fs.writeFile('appshot.json', JSON.stringify(config));
      const loaded = await loadConfig();
      
      expect(loaded).toEqual(config);
    });

    it('should throw error when appshot.json not found', async () => {
      await expect(loadConfig()).rejects.toThrow('appshot.json not found');
    });

    it('should throw error for invalid JSON', async () => {
      await fs.writeFile('appshot.json', 'invalid json');
      await expect(loadConfig()).rejects.toThrow('Failed to load appshot.json');
    });
  });

  describe('loadCaptions', () => {
    it('should load valid captions.json', async () => {
      const captions = {
        'screenshot1.png': { en: 'Hello', fr: 'Bonjour' },
        'screenshot2.png': 'Simple text'
      };
      
      const captionsPath = path.join(tempDir, 'captions.json');
      await fs.writeFile(captionsPath, JSON.stringify(captions));
      
      const loaded = await loadCaptions(captionsPath);
      expect(loaded).toEqual(captions);
    });

    it('should return empty object when file not found', async () => {
      const loaded = await loadCaptions('nonexistent.json');
      expect(loaded).toEqual({});
    });

    it('should return empty object for invalid JSON', async () => {
      const captionsPath = path.join(tempDir, 'captions.json');
      await fs.writeFile(captionsPath, 'invalid json');
      
      const loaded = await loadCaptions(captionsPath);
      expect(loaded).toEqual({});
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await fs.writeFile('test.txt', 'content');
      const exists = await fileExists('test.txt');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const exists = await fileExists('nonexistent.txt');
      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      await fs.mkdir('testdir');
      const exists = await fileExists('testdir');
      expect(exists).toBe(true);
    });
  });
});