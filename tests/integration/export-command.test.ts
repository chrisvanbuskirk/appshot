import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import os from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(execCb);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.join(__dirname, '..', '..', 'dist', 'cli.js');

describe('appshot export CLI', { timeout: 60000 }, () => {
  let testDir: string;
  const originalCwd = process.cwd();

  const runExport = async (args: string) => {
    try {
      return await execAsync(`node ${cliPath} export ${args}`, { cwd: testDir });
    } catch (error: any) {
      if (error.stdout) {
        // eslint-disable-next-line no-console
        console.error('CLI stdout:', error.stdout);
      }
      if (error.stderr) {
        // eslint-disable-next-line no-console
        console.error('CLI stderr:', error.stderr);
      }
      throw error;
    }
  };

  async function createScreenshot(
    device: string,
    language: string,
    filename: string,
    size: { width: number; height: number } = { width: 1290, height: 2796 }
  ) {
    const deviceDir = path.join(testDir, 'final', device, language);
    await fs.mkdir(deviceDir, { recursive: true });

    await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 4,
        background: { r: 120, g: 160, b: 200, alpha: 1 }
      }
    })
      .png()
      .toFile(path.join(deviceDir, filename));
  }

  beforeAll(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-export-'));
    process.chdir(testDir);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await fs.rm(path.join(testDir, 'final'), { recursive: true, force: true });
    await fs.rm(path.join(testDir, 'fastlane'), { recursive: true, force: true });
  });

  it('exports detected languages using symlinks by default', async () => {
    await createScreenshot('iphone', 'en', 'home.png');
    await createScreenshot('ipad', 'en', 'tablet.png', { width: 2048, height: 2732 });

    const { stdout } = await runExport('--json');
    const result = JSON.parse(stdout);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
    expect(result.byLanguage['en-US']).toBe(2);
    expect(result.byDevice.iphone).toBeGreaterThan(0);
    expect(result.byDevice.ipad).toBeGreaterThan(0);

    const iphoneExport = path.join(testDir, 'fastlane', 'screenshots', 'en-US', 'iphone', 'home.png');
    const ipadExport = path.join(testDir, 'fastlane', 'screenshots', 'en-US', 'ipad', 'tablet.png');

    const iphoneStat = await fs.lstat(iphoneExport);
    const ipadStat = await fs.lstat(ipadExport.replace('tablet.png', 'IPAD_PRO_3GEN_129_tablet.png'))
      .catch(() => fs.lstat(ipadExport));

    expect(iphoneStat.isSymbolicLink()).toBe(true);

    const iphoneTarget = await fs.readlink(iphoneExport);
    expect(path.resolve(path.dirname(iphoneExport), iphoneTarget)).toBe(
      path.join(testDir, 'final', 'iphone', 'en', 'home.png')
    );

    expect(ipadStat.isSymbolicLink()).toBe(true);
  });

  it('respects device filters and copy mode', async () => {
    await createScreenshot('watch', 'en', 'watch.png', { width: 368, height: 448 });
    await createScreenshot('iphone', 'en', 'phone.png');

    const { stdout } = await runExport('--devices watch --copy --json --clean');
    const result = JSON.parse(stdout);

    expect(result.success).toBe(true);
    expect(result.byDevice.watch).toBe(1);
    expect(result.byDevice.iphone).toBe(0);

    const watchExport = path.join(testDir, 'fastlane', 'screenshots', 'en-US', 'watch', 'watch.png');
    const iphoneExportDir = path.join(testDir, 'fastlane', 'screenshots', 'en-US', 'iphone');

    const watchStat = await fs.lstat(watchExport);
    expect(watchStat.isFile()).toBe(true);

    await expect(fs.access(iphoneExportDir)).rejects.toThrow();
  });

  it('provides a detailed dry-run plan without writing files', async () => {
    await createScreenshot('ipad', 'en', 'scene.png', { width: 2048, height: 2732 });

    const { stdout } = await runExport('--dry-run --json --devices ipad');
    const result = JSON.parse(stdout);

    expect(result.dryRun).toBe(true);
    expect(Array.isArray(result.actions)).toBe(true);
    expect(result.actions.length).toBe(1);

    const [action] = result.actions;
    expect(action.device).toBe('ipad');
    expect(action.language).toBe('en-US');
    expect(action.renamed).toBe(true);
    expect(action.destination).toContain('IPAD_PRO_3GEN_129_scene.png');

    const exportDir = path.join(testDir, 'fastlane');
    await expect(fs.access(exportDir)).rejects.toThrow();
  });
});
