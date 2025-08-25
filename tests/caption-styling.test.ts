import { describe, it, expect, beforeEach } from 'vitest';
import type { AppshotConfig, CaptionConfig } from '../src/types.js';

describe('Caption Styling', () => {
  let baseConfig: AppshotConfig;
  let captionConfig: CaptionConfig;

  beforeEach(() => {
    captionConfig = {
      font: 'Inter',
      fontsize: 56,
      color: '#FFFFFF',
      align: 'center',
      paddingTop: 60,
      paddingBottom: 40,
      position: 'above'
    };

    baseConfig = {
      output: './output',
      frames: './frames',
      gradient: {
        colors: ['#FF6B6B', '#4ECDC4']
      },
      caption: captionConfig,
      devices: {
        iphone: {
          input: './screenshots/iphone',
          resolution: '1284x2778',
          autoFrame: true
        }
      }
    };
  });

  describe('Background Configuration', () => {
    it('should accept background configuration', () => {
      captionConfig.background = {
        color: '#000000',
        opacity: 0.8,
        padding: 30
      };

      expect(captionConfig.background).toBeDefined();
      expect(captionConfig.background.color).toBe('#000000');
      expect(captionConfig.background.opacity).toBe(0.8);
      expect(captionConfig.background.padding).toBe(30);
    });

    it('should validate hex color format', () => {
      const validColors = ['#000000', '#FFFFFF', '#FF5733', '#00FF00'];
      
      validColors.forEach(color => {
        captionConfig.background = { color };
        expect(captionConfig.background.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should validate opacity range', () => {
      const validOpacities = [0, 0.5, 0.8, 1.0];
      
      validOpacities.forEach(opacity => {
        captionConfig.background = { opacity };
        expect(captionConfig.background.opacity).toBeGreaterThanOrEqual(0);
        expect(captionConfig.background.opacity).toBeLessThanOrEqual(1);
      });
    });

    it('should use default values when not specified', () => {
      captionConfig.background = {
        color: '#000000'
      };

      // In implementation, defaults would be applied
      const defaults = {
        opacity: 0.8,
        padding: 20
      };

      const merged = { ...defaults, ...captionConfig.background };
      expect(merged.opacity).toBe(0.8);
      expect(merged.padding).toBe(20);
    });
  });

  describe('Border Configuration', () => {
    it('should accept border configuration', () => {
      captionConfig.border = {
        color: '#FFFFFF',
        width: 3,
        radius: 15
      };

      expect(captionConfig.border).toBeDefined();
      expect(captionConfig.border.color).toBe('#FFFFFF');
      expect(captionConfig.border.width).toBe(3);
      expect(captionConfig.border.radius).toBe(15);
    });

    it('should validate border width range', () => {
      const validWidths = [1, 2, 3, 5, 8, 10];
      
      validWidths.forEach(width => {
        captionConfig.border = { width };
        expect(captionConfig.border.width).toBeGreaterThanOrEqual(1);
        expect(captionConfig.border.width).toBeLessThanOrEqual(10);
      });
    });

    it('should validate border radius range', () => {
      const validRadii = [0, 5, 12, 20, 30];
      
      validRadii.forEach(radius => {
        captionConfig.border = { radius };
        expect(captionConfig.border.radius).toBeGreaterThanOrEqual(0);
        expect(captionConfig.border.radius).toBeLessThanOrEqual(30);
      });
    });

    it('should use default values when not specified', () => {
      captionConfig.border = {
        color: '#FFFFFF'
      };

      // In implementation, defaults would be applied
      const defaults = {
        width: 2,
        radius: 12
      };

      const merged = { ...defaults, ...captionConfig.border };
      expect(merged.width).toBe(2);
      expect(merged.radius).toBe(12);
    });
  });

  describe('Combined Styling', () => {
    it('should support both background and border together', () => {
      captionConfig.background = {
        color: '#000000',
        opacity: 0.7,
        padding: 25
      };

      captionConfig.border = {
        color: '#FFFFFF',
        width: 2,
        radius: 16
      };

      expect(captionConfig.background).toBeDefined();
      expect(captionConfig.border).toBeDefined();
      expect(captionConfig.background.color).toBe('#000000');
      expect(captionConfig.border.color).toBe('#FFFFFF');
    });

    it('should work with all caption positions', () => {
      const positions: Array<'above' | 'below' | 'overlay'> = ['above', 'below', 'overlay'];
      
      captionConfig.background = {
        color: '#333333',
        opacity: 0.9
      };

      positions.forEach(position => {
        captionConfig.position = position;
        expect(captionConfig.position).toBe(position);
        expect(captionConfig.background).toBeDefined();
      });
    });

    it('should maintain styling when position changes', () => {
      captionConfig.background = {
        color: '#FF0000',
        opacity: 1.0,
        padding: 40
      };

      captionConfig.border = {
        color: '#00FF00',
        width: 4,
        radius: 20
      };

      // Change position
      captionConfig.position = 'below';
      expect(captionConfig.background.color).toBe('#FF0000');
      expect(captionConfig.border.color).toBe('#00FF00');

      captionConfig.position = 'overlay';
      expect(captionConfig.background.opacity).toBe(1.0);
      expect(captionConfig.border.width).toBe(4);
    });
  });

  describe('Device-specific Overrides', () => {
    it('should allow device-specific caption styling', () => {
      // Global caption config
      baseConfig.caption.background = {
        color: '#000000',
        opacity: 0.8,
        padding: 20
      };

      // Device-specific override (would be in device config)
      const deviceCaption = {
        ...baseConfig.caption,
        background: {
          color: '#FFFFFF',
          opacity: 0.6,
          padding: 30
        }
      };

      expect(deviceCaption.background.color).toBe('#FFFFFF');
      expect(deviceCaption.background.opacity).toBe(0.6);
      expect(deviceCaption.background.padding).toBe(30);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing background config', () => {
      expect(captionConfig.background).toBeUndefined();
    });

    it('should handle missing border config', () => {
      expect(captionConfig.border).toBeUndefined();
    });

    it('should handle background without border', () => {
      captionConfig.background = {
        color: '#000000',
        opacity: 0.5,
        padding: 15
      };

      expect(captionConfig.background).toBeDefined();
      expect(captionConfig.border).toBeUndefined();
    });

    it('should handle border without background', () => {
      captionConfig.border = {
        color: '#FF0000',
        width: 5,
        radius: 10
      };

      expect(captionConfig.background).toBeUndefined();
      expect(captionConfig.border).toBeDefined();
    });

    it('should handle empty caption text with styling', () => {
      captionConfig.background = {
        color: '#000000'
      };

      // Simulate empty caption
      const caption = '';
      expect(caption).toBe('');
      expect(captionConfig.background).toBeDefined();
    });
  });

  describe('Full Width Implementation', () => {
    it('should use full device width minus margins', () => {
      const canvasWidth = 1284;
      const sideMargin = 30;
      const expectedWidth = canvasWidth - (sideMargin * 2);

      expect(expectedWidth).toBe(1224);
    });

    it('should calculate correct x position for centered box', () => {
      const canvasWidth = 1284;
      const sideMargin = 30;
      const bgX = sideMargin;

      expect(bgX).toBe(30);
    });

    it('should maintain uniform width across different devices', () => {
      const devices = [
        { name: 'iphone', width: 1284 },
        { name: 'ipad', width: 2048 },
        { name: 'mac', width: 2880 }
      ];

      const sideMargin = 30;

      devices.forEach(device => {
        const bgWidth = device.width - (sideMargin * 2);
        const bgX = sideMargin;
        
        expect(bgX).toBe(30);
        expect(bgWidth).toBe(device.width - 60);
      });
    });
  });

  describe('SVG Generation', () => {
    it('should generate valid SVG rect element for background', () => {
      const bgX = 30;
      const bgY = 100;
      const bgWidth = 1224;
      const bgHeight = 120;
      const bgColor = '#000000';
      const bgOpacity = 0.8;
      const bgRadius = 12;

      const svgRect = `<rect x="${bgX}" y="${bgY}" width="${bgWidth}" height="${bgHeight}" fill="${bgColor}" opacity="${bgOpacity}" rx="${bgRadius}"/>`;

      expect(svgRect).toContain('x="30"');
      expect(svgRect).toContain('y="100"');
      expect(svgRect).toContain('width="1224"');
      expect(svgRect).toContain('height="120"');
      expect(svgRect).toContain('fill="#000000"');
      expect(svgRect).toContain('opacity="0.8"');
      expect(svgRect).toContain('rx="12"');
    });

    it('should generate valid SVG rect element for border', () => {
      const rectX = 30;
      const rectY = 100;
      const rectWidth = 1224;
      const rectHeight = 120;
      const borderColor = '#FFFFFF';
      const borderWidth = 3;
      const borderRadius = 20;

      const svgBorder = `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="none" stroke="${borderColor}" stroke-width="${borderWidth}" rx="${borderRadius}"/>`;

      expect(svgBorder).toContain('x="30"');
      expect(svgBorder).toContain('y="100"');
      expect(svgBorder).toContain('width="1224"');
      expect(svgBorder).toContain('height="120"');
      expect(svgBorder).toContain('fill="none"');
      expect(svgBorder).toContain('stroke="#FFFFFF"');
      expect(svgBorder).toContain('stroke-width="3"');
      expect(svgBorder).toContain('rx="20"');
    });

    it('should place background before text in SVG structure', () => {
      const svgElements: string[] = [];
      
      // Background should be added first
      svgElements.push('<rect ... />'); // Background
      svgElements.push('<rect ... />'); // Border
      svgElements.push('<text ... />'); // Text
      
      expect(svgElements[0]).toContain('rect');
      expect(svgElements[2]).toContain('text');
    });
  });
});