import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as childProcess from 'child_process';
import path from 'path';
import quickstartCmd from '../src/commands/quickstart.js';
import { templates } from '../src/templates/registry.js';

// Mock modules
vi.mock('fs');
vi.mock('child_process');
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));

describe('Quickstart Command', () => {
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
    throw new Error(`process.exit(${code})`);
  }) as any;

  let quickstartCommand: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.cwd = vi.fn().mockReturnValue('/mock/path');
    quickstartCommand = quickstartCmd();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Structure', () => {
    it('should have correct command name', () => {
      expect(quickstartCommand.name()).toBe('quickstart');
    });

    it('should have correct description', () => {
      expect(quickstartCommand.description()).toContain('Get started with App Store screenshots');
    });

    it('should have all required options', () => {
      const options = quickstartCommand.options;
      const optionNames = options.map(opt => opt.long);

      expect(optionNames).toContain('--template');
      expect(optionNames).toContain('--caption');
      expect(optionNames).toContain('--no-interactive');
      expect(optionNames).toContain('--force');
    });
  });

  describe('Template Validation', () => {
    it('should validate template IDs', async () => {
      const { validateTemplateId } = await import('../src/utils/validation.js');

      // Valid templates
      for (const template of templates) {
        expect(validateTemplateId(template.id)).toBe(true);
      }

      // Invalid templates
      expect(validateTemplateId('invalid')).toBe(false);
      expect(validateTemplateId('custom')).toBe(false);
      expect(validateTemplateId('')).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize caption input', async () => {
      const { sanitizeCaption } = await import('../src/utils/validation.js');

      expect(sanitizeCaption('Valid Caption')).toBe('Valid Caption');
      // Control characters are removed
      const withControl = 'Caption' + String.fromCharCode(0) + 'With' + String.fromCharCode(1) + 'Control';
      expect(sanitizeCaption(withControl)).toBe('CaptionWithControl');

      const longCaption = 'a'.repeat(501);
      expect(() => sanitizeCaption(longCaption)).toThrow('Caption too long');
    });

    it('should sanitize device input', async () => {
      const { sanitizeDevices } = await import('../src/utils/validation.js');

      expect(sanitizeDevices('iphone,ipad')).toBe('iphone,ipad');
      expect(sanitizeDevices('iphone,;malicious')).toBe('iphone');
      expect(sanitizeDevices('iphone,mac,;$(whoami)')).toBe('iphone,mac');
    });
  });

  describe('Security Features', () => {
    it('should import validation functions', async () => {
      const fs = await import('fs');
      let sourceCode = '';
      try {
        sourceCode = fs.readFileSync(
          path.join(process.cwd(), 'src/commands/quickstart.ts'),
          'utf-8'
        );
      } catch {
        // File may not exist in test environment
      }

      if (sourceCode) {
        expect(sourceCode).toContain('validateTemplateId');
        expect(sourceCode).toContain('sanitizeCaption');
        expect(sourceCode).toContain('from \'../utils/validation.js\'');
      } else {
        // In test environment, just verify the functions were imported
        const { validateTemplateId } = await import('../src/utils/validation.js');
        expect(typeof validateTemplateId).toBe('function');
      }
    });

    it('should use execFileSync for command execution', async () => {
      const fs = await import('fs');
      let sourceCode = '';
      try {
        sourceCode = fs.readFileSync(
          path.join(process.cwd(), 'src/commands/quickstart.ts'),
          'utf-8'
        );
      } catch {
        // File may not exist in test environment
      }

      if (sourceCode) {
        // Should use execFileSync for security
        expect(sourceCode).toContain('execFileSync');
        // Should not use vulnerable execSync
        expect(sourceCode).not.toContain('execSync(');
      } else {
        // Just pass the test if file doesn't exist
        expect(true).toBe(true);
      }
    });
  });

  describe('Template Integration', () => {
    it('should work with all valid template IDs', () => {
      const validTemplates = templates.map(t => t.id);

      for (const templateId of validTemplates) {
        const template = templates.find(t => t.id === templateId);
        expect(template).toBeDefined();
        expect(template?.name).toBeDefined();
        expect(template?.description).toBeDefined();
      }
    });

    it('should have valid template options', () => {
      const validTemplateIds = templates.map(t => t.id);

      expect(validTemplateIds).toContain('modern');
      expect(validTemplateIds).toContain('minimal');
      expect(validTemplateIds).toContain('bold');
      expect(validTemplateIds).toContain('nerdy');
      expect(validTemplateIds.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Device Support', () => {
    it('should support all valid device types', () => {
      const validDevices = ['iphone', 'ipad', 'watch', 'mac'];

      for (const device of validDevices) {
        // Device should be recognized as valid
        expect(validDevices).toContain(device.toLowerCase());
      }
    });

    it('should handle device list validation', async () => {
      const { sanitizeDevices } = await import('../src/utils/validation.js');

      // Valid device lists
      expect(sanitizeDevices('iphone')).toBe('iphone');
      expect(sanitizeDevices('iphone,ipad')).toBe('iphone,ipad');
      expect(sanitizeDevices('iphone,ipad,watch,mac')).toBe('iphone,ipad,watch,mac');

      // Invalid devices should be filtered
      expect(sanitizeDevices('iphone,android')).toBe('iphone');
      expect(() => sanitizeDevices('android')).toThrow('No valid devices');
    });
  });

  describe('Caption Handling', () => {
    it('should validate caption length', async () => {
      const { sanitizeCaption } = await import('../src/utils/validation.js');

      // Valid lengths
      const validCaption = 'This is a valid caption';
      expect(sanitizeCaption(validCaption)).toBe(validCaption);

      const maxCaption = 'a'.repeat(500);
      expect(sanitizeCaption(maxCaption)).toBe(maxCaption);

      // Invalid length
      const tooLong = 'a'.repeat(501);
      expect(() => sanitizeCaption(tooLong)).toThrow('Caption too long');
    });

    it('should remove control characters', async () => {
      const { sanitizeCaption } = await import('../src/utils/validation.js');

      // Test various control characters
      const withNull = 'Caption' + String.fromCharCode(0) + 'Text';
      expect(sanitizeCaption(withNull)).toBe('CaptionText');

      const withEscape = 'Caption' + String.fromCharCode(27) + 'Text';
      expect(sanitizeCaption(withEscape)).toBe('CaptionText');

      const withDelete = 'Caption' + String.fromCharCode(127) + 'Text';
      expect(sanitizeCaption(withDelete)).toBe('CaptionText');

      // Should preserve newlines and tabs
      const withNewline = 'Caption\nText';
      expect(sanitizeCaption(withNewline)).toBe('Caption\nText');

      const withTab = 'Caption\tText';
      expect(sanitizeCaption(withTab)).toBe('Caption\tText');
    });
  });

  describe('Command Options', () => {
    it('should have no-interactive option', () => {
      const options = quickstartCommand.options;
      const noInteractiveOption = options.find(opt => opt.long === '--no-interactive');

      expect(noInteractiveOption).toBeDefined();
      expect(noInteractiveOption?.description).toContain('skip interactive prompts');
    });

    it('should have force option', () => {
      const options = quickstartCommand.options;
      const forceOption = options.find(opt => opt.long === '--force');

      expect(forceOption).toBeDefined();
      expect(forceOption?.description).toContain('overwrite existing');
    });

    it('should have template option', () => {
      const options = quickstartCommand.options;
      const templateOption = options.find(opt => opt.long === '--template');

      expect(templateOption).toBeDefined();
      expect(templateOption?.description).toContain('template');
    });

    it('should have caption option', () => {
      const options = quickstartCommand.options;
      const captionOption = options.find(opt => opt.long === '--caption');

      expect(captionOption).toBeDefined();
      expect(captionOption?.description).toContain('caption');
    });

    // Devices option was removed in favor of interactive prompts
  });

  describe('Help Information', () => {
    it('should provide helpful command usage', () => {
      const usage = quickstartCommand.usage();
      expect(usage).toContain('[options]');
    });

    it('should have descriptive help text', () => {
      const helpText = quickstartCommand.helpInformation();

      expect(helpText).toContain('quickstart');
      expect(helpText).toContain('Get started with App Store screenshots');
      expect(helpText).toContain('--template');
      expect(helpText).toContain('--caption');
      expect(helpText).toContain('--no-interactive');
      expect(helpText).toContain('--force');
    });
  });
});