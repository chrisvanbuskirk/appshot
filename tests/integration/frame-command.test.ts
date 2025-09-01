import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { initializeFrameRegistry, findBestFrame } from '../../src/core/devices.js';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('frame command', { timeout: 60000 }, () => {
  let testDir: string;
  const originalCwd = process.cwd();
  const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');

  const run = async (args: string) => execAsync(`node ${cliPath} ${args}`);

  beforeAll(async () => {
    // Initialize frame registry BEFORE changing directory
    // This ensures the bundled frames are properly loaded
    await initializeFrameRegistry();

    // temp work dir
    testDir = path.join(process.cwd(), 'tmp-frame-cmd-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('frames an iPhone screenshot with transparency', async () => {
    // Create a tall iPhone-like screenshot (1290x2796)
    const inputPath = path.join(testDir, 'screen.png');
    await sharp({
      create: {
        width: 1290,
        height: 2796,
        channels: 4,
        background: { r: 120, g: 120, b: 220, alpha: 1 }
      }
    }).png().toFile(inputPath);

    // Frame it - use relative paths since we changed cwd
    const outDir = path.join(testDir, 'framed');
    const result = await run(`frame screen.png -o framed`);
    
    // Check if command succeeded
    if (result.stderr) {
      console.error('Frame command stderr:', result.stderr);
      console.error('Frame command stdout:', result.stdout);
    }

    const outFiles = await fs.readdir(outDir);
    // Log what files we got
    if (outFiles.length === 0) {
      console.error('No files created in output directory');
      console.error('Command stdout:', result.stdout);
    }
    const outFile = outFiles.find(f => f.includes('framed') && f.endsWith('.png'));
    expect(outFile).toBeDefined();

    const outPath = path.join(outDir, outFile!);
    const meta = await sharp(outPath).metadata();
    expect(meta.hasAlpha).toBe(true);

    // Width/height should match selected frame size
    const frame = findBestFrame(1290, 2796, 'iphone');
    expect(frame).toBeTruthy();
    if (frame) {
      expect(meta.width).toBe(frame.frameWidth);
      expect(meta.height).toBe(frame.frameHeight);
    }
  });

  it('supports dry-run and verbose', async () => {
    const inputPath = path.join(testDir, 'screen2.png');
    await sharp({
      create: {
        width: 2048,
        height: 2732,
        channels: 4,
        background: { r: 220, g: 120, b: 120, alpha: 1 }
      }
    }).png().toFile(inputPath);

    const { stdout } = await run(`frame screen2.png --dry-run --verbose`);
    const out = stdout.toLowerCase();
    expect(out).toContain('dry run complete');
    expect(out).toMatch(/would be framed|images would be framed/);
    expect(out).toContain('frame:');
  });
});
