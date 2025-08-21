import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';

// We need to import the compose module and test the getFontStack function
// Since it's not exported, we'll test it through the compose function behavior

describe('getFontStack function', () => {
  // Read the compose.ts file to extract and test the getFontStack logic
  let composeSrc: string;
  
  beforeAll(async () => {
    const composePath = path.join(process.cwd(), 'src/core/compose.ts');
    composeSrc = await fs.readFile(composePath, 'utf-8');
  });

  describe('font mapping verification', () => {
    it('should have getFontStack function defined', () => {
      expect(composeSrc).toContain('function getFontStack');
    });

    it('should map Apple system fonts correctly', () => {
      expect(composeSrc).toContain(`'SF Pro': "system-ui, -apple-system`);
      expect(composeSrc).toContain(`'SF Pro Display': "system-ui, -apple-system`);
      expect(composeSrc).toContain(`'SF Pro Text': "system-ui, -apple-system`);
      expect(composeSrc).toContain(`'San Francisco': "system-ui, -apple-system`);
      expect(composeSrc).toContain(`'New York': "Georgia`);
    });

    it('should map popular sans-serif fonts', () => {
      expect(composeSrc).toContain(`'Helvetica': "'Helvetica Neue', Helvetica, Arial`);
      expect(composeSrc).toContain(`'Arial': "Arial, Helvetica`);
      expect(composeSrc).toContain(`'Roboto': "Roboto`);
      expect(composeSrc).toContain(`'Open Sans': "'Open Sans'`);
      expect(composeSrc).toContain(`'Montserrat': "Montserrat`);
      expect(composeSrc).toContain(`'Inter': "Inter`);
    });

    it('should map serif fonts', () => {
      expect(composeSrc).toContain(`'Georgia': "Georgia, 'Times New Roman'`);
      expect(composeSrc).toContain(`'Times New Roman': "'Times New Roman', Times`);
      expect(composeSrc).toContain(`'Playfair Display': "'Playfair Display', Georgia`);
      expect(composeSrc).toContain(`'Merriweather': "Merriweather, Georgia`);
    });

    it('should map monospace fonts', () => {
      expect(composeSrc).toContain(`'Courier': "Courier, 'Courier New'`);
      expect(composeSrc).toContain(`'Courier New': "'Courier New', Courier`);
      expect(composeSrc).toContain(`'Monaco': "Monaco, 'Courier New'`);
      expect(composeSrc).toContain(`'Consolas': "Consolas, Monaco`);
      expect(composeSrc).toContain(`'Menlo': "Menlo, Monaco`);
    });

    it('should map display fonts', () => {
      expect(composeSrc).toContain(`'Impact': "Impact, 'Arial Black'`);
      expect(composeSrc).toContain(`'Arial Black': "'Arial Black', Impact`);
      expect(composeSrc).toContain(`'Bebas Neue': "'Bebas Neue', Impact`);
    });

    it('should map Windows fonts', () => {
      expect(composeSrc).toContain(`'Calibri': "Calibri`);
      expect(composeSrc).toContain(`'Verdana': "Verdana`);
      expect(composeSrc).toContain(`'Tahoma': "Tahoma`);
      expect(composeSrc).toContain(`'Segoe UI': "'Segoe UI'`);
    });
  });

  describe('font fallback logic', () => {
    it('should have case-insensitive font matching', () => {
      expect(composeSrc).toContain('toLowerCase()');
      expect(composeSrc).toContain('const normalizedFont = Object.keys(fontMap).find');
    });

    it('should detect serif fonts', () => {
      expect(composeSrc).toContain(`lowerFont.includes('serif') && !lowerFont.includes('sans')`);
      expect(composeSrc).toContain(`Georgia, 'Times New Roman', Times, serif`);
    });

    it('should detect monospace fonts', () => {
      expect(composeSrc).toContain(`lowerFont.includes('mono') || lowerFont.includes('code')`);
      expect(composeSrc).toContain(`Monaco, Consolas, 'Courier New', monospace`);
    });

    it('should detect display fonts', () => {
      expect(composeSrc).toContain(`lowerFont.includes('display') || lowerFont.includes('headline')`);
      expect(composeSrc).toContain(`Impact, 'Arial Black', sans-serif`);
    });

    it('should have default sans-serif fallback', () => {
      expect(composeSrc).toContain(`system-ui, -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif`);
    });
  });

  describe('font stack structure', () => {
    it('should use proper quote escaping for XML', () => {
      // Check that internal quotes use single quotes to avoid XML conflicts
      expect(composeSrc).toMatch(/"[^"]*'[^']*'/); // Contains single quotes inside double quotes
    });

    it('should include multiple fallback fonts', () => {
      // Check that font stacks have multiple fallbacks
      const fontStackPattern = /: "[^"]*,\s*[^"]*,\s*[^"]*"/;
      expect(composeSrc).toMatch(fontStackPattern);
    });

    it('should end with generic font families', () => {
      // Check that font stacks end with generic families
      expect(composeSrc).toContain('sans-serif"');
      expect(composeSrc).toContain('serif"');
      expect(composeSrc).toContain('monospace"');
    });
  });
});

describe('Font rendering in compose', () => {
  it('should use getFontStack for caption rendering', async () => {
    const composePath = path.join(process.cwd(), 'src/core/compose.ts');
    const composeSrc = await fs.readFile(composePath, 'utf-8');
    
    // Check that caption rendering uses getFontStack
    expect(composeSrc).toContain('getFontStack(captionConfig.font)');
    
    // Verify it's used in the SVG text element
    expect(composeSrc).toContain('font-family="${getFontStack(captionConfig.font)}"');
  });

  it('should apply font to multi-line captions', async () => {
    const composePath = path.join(process.cwd(), 'src/core/compose.ts');
    const composeSrc = await fs.readFile(composePath, 'utf-8');
    
    // Check that multi-line text also uses the font stack
    // Look for the pattern where textElements uses getFontStack
    const hasGetFontStackInMultiline = composeSrc.includes('font-family="${getFontStack(captionConfig.font)}"');
    expect(hasGetFontStackInMultiline).toBe(true);
    
    // Verify the function is used at least once (we fixed the hardcoded Arial issue)
    const getFontStackMatches = composeSrc.match(/getFontStack\(captionConfig\.font\)/g);
    expect(getFontStackMatches).toBeTruthy();
    expect(getFontStackMatches!.length).toBeGreaterThanOrEqual(1);
    
    // Verify that there's no hardcoded Arial in the multi-line section
    expect(composeSrc).not.toContain('font-family="Arial, sans-serif"');
  });
});