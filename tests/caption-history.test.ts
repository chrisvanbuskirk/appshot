import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  loadCaptionHistory,
  saveCaptionHistory,
  updateFrequency,
  addToSuggestions,
  getSuggestions,
  learnFromExistingCaptions,
  clearCaptionHistory,
  extractPatterns
} from '../src/utils/caption-history.js';
import type { CaptionHistory } from '../src/types.js';

describe('caption-history', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'appshot-caption-test-'));
    originalCwd = process.cwd();

    // Mock process.cwd to return our temp directory
    vi.spyOn(process, 'cwd').mockReturnValue(testDir);
  });

  afterEach(async () => {
    // Restore mocks
    vi.restoreAllMocks();

    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('loadCaptionHistory', () => {
    it('should return default history when file does not exist', async () => {
      const history = await loadCaptionHistory();

      expect(history.suggestions.global).toContain('Control Your Audit Flow');
      expect(history.suggestions.global).toContain('Track Your Progress');
      expect(history.frequency).toEqual({});
      expect(history.patterns).toContain('Track your *');
      expect(history.lastUpdated).toBeDefined();
    });

    it('should load existing history from file', async () => {
      const existingHistory: CaptionHistory = {
        version: 1,
        suggestions: {
          global: ['Custom Caption'],
          'home.png': ['Home Screen']
        },
        frequency: {
          'Test Caption': 5
        },
        patterns: ['Custom *'],
        lastUpdated: new Date().toISOString()
      };

      await fs.mkdir(path.join(testDir, '.appshot'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.appshot', 'caption-history.json'),
        JSON.stringify(existingHistory, null, 2)
      );

      const history = await loadCaptionHistory();

      expect(history.suggestions.global).toContain('Custom Caption');
      expect(history.suggestions['home.png']).toContain('Home Screen');
      expect(history.frequency['Test Caption']).toBe(5);
      expect(history.patterns).toContain('Custom *');
    });
  });

  describe('saveCaptionHistory', () => {
    it('should save history to file', async () => {
      const history: CaptionHistory = {
        version: 1,
        suggestions: {
          global: ['Test Caption']
        },
        frequency: {
          'Test Caption': 1
        },
        patterns: [],
        lastUpdated: new Date().toISOString()
      };

      await saveCaptionHistory(history);

      const savedContent = await fs.readFile(
        path.join(testDir, '.appshot', 'caption-history.json'),
        'utf-8'
      );
      const saved = JSON.parse(savedContent);

      expect(saved.suggestions.global).toContain('Test Caption');
      expect(saved.frequency['Test Caption']).toBe(1);
    });
  });

  describe('updateFrequency', () => {
    it('should increment frequency for existing caption', async () => {
      const history = await loadCaptionHistory();
      history.frequency['Test'] = 3;

      updateFrequency(history, 'Test');

      expect(history.frequency['Test']).toBe(4);
    });

    it('should add new caption with frequency 1', async () => {
      const history = await loadCaptionHistory();

      updateFrequency(history, 'New Caption');

      expect(history.frequency['New Caption']).toBe(1);
    });

    it('should handle multiple updates', async () => {
      const history = await loadCaptionHistory();

      updateFrequency(history, 'Caption A');
      updateFrequency(history, 'Caption A');
      updateFrequency(history, 'Caption B');

      expect(history.frequency['Caption A']).toBe(2);
      expect(history.frequency['Caption B']).toBe(1);
    });
  });

  describe('addToSuggestions', () => {
    it('should add caption to global suggestions', async () => {
      const history = await loadCaptionHistory();

      addToSuggestions(history, 'New Global Caption');

      expect(history.suggestions.global).toContain('New Global Caption');
    });

    it('should add caption to file-specific suggestions', async () => {
      const history = await loadCaptionHistory();

      addToSuggestions(history, 'File Caption', 'test.png');

      expect(history.suggestions['test.png']).toContain('File Caption');
    });

    it('should not duplicate captions', async () => {
      const history = await loadCaptionHistory();

      addToSuggestions(history, 'Unique Caption');
      const countBefore = history.suggestions.global.filter(s => s === 'Unique Caption').length;

      addToSuggestions(history, 'Unique Caption');
      const countAfter = history.suggestions.global.filter(s => s === 'Unique Caption').length;

      expect(countBefore).toBe(countAfter);
    });

    it('should add suggestions without limit enforcement', async () => {
      const history = await loadCaptionHistory();
      const initialCount = history.suggestions.global.length;

      for (let i = 0; i < 50; i++) {
        addToSuggestions(history, `Caption ${i}`);
      }

      // addToSuggestions doesn't enforce a limit, it just adds unique items
      expect(history.suggestions.global.length).toBe(initialCount + 50);
    });
  });

  describe('getSuggestions', () => {
    it('should return combined suggestions for a file', async () => {
      const history: CaptionHistory = {
        version: 1,
        suggestions: {
          global: ['Global Caption 1', 'Global Caption 2'],
          'test.png': ['File Caption 1', 'File Caption 2']
        },
        frequency: {
          'Global Caption 1': 5,
          'Global Caption 2': 3,
          'File Caption 1': 7,
          'File Caption 2': 1
        },
        patterns: [],
        lastUpdated: new Date().toISOString()
      };

      const suggestions = getSuggestions(history, 'test.png');

      // Should prioritize file-specific over global
      expect(suggestions[0]).toBe('File Caption 1'); // Highest frequency file-specific
      expect(suggestions).toContain('Global Caption 1');
      expect(suggestions).toContain('File Caption 2');
    });

    it('should handle empty query', async () => {
      const history = await loadCaptionHistory();

      const suggestions = getSuggestions(history, 'test.png');

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return suggestions regardless of query', async () => {
      const history: CaptionHistory = {
        version: 1,
        suggestions: {
          global: ['Track Progress', 'Track Time', 'Beautiful Design', 'Simple Interface']
        },
        frequency: {},
        patterns: [],
        lastUpdated: new Date().toISOString()
      };

      const suggestions = getSuggestions(history, 'test.png', 'track');

      // getSuggestions doesn't filter by query, it returns all suggestions
      expect(suggestions).toContain('Track Progress');
      expect(suggestions).toContain('Track Time');
      expect(suggestions).toContain('Beautiful Design');
    });
  });

  describe('learnFromExistingCaptions', () => {
    it('should learn from device captions', async () => {
      const captions = {
        'screen1.png': 'Caption One',
        'screen2.png': {
          en: 'English Caption',
          es: 'Spanish Caption'
        }
      };

      await fs.mkdir(path.join(testDir, '.appshot', 'captions'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.appshot', 'captions', 'iphone.json'),
        JSON.stringify(captions, null, 2)
      );

      const history = await loadCaptionHistory();
      await learnFromExistingCaptions(history);

      expect(history.suggestions.global).toContain('Caption One');
      expect(history.suggestions.global).toContain('English Caption');
      expect(history.suggestions['iphone']).toContain('Caption One');
      expect(history.suggestions['iphone']).toContain('English Caption');
    });

    it('should update frequency from existing captions', async () => {
      const captions = {
        'screen1.png': 'Repeated Caption',
        'screen2.png': 'Repeated Caption',
        'screen3.png': 'Unique Caption'
      };

      await fs.mkdir(path.join(testDir, '.appshot', 'captions'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.appshot', 'captions', 'iphone.json'),
        JSON.stringify(captions, null, 2)
      );

      const history = await loadCaptionHistory();
      await learnFromExistingCaptions(history);

      expect(history.frequency['Repeated Caption']).toBe(2);
      expect(history.frequency['Unique Caption']).toBe(1);
    });
  });

  describe('clearCaptionHistory', () => {
    it('should reset history to defaults', async () => {
      // Create existing history
      const history: CaptionHistory = {
        version: 1,
        suggestions: {
          global: ['Custom Caption'],
          'file.png': ['File Caption']
        },
        frequency: {
          'Custom Caption': 10
        },
        patterns: ['Custom Pattern'],
        lastUpdated: new Date().toISOString()
      };

      await saveCaptionHistory(history);

      // Clear history
      await clearCaptionHistory();

      // Load and check it's reset
      const cleared = await loadCaptionHistory();

      expect(cleared.suggestions.global).not.toContain('Custom Caption');
      expect(cleared.suggestions['file.png']).toBeUndefined();
      expect(cleared.frequency).toEqual({});
      // Should have default patterns
      expect(cleared.patterns).toContain('Track your *');
    });
  });

  describe('extractPatterns', () => {
    it('should extract patterns from captions', () => {
      const caption1 = 'Track Your Progress';
      const caption2 = 'Manage your tasks';

      const patterns1 = extractPatterns(caption1);
      const patterns2 = extractPatterns(caption2);

      expect(patterns1).toContain('Track your *');
      expect(patterns2).toContain('Manage your *');
    });

    it('should handle different starting patterns', () => {
      const caption = 'Control your workflow';

      const patterns = extractPatterns(caption);

      expect(patterns).toContain('Control your *');
    });

    it('should not extract patterns from non-matching captions', () => {
      const caption = 'Completely Different Caption';

      const patterns = extractPatterns(caption);

      expect(patterns.length).toBe(0);
    });
  });
});