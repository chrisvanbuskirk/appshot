import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';

const execAsync = promisify(exec);

export interface FontInfo {
  name: string;
  family?: string;
  style?: string;
  category?: 'system' | 'recommended' | 'web-safe';
  fallback?: string;
  installed?: boolean;  // Whether font is actually installed on system
}

export interface FontCategory {
  name: string;
  fonts: FontInfo[];
}

export interface FontStatus {
  name: string;
  installed: boolean;
  category?: 'system' | 'recommended' | 'web-safe';
  fallback: string;
  warning?: string;
}

export class FontService {
  private static instance: FontService;
  private systemFontsCache: string[] | null = null;

  public static getInstance(): FontService {
    if (!FontService.instance) {
      FontService.instance = new FontService();
    }
    return FontService.instance;
  }

  /**
   * Get list of system fonts based on platform
   */
  async getSystemFonts(): Promise<string[]> {
    // Quick bypass for CI environments to avoid slow font scanning
    if (process.env.APPSHOT_DISABLE_FONT_SCAN === '1' || process.env.APPSHOT_DISABLE_FONT_SCAN === 'true') {
      return this.getRecommendedFontsSync().map(f => f.name);
    }

    if (this.systemFontsCache) {
      return this.systemFontsCache;
    }

    const os = platform();
    let fonts: string[] = [];

    try {
      switch (os) {
      case 'darwin': // macOS
        fonts = await this.getMacOSFonts();
        break;
      case 'linux':
        fonts = await this.getLinuxFonts();
        break;
      case 'win32':
        fonts = await this.getWindowsFonts();
        break;
      default:
        console.warn(`Font detection not implemented for platform: ${os}`);
      }
    } catch (error) {
      console.error('Error detecting system fonts:', error);
    }

    this.systemFontsCache = fonts;
    return fonts;
  }

  /**
   * Get fonts on macOS using system_profiler
   */
  private async getMacOSFonts(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('system_profiler SPFontsDataType -json', {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer to handle large font lists
      });
      const data = JSON.parse(stdout);
      const fonts = new Set<string>();

      // Parse the JSON structure
      if (data.SPFontsDataType) {
        for (const font of data.SPFontsDataType) {
          // Extract typefaces
          if (font.typefaces) {
            for (const typefaceKey of Object.keys(font.typefaces)) {
              const typeface = font.typefaces[typefaceKey];
              if (typeface.family) {
                fonts.add(typeface.family);
              }
            }
          }
        }
      }

      return Array.from(fonts).sort();
    } catch (error) {
      console.error('Error getting macOS fonts:', error);
      return [];
    }
  }

  /**
   * Get fonts on Linux using fc-list
   */
  private async getLinuxFonts(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('fc-list : family');
      const fonts = new Set<string>();

      const lines = stdout.split('\n');
      for (const line of lines) {
        const fontName = line.trim();
        if (fontName) {
          // fc-list may return comma-separated font names
          const names = fontName.split(',');
          for (const name of names) {
            fonts.add(name.trim());
          }
        }
      }

      return Array.from(fonts).sort();
    } catch {
      console.warn('fc-list not available, using fallback fonts');
      return this.getRecommendedFontsSync().map(f => f.name);
    }
  }

  /**
   * Get fonts on Windows using PowerShell
   */
  private async getWindowsFonts(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName(\'System.Drawing\'); (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }"'
      );

      const fonts = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      return fonts.sort();
    } catch {
      console.warn('Could not get Windows fonts, using fallback fonts');
      return this.getRecommendedFontsSync().map(f => f.name);
    }
  }

  /**
   * Get recommended fonts with installation status
   */
  async getRecommendedFonts(): Promise<FontInfo[]> {
    const systemFonts = await this.getSystemFonts();
    const systemFontSet = new Set(systemFonts.map(f => f.toLowerCase()));

    const fonts: FontInfo[] = [
      // Sans-serif fonts (web-safe are usually installed)
      { name: 'Helvetica', family: 'Helvetica', category: 'web-safe', fallback: 'Arial, sans-serif' },
      { name: 'Arial', family: 'Arial', category: 'web-safe', fallback: 'Helvetica, sans-serif' },
      { name: 'Roboto', family: 'Roboto', category: 'recommended', fallback: 'Arial, sans-serif' },
      { name: 'Open Sans', family: 'Open Sans', category: 'recommended', fallback: 'Arial, sans-serif' },
      { name: 'Montserrat', family: 'Montserrat', category: 'recommended', fallback: 'Arial, sans-serif' },
      { name: 'Lato', family: 'Lato', category: 'recommended', fallback: 'Arial, sans-serif' },
      { name: 'Poppins', family: 'Poppins', category: 'recommended', fallback: 'Arial, sans-serif' },
      { name: 'Inter', family: 'Inter', category: 'recommended', fallback: 'Arial, sans-serif' },

      // Serif fonts
      { name: 'Georgia', family: 'Georgia', category: 'web-safe', fallback: 'Times New Roman, serif' },
      { name: 'Times New Roman', family: 'Times New Roman', category: 'web-safe', fallback: 'Georgia, serif' },
      { name: 'Playfair Display', family: 'Playfair Display', category: 'recommended', fallback: 'Georgia, serif' },
      { name: 'Merriweather', family: 'Merriweather', category: 'recommended', fallback: 'Georgia, serif' },

      // Monospace fonts
      { name: 'Courier New', family: 'Courier New', category: 'web-safe', fallback: 'monospace' },
      { name: 'Monaco', family: 'Monaco', category: 'web-safe', fallback: 'Courier New, monospace' },
      { name: 'Consolas', family: 'Consolas', category: 'web-safe', fallback: 'Courier New, monospace' },

      // Display fonts
      { name: 'Impact', family: 'Impact', category: 'web-safe', fallback: 'Arial Black, sans-serif' },
      { name: 'Arial Black', family: 'Arial Black', category: 'web-safe', fallback: 'Impact, sans-serif' },

      // System fonts
      { name: 'SF Pro', family: 'SF Pro', category: 'system', fallback: 'system-ui, -apple-system, sans-serif' },
      { name: 'SF Pro Display', family: 'SF Pro Display', category: 'system', fallback: 'system-ui, -apple-system, sans-serif' },
      { name: 'San Francisco', family: 'San Francisco', category: 'system', fallback: 'system-ui, -apple-system, sans-serif' },
      { name: 'New York', family: 'New York', category: 'system', fallback: 'Georgia, serif' },
      { name: 'Segoe UI', family: 'Segoe UI', category: 'system', fallback: 'system-ui, sans-serif' }
    ];

    // Mark which fonts are actually installed
    for (const font of fonts) {
      font.installed = systemFontSet.has(font.name.toLowerCase());
    }

    return fonts;
  }

  /**
   * Get basic recommended fonts (without async check) for backward compatibility
   */
  getRecommendedFontsSync(): FontInfo[] {
    return [
      // Only return truly web-safe fonts that are almost always available
      { name: 'Helvetica', family: 'Helvetica', category: 'web-safe', fallback: 'Arial, sans-serif' },
      { name: 'Arial', family: 'Arial', category: 'web-safe', fallback: 'Helvetica, sans-serif' },
      { name: 'Georgia', family: 'Georgia', category: 'web-safe', fallback: 'Times New Roman, serif' },
      { name: 'Times New Roman', family: 'Times New Roman', category: 'web-safe', fallback: 'Georgia, serif' },
      { name: 'Courier New', family: 'Courier New', category: 'web-safe', fallback: 'monospace' },
      { name: 'Monaco', family: 'Monaco', category: 'web-safe', fallback: 'Courier New, monospace' },
      { name: 'Impact', family: 'Impact', category: 'web-safe', fallback: 'Arial Black, sans-serif' },
      { name: 'Arial Black', family: 'Arial Black', category: 'web-safe', fallback: 'Impact, sans-serif' }
    ];
  }

  /**
   * Get fonts organized by category with installation status
   */
  async getFontCategories(): Promise<FontCategory[]> {
    const systemFonts = await this.getSystemFonts();
    const recommendedFonts = await this.getRecommendedFonts();

    // Create a set of recommended font names for quick lookup
    const recommendedNames = new Set(recommendedFonts.map(f => f.name.toLowerCase()));

    // Filter system fonts to exclude ones already in recommended
    const additionalSystemFonts = systemFonts
      .filter(font => !recommendedNames.has(font.toLowerCase()))
      .slice(0, 20) // Limit to top 20 to avoid overwhelming the user
      .map(name => ({
        name,
        category: 'system' as const,
        installed: true  // These are from system fonts, so they're installed
      }));

    // Separate installed vs not installed
    const installedWebSafe = recommendedFonts.filter(f => f.category === 'web-safe' && f.installed);
    const installedRecommended = recommendedFonts.filter(f => f.category === 'recommended' && f.installed);
    const notInstalledRecommended = recommendedFonts.filter(f => f.category === 'recommended' && !f.installed);

    const categories: FontCategory[] = [
      {
        name: 'Installed Fonts (Web-Safe)',
        fonts: installedWebSafe
      }
    ];

    if (installedRecommended.length > 0) {
      categories.push({
        name: 'Installed Fonts (Popular)',
        fonts: installedRecommended
      });
    }

    if (notInstalledRecommended.length > 0) {
      categories.push({
        name: 'Popular Fonts (Not Installed - Will Use Fallback)',
        fonts: notInstalledRecommended
      });
    }

    categories.push({
      name: 'System Fonts',
      fonts: [
        ...recommendedFonts.filter(f => f.category === 'system' && f.installed),
        ...additionalSystemFonts
      ]
    });

    return categories;
  }

  /**
   * Check if a font is actually installed on the system
   * This is the TRUTH - only returns true if font can actually be used
   */
  async isFontInstalled(fontName: string): Promise<boolean> {
    const systemFonts = await this.getSystemFonts();
    return systemFonts.some(f => f.toLowerCase() === fontName.toLowerCase());
  }

  /**
   * Validate if a font can be rendered
   * NOW only checks if actually installed, not just "recommended"
   */
  async validateFont(fontName: string): Promise<boolean> {
    // Only return true if font is ACTUALLY installed
    return this.isFontInstalled(fontName);
  }

  /**
   * Get detailed status about a font
   */
  async getFontStatus(fontName: string): Promise<FontStatus> {
    const installed = await this.isFontInstalled(fontName);
    const recommended = await this.getRecommendedFonts();
    const fontInfo = recommended.find(f => f.name.toLowerCase() === fontName.toLowerCase());

    const status: FontStatus = {
      name: fontName,
      installed,
      category: fontInfo?.category,
      fallback: this.getFontFallback(fontName)
    };

    if (!installed) {
      if (fontInfo?.category === 'recommended') {
        status.warning = `Font "${fontName}" is not installed. Install it from Google Fonts or the fallback (${status.fallback}) will be used.`;
      } else if (fontInfo?.category === 'system') {
        status.warning = `System font "${fontName}" is not available on this machine. The fallback (${status.fallback}) will be used.`;
      } else {
        status.warning = `Font "${fontName}" is not installed on your system. The fallback (${status.fallback}) will be used.`;
      }
    }

    return status;
  }

  /**
   * Get a font's fallback chain (synchronous for backward compatibility)
   */
  getFontFallback(fontName: string): string {
    // Use sync version for immediate fallback lookup
    const recommended = this.getRecommendedFontsSync();
    const font = recommended.find(f => f.name.toLowerCase() === fontName.toLowerCase());

    if (font?.fallback) {
      return font.fallback;
    }

    // Check extended list if not found in basic web-safe fonts
    const extendedFonts: Array<{name: string; fallback: string}> = [
      { name: 'Roboto', fallback: 'Arial, sans-serif' },
      { name: 'Open Sans', fallback: 'Arial, sans-serif' },
      { name: 'Montserrat', fallback: 'Arial, sans-serif' },
      { name: 'Lato', fallback: 'Arial, sans-serif' },
      { name: 'Poppins', fallback: 'Arial, sans-serif' },
      { name: 'Inter', fallback: 'Arial, sans-serif' },
      { name: 'Playfair Display', fallback: 'Georgia, serif' },
      { name: 'Merriweather', fallback: 'Georgia, serif' },
      { name: 'SF Pro', fallback: 'system-ui, -apple-system, sans-serif' },
      { name: 'SF Pro Display', fallback: 'system-ui, -apple-system, sans-serif' },
      { name: 'San Francisco', fallback: 'system-ui, -apple-system, sans-serif' },
      { name: 'New York', fallback: 'Georgia, serif' },
      { name: 'Segoe UI', fallback: 'system-ui, sans-serif' }
    ];

    const extendedFont = extendedFonts.find(f => f.name.toLowerCase() === fontName.toLowerCase());
    if (extendedFont) {
      return extendedFont.fallback;
    }

    // Default fallback based on font characteristics
    const lowerFont = fontName.toLowerCase();

    if (lowerFont.includes('serif') && !lowerFont.includes('sans')) {
      // Serif font
      return 'Georgia, Times New Roman, serif';
    } else if (lowerFont.includes('mono') || lowerFont.includes('code') || lowerFont.includes('console')) {
      // Monospace font
      return 'Courier New, Monaco, monospace';
    } else if (lowerFont.includes('display') || lowerFont.includes('headline')) {
      // Display font
      return 'Impact, Arial Black, sans-serif';
    } else {
      // Default to sans-serif
      return 'Arial, Helvetica, sans-serif';
    }
  }
}