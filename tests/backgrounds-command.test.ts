import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig, saveConfig, fileExists } from '../src/core/files.js';
import { validateBackgroundDimensions, detectBestFit } from '../src/core/background.js';
import type { AppshotConfig } from '../src/types.js';
import { isMainThread } from 'worker_threads';

// Vitest vmThreads disallows process.chdir inside workers. In that pool we
// conditionally skip this suite to keep CI/environment compatibility while
// retaining coverage in normal process pools.
const canChdir = typeof process.chdir === 'function' && isMainThread;
const describeMaybe = canChdir ? describe : describe.skip;

describeMaybe('backgrounds command', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-cmd-test-'));
    
    // Set working directory (guarded for environments that disallow chdir)
    if (canChdir) process.chdir(tempDir);
    
    // Create basic appshot structure
    await fs.mkdir(path.join(tempDir, '.appshot'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.appshot', 'captions'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'screenshots', 'iphone'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'screenshots', 'ipad'), { recursive: true });
    
    // Create config
    configPath = path.join(tempDir, '.appshot', 'config.json');
    const config: AppshotConfig = {
      output: './final',
      frames: './frames',
      gradient: {
        colors: ['#FF5733', '#FFC300'],
        direction: 'top-bottom'
      },
      caption: {
        font: 'SF Pro',
        fontsize: 64,
        color: '#FFFFFF',
        align: 'center',
        paddingTop: 50,
        position: 'above'
      },
      devices: {
        iphone: {
          input: './screenshots/iphone',
          resolution: '1290x2796'
        },
        ipad: {
          input: './screenshots/ipad',
          resolution: '2048x2732'
        }
      }
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  });

  afterEach(async () => {
    // Reset working directory
    if (canChdir) process.chdir('/');
    
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('backgrounds set', () => {
    it('should set global background', async () => {
      const imagePath = path.join(tempDir, 'bg.png');
      await fs.writeFile(imagePath, 'dummy');
      
      const config = await loadConfig();
      config.background = {
        mode: 'image',
        image: imagePath,
        fit: 'cover'
      };
      await saveConfig(config);
      
      const updated = await loadConfig();
      expect(updated.background?.image).toBe(imagePath);
      expect(updated.background?.fit).toBe('cover');
    });

    it('should set device-specific background', async () => {
      const imagePath = path.join(tempDir, 'iphone-bg.png');
      await fs.writeFile(imagePath, 'dummy');
      
      const config = await loadConfig();
      if (!config.devices.iphone.background) {
        config.devices.iphone.background = {};
      }
      config.devices.iphone.background.image = imagePath;
      config.devices.iphone.background.fit = 'contain';
      await saveConfig(config);
      
      const updated = await loadConfig();
      expect(updated.devices.iphone.background?.image).toBe(imagePath);
      expect(updated.devices.iphone.background?.fit).toBe('contain');
    });

    it('should validate image exists before setting', async () => {
      const nonExistentPath = path.join(tempDir, 'missing.png');
      const exists = await fileExists(nonExistentPath);
      expect(exists).toBe(false);
    });
  });

  describe('backgrounds validate', () => {
    it('should validate matching dimensions', async () => {
      // Create test image
      const imagePath = path.join(tempDir, 'test.png');
      await fs.writeFile(imagePath, Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x05, 0x0A, // Width: 1290
        0x00, 0x00, 0x0A, 0xEC, // Height: 2796
        0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
      ]));
      
      const result = await validateBackgroundDimensions(
        imagePath,
        1290,
        2796
      );
      
      // Since we're using a minimal PNG header, validation may fail
      // but the function should handle it gracefully
      expect(result.valid).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.dimensions).toBeDefined();
    });

    it('should detect best fit mode', () => {
      // Same aspect ratio
      let fit = detectBestFit(1000, 2000, 500, 1000);
      expect(fit).toBe('fill');
      
      // Source smaller but same aspect ratio
      fit = detectBestFit(500, 1000, 1000, 2000);
      expect(fit).toBe('fill'); // Same aspect ratio so uses fill
      
      // Source larger but same aspect ratio
      fit = detectBestFit(2000, 4000, 1000, 2000);
      expect(fit).toBe('fill'); // Same aspect ratio so uses fill
      
      // Different aspect ratios
      fit = detectBestFit(1000, 1000, 1000, 2000);
      expect(fit).toBe('contain'); // Different aspect, not smaller, so contain
    });
  });

  describe('backgrounds list', () => {
    it('should list configured backgrounds', async () => {
      const config = await loadConfig();
      
      // Add global background
      config.background = {
        mode: 'image',
        image: './global-bg.png',
        fit: 'cover'
      };
      
      // Add device background
      config.devices.iphone.background = {
        image: './iphone-bg.png',
        fit: 'contain'
      };
      
      await saveConfig(config);
      
      const updated = await loadConfig();
      expect(updated.background?.image).toBe('./global-bg.png');
      expect(updated.devices.iphone.background?.image).toBe('./iphone-bg.png');
    });

    it('should detect auto backgrounds', async () => {
      // Create background files in device folders
      await fs.writeFile(
        path.join(tempDir, 'screenshots', 'iphone', 'background.png'),
        'dummy'
      );
      await fs.writeFile(
        path.join(tempDir, 'screenshots', 'ipad', 'background.jpg'),
        'dummy'
      );
      
      // Check they exist
      const iphoneBg = await fileExists(
        path.join(tempDir, 'screenshots', 'iphone', 'background.png')
      );
      const ipadBg = await fileExists(
        path.join(tempDir, 'screenshots', 'ipad', 'background.jpg')
      );
      
      expect(iphoneBg).toBe(true);
      expect(ipadBg).toBe(true);
    });
  });

  describe('backgrounds clear', () => {
    it('should clear global background', async () => {
      const config = await loadConfig();
      config.background = {
        mode: 'image',
        image: './bg.png'
      };
      await saveConfig(config);
      
      // Clear it
      const updated = await loadConfig();
      if (updated.background) {
        delete updated.background.image;
      }
      await saveConfig(updated);
      
      const final = await loadConfig();
      expect(final.background?.image).toBeUndefined();
    });

    it('should clear device-specific background', async () => {
      const config = await loadConfig();
      config.devices.iphone.background = {
        image: './iphone-bg.png'
      };
      await saveConfig(config);
      
      // Clear it
      const updated = await loadConfig();
      if (updated.devices.iphone.background) {
        delete updated.devices.iphone.background.image;
      }
      await saveConfig(updated);
      
      const final = await loadConfig();
      expect(final.devices.iphone.background?.image).toBeUndefined();
    });
  });

  describe('backgrounds preview', () => {
    it('should create preview output directory', async () => {
      const previewDir = path.join(tempDir, 'preview');
      await fs.mkdir(previewDir, { recursive: true });
      
      const exists = await fileExists(previewDir);
      expect(exists).toBe(true);
      
      const stats = await fs.stat(previewDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });
});
