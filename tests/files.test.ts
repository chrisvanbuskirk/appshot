import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, loadCaptions, fileExists } from '../src/core/files.js';

describe('files', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-test-'));
  });

  afterEach(async () => {
    // Change back to root temp dir before cleanup (Windows can't delete current directory)
    process.chdir(os.tmpdir());
    
    // Add delay for Windows file system
    if (process.platform === 'win32') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (err) {
      // Ignore cleanup errors in tests
      console.warn('Cleanup warning:', err);
    }
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
      
      const configPath = path.join(tempDir, 'appshot.json');
      await fs.writeFile(configPath, JSON.stringify(config));
      
      // Change to tempDir for loadConfig to work
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const loaded = await loadConfig();
        expect(loaded).toEqual(config);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should throw error when appshot.json not found', async () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        await expect(loadConfig()).rejects.toThrow('appshot.json not found');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should throw error for invalid JSON', async () => {
      const configPath = path.join(tempDir, 'appshot.json');
      await fs.writeFile(configPath, 'invalid json');
      
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        await expect(loadConfig()).rejects.toThrow('Failed to load appshot.json');
      } finally {
        process.chdir(originalCwd);
      }
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
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'content');
      const exists = await fileExists(testFile);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const testFile = path.join(tempDir, 'nonexistent.txt');
      const exists = await fileExists(testFile);
      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      const testDir = path.join(tempDir, 'testdir');
      await fs.mkdir(testDir);
      const exists = await fileExists(testDir);
      expect(exists).toBe(true);
    });
  });
});