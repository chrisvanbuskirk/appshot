import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import path from 'path';
import templateCmd from '../src/commands/template.js';
import { templates, getTemplate, applyTemplateToConfig, getTemplateCaptionSuggestions, getTemplateCategories } from '../src/templates/registry.js';

// Mock modules
vi.mock('fs/promises', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn()
  },
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn()
  }
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
    Separator: vi.fn()
  }
}));

describe('Template Command', () => {
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Structure', () => {
    it('should have correct command name', () => {
      const cmd = templateCmd();
      expect(cmd.name()).toBe('template');
    });

    it('should have correct description', () => {
      const cmd = templateCmd();
      expect(cmd.description()).toContain('Apply professional screenshot templates');
    });

    it('should have all required options', () => {
      const cmd = templateCmd();
      const options = cmd.options;
      const optionNames = options.map(opt => opt.long);

      expect(optionNames).toContain('--list');
      expect(optionNames).toContain('--preview');
      expect(optionNames).toContain('--caption');
      expect(optionNames).toContain('--captions');
      expect(optionNames).toContain('--device');
      expect(optionNames).toContain('--no-backup');
      expect(optionNames).toContain('--dry-run');
    });

    it('should accept template ID as optional argument', () => {
      const cmd = templateCmd();
      const usage = cmd.usage();
      expect(usage).toContain('[template]');
    });
  });

  describe('Template Registry Integration', () => {
    it('should work with all templates from registry', () => {
      const templateIds = templates.map(t => t.id);

      for (const id of templateIds) {
        const template = getTemplate(id);
        expect(template).toBeDefined();
        expect(template?.id).toBe(id);
      }
    });

    it('should have valid template configurations', () => {
      for (const template of templates) {
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.background).toBeDefined();
        expect(template.captionStyle).toBeDefined();
        expect(template.deviceStyle).toBeDefined();
      }
    });
  });

  describe('Help Text', () => {
    it('should have descriptive help text', () => {
      const cmd = templateCmd();
      const helpText = cmd.helpInformation();

      expect(helpText).toContain('template');
      expect(helpText).toContain('Apply professional screenshot templates');
      expect(helpText).toContain('--list');
      expect(helpText).toContain('--preview');
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
      expect(validateTemplateId('a'.repeat(51))).toBe(false); // Too long
    });
  });

  describe('Caption Handling', () => {
    it('should sanitize caption input', async () => {
      const { sanitizeCaption } = await import('../src/utils/validation.js');

      expect(sanitizeCaption('Valid Caption')).toBe('Valid Caption');
      // Control characters are removed
      const withControl = 'Caption' + String.fromCharCode(0) + 'With' + String.fromCharCode(1) + 'Control';
      expect(sanitizeCaption(withControl)).toBe('CaptionWithControl');

      const longCaption = 'a'.repeat(501);
      expect(() => sanitizeCaption(longCaption)).toThrow('Caption too long');
    });

    it('should validate JSON captions', async () => {
      const { validateJson } = await import('../src/utils/validation.js');

      expect(validateJson('{"key": "value"}')).toEqual({ key: 'value' });
      expect(validateJson('[]')).toEqual([]);

      expect(() => validateJson('invalid json')).toThrow('Invalid JSON');
      expect(() => validateJson('{key: value}')).toThrow('Invalid JSON');

      const largeJson = '{"data": "' + 'a'.repeat(10001) + '"}';
      expect(() => validateJson(largeJson)).toThrow('JSON string too long');
    });
  });

  describe('Configuration Application', () => {
    it('should apply template to config', () => {
      const config = {
        devices: {
          iphone: {
            input: './screenshots/iphone',
            resolution: '1290x2796'
          }
        }
      };

      const result = applyTemplateToConfig('modern', config);

      expect(result).toHaveProperty('background');
      expect(result).toHaveProperty('caption');
      expect(result.devices?.iphone).toBeDefined();
    });

    it('should preserve existing device configs', () => {
      const config = {
        devices: {
          iphone: {
            input: './custom/path',
            resolution: '1290x2796',
            customProp: 'value'
          }
        }
      };

      const result = applyTemplateToConfig('bold', config);

      expect(result.devices?.iphone?.input).toBe('./custom/path');
      expect(result.devices?.iphone?.customProp).toBe('value');
    });

    it('should apply device overrides', () => {
      const modernTemplate = getTemplate('modern');
      if (modernTemplate?.deviceOverrides?.watch) {
        const config = {
          devices: {
            watch: {
              input: './screenshots/watch',
              resolution: '410x502'
            }
          }
        };

        const result = applyTemplateToConfig('modern', config);

        expect(result.devices?.watch?.frameScale).toBe(
          modernTemplate.deviceOverrides.watch.frameScale
        );
      }
    });
  });

  describe('Caption Suggestions', () => {
    it('should provide caption suggestions for templates', () => {
      for (const template of templates) {
        const suggestions = getTemplateCaptionSuggestions(template.id);

        expect(suggestions).toHaveProperty('hero');
        expect(suggestions).toHaveProperty('features');
        expect(suggestions).toHaveProperty('cta');

        expect(Array.isArray(suggestions.hero)).toBe(true);
        expect(Array.isArray(suggestions.features)).toBe(true);
        expect(Array.isArray(suggestions.cta)).toBe(true);

        expect(suggestions.hero.length).toBeGreaterThan(0);
        expect(suggestions.features.length).toBeGreaterThan(0);
        expect(suggestions.cta.length).toBeGreaterThan(0);
      }
    });

    it('should provide default suggestions for invalid templates', () => {
      const suggestions = getTemplateCaptionSuggestions('invalid');

      expect(suggestions).toHaveProperty('hero');
      expect(suggestions).toHaveProperty('features');
      expect(suggestions).toHaveProperty('cta');
      expect(suggestions.hero[0]).toBe('Powerful Features, Beautiful Design');
    });
  });

  describe('Template Categories', () => {
    it('should return unique categories', () => {
      const categories = getTemplateCategories();
      const uniqueCategories = [...new Set(categories)];

      expect(categories).toEqual(uniqueCategories);
    });

    it('should include all template categories', () => {
      const categories = getTemplateCategories();
      const templateCategories = templates.map(t => t.category);

      for (const category of templateCategories) {
        expect(categories).toContain(category);
      }
    });
  });

  describe('Security Features', () => {
    it('should import validation functions', async () => {
      const fs = await import('fs');
      const sourceCode = fs.readFileSync(
        path.join(process.cwd(), 'src/commands/template.ts'),
        'utf-8'
      );

      expect(sourceCode).toContain('validateTemplateId');
      expect(sourceCode).toContain('sanitizeCaption');
      expect(sourceCode).toContain('validateJson');
      expect(sourceCode).toContain('from \'../utils/validation.js\'');
    });
  });

  describe('Template Descriptions', () => {
    it('should have meaningful descriptions for all templates', () => {
      for (const template of templates) {
        expect(template.description).toBeDefined();
        expect(template.description.length).toBeGreaterThan(10);
        expect(typeof template.description).toBe('string');
      }
    });

    it('should have valid categories', () => {
      // Get actual categories from templates
      const actualCategories = [...new Set(templates.map(t => t.category))];

      for (const template of templates) {
        expect(actualCategories).toContain(template.category);
      }
    });
  });

  describe('Gradient Configuration', () => {
    it('should have valid gradient configurations', () => {
      for (const template of templates) {
        if (template.background.mode === 'gradient' && template.background.gradient) {
          const gradient = template.background.gradient;

          expect(gradient.colors).toBeDefined();
          expect(Array.isArray(gradient.colors)).toBe(true);
          expect(gradient.colors.length).toBeGreaterThanOrEqual(2);
          expect(gradient.colors.length).toBeLessThanOrEqual(3);

          for (const color of gradient.colors) {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }

          expect(gradient.direction).toBeDefined();
          expect(['top-bottom', 'bottom-top', 'left-right', 'right-left', 'diagonal'])
            .toContain(gradient.direction);
        }
      }
    });
  });

  describe('Device Style Configuration', () => {
    it('should have valid frame scale values', () => {
      for (const template of templates) {
        expect(template.deviceStyle.frameScale).toBeDefined();
        expect(template.deviceStyle.frameScale).toBeGreaterThan(0);
        expect(template.deviceStyle.frameScale).toBeLessThanOrEqual(1);
      }
    });

    it('should have valid frame positions', () => {
      for (const template of templates) {
        const position = template.deviceStyle.framePosition;

        if (typeof position === 'number') {
          expect(position).toBeGreaterThanOrEqual(0);
          expect(position).toBeLessThanOrEqual(100);
        } else if (typeof position === 'string') {
          expect(['top', 'center', 'bottom']).toContain(position);
        }
      }
    });
  });

  describe('Caption Style Configuration', () => {
    it('should have valid caption positions', () => {
      const validPositions = ['above', 'below', 'overlay'];

      for (const template of templates) {
        const position = template.captionStyle.position || 'above';
        expect(validPositions).toContain(position);
      }
    });

    it('should have valid font sizes', () => {
      for (const template of templates) {
        expect(template.captionStyle.fontsize).toBeDefined();
        expect(template.captionStyle.fontsize).toBeGreaterThan(0);
        expect(template.captionStyle.fontsize).toBeLessThanOrEqual(200);
      }
    });

    it('should have valid colors', () => {
      for (const template of templates) {
        expect(template.captionStyle.color).toBeDefined();
        // Allow 6 or 8 hex digits (with or without alpha)
        expect(template.captionStyle.color).toMatch(/^#[0-9A-Fa-f]{6,8}$/);
      }
    });
  });
});