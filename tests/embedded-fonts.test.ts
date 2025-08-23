import { describe, it, expect, beforeEach } from 'vitest';
import { FontService } from '../src/services/fonts.js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

describe('Embedded Fonts', () => {
  let fontService: FontService;

  beforeEach(() => {
    fontService = FontService.getInstance();
  });

  describe('getEmbeddedFonts', () => {
    it('should return list of embedded fonts', async () => {
      const embeddedFonts = await fontService.getEmbeddedFonts();
      
      // Should have at least some embedded fonts
      expect(embeddedFonts.length).toBeGreaterThan(0);
      
      // Check for expected fonts
      const fontNames = embeddedFonts.map(f => f.name);
      expect(fontNames).toContain('Inter');
      expect(fontNames).toContain('Poppins');
      expect(fontNames).toContain('Montserrat');
      expect(fontNames).toContain('DM Sans');
      expect(fontNames).toContain('Roboto');
      expect(fontNames).toContain('Open Sans');
      expect(fontNames).toContain('Lato');
      expect(fontNames).toContain('Work Sans');
    });

    it('should have correct properties for embedded fonts', async () => {
      const embeddedFonts = await fontService.getEmbeddedFonts();
      
      for (const font of embeddedFonts) {
        expect(font.category).toBe('embedded');
        expect(font.embedded).toBe(true);
        expect(font.installed).toBe(false);
        expect(font.path).toBeDefined();
        expect(font.fallback).toBeDefined();
        
        // Check that the font file actually exists
        if (font.path) {
          expect(existsSync(font.path)).toBe(true);
        }
      }
    });

    it('should cache embedded fonts after first call', async () => {
      const firstCall = await fontService.getEmbeddedFonts();
      const secondCall = await fontService.getEmbeddedFonts();
      
      // Should return the same reference (cached)
      expect(firstCall).toBe(secondCall);
    });
  });

  describe('isFontAvailable', () => {
    it('should return true for embedded fonts', async () => {
      const isAvailable = await fontService.isFontAvailable('Inter');
      expect(isAvailable).toBe(true);
    });

    it('should check embedded fonts before system fonts', async () => {
      // Even if a font is not installed on the system, 
      // it should be available if embedded
      const embeddedFonts = await fontService.getEmbeddedFonts();
      
      for (const font of embeddedFonts) {
        const isAvailable = await fontService.isFontAvailable(font.name);
        expect(isAvailable).toBe(true);
      }
    });

    it('should be case-insensitive', async () => {
      expect(await fontService.isFontAvailable('inter')).toBe(true);
      expect(await fontService.isFontAvailable('INTER')).toBe(true);
      expect(await fontService.isFontAvailable('Inter')).toBe(true);
    });
  });

  describe('getFontStatusWithEmbedded', () => {
    it('should return embedded status for embedded fonts', async () => {
      const status = await fontService.getFontStatusWithEmbedded('Inter');
      
      expect(status.embedded).toBe(true);
      expect(status.category).toBe('embedded');
      expect(status.path).toBeDefined();
      expect(status.installed).toBe(false);
    });

    it('should return path to font file', async () => {
      const status = await fontService.getFontStatusWithEmbedded('Poppins');
      
      expect(status.path).toBeDefined();
      if (status.path) {
        expect(status.path).toContain('Poppins');
        expect(status.path).toMatch(/\.(ttf|otf)$/);
        expect(existsSync(status.path)).toBe(true);
      }
    });

    it('should handle non-embedded fonts', async () => {
      const status = await fontService.getFontStatusWithEmbedded('NonExistentFont');
      
      expect(status.embedded).toBeUndefined();
      expect(status.path).toBeUndefined();
      // Should still have fallback
      expect(status.fallback).toBeDefined();
    });
  });

  describe('getAllAvailableFonts', () => {
    it('should include embedded fonts with highest priority', async () => {
      const allFonts = await fontService.getAllAvailableFonts();
      
      // Find Inter font in the list
      const interFont = allFonts.find(f => f.name === 'Inter');
      expect(interFont).toBeDefined();
      expect(interFont?.embedded).toBe(true);
      expect(interFont?.category).toBe('embedded');
    });

    it('should deduplicate fonts by name', async () => {
      const allFonts = await fontService.getAllAvailableFonts();
      
      // Check that each font name appears only once
      const fontNames = allFonts.map(f => f.name.toLowerCase());
      const uniqueNames = new Set(fontNames);
      expect(fontNames.length).toBe(uniqueNames.size);
    });

    it('should mark fonts as both embedded and installed if applicable', async () => {
      const allFonts = await fontService.getAllAvailableFonts();
      
      // Arial should be installed on most systems but not embedded
      const arial = allFonts.find(f => f.name === 'Arial');
      if (arial) {
        expect(arial.embedded).not.toBe(true);
      }
      
      // Inter should be embedded
      const inter = allFonts.find(f => f.name === 'Inter');
      expect(inter?.embedded).toBe(true);
    });
  });

  describe('Font file structure', () => {
    it('should have proper directory structure', () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const fontsDir = join(__dirname, '..', 'fonts');
      
      expect(existsSync(fontsDir)).toBe(true);
      
      // Check each font directory
      const expectedFonts = ['Inter', 'Poppins', 'Montserrat', 'DMSans', 'Roboto', 'OpenSans', 'Lato', 'WorkSans'];
      for (const fontDir of expectedFonts) {
        const fontPath = join(fontsDir, fontDir);
        expect(existsSync(fontPath)).toBe(true);
      }
    });

    it('should have license files for each font', () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const fontsDir = join(__dirname, '..', 'fonts');
      
      const fontDirs = ['Inter', 'Poppins', 'Montserrat', 'DMSans', 'Roboto', 'OpenSans', 'Lato', 'WorkSans'];
      
      for (const fontDir of fontDirs) {
        const fontPath = join(fontsDir, fontDir);
        // Look for any license file
        const hasLicense = existsSync(join(fontPath, 'LICENSE.txt')) ||
                          existsSync(join(fontPath, `${fontDir}-LICENSE.txt`)) ||
                          existsSync(join(fontPath, 'OFL.txt'));
        
        expect(hasLicense).toBe(true);
      }
    });
  });
});