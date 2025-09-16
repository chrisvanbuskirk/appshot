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

  // Skip when simulators are not available (or in CI)
  it.skipIf(isNotMacOS || process.env.CI || process.env.SIMCTL_AVAILABLE === '0')('should handle device list command', async () => {
    // Probe simctl availability; skip if not present
    try {
      await exec('xcrun simctl help');
    } catch {
      return; // treat as skipped on environments without simulators
    }
    const { stdout } = await exec('node dist/cli.js device list');
    expect(stdout).toContain('Available Devices');
  });
});
