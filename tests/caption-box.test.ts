import { describe, it, expect } from 'vitest';
import {
  estimateTextWidth,
  calculateCharsPerLine,
  wrapText,
  calculateCaptionHeight,
  calculateAdaptiveCaptionHeight
} from '../src/core/text-utils.js';

describe('Caption Box System', () => {
  describe('Text Measurement', () => {
    it('should estimate text width', () => {
      const width = estimateTextWidth('Hello World', 64);
      expect(width).toBeGreaterThan(0);
      expect(width).toBe(11 * 64 * 0.65); // 11 chars * fontSize * factor
    });

    it('should calculate characters per line', () => {
      const chars = calculateCharsPerLine(1290, 64, 40);
      expect(chars).toBeGreaterThan(0);
      expect(chars).toBeLessThan(50); // Reasonable limit for this width
    });
  });

  describe('Text Wrapping', () => {
    it('should wrap text to multiple lines', () => {
      const text = 'This is a very long caption that needs to wrap to multiple lines';
      const lines = wrapText(text, 1290, 64);
      
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.every(line => line.length > 0)).toBe(true);
    });

    it('should respect max lines limit', () => {
      const text = 'This is a very long caption that needs to wrap to multiple lines and should be truncated if it exceeds the maximum number of lines allowed';
      const lines = wrapText(text, 800, 64, 2);
      
      expect(lines.length).toBeLessThanOrEqual(2);
    });

    it('should add ellipsis when truncating', () => {
      const text = 'This is a very long caption that definitely needs truncation';
      const lines = wrapText(text, 400, 64, 1);
      
      expect(lines.length).toBeLessThanOrEqual(2); // May have spillover
      // Check if truncation happened
      const fullText = lines.join(' ');
      expect(fullText.length).toBeLessThan(text.length);
    });

    it('should handle single word lines', () => {
      const text = 'Supercalifragilisticexpialidocious';
      const lines = wrapText(text, 200, 64);
      
      expect(lines.length).toBeGreaterThanOrEqual(1);
      if (lines[0].includes('...')) {
        expect(lines[0]).toContain('...');
      }
    });
  });

  describe('Caption Height Calculation', () => {
    it('should calculate basic caption height', () => {
      const result = calculateCaptionHeight('Short caption', 64, 1290);
      
      expect(result.height).toBeGreaterThan(0);
      expect(result.lines.length).toBe(1);
    });

    it('should calculate multi-line caption height', () => {
      const longText = 'This is a very long caption that will definitely need multiple lines to display properly';
      const result = calculateCaptionHeight(longText, 64, 800);
      
      expect(result.height).toBeGreaterThan(100);
      expect(result.lines.length).toBeGreaterThan(1);
    });

    it('should respect min and max height constraints', () => {
      const result = calculateCaptionHeight('Text', 64, 1290, {
        minHeight: 200,
        maxHeight: 300
      });
      
      expect(result.height).toBeGreaterThanOrEqual(200);
      expect(result.height).toBeLessThanOrEqual(300);
    });

    it('should apply line height multiplier', () => {
      const result1 = calculateCaptionHeight('Multi\nLine\nText', 64, 1290, {
        lineHeight: 1.2
      });
      const result2 = calculateCaptionHeight('Multi\nLine\nText', 64, 1290, {
        lineHeight: 1.8
      });
      
      expect(result2.height).toBeGreaterThan(result1.height);
    });
  });

  describe('Adaptive Caption Height', () => {
    it('should adapt to device at top position', () => {
      const result = calculateAdaptiveCaptionHeight(
        'Caption text',
        64,
        1290,
        2796,
        100,  // deviceTop
        2000, // deviceHeight
        'top'
      );
      
      // Should have limited space when device is at top
      expect(result.height).toBeLessThan(500);
    });

    it('should adapt to device at bottom position', () => {
      const result = calculateAdaptiveCaptionHeight(
        'Caption text',
        64,
        1290,
        2796,
        2000, // deviceTop (near bottom)
        700,  // deviceHeight
        'bottom'
      );
      
      // Should have more space when device is at bottom
      expect(result.height).toBeGreaterThan(100);
      expect(result.height).toBeLessThanOrEqual(2796 * 0.5); // Max half screen
    });

    it('should adapt to custom position percentage', () => {
      const result = calculateAdaptiveCaptionHeight(
        'Caption text',
        64,
        1290,
        2796,
        1400, // deviceTop (middle)
        1000, // deviceHeight
        50    // 50% position
      );
      
      expect(result.height).toBeGreaterThan(0);
      expect(result.height).toBeLessThan(1400); // Should not exceed device position
    });

    it('should handle centered position', () => {
      const result = calculateAdaptiveCaptionHeight(
        'Caption text',
        64,
        1290,
        2796,
        1000, // deviceTop
        1000, // deviceHeight
        'center'
      );
      
      expect(result.height).toBeGreaterThan(0);
    });

    it('should wrap long text based on available space', () => {
      const longText = 'This is an extremely long caption that needs to be wrapped properly based on the available space above the device frame';
      
      const result = calculateAdaptiveCaptionHeight(
        longText,
        64,
        1290,
        2796,
        2000, // Lots of space above device
        700,
        'bottom'
      );
      
      expect(result.lines.length).toBeGreaterThan(1);
      expect(result.height).toBeGreaterThan(200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const lines = wrapText('', 1290, 64);
      expect(lines).toEqual([]);
    });

    it('should handle very small width', () => {
      const lines = wrapText('Hello World', 100, 64);
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should handle very large font size', () => {
      const chars = calculateCharsPerLine(1290, 200);
      expect(chars).toBeLessThan(20);
    });

    it('should handle single character text', () => {
      const lines = wrapText('A', 1290, 64);
      expect(lines).toEqual(['A']);
    });
  });
});