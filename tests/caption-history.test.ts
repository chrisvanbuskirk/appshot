import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up
    process.chdir(originalCwd);
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
        suggestions: {
          global: ['Test Caption'],
          iphone: ['iPhone Caption']
        },
        frequency: { 'Test Caption': 5 },
        patterns: ['Test your *'],
        lastUpdated: new Date().toISOString()
      };

      await fs.mkdir('.appshot', { recursive: true });
      await fs.writeFile(
        '.appshot/caption-history.json',
        JSON.stringify(existingHistory, null, 2)
      );

      const history = await loadCaptionHistory();
      
      expect(history.suggestions.global).toContain('Test Caption');
      expect(history.suggestions.iphone).toContain('iPhone Caption');
      expect(history.frequency['Test Caption']).toBe(5);
      expect(history.patterns).toContain('Test your *');
    });
  });

  describe('saveCaptionHistory', () => {
    it('should save history to file', async () => {
      const history: CaptionHistory = {
        suggestions: {
          global: ['Saved Caption'],
          watch: ['Watch Caption']
        },
        frequency: { 'Saved Caption': 3 },
        patterns: ['Save your *'],
        lastUpdated: ''
      };

      await saveCaptionHistory(history);

      const savedContent = await fs.readFile('.appshot/caption-history.json', 'utf8');
      const saved = JSON.parse(savedContent);
      
      expect(saved.suggestions.global).toContain('Saved Caption');
      expect(saved.suggestions.watch).toContain('Watch Caption');
      expect(saved.frequency['Saved Caption']).toBe(3);
      expect(saved.lastUpdated).toBeDefined();
    });

    it('should create directory if it does not exist', async () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      await saveCaptionHistory(history);
      
      const dirExists = await fs.access('.appshot')
        .then(() => true)
        .catch(() => false);
      
      expect(dirExists).toBe(true);
    });
  });

  describe('updateFrequency', () => {
    it('should increment frequency for existing caption', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: { 'Existing Caption': 2 },
        patterns: [],
        lastUpdated: ''
      };

      updateFrequency(history, 'Existing Caption');
      
      expect(history.frequency['Existing Caption']).toBe(3);
    });

    it('should add new caption with frequency 1', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      updateFrequency(history, 'New Caption');
      
      expect(history.frequency['New Caption']).toBe(1);
    });

    it('should handle empty or whitespace captions', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      updateFrequency(history, '');
      updateFrequency(history, '   ');
      
      expect(Object.keys(history.frequency).length).toBe(0);
    });
  });

  describe('addToSuggestions', () => {
    it('should add caption to global suggestions', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      addToSuggestions(history, 'New Global Caption');
      
      expect(history.suggestions.global).toContain('New Global Caption');
    });

    it('should add caption to device-specific suggestions', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      addToSuggestions(history, 'iPhone Caption', 'iphone');
      
      expect(history.suggestions.iphone).toContain('iPhone Caption');
      expect(history.suggestions.global).toContain('iPhone Caption');
    });

    it('should not add duplicate captions', () => {
      const history: CaptionHistory = {
        suggestions: { global: ['Existing Caption'] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      addToSuggestions(history, 'Existing Caption');
      
      expect(history.suggestions.global.filter(s => s === 'Existing Caption').length).toBe(1);
    });

    it('should handle empty captions', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      addToSuggestions(history, '');
      addToSuggestions(history, '   ');
      
      expect(history.suggestions.global.length).toBe(0);
    });
  });

  describe('extractPatterns', () => {
    it('should extract "Track your" pattern', () => {
      const patterns = extractPatterns('Track your workouts');
      expect(patterns).toContain('Track your *');
    });

    it('should extract "Manage your" pattern', () => {
      const patterns = extractPatterns('Manage your tasks efficiently');
      expect(patterns).toContain('Manage your *');
    });

    it('should extract "Control your" pattern', () => {
      const patterns = extractPatterns('Control your audit flow');
      expect(patterns).toContain('Control your *');
    });

    it('should handle case insensitive matching', () => {
      const patterns = extractPatterns('track your progress');
      expect(patterns).toContain('Track your *');
    });

    it('should return empty array for non-matching captions', () => {
      const patterns = extractPatterns('Beautiful interface');
      expect(patterns).toEqual([]);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions sorted by frequency', () => {
      const history: CaptionHistory = {
        suggestions: {
          global: ['Caption A', 'Caption B', 'Caption C']
        },
        frequency: {
          'Caption A': 1,
          'Caption B': 5,
          'Caption C': 3
        },
        patterns: [],
        lastUpdated: ''
      };

      const suggestions = getSuggestions(history);
      
      expect(suggestions[0]).toBe('Caption B'); // Highest frequency
      expect(suggestions[1]).toBe('Caption C');
      expect(suggestions[2]).toBe('Caption A'); // Lowest frequency
    });

    it('should prioritize device-specific suggestions', () => {
      const history: CaptionHistory = {
        suggestions: {
          global: ['Global Caption'],
          watch: ['Watch Caption']
        },
        frequency: {
          'Global Caption': 10,
          'Watch Caption': 1
        },
        patterns: [],
        lastUpdated: ''
      };

      const suggestions = getSuggestions(history, 'watch');
      
      expect(suggestions[0]).toBe('Watch Caption'); // Device-specific first
      expect(suggestions[1]).toBe('Global Caption');
    });

    it('should limit suggestions to 15', () => {
      const history: CaptionHistory = {
        suggestions: {
          global: Array.from({ length: 20 }, (_, i) => `Caption ${i}`)
        },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      const suggestions = getSuggestions(history);
      
      expect(suggestions.length).toBe(15);
    });

    it('should handle empty history', () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      const suggestions = getSuggestions(history);
      
      expect(suggestions).toEqual([]);
    });
  });

  describe('learnFromExistingCaptions', () => {
    it('should learn from existing caption files', async () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      // Create sample caption files
      await fs.mkdir('.appshot/captions', { recursive: true });
      await fs.writeFile(
        '.appshot/captions/iphone.json',
        JSON.stringify({
          'screenshot1.png': 'Track your progress',
          'screenshot2.png': { en: 'Manage your tasks', fr: 'Gérez vos tâches' }
        })
      );

      await learnFromExistingCaptions(history);
      
      expect(history.suggestions.global).toContain('Track your progress');
      expect(history.suggestions.global).toContain('Manage your tasks');
      expect(history.suggestions.iphone).toContain('Track your progress');
      expect(history.frequency['Track your progress']).toBe(1);
      expect(history.patterns).toContain('Track your *');
      expect(history.patterns).toContain('Manage your *');
    });

    it('should handle missing captions directory', async () => {
      const history: CaptionHistory = {
        suggestions: { global: [] },
        frequency: {},
        patterns: [],
        lastUpdated: ''
      };

      // Don't create captions directory
      await learnFromExistingCaptions(history);
      
      // Should not throw, just have empty data
      expect(history.suggestions.global).toEqual([]);
      expect(Object.keys(history.frequency).length).toBe(0);
    });
  });

  describe('clearCaptionHistory', () => {
    it('should delete history file', async () => {
      await fs.mkdir('.appshot', { recursive: true });
      await fs.writeFile('.appshot/caption-history.json', '{}');
      
      await clearCaptionHistory();
      
      const fileExists = await fs.access('.appshot/caption-history.json')
        .then(() => true)
        .catch(() => false);
      
      expect(fileExists).toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      await expect(clearCaptionHistory()).resolves.not.toThrow();
    });
  });
});