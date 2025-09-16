import { promises as fs } from 'fs';
import path from 'path';

/**
 * Fastlane-supported language codes
 * Source: https://docs.fastlane.tools/actions/deliver/
 */
export const FASTLANE_LANGUAGES = new Set([
  'da', 'de-DE', 'el', 'en-AU', 'en-CA', 'en-GB', 'en-US',
  'es-ES', 'es-MX', 'fi', 'fr-CA', 'fr-FR', 'id', 'it', 'ja',
  'ko', 'ms', 'nl-NL', 'no', 'pt-BR', 'pt-PT', 'ru', 'sv',
  'th', 'tr', 'vi', 'zh-Hans', 'zh-Hant', 'hi', 'hr', 'hu',
  'pl', 'ro', 'sk', 'uk', 'ca', 'cs', 'he'
]);

/**
 * Default language code mappings from appshot to Fastlane
 */
export const DEFAULT_MAPPINGS: Record<string, string> = {
  // Common two-letter codes
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'pt': 'pt-PT',
  'nl': 'nl-NL',
  'it': 'it',
  'ja': 'ja',
  'ko': 'ko',
  'ru': 'ru',
  'da': 'da',
  'fi': 'fi',
  'no': 'no',
  'sv': 'sv',
  'pl': 'pl',
  'tr': 'tr',
  'th': 'th',
  'vi': 'vi',
  'id': 'id',
  'ms': 'ms',
  'el': 'el',
  'hi': 'hi',
  'hr': 'hr',
  'hu': 'hu',
  'ro': 'ro',
  'sk': 'sk',
  'uk': 'uk',
  'ca': 'ca',
  'cs': 'cs',
  'he': 'he',

  // Chinese variants
  'zh': 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hant': 'zh-Hant',
  'zh-hk': 'zh-Hant',

  // Regional variants
  'en-gb': 'en-GB',
  'en-au': 'en-AU',
  'en-ca': 'en-CA',
  'es-mx': 'es-MX',
  'fr-ca': 'fr-CA',
  'pt-br': 'pt-BR',

  // Alternative codes
  'english': 'en-US',
  'spanish': 'es-ES',
  'french': 'fr-FR',
  'german': 'de-DE',
  'portuguese': 'pt-PT',
  'chinese': 'zh-Hans',
  'dutch': 'nl-NL',
  'italian': 'it',
  'japanese': 'ja',
  'korean': 'ko',
  'russian': 'ru'
};

export interface LanguageMappingConfig {
  languageMappings?: Record<string, string>;
}

/**
 * Load user-defined language mappings from config file
 */
export async function loadUserMappings(configPath?: string): Promise<Record<string, string> | undefined> {
  const defaultPath = path.join(process.cwd(), '.appshot', 'export-config.json');
  const targetPath = configPath || defaultPath;

  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    const config: LanguageMappingConfig = JSON.parse(content);
    return config.languageMappings;
  } catch {
    // Config file is optional
    return undefined;
  }
}

/**
 * Map a language code to Fastlane-compatible format
 */
export function mapToFastlaneCode(lang: string, userMappings?: Record<string, string>): string {
  const normalized = lang.toLowerCase();

  // Priority 1: User-defined mapping
  if (userMappings?.[normalized]) {
    return userMappings[normalized];
  }

  // Priority 2: Already a valid Fastlane code (case-sensitive check)
  if (FASTLANE_LANGUAGES.has(lang)) {
    return lang;
  }

  // Check with normalized case for region codes
  const withRegion = lang.match(/^([a-z]{2,3})-([A-Z]{2,4})$/i);
  if (withRegion) {
    const formatted = `${withRegion[1].toLowerCase()}-${withRegion[2].toUpperCase()}`;
    if (FASTLANE_LANGUAGES.has(formatted)) {
      return formatted;
    }
  }

  // Priority 3: Default mapping
  const mapped = DEFAULT_MAPPINGS[normalized];
  if (mapped) {
    return mapped;
  }

  // Priority 4: Try to construct valid code for two-letter codes
  if (normalized.match(/^[a-z]{2}$/)) {
    // Common region mappings
    const commonRegions: Record<string, string> = {
      'en': 'US',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'pt': 'PT',
      'zh': 'Hans',
      'nl': 'NL'
    };

    const region = commonRegions[normalized];
    if (region) {
      const constructed = region === 'Hans' || region === 'Hant'
        ? `zh-${region}`
        : `${normalized}-${region}`;

      if (FASTLANE_LANGUAGES.has(constructed)) {
        return constructed;
      }
    }
  }

  // Priority 5: Return as-is (may not be valid for Fastlane)
  return lang;
}

/**
 * Validate if a language code is supported by Fastlane
 */
export function isValidFastlaneCode(code: string): boolean {
  return FASTLANE_LANGUAGES.has(code);
}

/**
 * Get all supported Fastlane language codes
 */
export function getSupportedLanguages(): string[] {
  return Array.from(FASTLANE_LANGUAGES).sort();
}

/**
 * Map multiple language codes with validation
 */
export async function mapLanguages(
  languages: string[],
  configPath?: string
): Promise<Map<string, string>> {
  const userMappings = await loadUserMappings(configPath);
  const mapped = new Map<string, string>();

  for (const lang of languages) {
    const fastlaneCode = mapToFastlaneCode(lang, userMappings);
    mapped.set(lang, fastlaneCode);
  }

  return mapped;
}