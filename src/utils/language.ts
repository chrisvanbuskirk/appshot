import type { CaptionsFile, AppshotConfig } from '../types.js';

/**
 * Get the system's default language code
 * Uses Intl API first, then environment variables, finally defaults to 'en'
 */
export function getSystemLanguage(): string {
  try {
    // Try Intl API first (most reliable in Node.js)
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    // Extract language code (e.g., 'en' from 'en-US')
    return locale.split('-')[0].toLowerCase();
  } catch {
    // Fall back to environment variables
    const envLang = process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || '';
    if (envLang) {
      // Extract language code from POSIX locale (e.g., 'en' from 'en_US.UTF-8')
      const match = envLang.match(/^([a-z]{2})/i);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    // Default to English
    return 'en';
  }
}

/**
 * Detect available languages from caption structure
 * Returns empty array for simple string captions
 */
export function detectLanguagesFromCaptions(captions: CaptionsFile): string[] {
  const languages = new Set<string>();

  for (const [_, value] of Object.entries(captions)) {
    if (typeof value === 'object' && value !== null) {
      // Caption entry with language keys
      Object.keys(value).forEach(lang => languages.add(lang));
    }
  }

  return Array.from(languages).sort();
}

/**
 * Resolve which languages to build based on priority:
 * 1. CLI --langs flag (highest priority)
 * 2. Languages detected from caption objects
 * 3. Config defaultLanguage setting
 * 4. System detected language
 * 5. Fallback to 'en'
 */
export function resolveLanguages(
  cliLangs: string[] | undefined,
  captions: CaptionsFile,
  config: AppshotConfig
): { languages: string[]; source: string } {
  // Priority 1: CLI languages
  if (cliLangs && cliLangs.length > 0) {
    return {
      languages: cliLangs,
      source: 'command line'
    };
  }

  // Priority 2: Detect from captions
  const captionLangs = detectLanguagesFromCaptions(captions);
  if (captionLangs.length > 0) {
    return {
      languages: captionLangs,
      source: 'caption files'
    };
  }

  // Priority 3: Config default language
  if (config.defaultLanguage) {
    return {
      languages: [config.defaultLanguage],
      source: 'config setting'
    };
  }

  // Priority 4: System language
  const systemLang = getSystemLanguage();
  if (systemLang !== 'en') {
    return {
      languages: [systemLang],
      source: `system locale (${systemLang.toUpperCase()})`
    };
  }

  // Priority 5: Fallback
  return {
    languages: ['en'],
    source: 'default'
  };
}

/**
 * Validate language code format (basic ISO 639-1 validation)
 */
export function isValidLanguageCode(code: string): boolean {
  // Basic validation: 2-3 letter codes, optionally with region (e.g., zh-CN)
  return /^[a-z]{2,3}(-[A-Z]{2})?$/.test(code);
}

/**
 * Normalize language code to lowercase, preserving region if present
 */
export function normalizeLanguageCode(code: string): string {
  const parts = code.split('-');
  if (parts.length === 2) {
    // Preserve format like zh-CN
    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  }
  return code.toLowerCase();
}