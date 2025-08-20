import { describe, it, expect } from 'vitest';
import { 
  gradientPresets, 
  getGradientPreset, 
  getGradientsByCategory,
  getGradientCategories 
} from '../src/core/gradient-presets.js';

describe('gradient-presets', () => {
  describe('gradientPresets', () => {
    it('should have at least 20 presets', () => {
      expect(gradientPresets.length).toBeGreaterThanOrEqual(20);
    });

    it('should have valid gradient structure', () => {
      gradientPresets.forEach(gradient => {
        expect(gradient).toHaveProperty('id');
        expect(gradient).toHaveProperty('name');
        expect(gradient).toHaveProperty('description');
        expect(gradient).toHaveProperty('colors');
        expect(gradient).toHaveProperty('direction');
        expect(gradient).toHaveProperty('category');
        
        // Validate colors are hex codes
        gradient.colors.forEach(color => {
          expect(color).toMatch(/^#[0-9A-F]{6}$/i);
        });
        
        // Validate direction
        expect(['top-bottom', 'bottom-top', 'left-right', 'right-left', 'diagonal'])
          .toContain(gradient.direction);
        
        // Validate category
        expect(['warm', 'cool', 'vibrant', 'subtle', 'monochrome', 'brand'])
          .toContain(gradient.category);
      });
    });

    it('should have unique IDs', () => {
      const ids = gradientPresets.map(g => g.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds.length).toBe(ids.length);
    });
  });

  describe('getGradientPreset', () => {
    it('should return gradient by ID', () => {
      const sunset = getGradientPreset('sunset');
      expect(sunset).toBeDefined();
      expect(sunset?.name).toBe('Sunset');
      expect(sunset?.colors).toEqual(['#FF5733', '#FFC300']);
    });

    it('should return undefined for invalid ID', () => {
      const invalid = getGradientPreset('invalid-gradient');
      expect(invalid).toBeUndefined();
    });
  });

  describe('getGradientsByCategory', () => {
    it('should return gradients for valid category', () => {
      const warmGradients = getGradientsByCategory('warm');
      expect(warmGradients.length).toBeGreaterThan(0);
      warmGradients.forEach(g => {
        expect(g.category).toBe('warm');
      });
    });

    it('should return empty array for invalid category', () => {
      const invalid = getGradientsByCategory('invalid-category');
      expect(invalid).toEqual([]);
    });
  });

  describe('getGradientCategories', () => {
    it('should return all unique categories', () => {
      const categories = getGradientCategories();
      expect(categories).toContain('warm');
      expect(categories).toContain('cool');
      expect(categories).toContain('vibrant');
      expect(categories).toContain('subtle');
      expect(categories).toContain('monochrome');
      expect(categories).toContain('brand');
      expect(categories.length).toBe(6);
    });
  });

  describe('specific presets', () => {
    it('should have essential presets', () => {
      const essentialPresets = [
        'sunset', 'ocean', 'neon', 'pastel', 
        'noir', 'instagram', 'arctic', 'tropical'
      ];
      
      essentialPresets.forEach(id => {
        const preset = getGradientPreset(id);
        expect(preset).toBeDefined();
        expect(preset?.colors.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have multi-color gradients', () => {
      const multiColorPresets = gradientPresets.filter(g => g.colors.length > 2);
      expect(multiColorPresets.length).toBeGreaterThan(0);
    });
  });
});