import { describe, it, expect } from 'vitest';
import {
  sanitizeDevices,
  sanitizeLanguages,
  sanitizePath,
  validateTemplateId,
  validateDeviceArray,
  sanitizeCaption,
  validateJson,
  validateArguments
} from '../src/utils/validation.js';

describe('Security Validation', () => {
  describe('sanitizeDevices', () => {
    it('should accept valid device names', () => {
      expect(sanitizeDevices('iphone')).toBe('iphone');
      expect(sanitizeDevices('iphone,ipad')).toBe('iphone,ipad');
      expect(sanitizeDevices('iphone,ipad,watch,mac')).toBe('iphone,ipad,watch,mac');
    });

    it('should reject invalid device names', () => {
      expect(() => sanitizeDevices('android')).toThrow('No valid devices');
      expect(sanitizeDevices('iphone,android')).toBe('iphone'); // Filters out invalid
    });

    it('should prevent command injection', () => {
      // Test with valid device separated by comma to ensure parsing works
      const result1 = sanitizeDevices('iphone,;rm -rf /');
      expect(result1).toBe('iphone');
      expect(result1).not.toContain(';');

      const result2 = sanitizeDevices('iphone,$(whoami)');
      expect(result2).toBe('iphone');
      expect(result2).not.toContain('$');

      const result3 = sanitizeDevices('iphone,`ls`');
      expect(result3).toBe('iphone');
      expect(result3).not.toContain('`');

      const result4 = sanitizeDevices('iphone,|cat /etc/passwd');
      expect(result4).toBe('iphone');
      expect(result4).not.toContain('|');
    });

    it('should enforce length limits', () => {
      const longString = 'iphone,'.repeat(50);
      expect(() => sanitizeDevices(longString)).toThrow('Device list too long');
    });

    it('should enforce array size limits', () => {
      const manyDevices = 'iphone,' + 'ipad,'.repeat(15);
      expect(() => sanitizeDevices(manyDevices)).toThrow('Too many devices');
    });

    it('should handle case insensitive', () => {
      expect(sanitizeDevices('iPhone,iPad')).toBe('iphone,ipad');
      expect(sanitizeDevices('WATCH')).toBe('watch');
    });
  });

  describe('sanitizeLanguages', () => {
    it('should accept valid language codes', () => {
      expect(sanitizeLanguages('en')).toBe('en');
      expect(sanitizeLanguages('en,es,fr')).toBe('en,es,fr');
      expect(sanitizeLanguages('en-us,fr-ca')).toBe('en-us,fr-ca');
      expect(sanitizeLanguages('zh-cn')).toBe('zh-cn');
    });

    it('should reject invalid language codes', () => {
      expect(() => sanitizeLanguages('english')).toThrow('No valid language');
      expect(() => sanitizeLanguages('1234')).toThrow('No valid language');
      expect(() => sanitizeLanguages('e')).toThrow('No valid language'); // Too short
      expect(() => sanitizeLanguages('engl')).toThrow('No valid language'); // Too long
    });

    it('should prevent command injection', () => {
      // Test with valid language separated by comma to ensure parsing works
      const result1 = sanitizeLanguages('en,;rmdir /');
      expect(result1).not.toContain(';');
      expect(result1).toBe('en'); // 'rmdir' is 5 chars, won't be valid

      const result2 = sanitizeLanguages('en,$(whoami)');
      expect(result2).not.toContain('$');
      expect(result2).toBe('en'); // 'whoami' is 6 chars, won't be valid

      const result3 = sanitizeLanguages('en,`exec`');
      expect(result3).not.toContain('`');
      expect(result3).toBe('en'); // 'exec' is 4 chars, won't be valid

      const result4 = sanitizeLanguages('en,|system|');
      expect(result4).not.toContain('|');
      expect(result4).toBe('en'); // 'system' is 6 chars, won't be valid
    });

    it('should enforce length limits', () => {
      const longString = 'en,'.repeat(100);
      expect(() => sanitizeLanguages(longString)).toThrow('Language list too long');
    });

    it('should enforce array size limits', () => {
      const manyLangs = Array(35).fill('en').join(',');
      expect(() => sanitizeLanguages(manyLangs)).toThrow('Too many languages');
    });
  });

  describe('sanitizePath', () => {
    it('should accept valid paths', () => {
      expect(sanitizePath('./output')).toBe('./output');
      expect(sanitizePath('/Users/test/output')).toBe('/Users/test/output');
      expect(sanitizePath('my-folder_123')).toBe('my-folder_123');
    });

    it('should prevent directory traversal', () => {
      expect(() => sanitizePath('../etc/passwd')).toThrow('Directory traversal');
      expect(() => sanitizePath('../../secret')).toThrow('Directory traversal');
      expect(() => sanitizePath('output/../../../etc')).toThrow('Directory traversal');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizePath('output;rm -rf /')).toBe('outputrm -rf /');
      expect(sanitizePath('file$(whoami).txt')).toBe('filewhoami.txt');
      expect(sanitizePath('path`ls`.txt')).toBe('pathls.txt');
    });

    it('should enforce length limits', () => {
      const longPath = 'a'.repeat(501);
      expect(() => sanitizePath(longPath)).toThrow('Path too long');
    });

    it('should allow spaces in paths', () => {
      expect(sanitizePath('My Documents/Screenshots')).toBe('My Documents/Screenshots');
    });
  });

  describe('validateTemplateId', () => {
    it('should accept valid template IDs', () => {
      expect(validateTemplateId('modern')).toBe(true);
      expect(validateTemplateId('minimal')).toBe(true);
      expect(validateTemplateId('bold')).toBe(true);
      expect(validateTemplateId('elegant')).toBe(true);
      expect(validateTemplateId('nerdy')).toBe(true);
    });

    it('should reject invalid template IDs', () => {
      expect(validateTemplateId('invalid')).toBe(false);
      expect(validateTemplateId('custom')).toBe(false);
      expect(validateTemplateId('')).toBe(false);
    });

    it('should reject excessively long IDs', () => {
      const longId = 'a'.repeat(51);
      expect(validateTemplateId(longId)).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(validateTemplateId('MODERN')).toBe(false);
      expect(validateTemplateId('Modern')).toBe(false);
    });
  });

  describe('validateDeviceArray', () => {
    it('should accept valid device arrays', () => {
      expect(validateDeviceArray(['iphone'])).toEqual(['iphone']);
      expect(validateDeviceArray(['iphone', 'ipad'])).toEqual(['iphone', 'ipad']);
      expect(validateDeviceArray(['iPhone', 'iPad'])).toEqual(['iphone', 'ipad']); // Lowercases
    });

    it('should filter out invalid devices', () => {
      expect(validateDeviceArray(['iphone', 'android'])).toEqual(['iphone']);
      expect(validateDeviceArray(['invalid', 'ipad'])).toEqual(['ipad']);
    });

    it('should throw if no valid devices', () => {
      expect(() => validateDeviceArray(['android'])).toThrow('No valid devices');
      expect(() => validateDeviceArray([])).toThrow('No valid devices');
    });

    it('should enforce array size limits', () => {
      const manyDevices = Array(15).fill('iphone');
      expect(() => validateDeviceArray(manyDevices)).toThrow('Too many devices');
    });
  });

  describe('sanitizeCaption', () => {
    it('should accept valid captions', () => {
      expect(sanitizeCaption('Hello World')).toBe('Hello World');
      expect(sanitizeCaption('Amazing App! 🎉')).toBe('Amazing App! 🎉'); // Unicode OK
      expect(sanitizeCaption('Version 1.0')).toBe('Version 1.0');
    });

    it('should remove control characters', () => {
      expect(sanitizeCaption('Hello\x00World')).toBe('HelloWorld');
      expect(sanitizeCaption('Test\x1BEscape')).toBe('TestEscape');
      expect(sanitizeCaption('Line\x7FDel')).toBe('LineDel');
    });

    it('should enforce length limits', () => {
      const longCaption = 'a'.repeat(501);
      expect(() => sanitizeCaption(longCaption)).toThrow('Caption too long');
    });

    it('should preserve newlines and tabs', () => {
      expect(sanitizeCaption('Line 1\nLine 2')).toBe('Line 1\nLine 2');
      expect(sanitizeCaption('Tab\tSeparated')).toBe('Tab\tSeparated');
    });
  });

  describe('validateJson', () => {
    it('should parse valid JSON', () => {
      expect(validateJson('{"key": "value"}')).toEqual({ key: 'value' });
      expect(validateJson('[]')).toEqual([]);
      expect(validateJson('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should reject invalid JSON', () => {
      expect(() => validateJson('not json')).toThrow('Invalid JSON');
      expect(() => validateJson('{key: value}')).toThrow('Invalid JSON');
      expect(() => validateJson("{'key': 'value'}")).toThrow('Invalid JSON'); // Single quotes
    });

    it('should enforce size limits', () => {
      const largeJson = '{"data": "' + 'a'.repeat(10001) + '"}';
      expect(() => validateJson(largeJson)).toThrow('JSON string too long');
    });

    it('should handle edge cases', () => {
      expect(validateJson('null')).toBe(null);
      expect(validateJson('true')).toBe(true);
      expect(validateJson('false')).toBe(false);
      expect(validateJson('0')).toBe(0);
      expect(validateJson('""')).toBe('');
    });
  });

  describe('validateArguments', () => {
    it('should accept valid argument arrays', () => {
      expect(() => validateArguments(['--device', 'iphone'])).not.toThrow();
      expect(() => validateArguments(['build', '--verbose'])).not.toThrow();
      expect(() => validateArguments([])).not.toThrow();
    });

    it('should reject too many arguments', () => {
      const manyArgs = Array(101).fill('arg');
      expect(() => validateArguments(manyArgs)).toThrow('Too many arguments');
    });

    it('should reject excessively long arguments', () => {
      const longArg = 'a'.repeat(1001);
      expect(() => validateArguments([longArg])).toThrow('Argument too long');
    });

    it('should check each argument', () => {
      const args = ['normal', 'a'.repeat(1001), 'another'];
      expect(() => validateArguments(args)).toThrow('Argument too long');
    });
  });

  describe('Command Injection Prevention', () => {
    it('should prevent all common injection patterns', () => {
      const maliciousInputs = [
        '; rm -rf /',
        '$(rm -rf /)',
        '`rm -rf /`',
        '| cat /etc/passwd',
        '&& malicious-command',
        '|| malicious-command',
        '\n malicious-command',
        '\r\n malicious-command',
        '> /etc/passwd',
        '< /etc/shadow',
        '>> output.txt'
      ];

      maliciousInputs.forEach(input => {
        // Test devices - special characters are stripped and won't interfere
        const safeInput = 'iphone' + input + ',mac';
        const devices = sanitizeDevices(safeInput);
        expect(['iphone,mac', 'iphone', 'mac']).toContain(devices); // May parse differently
        expect(devices).not.toContain(';');
        expect(devices).not.toContain('$');
        expect(devices).not.toContain('`');
        expect(devices).not.toContain('|');
        expect(devices).not.toContain('&');
        expect(devices).not.toContain('>');
        expect(devices).not.toContain('<');
        expect(devices).not.toContain('\n');
        expect(devices).not.toContain('\r');

        // Test paths
        const path = sanitizePath('output' + input);
        expect(path).not.toContain(';');
        expect(path).not.toContain('$');
        expect(path).not.toContain('`');
        expect(path).not.toContain('|');
        expect(path).not.toContain('&');
        expect(path).not.toContain('>');
        expect(path).not.toContain('<');
      });
    });
  });

  describe('DoS Prevention', () => {
    it('should prevent memory exhaustion attacks', () => {
      // Very long strings
      const veryLongString = 'a'.repeat(10000);
      expect(() => sanitizeDevices(veryLongString)).toThrow();
      expect(() => sanitizeLanguages(veryLongString)).toThrow();
      expect(() => sanitizePath(veryLongString)).toThrow();
      expect(() => sanitizeCaption(veryLongString)).toThrow();
      expect(() => validateJson(veryLongString)).toThrow();
    });

    it('should prevent array explosion attacks', () => {
      // Many array elements
      const manyDevices = Array(100).fill('iphone');
      expect(() => validateDeviceArray(manyDevices)).toThrow();

      const manyArgs = Array(1000).fill('arg');
      expect(() => validateArguments(manyArgs)).toThrow();
    });
  });
});