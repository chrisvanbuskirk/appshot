import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getSystemLanguage, 
  detectLanguagesFromCaptions, 
  resolveLanguages,
  isValidLanguageCode,
  normalizeLanguageCode
} from '../src/utils/language.js';
import type { CaptionsFile, AppshotConfig } from '../src/types.js';

describe('Language Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getSystemLanguage', () => {
    it('should detect language from Intl API', () => {
      const lang = getSystemLanguage();
      expect(lang).toMatch(/^[a-z]{2}$/);
    });

    it('should fall back to LANG environment variable', () => {
      // Mock Intl to throw error
      const originalIntl = global.Intl;
      // @ts-ignore
      global.Intl = undefined;
      
      process.env.LANG = 'fr_FR.UTF-8';
      expect(getSystemLanguage()).toBe('fr');
      
      process.env.LANG = 'de_DE.UTF-8';
      expect(getSystemLanguage()).toBe('de');
      
      // Restore Intl
      global.Intl = originalIntl;
    });

    it('should fall back to LC_ALL if LANG is not set', () => {
      const originalIntl = global.Intl;
      // @ts-ignore
      global.Intl = undefined;
      
      delete process.env.LANG;
      process.env.LC_ALL = 'es_ES.UTF-8';
      expect(getSystemLanguage()).toBe('es');
      
      global.Intl = originalIntl;
    });

    it('should default to en when no locale is detected', () => {
      const originalIntl = global.Intl;
      // @ts-ignore
      global.Intl = undefined;
      
      delete process.env.LANG;
      delete process.env.LC_ALL;
      delete process.env.LC_MESSAGES;
      
      expect(getSystemLanguage()).toBe('en');
      
      global.Intl = originalIntl;
    });
  });

  describe('detectLanguagesFromCaptions', () => {
    it('should return empty array for simple string captions', () => {
      const captions: CaptionsFile = {
        'home.png': 'Welcome',
        'settings.png': 'Settings'
      };
      
      expect(detectLanguagesFromCaptions(captions)).toEqual([]);
    });

    it('should detect languages from object captions', () => {
      const captions: CaptionsFile = {
        'home.png': {
          en: 'Welcome',
          es: 'Bienvenido',
          fr: 'Bienvenue'
        },
        'settings.png': {
          en: 'Settings',
          es: 'Configuración'
        }
      };
      
      const langs = detectLanguagesFromCaptions(captions);
      expect(langs).toEqual(['en', 'es', 'fr']);
    });

    it('should handle mixed caption formats', () => {
      const captions: CaptionsFile = {
        'home.png': 'Simple string',
        'settings.png': {
          en: 'Settings',
          de: 'Einstellungen'
        }
      };
      
      const langs = detectLanguagesFromCaptions(captions);
      expect(langs).toEqual(['de', 'en']);
    });

    it('should return sorted unique languages', () => {
      const captions: CaptionsFile = {
        'a.png': { zh: 'A', en: 'A', fr: 'A' },
        'b.png': { en: 'B', fr: 'B', zh: 'B' },
        'c.png': { fr: 'C', zh: 'C', en: 'C' }
      };
      
      const langs = detectLanguagesFromCaptions(captions);
      expect(langs).toEqual(['en', 'fr', 'zh']);
    });
  });

  describe('resolveLanguages', () => {
    const mockConfig: AppshotConfig = {
      output: './final',
      frames: './frames',
      gradient: { colors: ['#000', '#fff'], direction: 'top-bottom' },
      caption: { font: 'Arial', fontsize: 64, color: '#fff', align: 'center', paddingTop: 100 },
      devices: {}
    };

    it('should prioritize CLI languages', () => {
      const cliLangs = ['es', 'fr'];
      const captions: CaptionsFile = {
        'home.png': { en: 'Home', de: 'Startseite' }
      };
      
      const result = resolveLanguages(cliLangs, captions, mockConfig);
      expect(result.languages).toEqual(['es', 'fr']);
      expect(result.source).toBe('command line');
    });

    it('should use caption languages when no CLI langs provided', () => {
      const captions: CaptionsFile = {
        'home.png': { en: 'Home', ja: 'ホーム' }
      };
      
      const result = resolveLanguages(undefined, captions, mockConfig);
      expect(result.languages).toEqual(['en', 'ja']);
      expect(result.source).toBe('caption files');
    });

    it('should use config defaultLanguage', () => {
      const configWithDefault = {
        ...mockConfig,
        defaultLanguage: 'pt'
      };
      const captions: CaptionsFile = { 'home.png': 'Simple' };
      
      const result = resolveLanguages(undefined, captions, configWithDefault);
      expect(result.languages).toEqual(['pt']);
      expect(result.source).toBe('config setting');
    });

    it('should use system language as fallback', () => {
      const originalIntl = global.Intl;
      // @ts-ignore
      global.Intl = undefined;
      process.env.LANG = 'fr_FR.UTF-8';
      
      const captions: CaptionsFile = { 'home.png': 'Simple' };
      
      const result = resolveLanguages(undefined, captions, mockConfig);
      expect(result.languages).toEqual(['fr']);
      expect(result.source).toBe('system locale (FR)');
      
      global.Intl = originalIntl;
    });

    it('should default to en when all else fails', () => {
      const originalIntl = global.Intl;
      // @ts-ignore
      global.Intl = undefined;
      delete process.env.LANG;
      delete process.env.LC_ALL;
      
      const captions: CaptionsFile = { 'home.png': 'Simple' };
      
      const result = resolveLanguages(undefined, captions, mockConfig);
      expect(result.languages).toEqual(['en']);
      expect(result.source).toBe('default');
      
      global.Intl = originalIntl;
    });
  });

  describe('isValidLanguageCode', () => {
    it('should validate 2-letter codes', () => {
      expect(isValidLanguageCode('en')).toBe(true);
      expect(isValidLanguageCode('fr')).toBe(true);
      expect(isValidLanguageCode('ja')).toBe(true);
    });

    it('should validate 3-letter codes', () => {
      expect(isValidLanguageCode('eng')).toBe(true);
      expect(isValidLanguageCode('fra')).toBe(true);
    });

    it('should validate codes with regions', () => {
      expect(isValidLanguageCode('zh-CN')).toBe(true);
      expect(isValidLanguageCode('pt-BR')).toBe(true);
      expect(isValidLanguageCode('en-US')).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(isValidLanguageCode('e')).toBe(false);
      expect(isValidLanguageCode('english')).toBe(false);
      expect(isValidLanguageCode('en_US')).toBe(false); // Underscore not valid
      expect(isValidLanguageCode('EN')).toBe(false); // Must be lowercase
      expect(isValidLanguageCode('en-us')).toBe(false); // Region must be uppercase
    });
  });

  describe('normalizeLanguageCode', () => {
    it('should lowercase simple codes', () => {
      expect(normalizeLanguageCode('EN')).toBe('en');
      expect(normalizeLanguageCode('Fr')).toBe('fr');
      expect(normalizeLanguageCode('JA')).toBe('ja');
    });

    it('should normalize codes with regions', () => {
      expect(normalizeLanguageCode('zh-cn')).toBe('zh-CN');
      expect(normalizeLanguageCode('PT-br')).toBe('pt-BR');
      expect(normalizeLanguageCode('en-us')).toBe('en-US');
      expect(normalizeLanguageCode('ZH-CN')).toBe('zh-CN');
    });

    it('should handle already normalized codes', () => {
      expect(normalizeLanguageCode('en')).toBe('en');
      expect(normalizeLanguageCode('zh-CN')).toBe('zh-CN');
    });
  });
});