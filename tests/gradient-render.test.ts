import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { renderGradient } from '../src/core/render.js';
import { gradientPresets } from '../src/core/gradient-presets.js';

describe('gradient rendering', () => {
  describe('renderGradient', () => {
    it('should render gradient with correct dimensions', async () => {
      const width = 400;
      const height = 800;
      const gradient = {
        colors: ['#FF0000', '#00FF00'],
        direction: 'top-bottom' as const
      };

      const buffer = await renderGradient(width, height, gradient);
      const metadata = await sharp(buffer).metadata();

      expect(metadata.width).toBe(width);
      expect(metadata.height).toBe(height);
      expect(metadata.format).toBe('png');
    });

    it('should render all preset gradients without errors', async () => {
      const testPromises = gradientPresets.map(async (preset) => {
        const buffer = await renderGradient(200, 400, {
          colors: preset.colors,
          direction: preset.direction
        });

        const metadata = await sharp(buffer).metadata();
        expect(metadata.width).toBe(200);
        expect(metadata.height).toBe(400);
      });

      await Promise.all(testPromises);
    });

    it('should handle multi-color gradients', async () => {
      const gradient = {
        colors: ['#FF0000', '#00FF00', '#0000FF'],
        direction: 'left-right' as const
      };

      const buffer = await renderGradient(300, 300, gradient);
      const metadata = await sharp(buffer).metadata();

      expect(metadata.width).toBe(300);
      expect(metadata.height).toBe(300);
    });

    it('should handle all gradient directions', async () => {
      const directions = ['top-bottom', 'bottom-top', 'left-right', 'right-left', 'diagonal'] as const;
      
      for (const direction of directions) {
        const buffer = await renderGradient(100, 100, {
          colors: ['#000000', '#FFFFFF'],
          direction
        });

        const metadata = await sharp(buffer).metadata();
        expect(metadata.width).toBe(100);
        expect(metadata.height).toBe(100);
      }
    });

    it('should create valid PNG buffer', async () => {
      const buffer = await renderGradient(100, 100, {
        colors: ['#FF5733', '#FFC300'],
        direction: 'diagonal'
      });

      // Check PNG signature
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4E);
      expect(buffer[3]).toBe(0x47);
    });
  });

  describe('gradient preset rendering', () => {
    it('should render warm gradients correctly', async () => {
      const warmGradients = gradientPresets.filter(g => g.category === 'warm');
      
      for (const gradient of warmGradients) {
        const buffer = await renderGradient(150, 150, {
          colors: gradient.colors,
          direction: gradient.direction
        });

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      }
    });

    it('should handle brand gradients with multiple colors', async () => {
      const instagramGradient = gradientPresets.find(g => g.id === 'instagram');
      expect(instagramGradient).toBeDefined();
      
      if (instagramGradient) {
        const buffer = await renderGradient(200, 200, {
          colors: instagramGradient.colors,
          direction: instagramGradient.direction
        });

        const metadata = await sharp(buffer).metadata();
        expect(metadata.channels).toBeGreaterThanOrEqual(3); // RGB or RGBA
      }
    });
  });
});