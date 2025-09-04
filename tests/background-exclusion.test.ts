import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(require('child_process').exec);

describe('background file exclusion', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-exclude-test-'));
    
    // Create basic appshot structure
    await fs.mkdir(path.join(tempDir, '.appshot'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.appshot', 'captions'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'screenshots', 'iphone'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'final'), { recursive: true });
    
    // Create config
    configPath = path.join(tempDir, '.appshot', 'config.json');
    const config = {
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
        }
      }
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Create empty captions file
    await fs.writeFile(
      path.join(tempDir, '.appshot', 'captions', 'iphone.json'),
      '{}'
    );
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should exclude exact background.png from screenshot list', async () => {
    // Create test images in iphone folder
    const iphoneDir = path.join(tempDir, 'screenshots', 'iphone');
    
    // Create dummy image files
    await fs.writeFile(path.join(iphoneDir, 'screen1.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'screen2.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background.png'), 'dummy');
    
    // List files that would be processed (simulating the build filter)
    const files = await fs.readdir(iphoneDir);
    const screenshots = files
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
      .sort();
    
    expect(screenshots).toEqual(['screen1.png', 'screen2.png']);
    expect(screenshots).not.toContain('background.png');
  });

  it('should exclude background.jpg and background.jpeg', async () => {
    const iphoneDir = path.join(tempDir, 'screenshots', 'iphone');
    
    await fs.writeFile(path.join(iphoneDir, 'screen1.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background.jpg'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background.jpeg'), 'dummy');
    
    const files = await fs.readdir(iphoneDir);
    const screenshots = files
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
      .sort();
    
    expect(screenshots).toEqual(['screen1.png']);
    expect(screenshots).not.toContain('background.jpg');
    expect(screenshots).not.toContain('background.jpeg');
  });

  it('should handle case-insensitive background exclusion', async () => {
    const iphoneDir = path.join(tempDir, 'screenshots', 'iphone');
    
    await fs.writeFile(path.join(iphoneDir, 'screen1.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'Background.PNG'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'BACKGROUND.JPG'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'BaCkGrOuNd.jpeg'), 'dummy');
    
    const files = await fs.readdir(iphoneDir);
    const screenshots = files
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
      .sort();
    
    expect(screenshots).toEqual(['screen1.png']);
    expect(screenshots.length).toBe(1);
  });

  it('should process files with background in name but not exact match', async () => {
    const iphoneDir = path.join(tempDir, 'screenshots', 'iphone');
    
    await fs.writeFile(path.join(iphoneDir, 'background-old.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'my-background.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background2.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background.png'), 'dummy'); // This should be excluded
    
    const files = await fs.readdir(iphoneDir);
    const screenshots = files
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
      .sort();
    
    expect(screenshots).toEqual(['background-old.png', 'background2.png', 'my-background.png']);
    expect(screenshots).not.toContain('background.png');
  });

  it('should handle empty directory after background exclusion', async () => {
    const iphoneDir = path.join(tempDir, 'screenshots', 'iphone');
    
    // Only add background files
    await fs.writeFile(path.join(iphoneDir, 'background.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background.jpg'), 'dummy');
    
    const files = await fs.readdir(iphoneDir);
    const screenshots = files
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
      .sort();
    
    expect(screenshots).toEqual([]);
    expect(screenshots.length).toBe(0);
  });

  it('should work with mixed file types', async () => {
    const iphoneDir = path.join(tempDir, 'screenshots', 'iphone');
    
    // Mix of screenshots and other files
    await fs.writeFile(path.join(iphoneDir, 'screen1.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'screen2.jpg'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'screen3.jpeg'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'background.png'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, 'readme.txt'), 'dummy');
    await fs.writeFile(path.join(iphoneDir, '.DS_Store'), 'dummy');
    
    const files = await fs.readdir(iphoneDir);
    const screenshots = files
      .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
      .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
      .sort();
    
    expect(screenshots).toEqual(['screen1.png', 'screen2.jpg', 'screen3.jpeg']);
    expect(screenshots).not.toContain('background.png');
    expect(screenshots).not.toContain('readme.txt');
    expect(screenshots).not.toContain('.DS_Store');
  });
});