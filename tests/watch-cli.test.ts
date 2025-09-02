import { describe, it, expect } from 'vitest';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const exec = promisify(execCallback);

describe('Watch CLI Commands', () => {
  const isNotMacOS = platform() !== 'darwin';

  it('should show watch help', async () => {
    const { stdout } = await exec('node dist/cli.js watch --help');
    
    expect(stdout).toContain('Monitor directories for new screenshots');
    expect(stdout).toContain('start');
    expect(stdout).toContain('stop');
    expect(stdout).toContain('status');
    expect(stdout).toContain('setup');
  });

  it('should show unwatch help', async () => {
    const { stdout } = await exec('node dist/cli.js unwatch --help');
    
    expect(stdout).toContain('Stop watching directories');
    expect(stdout).toContain('alias for');
  });

  it.skipIf(isNotMacOS)('should show watch status when not running', async () => {
    const { stdout } = await exec('node dist/cli.js watch status');
    
    expect(stdout.toLowerCase()).toMatch(/not running|no watch service/i);
  });

  it('should reject watch commands on non-macOS', async () => {
    if (platform() !== 'darwin') {
      try {
        await exec('node dist/cli.js watch start --dirs screenshots');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('only available on macOS');
      }
    } else {
      expect(true).toBe(true); // Skip on macOS
    }
  });

  it('should list available watch commands', async () => {
    const { stdout } = await exec('node dist/cli.js watch --help');
    
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('start');
  });
});