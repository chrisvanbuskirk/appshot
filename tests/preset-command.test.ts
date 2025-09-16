import { describe, it, expect, vi } from 'vitest';
import { presetCommand } from '../src/commands/preset.js';
import { templates } from '../src/templates/registry.js';

describe('Preset Command', () => {
  describe('Command Structure', () => {
    it('should have correct command name', () => {
      expect(presetCommand.name()).toBe('preset');
    });

    it('should have correct description', () => {
      expect(presetCommand.description()).toContain('Apply template preset');
    });

    it('should have all required options', () => {
      const options = presetCommand.options;
      const optionNames = options.map(opt => opt.long);

      expect(optionNames).toContain('--caption');
      expect(optionNames).toContain('--devices');
      expect(optionNames).toContain('--langs');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--dry-run');
      expect(optionNames).toContain('--verbose');
    });
  });

  describe('Template Registry Integration', () => {
    it('should accept all valid template IDs', () => {
      // All templates in registry should be valid preset names
      const validPresets = templates.map(t => t.id);

      expect(validPresets).toContain('modern');
      expect(validPresets).toContain('minimal');
      expect(validPresets).toContain('bold');
      expect(validPresets).toContain('elegant');
      expect(validPresets).toContain('nerdy');
      expect(validPresets).toContain('showcase');
      expect(validPresets).toContain('playful');
      expect(validPresets).toContain('corporate');
    });

    it('should have help text with template names', () => {
      const helpText = presetCommand.helpInformation();

      expect(helpText).toContain('modern');
      expect(helpText).toContain('minimal');
      expect(helpText).toContain('bold');
      expect(helpText).toContain('Preset name');
    });
  });

  describe('Input Validation', () => {
    it('should validate template ID through validateTemplateId', async () => {
      const { validateTemplateId } = await import('../src/utils/validation.js');

      // Valid templates
      expect(validateTemplateId('modern')).toBe(true);
      expect(validateTemplateId('minimal')).toBe(true);
      expect(validateTemplateId('bold')).toBe(true);
      expect(validateTemplateId('nerdy')).toBe(true);

      // Invalid templates
      expect(validateTemplateId('invalid')).toBe(false);
      expect(validateTemplateId('custom')).toBe(false);
      expect(validateTemplateId('')).toBe(false);
    });

    it('should sanitize device input', async () => {
      const { sanitizeDevices } = await import('../src/utils/validation.js');

      expect(sanitizeDevices('iphone,ipad')).toBe('iphone,ipad');
      expect(sanitizeDevices('iphone,;malicious')).toBe('iphone');
      expect(sanitizeDevices('iphone,mac,;$(whoami)')).toBe('iphone,mac');
    });

    it('should sanitize language input', async () => {
      const { sanitizeLanguages } = await import('../src/utils/validation.js');

      expect(sanitizeLanguages('en,es,fr')).toBe('en,es,fr');
      expect(sanitizeLanguages('en,;rmdir /')).toBe('en');
      expect(sanitizeLanguages('en,$(whoami)')).toBe('en');
    });

    it('should sanitize caption input', async () => {
      const { sanitizeCaption } = await import('../src/utils/validation.js');

      expect(sanitizeCaption('Test Caption')).toBe('Test Caption');
      // sanitizeCaption doesn't remove HTML tags, it only removes control characters
      expect(sanitizeCaption('Test\x00Script')).toBe('TestScript');

      const longCaption = 'a'.repeat(501);
      expect(() => sanitizeCaption(longCaption)).toThrow('Caption too long');
    });

    it('should sanitize output path', async () => {
      const { sanitizePath } = await import('../src/utils/validation.js');

      expect(sanitizePath('./output')).toBe('./output');
      expect(sanitizePath('output;rm -rf /')).toBe('outputrm -rf /');
      expect(() => sanitizePath('../../../etc/passwd')).toThrow('Directory traversal');
    });
  });

  describe('Command Arguments', () => {
    it('should accept preset as first argument', () => {
      // Check that the command signature includes a preset argument
      const usage = presetCommand.usage();
      expect(usage).toContain('<preset>');
    });

    it('should describe preset argument correctly', () => {
      const helpText = presetCommand.helpInformation();
      expect(helpText).toContain('Preset name');
      expect(helpText).toContain('modern, bold, minimal');
    });
  });

  describe('Option Descriptions', () => {
    it('should have clear option descriptions', () => {
      const helpText = presetCommand.helpInformation();

      expect(helpText).toContain('Add caption to all screenshots');
      expect(helpText).toContain('Comma-separated device list');
      expect(helpText).toContain('Comma-separated language codes');
      expect(helpText).toContain('Output directory');
      expect(helpText).toContain('Preview without building');
      expect(helpText).toContain('Show detailed output');
    });
  });

  describe('Template Application', () => {
    it('should use template configuration from registry', () => {
      const modernTemplate = templates.find(t => t.id === 'modern');
      expect(modernTemplate).toBeDefined();
      expect(modernTemplate?.name).toBe('Modern Vibrant');
      expect(modernTemplate?.background.mode).toBe('gradient');
      // Check that font is defined, not a specific value since it may vary
      expect(modernTemplate?.captionStyle.font).toBeDefined();
      expect(typeof modernTemplate?.captionStyle.font).toBe('string');
    });

    it('should support all registered templates', () => {
      const templateIds = templates.map(t => t.id);

      // All these should be valid presets
      for (const id of templateIds) {
        const template = templates.find(t => t.id === id);
        expect(template).toBeDefined();
        expect(template?.background).toBeDefined();
        expect(template?.captionStyle).toBeDefined();
        expect(template?.deviceStyle).toBeDefined();
      }
    });
  });

  describe('Security Features', () => {
    it('should use execFileSync instead of execSync', async () => {
      // Read the source to verify it uses execFileSync
      const fs = await import('fs');
      const path = await import('path');
      const sourceCode = fs.readFileSync(
        path.join(process.cwd(), 'src/commands/preset.ts'),
        'utf-8'
      );

      expect(sourceCode).toContain('execFileSync');
      expect(sourceCode).not.toContain('execSync(');
    });

    it('should import validation functions', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sourceCode = fs.readFileSync(
        path.join(process.cwd(), 'src/commands/preset.ts'),
        'utf-8'
      );

      expect(sourceCode).toContain('sanitizeDevices');
      expect(sourceCode).toContain('sanitizeLanguages');
      expect(sourceCode).toContain('sanitizePath');
      expect(sourceCode).toContain('validateTemplateId');
      expect(sourceCode).toContain('sanitizeCaption');
    });
  });
});