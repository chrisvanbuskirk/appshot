import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// --- 1) Hoist the mocks so factories can use them (avoids TDZ) ---
type ExecAsync = (cmd: string, options?: any) => Promise<{ stdout: string; stderr: string }>;

const { mockExecAsync, mockExec } = vi.hoisted(() => {
  const mockExecAsync = vi.fn() as unknown as Mock<Parameters<ExecAsync>, ReturnType<ExecAsync>>;
  const mockExec = vi.fn();
  return { mockExecAsync, mockExec };
});

// --- 2) Mock child_process and util before importing the SUT ---
vi.mock('child_process', () => {
  return {
    exec: mockExec,
  };
});

vi.mock('util', () => {
  return {
    promisify: vi.fn(() => mockExecAsync),
  };
});

// Helper to create platform-appropriate mock response
function createMockFontResponse(fonts: string[]) {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    // macOS format
    const typefaces: any = {};
    fonts.forEach(font => {
      typefaces[font] = { family: font };
      typefaces[`${font} Bold`] = { family: font };
    });
    return JSON.stringify({
      SPFontsDataType: [{ typefaces }]
    });
  } else if (platform === 'win32') {
    // Windows format - one font per line
    return fonts.join('\n');
  } else {
    // Linux format - one font per line
    return fonts.join('\n');
  }
}

// Helper to import the FontService fresh each test
async function importFontService() {
  vi.resetModules();
  const mod = await import('../src/services/fonts.js');
  // Reset the singleton instance and cache
  (mod.FontService as any).instance = null;
  const service = mod.FontService.getInstance();
  (service as any).systemFontsCache = null;
  return service;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FontService', () => {
  describe('isFontInstalled', () => {
    it('should return true for installed fonts', async () => {
      // Set up mock BEFORE importing service
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial', 'Helvetica']),
        stderr: ''
      });
      
      const fontService = await importFontService();

      expect(await fontService.isFontInstalled('Arial')).toBe(true);
      expect(await fontService.isFontInstalled('Helvetica')).toBe(true);
    });

    it('should return false for non-installed fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });
      
      const fontService = await importFontService();

      expect(await fontService.isFontInstalled('NonExistentFont')).toBe(false);
      expect(await fontService.isFontInstalled('FakeFont')).toBe(false);
    });

    it('should be case-insensitive', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });
      
      const fontService = await importFontService();

      expect(await fontService.isFontInstalled('arial')).toBe(true);
      expect(await fontService.isFontInstalled('ARIAL')).toBe(true);
      expect(await fontService.isFontInstalled('ArIaL')).toBe(true);
    });
  });

  describe('validateFont', () => {
    it('should only return true for actually installed fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });
      
      const fontService = await importFontService();

      expect(await fontService.validateFont('Arial')).toBe(true);
      expect(await fontService.validateFont('Helvetica')).toBe(false);
      expect(await fontService.validateFont('SF Pro')).toBe(false);
    });

    it('should not return true for recommended fonts that are not installed', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
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
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });
      
      const fontService = await importFontService();

      const status = await fontService.getFontStatus('Arial');
      expect(status).toEqual({
        name: 'Arial',
        installed: true,
        category: 'web-safe',
        fallback: 'Helvetica, sans-serif'
        // warning is not set when font is installed
      });
    });

    it('should return correct status with warning for non-installed fonts', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
        stderr: ''
      });

      const status = await fontService.getFontStatus('Roboto');
      expect(status.installed).toBe(false);
      expect(status.warning).toContain('not installed');
      expect(status.fallback).toBeTruthy();
    });

    it('should handle unknown fonts correctly', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
        stderr: ''
      });

      const status = await fontService.getFontStatus('CompletelyUnknownFont');
      expect(status.installed).toBe(false);
      expect(status.warning).toContain('not installed');
      expect(status.fallback).toBe('Arial, Helvetica, sans-serif');
    });

    it('should provide appropriate warnings for different font categories', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
        stderr: ''
      });

      const webSafeStatus = await fontService.getFontStatus('Arial');
      const recommendedStatus = await fontService.getFontStatus('Roboto');
      const systemStatus = await fontService.getFontStatus('SF Pro');

      expect(webSafeStatus.fallback).toContain('Helvetica');
      expect(recommendedStatus.fallback).toContain('sans-serif');
      expect(systemStatus.fallback).toContain('system-ui');
    });
  });

  describe('getRecommendedFonts', () => {
    it('should mark installation status for all fonts', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial', 'Georgia']),
        stderr: ''
      });
      
      const fontService = await importFontService();

      const fonts = await fontService.getRecommendedFonts();
      const arial = fonts.find(f => f.name === 'Arial');
      const georgia = fonts.find(f => f.name === 'Georgia');
      const roboto = fonts.find(f => f.name === 'Roboto');

      expect(arial?.installed).toBe(true);
      expect(georgia?.installed).toBe(true);
      expect(roboto?.installed).toBe(false);
    });

    it('should correctly categorize fonts', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
        stderr: ''
      });
      
      const fonts = await fontService.getRecommendedFonts();
      
      const webSafeCount = fonts.filter(f => f.category === 'web-safe').length;
      const recommendedCount = fonts.filter(f => f.category === 'recommended').length;
      const systemCount = fonts.filter(f => f.category === 'system').length;

      expect(webSafeCount).toBeGreaterThan(0);
      expect(recommendedCount).toBeGreaterThan(0);
      expect(systemCount).toBeGreaterThan(0);
    });

    it('should include fallback fonts for all entries', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
        stderr: ''
      });
      
      const fonts = await fontService.getRecommendedFonts();
      
      fonts.forEach(font => {
        expect(font.fallback).toBeTruthy();
        // Fallbacks should contain either serif, sans-serif, or monospace
        expect(
          font.fallback.includes('serif') || 
          font.fallback.includes('monospace')
        ).toBe(true);
      });
    });
  });

  describe('getFontCategories', () => {
    it('should separate installed and not installed fonts', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });

      const categories = await fontService.getFontCategories();
      
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach(category => {
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('fonts');
        expect(Array.isArray(category.fonts)).toBe(true);
      });
    });

    it('should return system fonts in a category', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });
      
      const fontService = await importFontService();
      
      const categories = await fontService.getFontCategories();
      const systemCategory = categories.find(c => c.name === 'System Fonts');
      
      expect(systemCategory).toBeDefined();
      // System fonts category exists, but may have 0 fonts if none detected
      // (which is the case in our mock - we only mock Arial which is web-safe, not system)
      expect(systemCategory?.fonts).toBeDefined();
      expect(Array.isArray(systemCategory?.fonts)).toBe(true);
    });
  });

  describe('getSystemFonts', () => {
    it('should cache system fonts after first call', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse(['Arial']),
        stderr: ''
      });

      const fonts1 = await fontService.getSystemFonts();
      const fonts2 = await fontService.getSystemFonts();

      expect(fonts1).toEqual(fonts2);
      expect(mockExecAsync).toHaveBeenCalledTimes(1);
    });

    it('should return fallback fonts on error for Windows/Linux', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockRejectedValue(new Error('Command failed'));

      const fonts = await fontService.getSystemFonts();
      
      // Platform-specific behavior
      if (process.platform === 'darwin') {
        expect(fonts).toEqual([]);
      } else {
        // Windows and Linux fall back to recommended fonts
        expect(fonts.length).toBeGreaterThan(0);
        expect(fonts).toContain('Arial');
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: 'not json',
        stderr: ''
      });

      const fonts = await fontService.getSystemFonts();
      
      // Platform-specific parsing
      if (process.platform === 'darwin') {
        expect(fonts).toEqual([]);
      } else {
        // Windows/Linux treat each line as a font
        expect(fonts).toEqual(['not json']);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockRejectedValue(new Error('Command failed'));

      const fonts = await fontService.getSystemFonts();
      
      // Platform-specific fallback behavior
      if (process.platform === 'darwin') {
        expect(fonts).toEqual([]);
      } else {
        // Windows and Linux fall back to recommended fonts
        expect(fonts.length).toBeGreaterThan(0);
        expect(fonts).toContain('Arial');
      }
    });

    it('should handle missing SPFontsDataType field', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: process.platform === 'darwin' ? JSON.stringify({}) : '',
        stderr: ''
      });

      const fonts = await fontService.getSystemFonts();
      
      // All platforms should return empty array for empty response
      expect(fonts).toEqual([]);
    });

    it('should handle empty response', async () => {
      const fontService = await importFontService();
      
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: ''
      });

      const fonts = await fontService.getSystemFonts();
      expect(fonts).toEqual([]);
    });
  });

  describe('promisify integration', () => {
    it('promisify should be called with exec', async () => {
      await importFontService();
      const utilMod: any = await import('util');
      expect(utilMod.promisify).toHaveBeenCalledWith(mockExec);
    });

    it('execAsync should be called with correct command for platform', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: createMockFontResponse([]),
        stderr: ''
      });
      
      const fontService = await importFontService();

      await fontService.getSystemFonts();
      
      // Check platform-specific command
      const platform = process.platform;
      if (platform === 'darwin') {
        expect(mockExecAsync).toHaveBeenCalledWith(
          'system_profiler SPFontsDataType -json',
          { maxBuffer: 10 * 1024 * 1024 }
        );
      } else if (platform === 'win32') {
        expect(mockExecAsync).toHaveBeenCalledWith(
          expect.stringContaining('InstalledFontCollection')
        );
      } else {
        expect(mockExecAsync).toHaveBeenCalledWith('fc-list : family');
      }
    });
  });
});