import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';
import specsCmd from '../src/commands/specs.js';
import { ALL_PRESETS } from '../src/core/app-store-specs.js';

describe('specs command', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    program = new Command();
    program.addCommand(specsCmd());
    
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('JSON output', () => {
    it('should output complete Apple specifications as JSON', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json']);
      
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Should include lastUpdated field
      expect(output).toHaveProperty('lastUpdated');
      expect(output.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Should include all device types
      expect(output).toHaveProperty('iphone');
      expect(output).toHaveProperty('ipad');
      expect(output).toHaveProperty('mac');
      expect(output).toHaveProperty('watch');
      expect(output).toHaveProperty('appletv');
      expect(output).toHaveProperty('visionpro');
      
      // Should match the structure from ALL_PRESETS
      expect(output.iphone).toEqual(ALL_PRESETS.iphone);
      expect(output.ipad).toEqual(ALL_PRESETS.ipad);
    });

    it('should include exact resolution specifications', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Check iPhone 6.9" specs match exactly
      const iphone69 = output.iphone.find((p: any) => p.id === 'iphone-6-9');
      expect(iphone69).toBeDefined();
      expect(iphone69.resolutions.portrait).toBe('1290x2796');
      expect(iphone69.resolutions.landscape).toBe('2796x1290');
      expect(iphone69.displaySize).toBe('6.9"');
      expect(iphone69.required).toBe(true);
      
      // Check iPad 13" specs match exactly
      const ipad13 = output.ipad.find((p: any) => p.id === 'ipad-13');
      expect(ipad13).toBeDefined();
      expect(ipad13.resolutions.portrait).toBe('2064x2752');
      expect(ipad13.resolutions.landscape).toBe('2752x2064');
      expect(ipad13.displaySize).toBe('13"');
      expect(ipad13.required).toBe(true);
    });

    it('should filter by device type with --device flag', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json', '--device', 'iphone']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Should still include lastUpdated
      expect(output).toHaveProperty('lastUpdated');
      
      // Should only include iPhone
      expect(output).toHaveProperty('iphone');
      expect(output).not.toHaveProperty('ipad');
      expect(output).not.toHaveProperty('mac');
      
      // iPhone data should be complete
      expect(output.iphone).toEqual(ALL_PRESETS.iphone);
    });

    it('should filter to required presets with --required flag', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json', '--required']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Should only include required presets
      const requiredIphones = output.iphone.filter((p: any) => p.required);
      expect(output.iphone).toEqual(requiredIphones);
      expect(output.iphone.length).toBeGreaterThan(0);
      expect(output.iphone.every((p: any) => p.required)).toBe(true);
    });

    it('should combine --device and --required flags', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json', '--device', 'ipad', '--required']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Should only include required iPad presets
      expect(output).toHaveProperty('ipad');
      expect(output).not.toHaveProperty('iphone');
      expect(output.ipad.every((p: any) => p.required)).toBe(true);
    });

    it('should handle invalid device type', async () => {
      await expect(
        program.parseAsync(['node', 'test', 'specs', '--json', '--device', 'invalid'])
      ).rejects.toThrow('Process exited with code 1');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const errorMessage = consoleErrorSpy.mock.calls[0].join(' ');
      expect(errorMessage).toContain('Unknown device type: invalid');
    });
  });

  describe('formatted output', () => {
    it('should display formatted specifications', async () => {
      await program.parseAsync(['node', 'test', 'specs']);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      
      // Should include headers
      expect(output).toContain('Apple App Store Screenshot Specifications');
      expect(output).toContain('Last Updated:');
      expect(output).toMatch(/Last Updated: \d{4}-\d{2}-\d{2}/);
      expect(output).toContain('IPHONE');
      expect(output).toContain('IPAD');
      
      // Should include resolution info
      expect(output).toContain('1290x2796');
      expect(output).toContain('Portrait:');
      expect(output).toContain('Landscape:');
    });

    it('should mark required presets', async () => {
      await program.parseAsync(['node', 'test', 'specs']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      
      // Should mark required presets
      expect(output).toContain('(REQUIRED)');
      expect(output).toContain('iPhone 6.9" Display');
    });

    it('should filter by device type in formatted output', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--device', 'watch']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      
      // Should only show watch specs
      expect(output).toContain('WATCH');
      expect(output).not.toContain('IPHONE');
      expect(output).not.toContain('IPAD');
    });

    it('should show only required presets in formatted output', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--required']);
      
      const output = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      
      // Should include required iPhone preset
      expect(output).toContain('iPhone 6.9" Display');
      expect(output).toContain('(REQUIRED)');
      
      // Should not include non-required presets
      const nonRequiredPreset = ALL_PRESETS.iphone.find(p => !p.required);
      if (nonRequiredPreset) {
        expect(output).not.toContain(nonRequiredPreset.name);
      }
    });
  });

  describe('data integrity', () => {
    it('should preserve all preset fields in JSON output', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Check that all fields are preserved
      const firstIphone = output.iphone[0];
      expect(firstIphone).toHaveProperty('id');
      expect(firstIphone).toHaveProperty('name');
      expect(firstIphone).toHaveProperty('displaySize');
      expect(firstIphone).toHaveProperty('devices');
      expect(firstIphone).toHaveProperty('resolutions');
      
      // Optional fields should be preserved when present
      if (ALL_PRESETS.iphone[0].notes) {
        expect(firstIphone).toHaveProperty('notes');
      }
      if (ALL_PRESETS.iphone[0].fallback) {
        expect(firstIphone).toHaveProperty('fallback');
      }
    });

    it('should maintain resolution format consistency', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Check all resolutions follow WIDTHxHEIGHT format
      for (const [key, value] of Object.entries(output)) {
        // Skip the lastUpdated field
        if (key === 'lastUpdated') continue;
        
        for (const preset of value as any[]) {
          if (preset.resolutions.portrait) {
            expect(preset.resolutions.portrait).toMatch(/^\d+x\d+$/);
          }
          if (preset.resolutions.landscape) {
            expect(preset.resolutions.landscape).toMatch(/^\d+x\d+$/);
          }
        }
      }
    });

    it('should output valid JSON that can be parsed and re-stringified', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json']);
      
      const originalOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(originalOutput);
      const reStringified = JSON.stringify(parsed, null, 2);
      
      // Should be able to round-trip the JSON
      expect(JSON.parse(reStringified)).toEqual(parsed);
    });
  });

  describe('snapshot testing for change detection', () => {
    it('should produce consistent JSON output for diffing', async () => {
      await program.parseAsync(['node', 'test', 'specs', '--json']);
      
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      
      // Create a snapshot-like structure for key specs
      const snapshot = {
        iphone69: output.iphone.find((p: any) => p.id === 'iphone-6-9'),
        ipad13: output.ipad.find((p: any) => p.id === 'ipad-13'),
        totalIphonePresets: output.iphone.length,
        totalIpadPresets: output.ipad.length,
        requiredIphonePresets: output.iphone.filter((p: any) => p.required).length,
        requiredIpadPresets: output.ipad.filter((p: any) => p.required).length
      };
      
      // These values should remain stable for diffing
      expect(snapshot.iphone69?.resolutions.portrait).toBe('1290x2796');
      expect(snapshot.ipad13?.resolutions.portrait).toBe('2064x2752');
      expect(snapshot.totalIphonePresets).toBeGreaterThan(0);
      expect(snapshot.totalIpadPresets).toBeGreaterThan(0);
    });
  });
});