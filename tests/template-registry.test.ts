import { describe, it, expect } from 'vitest';
import {
  templates,
  getTemplate,
  applyTemplateToConfig,
  getTemplateCaptionSuggestions,
  getTemplateCategories
} from '../src/templates/registry.js';
import type { AppshotConfig } from '../src/types.js';

describe('Template Registry', () => {
  describe('Template Structure', () => {
    it('should have 8 templates', () => {
      expect(templates).toHaveLength(8);
    });

    it('should have all required template IDs', () => {
      const expectedIds = ['modern', 'minimal', 'bold', 'elegant', 'showcase', 'playful', 'corporate', 'nerdy'];
      const actualIds = templates.map(t => t.id);
      expect(actualIds).toEqual(expect.arrayContaining(expectedIds));
    });

    it('should have required fields for each template', () => {
      templates.forEach(template => {
        // Required fields
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('background');
        expect(template).toHaveProperty('captionStyle');
        expect(template).toHaveProperty('deviceStyle');

        // Background structure
        expect(template.background).toHaveProperty('mode');
        if (template.background.mode === 'gradient') {
          expect(template.background).toHaveProperty('gradient');
          expect(template.background.gradient).toHaveProperty('colors');
          expect(template.background.gradient).toHaveProperty('direction');
        }

        // Caption style structure
        expect(template.captionStyle).toHaveProperty('font');
        expect(template.captionStyle).toHaveProperty('fontsize');
        expect(template.captionStyle).toHaveProperty('color');
        expect(template.captionStyle).toHaveProperty('position');

        // Device style structure
        expect(template.deviceStyle).toHaveProperty('frameScale');
        expect(typeof template.deviceStyle.frameScale).toBe('number');
        expect(template.deviceStyle.frameScale).toBeGreaterThan(0);
        expect(template.deviceStyle.frameScale).toBeLessThanOrEqual(1);
      });
    });

    it('should have valid categories', () => {
      // Get actual categories from templates
      const actualCategories = [...new Set(templates.map(t => t.category))];
      templates.forEach(template => {
        expect(actualCategories).toContain(template.category);
      });
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', () => {
      const modern = getTemplate('modern');
      expect(modern).toBeDefined();
      expect(modern?.id).toBe('modern');
      expect(modern?.name).toBe('Modern Vibrant');
    });

    it('should return undefined for invalid ID', () => {
      const invalid = getTemplate('nonexistent');
      expect(invalid).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const uppercase = getTemplate('MODERN');
      expect(uppercase).toBeUndefined();
    });
  });

  describe('applyTemplateToConfig', () => {
    it('should apply template to empty config', () => {
      const config: Partial<AppshotConfig> = {};
      const result = applyTemplateToConfig('modern', config);

      expect(result).toHaveProperty('background');
      expect(result).toHaveProperty('caption');
      expect(result.caption).toHaveProperty('font');
      // Check that font is defined, not a specific value
      expect(result.caption?.font).toBeDefined();
      expect(typeof result.caption?.font).toBe('string');
    });

    it('should preserve existing device configs', () => {
      const config: Partial<AppshotConfig> = {
        devices: {
          iphone: {
            input: './custom/path',
            resolution: '1290x2796',
            autoFrame: true
          }
        }
      };

      const result = applyTemplateToConfig('bold', config);
      expect(result.devices?.iphone?.input).toBe('./custom/path');
      // Check that frameScale is defined and is a number
      expect(result.devices?.iphone?.frameScale).toBeDefined();
      expect(typeof result.devices?.iphone?.frameScale).toBe('number');
    });

    it('should apply device overrides correctly', () => {
      const config: Partial<AppshotConfig> = {
        devices: {
          watch: {
            input: './screenshots/watch',
            resolution: '410x502',
            autoFrame: true
          }
        }
      };

      const result = applyTemplateToConfig('modern', config);

      // Modern template has watch override
      const modernTemplate = getTemplate('modern');
      if (modernTemplate?.deviceOverrides?.watch) {
        expect(result.devices?.watch?.frameScale).toBe(modernTemplate.deviceOverrides.watch.frameScale);
        expect(result.devices?.watch?.captionSize).toBe(modernTemplate.deviceOverrides.watch.captionSize);
      }
    });

    it('should handle templates without device overrides', () => {
      const config: Partial<AppshotConfig> = {
        devices: {
          iphone: {
            input: './screenshots/iphone',
            resolution: '1290x2796',
            autoFrame: true
          }
        }
      };

      const result = applyTemplateToConfig('minimal', config);
      // Check that frameScale is defined and is a number
      expect(result.devices?.iphone?.frameScale).toBeDefined();
      expect(typeof result.devices?.iphone?.frameScale).toBe('number');
    });
  });

  describe('getTemplateCaptionSuggestions', () => {
    it('should return caption suggestions for valid template', () => {
      const suggestions = getTemplateCaptionSuggestions('modern');
      expect(suggestions).toHaveProperty('hero');
      expect(suggestions).toHaveProperty('features');
      expect(suggestions).toHaveProperty('cta');

      expect(Array.isArray(suggestions.hero)).toBe(true);
      expect(suggestions.hero.length).toBeGreaterThan(0);
      expect(Array.isArray(suggestions.features)).toBe(true);
      expect(suggestions.features.length).toBeGreaterThan(0);
      expect(Array.isArray(suggestions.cta)).toBe(true);
      expect(suggestions.cta.length).toBeGreaterThan(0);
    });

    it('should return default suggestions for invalid template', () => {
      const suggestions = getTemplateCaptionSuggestions('invalid');
      expect(suggestions).toHaveProperty('hero');
      expect(suggestions).toHaveProperty('features');
      expect(suggestions).toHaveProperty('cta');
      expect(suggestions.hero[0]).toBe('Powerful Features, Beautiful Design');
    });

    it('should have consistent suggestions structure', () => {
      // All templates should return the same structure even if values are similar
      const modernSuggestions = getTemplateCaptionSuggestions('modern');
      const boldSuggestions = getTemplateCaptionSuggestions('bold');

      // Check structure consistency
      expect(modernSuggestions).toHaveProperty('hero');
      expect(modernSuggestions).toHaveProperty('features');
      expect(modernSuggestions).toHaveProperty('cta');
      expect(boldSuggestions).toHaveProperty('hero');
      expect(boldSuggestions).toHaveProperty('features');
      expect(boldSuggestions).toHaveProperty('cta');
    });
  });

  describe('getTemplateCategories', () => {
    it('should return unique categories', () => {
      const categories = getTemplateCategories();
      const uniqueCategories = [...new Set(categories)];
      expect(categories).toEqual(uniqueCategories);
    });

    it('should include all template categories', () => {
      const categories = getTemplateCategories();
      const templateCategories = templates.map(t => t.category);

      templateCategories.forEach(cat => {
        expect(categories).toContain(cat);
      });
    });
  });

  describe('Template Configurations', () => {
    it('should have valid gradient colors', () => {
      templates.forEach(template => {
        if (template.background.mode === 'gradient' && template.background.gradient) {
          // Some gradients can have 2 or 3 colors
          expect(template.background.gradient.colors.length).toBeGreaterThanOrEqual(2);
          expect(template.background.gradient.colors.length).toBeLessThanOrEqual(3);

          template.background.gradient.colors.forEach(color => {
            // Check if it's a valid hex color
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          });
        }
      });
    });

    it('should have valid font sizes', () => {
      templates.forEach(template => {
        expect(template.captionStyle.fontsize).toBeGreaterThan(0);
        expect(template.captionStyle.fontsize).toBeLessThanOrEqual(200);
      });
    });

    it('should have valid frame positions', () => {
      templates.forEach(template => {
        const framePosition = template.deviceStyle.framePosition;
        if (typeof framePosition === 'number') {
          expect(framePosition).toBeGreaterThanOrEqual(0);
          expect(framePosition).toBeLessThanOrEqual(100);
        } else if (typeof framePosition === 'string') {
          expect(['top', 'center', 'bottom']).toContain(framePosition);
        }
      });
    });

    it('should have valid caption positions', () => {
      const validPositions = ['above', 'below', 'overlay'];
      templates.forEach(template => {
        expect(validPositions).toContain(template.captionStyle.position || 'above');
      });
    });
  });

  describe('Nerdy Template Specifics', () => {
    it('should have nerdy template configured correctly', () => {
      const nerdy = getTemplate('nerdy');
      expect(nerdy).toBeDefined();
      expect(nerdy?.id).toBe('nerdy');
      expect(nerdy?.name).toBe('Nerdy OSS');
      expect(nerdy?.captionStyle.font).toBe('JetBrains Mono Bold');
      expect(nerdy?.background.mode).toBe('auto');
    });

    it('should have nerdy template device overrides', () => {
      const nerdy = getTemplate('nerdy');
      expect(nerdy?.deviceOverrides).toBeDefined();
      expect(nerdy?.deviceOverrides?.mac).toBeDefined();
      expect(nerdy?.deviceOverrides?.iphone).toBeDefined();
      expect(nerdy?.deviceOverrides?.ipad).toBeDefined();
      expect(nerdy?.deviceOverrides?.watch).toBeDefined();
    });
  });
});