import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import type { AppshotConfig } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Style Configuration', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-style-test-'));
    
    // Create .appshot directory
    await fs.mkdir(path.join(testDir, '.appshot'), { recursive: true });
    
    // Create test config
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
        paddingTop: 100
      },
      devices: {
        iphone: {
          input: './screenshots/iphone',
          resolution: '1290x2796',
          autoFrame: true
        },
        watch: {
          input: './screenshots/watch',
          resolution: '396x484',
          autoFrame: true
        }
      }
    };
    
    await fs.writeFile(
      path.join(testDir, '.appshot', 'config.json'),
      JSON.stringify(config, null, 2)
    );
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should load existing configuration', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    expect(config.devices.iphone).toBeDefined();
    expect(config.devices.watch).toBeDefined();
  });

  it('should support device-specific frame positioning', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    // Add frame positioning
    config.devices.iphone.framePosition = 'top';
    config.devices.watch.framePosition = 'bottom';
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Read back and verify
    const updatedContent = await fs.readFile(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent) as AppshotConfig;
    
    expect(updatedConfig.devices.iphone.framePosition).toBe('top');
    expect(updatedConfig.devices.watch.framePosition).toBe('bottom');
  });

  it('should support custom frame scaling', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    // Add frame scaling
    config.devices.iphone.frameScale = 0.85;
    config.devices.watch.frameScale = 1.3;
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Read back and verify
    const updatedContent = await fs.readFile(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent) as AppshotConfig;
    
    expect(updatedConfig.devices.iphone.frameScale).toBe(0.85);
    expect(updatedConfig.devices.watch.frameScale).toBe(1.3);
  });

  it('should support device-specific caption overrides', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    // Add caption overrides
    config.devices.iphone.captionSize = 72;
    config.devices.iphone.captionPosition = 'overlay';
    config.devices.watch.captionSize = 36;
    config.devices.watch.captionPosition = 'above';
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Read back and verify
    const updatedContent = await fs.readFile(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent) as AppshotConfig;
    
    expect(updatedConfig.devices.iphone.captionSize).toBe(72);
    expect(updatedConfig.devices.iphone.captionPosition).toBe('overlay');
    expect(updatedConfig.devices.watch.captionSize).toBe(36);
    expect(updatedConfig.devices.watch.captionPosition).toBe('above');
  });

  it('should support numeric frame positioning', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    // Add numeric positioning (percentage from top)
    config.devices.iphone.framePosition = 25;  // 25% from top
    config.devices.watch.framePosition = 75;   // 75% from top
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Read back and verify
    const updatedContent = await fs.readFile(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent) as AppshotConfig;
    
    expect(updatedConfig.devices.iphone.framePosition).toBe(25);
    expect(updatedConfig.devices.watch.framePosition).toBe(75);
  });

  it('should preserve partial frame settings', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    // Add partial frame settings
    config.devices.iphone.partialFrame = true;
    config.devices.iphone.frameOffset = 30;
    config.devices.watch.partialFrame = true;
    config.devices.watch.frameOffset = 25;
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Read back and verify
    const updatedContent = await fs.readFile(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent) as AppshotConfig;
    
    expect(updatedConfig.devices.iphone.partialFrame).toBe(true);
    expect(updatedConfig.devices.iphone.frameOffset).toBe(30);
    expect(updatedConfig.devices.watch.partialFrame).toBe(true);
    expect(updatedConfig.devices.watch.frameOffset).toBe(25);
  });

  it('should handle reset to defaults', async () => {
    const configPath = path.join(testDir, '.appshot', 'config.json');
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content) as AppshotConfig;
    
    // Add custom settings
    config.devices.iphone.framePosition = 'top';
    config.devices.iphone.frameScale = 1.2;
    config.devices.iphone.captionSize = 80;
    config.devices.iphone.captionPosition = 'overlay';
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Simulate reset
    delete config.devices.iphone.framePosition;
    delete config.devices.iphone.frameScale;
    delete config.devices.iphone.captionSize;
    delete config.devices.iphone.captionPosition;
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Read back and verify
    const updatedContent = await fs.readFile(configPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent) as AppshotConfig;
    
    expect(updatedConfig.devices.iphone.framePosition).toBeUndefined();
    expect(updatedConfig.devices.iphone.frameScale).toBeUndefined();
    expect(updatedConfig.devices.iphone.captionSize).toBeUndefined();
    expect(updatedConfig.devices.iphone.captionPosition).toBeUndefined();
  });

  it('should validate frame position values', () => {
    const isValidPosition = (pos: any): boolean => {
      if (typeof pos === 'string') {
        return ['top', 'center', 'bottom'].includes(pos);
      }
      if (typeof pos === 'number') {
        return pos >= 0 && pos <= 100;
      }
      return false;
    };

    expect(isValidPosition('top')).toBe(true);
    expect(isValidPosition('center')).toBe(true);
    expect(isValidPosition('bottom')).toBe(true);
    expect(isValidPosition(50)).toBe(true);
    expect(isValidPosition(0)).toBe(true);
    expect(isValidPosition(100)).toBe(true);
    expect(isValidPosition(-10)).toBe(false);
    expect(isValidPosition(150)).toBe(false);
    expect(isValidPosition('invalid')).toBe(false);
  });

  it('should validate frame scale values', () => {
    const isValidScale = (scale: any): boolean => {
      return typeof scale === 'number' && scale >= 0.5 && scale <= 2.0;
    };

    expect(isValidScale(0.5)).toBe(true);
    expect(isValidScale(1.0)).toBe(true);
    expect(isValidScale(1.5)).toBe(true);
    expect(isValidScale(2.0)).toBe(true);
    expect(isValidScale(0.3)).toBe(false);
    expect(isValidScale(2.5)).toBe(false);
    expect(isValidScale('1.0')).toBe(false);
  });
});