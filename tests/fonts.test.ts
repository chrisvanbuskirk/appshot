import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FontService } from '../src/services/fonts.js';

// Create mock exec function that works with promisify
const createMockExec = () => {
  let responseData = { stdout: JSON.stringify({ SPFontsDataType: [] }), stderr: '' };
  
  const mockExec = vi.fn((cmd: string, options: any, callback?: any) => {
    // Handle both 2-arg and 3-arg versions
    const cb = callback || options;
    if (typeof cb === 'function') {
      cb(null, responseData.stdout, responseData.stderr);
    }
  });
  
  // Add helper to set response
  (mockExec as any).setResponse = (data: any) => {
    responseData = data;
  };
  
  return mockExec;
};

const mockExec = createMockExec();

vi.mock('child_process', () => ({
  exec: mockExec
}));

describe('FontService', () => {
  let fontService: FontService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton instance
    (FontService as any).instance = null;
    fontService = FontService.getInstance();
    
    // Set default response
    (mockExec as any).setResponse({
      stdout: JSON.stringify({ SPFontsDataType: [] }),
      stderr: ''
    });
  });

  describe('isFontInstalled', () => {
    it('should return true for installed fonts', async () => {
      // Mock system fonts
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] },
            { _items: [{ _name: 'Family', display_name0: 'Helvetica' }] }
          ]
        }),
        stderr: ''
      });

      expect(await fontService.isFontInstalled('Arial')).toBe(true);
      expect(await fontService.isFontInstalled('Helvetica')).toBe(true);
    });

    it('should return false for non-installed fonts', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] }
          ]
        }),
        stderr: ''
      });

      expect(await fontService.isFontInstalled('NonExistentFont')).toBe(false);
      expect(await fontService.isFontInstalled('FakeFont')).toBe(false);
    });

    it('should be case-insensitive', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] }
          ]
        }),
        stderr: ''
      });

      expect(await fontService.isFontInstalled('arial')).toBe(true);
      expect(await fontService.isFontInstalled('ARIAL')).toBe(true);
      expect(await fontService.isFontInstalled('ArIaL')).toBe(true);
    });
  });

  describe('validateFont', () => {
    it('should only return true for actually installed fonts', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] }
          ]
        }),
        stderr: ''
      });

      expect(await fontService.validateFont('Arial')).toBe(true);
      expect(await fontService.validateFont('Helvetica')).toBe(false);
      expect(await fontService.validateFont('SF Pro')).toBe(false);
    });

    it('should not return true for recommended fonts that are not installed', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      // Even recommended fonts should return false if not installed
      expect(await fontService.validateFont('Arial')).toBe(false);
      expect(await fontService.validateFont('Helvetica')).toBe(false);
      expect(await fontService.validateFont('Georgia')).toBe(false);
    });
  });

  describe('getFontStatus', () => {
    it('should return correct status for installed fonts', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] }
          ]
        }),
        stderr: ''
      });

      const status = await fontService.getFontStatus('Arial');
      expect(status).toEqual({
        name: 'Arial',
        installed: true,
        fallback: 'Helvetica, sans-serif',
        warning: null
      });
    });

    it('should return correct status with warning for non-installed fonts', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      const status = await fontService.getFontStatus('Roboto');
      expect(status.installed).toBe(false);
      expect(status.warning).toContain('not installed');
      expect(status.fallback).toBeTruthy();
    });

    it('should handle unknown fonts correctly', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      const status = await fontService.getFontStatus('CompletelyUnknownFont');
      expect(status.installed).toBe(false);
      expect(status.warning).toContain('not installed');
      expect(status.fallback).toContain('system-ui');
    });

    it('should provide appropriate warnings for different font categories', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      // Web-safe font
      const arialStatus = await fontService.getFontStatus('Arial');
      expect(arialStatus.warning).toContain('web-safe');

      // Popular font
      const robotoStatus = await fontService.getFontStatus('Roboto');
      expect(robotoStatus.warning).toContain('popular');

      // Unknown font
      const unknownStatus = await fontService.getFontStatus('UnknownFont');
      expect(unknownStatus.warning).toContain('not installed');
    });
  });

  describe('getRecommendedFonts', () => {
    it('should mark installation status for all fonts', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] },
            { _items: [{ _name: 'Family', display_name0: 'Georgia' }] }
          ]
        }),
        stderr: ''
      });

      const fonts = await fontService.getRecommendedFonts();
      const arial = fonts.find(f => f.name === 'Arial');
      const georgia = fonts.find(f => f.name === 'Georgia');
      const roboto = fonts.find(f => f.name === 'Roboto');

      expect(arial?.installed).toBe(true);
      expect(georgia?.installed).toBe(true);
      expect(roboto?.installed).toBe(false);
    });

    it('should correctly categorize fonts', async () => {
      const fonts = await fontService.getRecommendedFonts();
      
      const webSafe = fonts.filter(f => f.category === 'web-safe');
      const popular = fonts.filter(f => f.category === 'popular');
      const system = fonts.filter(f => f.category === 'system');

      expect(webSafe.length).toBeGreaterThan(0);
      expect(popular.length).toBeGreaterThan(0);
      expect(system.length).toBeGreaterThan(0);

      // Check specific fonts are in correct categories
      expect(webSafe.some(f => f.name === 'Arial')).toBe(true);
      expect(popular.some(f => f.name === 'Roboto')).toBe(true);
      expect(system.some(f => f.name === 'SF Pro')).toBe(true);
    });
  });

  describe('getFontCategories', () => {
    it('should separate installed and not installed fonts', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] }
          ]
        }),
        stderr: ''
      });

      const categories = await fontService.getFontCategories();
      
      // Find web-safe category
      const webSafe = categories.find(c => c.name.includes('Web-Safe'));
      expect(webSafe).toBeTruthy();
      
      // Arial should be marked as installed
      const arial = webSafe?.fonts.find(f => f.name === 'Arial');
      expect(arial?.installed).toBe(true);
      
      // Helvetica should not be installed
      const helvetica = webSafe?.fonts.find(f => f.name === 'Helvetica');
      expect(helvetica?.installed).toBe(false);
    });
  });

  describe('getFontFallback', () => {
    it('should return correct fallbacks for known fonts', () => {
      expect(fontService.getFontFallback('Arial')).toBe('Helvetica, sans-serif');
      expect(fontService.getFontFallback('Georgia')).toBe("'Times New Roman', serif");
      expect(fontService.getFontFallback('Courier New')).toBe('Courier, monospace');
    });

    it('should provide intelligent fallbacks for unknown fonts', () => {
      // Serif font
      const serifFallback = fontService.getFontFallback('MySerifFont');
      expect(serifFallback).toContain('serif');
      
      // Monospace font
      const monoFallback = fontService.getFontFallback('MyCodeFont');
      expect(monoFallback).toContain('monospace');
      
      // Display font
      const displayFallback = fontService.getFontFallback('MyDisplayFont');
      expect(displayFallback).toContain('Impact');
      
      // Default sans-serif
      const defaultFallback = fontService.getFontFallback('RandomFont');
      expect(defaultFallback).toContain('system-ui');
    });

    it('should be case-insensitive', () => {
      expect(fontService.getFontFallback('arial')).toBe('Helvetica, sans-serif');
      expect(fontService.getFontFallback('ARIAL')).toBe('Helvetica, sans-serif');
      expect(fontService.getFontFallback('ArIaL')).toBe('Helvetica, sans-serif');
    });
  });

  describe('getSystemFonts', () => {
    it('should cache system fonts after first call', async () => {
      (mockExec as any).setResponse({
        stdout: JSON.stringify({
          SPFontsDataType: [
            { _items: [{ _name: 'Family', display_name0: 'Arial' }] }
          ]
        }),
        stderr: ''
      });

      const fonts1 = await fontService.getSystemFonts();
      const fonts2 = await fontService.getSystemFonts();
      
      expect(fonts1).toEqual(fonts2);
      expect(mockExec).toHaveBeenCalledTimes(1); // Should only call once due to caching
    });

    it('should handle errors gracefully', async () => {
      // Mock an error by setting response that triggers error path
      mockExec.mockImplementation((cmd: string, options: any, callback?: any) => {
        const cb = callback || options;
        if (typeof cb === 'function') {
          cb(new Error('Command failed'), '', '');
        }
      });

      const fonts = await fontService.getSystemFonts();
      expect(fonts).toEqual([]); // Should return empty array on error
    });
  });
});