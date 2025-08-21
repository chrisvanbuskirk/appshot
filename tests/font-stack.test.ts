import { describe, it, expect, vi } from 'vitest';
import { getFontStack } from '../src/core/compose.js';

describe('getFontStack function', () => {
  describe('font mapping verification', () => {
    it('should return correct fallback for Arial', () => {
      const result = getFontStack('Arial');
      expect(result).toBe('Arial, Helvetica, sans-serif');
    });

    it('should return correct fallback for Helvetica', () => {
      const result = getFontStack('Helvetica');
      expect(result).toBe("Helvetica, 'Helvetica Neue', Arial, sans-serif");
    });

    it('should return correct fallback for Georgia', () => {
      const result = getFontStack('Georgia');
      expect(result).toBe("Georgia, 'Times New Roman', Times, serif");
    });

    it('should return correct fallback for Times New Roman', () => {
      const result = getFontStack('Times New Roman');
      expect(result).toBe("'Times New Roman', Times, serif");
    });

    it('should return correct fallback for Courier New', () => {
      const result = getFontStack('Courier New');
      expect(result).toBe("'Courier New', Courier, monospace");
    });

    it('should return correct fallback for SF Pro', () => {
      const result = getFontStack('SF Pro');
      expect(result).toBe("system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif");
    });

    it('should return correct fallback for Segoe UI', () => {
      const result = getFontStack('Segoe UI');
      expect(result).toBe("'Segoe UI', system-ui, Tahoma, Geneva, sans-serif");
    });

    it('should be case-insensitive', () => {
      expect(getFontStack('arial')).toBe('Arial, Helvetica, sans-serif');
      expect(getFontStack('ARIAL')).toBe('Arial, Helvetica, sans-serif');
      expect(getFontStack('ArIaL')).toBe('Arial, Helvetica, sans-serif');
    });
  });

  describe('fallback patterns', () => {
    it('should provide serif fallback for serif fonts', () => {
      const result = getFontStack('MySerifFont');
      expect(result).toContain('serif');
      expect(result).not.toContain('sans-serif');
    });

    it('should provide monospace fallback for monospace fonts', () => {
      const result = getFontStack('MyCodeFont');
      expect(result).toContain('monospace');
    });

    it('should provide monospace fallback for fonts with "mono" in name', () => {
      const result = getFontStack('CustomMono');
      expect(result).toContain('monospace');
    });

    it('should provide display fallback for display fonts', () => {
      const result = getFontStack('MyDisplayFont');
      expect(result).toContain('Impact');
    });

    it('should provide display fallback for headline fonts', () => {
      const result = getFontStack('HeadlineFont');
      expect(result).toContain('Impact');
    });

    it('should provide system fallback for unknown fonts', () => {
      const result = getFontStack('RandomUnknownFont');
      expect(result).toContain('system-ui');
      expect(result).toContain('sans-serif');
    });
  });

  describe('quote handling', () => {
    it('should properly quote multi-word font names', () => {
      const result = getFontStack('Times New Roman');
      expect(result).toContain("'Times New Roman'");
    });

    it('should not double-quote single-word fonts', () => {
      const result = getFontStack('Arial');
      expect(result).toBe('Arial, Helvetica, sans-serif');
      expect(result).not.toContain("'Arial'");
    });
  });
});