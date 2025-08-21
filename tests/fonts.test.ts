import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FontService } from '../src/services/fonts.js';

// Mock the promisify function before module imports
vi.mock('util', () => {
  const mockExecAsync = vi.fn();
  return {
    promisify: vi.fn(() => mockExecAsync),
    mockExecAsync // Export for test access
  };
});

describe('FontService', () => {
  let fontService: FontService;
  let mockExecAsync: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the singleton instance
    (FontService as any).instance = null;
    fontService = FontService.getInstance();
    // Get the mocked exec function
    const util = vi.importActual('util') as any;
    mockExecAsync = (vi.mocked(util).mockExecAsync || vi.fn());
    
    // Set a default mock for all tests
    mockExecAsync = vi.fn().mockResolvedValue({
      stdout: JSON.stringify({ SPFontsDataType: [] }),
      stderr: ''
    });
    
    // Re-mock util with our mockExecAsync
    vi.mocked(require('util')).promisify.mockReturnValue(mockExecAsync);
  });

  describe('isFontInstalled', () => {
    it('should return true for installed fonts', async () => {
      // Mock system fonts
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' },
              'helvetica': { family: 'Helvetica' }
            }
          }]
        }),
        stderr: ''
      });

      const isInstalled = await fontService.isFontInstalled('Arial');
      expect(isInstalled).toBe(true);
    });

    it('should return false for non-installed fonts', async () => {
      // Mock system fonts without Poppins
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' },
              'helvetica': { family: 'Helvetica' }
            }
          }]
        }),
        stderr: ''
      });

      const isInstalled = await fontService.isFontInstalled('Poppins');
      expect(isInstalled).toBe(false);
    });

    it('should be case-insensitive', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' }
            }
          }]
        }),
        stderr: ''
      });

      const isInstalled1 = await fontService.isFontInstalled('ARIAL');
      const isInstalled2 = await fontService.isFontInstalled('arial');
      const isInstalled3 = await fontService.isFontInstalled('Arial');
      
      expect(isInstalled1).toBe(true);
      expect(isInstalled2).toBe(true);
      expect(isInstalled3).toBe(true);
    });
  });

  describe('validateFont', () => {
    it('should only return true for actually installed fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' }
            }
          }]
        }),
        stderr: ''
      });

      // Arial is installed
      const isValidArial = await fontService.validateFont('Arial');
      expect(isValidArial).toBe(true);

      // Poppins is NOT installed (even though it's in recommended list)
      const isValidPoppins = await fontService.validateFont('Poppins');
      expect(isValidPoppins).toBe(false);
    });

    it('should not return true for recommended fonts that are not installed', async () => {
      // Mock empty system fonts
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      // Test all recommended fonts should be false when not installed
      const recommendedFonts = ['Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Inter'];
      
      for (const font of recommendedFonts) {
        const isValid = await fontService.validateFont(font);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('getFontStatus', () => {
    it('should return correct status for installed fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' }
            }
          }]
        }),
        stderr: ''
      });

      const status = await fontService.getFontStatus('Arial');
      
      expect(status.name).toBe('Arial');
      expect(status.installed).toBe(true);
      expect(status.category).toBe('web-safe');
      expect(status.fallback).toBe('Helvetica, sans-serif');
      expect(status.warning).toBeUndefined();
    });

    it('should return correct status with warning for non-installed fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      const status = await fontService.getFontStatus('Poppins');
      
      expect(status.name).toBe('Poppins');
      expect(status.installed).toBe(false);
      expect(status.category).toBe('recommended');
      expect(status.fallback).toBe('Arial, sans-serif');
      expect(status.warning).toContain('not installed');
      expect(status.warning).toContain('Google Fonts');
    });

    it('should handle unknown fonts correctly', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      const status = await fontService.getFontStatus('UnknownFont');
      
      expect(status.name).toBe('UnknownFont');
      expect(status.installed).toBe(false);
      expect(status.fallback).toBe('Arial, Helvetica, sans-serif'); // Default fallback
      expect(status.warning).toContain('not installed on your system');
    });

    it('should provide appropriate warnings for different font categories', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      // Test recommended font warning
      const recommendedStatus = await fontService.getFontStatus('Montserrat');
      expect(recommendedStatus.warning).toContain('Install it from Google Fonts');

      // Test system font warning  
      const systemStatus = await fontService.getFontStatus('SF Pro');
      expect(systemStatus.warning).toContain('System font');
      expect(systemStatus.warning).toContain('not available on this machine');
    });
  });

  describe('getRecommendedFonts', () => {
    it('should mark installation status for all fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' },
              'helvetica': { family: 'Helvetica' },
              'georgia': { family: 'Georgia' }
            }
          }]
        }),
        stderr: ''
      });

      const fonts = await fontService.getRecommendedFonts();
      
      // Check that Arial is marked as installed
      const arial = fonts.find(f => f.name === 'Arial');
      expect(arial?.installed).toBe(true);
      
      // Check that Helvetica is marked as installed
      const helvetica = fonts.find(f => f.name === 'Helvetica');
      expect(helvetica?.installed).toBe(true);
      
      // Check that Poppins is marked as NOT installed
      const poppins = fonts.find(f => f.name === 'Poppins');
      expect(poppins?.installed).toBe(false);
      
      // Check that all fonts have an installed property
      fonts.forEach(font => {
        expect(font).toHaveProperty('installed');
        expect(typeof font.installed).toBe('boolean');
      });
    });

    it('should correctly categorize fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({ SPFontsDataType: [] }),
        stderr: ''
      });

      const fonts = await fontService.getRecommendedFonts();
      
      // Check web-safe fonts
      const webSafeFonts = fonts.filter(f => f.category === 'web-safe');
      const webSafeNames = webSafeFonts.map(f => f.name);
      expect(webSafeNames).toContain('Arial');
      expect(webSafeNames).toContain('Helvetica');
      expect(webSafeNames).toContain('Georgia');
      expect(webSafeNames).toContain('Times New Roman');
      
      // Check recommended fonts
      const recommendedFonts = fonts.filter(f => f.category === 'recommended');
      const recommendedNames = recommendedFonts.map(f => f.name);
      expect(recommendedNames).toContain('Roboto');
      expect(recommendedNames).toContain('Poppins');
      expect(recommendedNames).toContain('Inter');
      
      // Check system fonts
      const systemFonts = fonts.filter(f => f.category === 'system');
      const systemNames = systemFonts.map(f => f.name);
      expect(systemNames).toContain('SF Pro');
      expect(systemNames).toContain('Segoe UI');
    });
  });

  describe('getFontCategories', () => {
    it('should separate installed and not installed fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' },
              'roboto': { family: 'Roboto' }
            }
          }]
        }),
        stderr: ''
      });

      const categories = await fontService.getFontCategories();
      
      // Should have category for installed web-safe fonts
      const installedWebSafe = categories.find(c => c.name === 'Installed Fonts (Web-Safe)');
      expect(installedWebSafe).toBeDefined();
      expect(installedWebSafe?.fonts.some(f => f.name === 'Arial')).toBe(true);
      
      // Should have category for installed popular fonts
      const installedPopular = categories.find(c => c.name === 'Installed Fonts (Popular)');
      expect(installedPopular).toBeDefined();
      expect(installedPopular?.fonts.some(f => f.name === 'Roboto')).toBe(true);
      
      // Should have category for not installed popular fonts
      const notInstalled = categories.find(c => c.name === 'Popular Fonts (Not Installed - Will Use Fallback)');
      expect(notInstalled).toBeDefined();
      expect(notInstalled?.fonts.some(f => f.name === 'Poppins')).toBe(true);
    });
  });

  describe('getFontFallback', () => {
    it('should return correct fallbacks for known fonts', () => {
      expect(fontService.getFontFallback('Arial')).toBe('Helvetica, sans-serif');
      expect(fontService.getFontFallback('Georgia')).toBe('Times New Roman, serif');
      expect(fontService.getFontFallback('Courier New')).toBe('monospace');
      expect(fontService.getFontFallback('Poppins')).toBe('Arial, sans-serif');
      expect(fontService.getFontFallback('SF Pro')).toBe('system-ui, -apple-system, sans-serif');
    });

    it('should provide intelligent fallbacks for unknown fonts', () => {
      // Serif font
      expect(fontService.getFontFallback('CustomSerif')).toBe('Georgia, Times New Roman, serif');
      
      // Monospace font
      expect(fontService.getFontFallback('CustomMono')).toBe('Courier New, Monaco, monospace');
      expect(fontService.getFontFallback('CodeFont')).toBe('Courier New, Monaco, monospace');
      
      // Display font
      expect(fontService.getFontFallback('CustomDisplay')).toBe('Impact, Arial Black, sans-serif');
      expect(fontService.getFontFallback('HeadlineFont')).toBe('Impact, Arial Black, sans-serif');
      
      // Default sans-serif
      expect(fontService.getFontFallback('RandomFont')).toBe('Arial, Helvetica, sans-serif');
    });

    it('should be case-insensitive', () => {
      expect(fontService.getFontFallback('ARIAL')).toBe('Helvetica, sans-serif');
      expect(fontService.getFontFallback('arial')).toBe('Helvetica, sans-serif');
      expect(fontService.getFontFallback('Arial')).toBe('Helvetica, sans-serif');
    });
  });

  describe('getSystemFonts', () => {
    it('should cache system fonts after first call', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify({
          SPFontsDataType: [{
            typefaces: {
              'arial': { family: 'Arial' }
            }
          }]
        }),
        stderr: ''
      });

      // First call
      const fonts1 = await fontService.getSystemFonts();
      expect(fonts1).toContain('Arial');
      expect(mockExecAsync).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const fonts2 = await fontService.getSystemFonts();
      expect(fonts2).toEqual(fonts1);
      expect(mockExecAsync).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should handle errors gracefully', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command failed'));

      const fonts = await fontService.getSystemFonts();
      expect(fonts).toEqual([]);
    });
  });
});