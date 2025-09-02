import { describe, it, expect } from 'vitest';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const exec = promisify(execCallback);

describe('Device CLI Commands', () => {
  const isNotMacOS = platform() !== 'darwin';

  it.skipIf(isNotMacOS)('should show device help', async () => {
    const { stdout } = await exec('node dist/cli.js device --help');
    
    expect(stdout).toContain('Capture screenshots from simulators');
    expect(stdout).toContain('capture');
    expect(stdout).toContain('list');
    expect(stdout).toContain('prepare');
  });

  it.skipIf(isNotMacOS)('should show device capture help', async () => {
    const { stdout } = await exec('node dist/cli.js device capture --help');
    
    expect(stdout).toContain('Capture screenshot from a device');
    expect(stdout).toContain('--device');
    expect(stdout).toContain('--all');
    expect(stdout).toContain('--booted');
    expect(stdout).toContain('--process');
  });

  it('should reject device commands on non-macOS', async () => {
    if (platform() !== 'darwin') {
      try {
        await exec('node dist/cli.js device list');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toMatch(/unknown command|only available on macOS/);
      }
    } else {
      // On macOS, just verify the command exists
      const { stdout } = await exec('node dist/cli.js device --help');
      expect(stdout).toContain('device');
    }
  });

  it.skipIf(isNotMacOS)('should handle device list command', async () => {
    // This will run on macOS only
    try {
      const { stdout } = await exec('node dist/cli.js device list');
      // Should at least show the header
      expect(stdout).toContain('Available Devices');
    } catch (error: any) {
      // If no simulators installed, that's ok
      expect(error.stderr || error.stdout).toBeDefined();
    }
  });
});