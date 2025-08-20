import { promises as fs } from 'fs';
import path from 'path';
import type { CaptionHistory, CaptionSuggestions, CaptionsFile } from '../types.js';

const HISTORY_FILE = '.appshot/caption-history.json';
const MAX_SUGGESTIONS = 100; // Maximum suggestions per category
const MAX_FREQUENCY_ENTRIES = 200; // Maximum tracked frequencies

/**
 * Load caption history from file
 */
export async function loadCaptionHistory(): Promise<CaptionHistory> {
  const historyPath = path.join(process.cwd(), HISTORY_FILE);

  try {
    const content = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(content);
  } catch {
    // Return default history if file doesn't exist
    return {
      suggestions: {
        global: [
          'Control Your Audit Flow',
          'Track Your Progress',
          'Manage Your Tasks',
          'Stay Organized',
          'Beautiful Interface',
          'Powerful Features',
          'Simple and Intuitive',
          'Track Everything',
          'Get Things Done',
          'Your Personal Assistant'
        ]
      },
      frequency: {},
      patterns: [
        'Track your *',
        'Manage your *',
        'Control your *',
        'View your *',
        'Monitor your *',
        'Organize your *'
      ],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save caption history to file
 */
export async function saveCaptionHistory(history: CaptionHistory): Promise<void> {
  const historyPath = path.join(process.cwd(), HISTORY_FILE);
  const historyDir = path.dirname(historyPath);

  // Ensure directory exists
  await fs.mkdir(historyDir, { recursive: true });

  // Limit the size of stored data
  const trimmedHistory = trimHistory(history);
  trimmedHistory.lastUpdated = new Date().toISOString();

  await fs.writeFile(historyPath, JSON.stringify(trimmedHistory, null, 2), 'utf8');
}

/**
 * Update frequency count for a caption
 */
export function updateFrequency(history: CaptionHistory, caption: string): void {
  if (!caption || caption.trim() === '') return;

  const trimmed = caption.trim();
  history.frequency[trimmed] = (history.frequency[trimmed] || 0) + 1;
}

/**
 * Add a caption to suggestions if it's new
 */
export function addToSuggestions(
  history: CaptionHistory,
  caption: string,
  device?: string
): void {
  if (!caption || caption.trim() === '') return;

  const trimmed = caption.trim();

  // Add to global suggestions
  if (!history.suggestions.global.includes(trimmed)) {
    history.suggestions.global.push(trimmed);
  }

  // Add to device-specific suggestions if device is provided
  if (device) {
    if (!history.suggestions[device]) {
      history.suggestions[device] = [];
    }
    const deviceSuggestions = history.suggestions[device];
    if (deviceSuggestions && !deviceSuggestions.includes(trimmed)) {
      deviceSuggestions.push(trimmed);
    }
  }
}

/**
 * Extract patterns from a caption
 * e.g., "Track your workouts" -> "Track your *"
 */
export function extractPatterns(caption: string): string[] {
  const patterns: string[] = [];

  // Common patterns
  const commonStarts = [
    'Track your', 'Manage your', 'Control your', 'View your',
    'Monitor your', 'Organize your', 'Create your', 'Build your',
    'Design your', 'Customize your', 'Share your', 'Sync your'
  ];

  for (const start of commonStarts) {
    if (caption.toLowerCase().startsWith(start.toLowerCase())) {
      patterns.push(`${start} *`);
      break;
    }
  }

  return patterns;
}

/**
 * Learn from existing caption files
 */
export async function learnFromExistingCaptions(history: CaptionHistory): Promise<void> {
  const captionsDir = path.join(process.cwd(), '.appshot', 'captions');

  try {
    const files = await fs.readdir(captionsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const device = file.replace('.json', '');
      const content = await fs.readFile(path.join(captionsDir, file), 'utf8');
      const captions: CaptionsFile = JSON.parse(content);

      for (const [, captionData] of Object.entries(captions)) {
        if (typeof captionData === 'string') {
          addToSuggestions(history, captionData, device);
          updateFrequency(history, captionData);

          const patterns = extractPatterns(captionData);
          for (const pattern of patterns) {
            if (!history.patterns.includes(pattern)) {
              history.patterns.push(pattern);
            }
          }
        } else if (captionData && typeof captionData === 'object') {
          for (const caption of Object.values(captionData)) {
            addToSuggestions(history, caption, device);
            updateFrequency(history, caption);

            const patterns = extractPatterns(caption);
            for (const pattern of patterns) {
              if (!history.patterns.includes(pattern)) {
                history.patterns.push(pattern);
              }
            }
          }
        }
      }
    }
  } catch {
    // Captions directory doesn't exist yet, that's okay
  }
}

/**
 * Get suggestions for autocomplete
 */
export function getSuggestions(
  history: CaptionHistory,
  device?: string,
  currentInput?: string
): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  // Helper to add unique suggestions
  const addUnique = (items: string[]) => {
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        suggestions.push(item);
      }
    }
  };

  // Sort suggestions by frequency
  const sortByFrequency = (items: string[]) => {
    return items.sort((a, b) => {
      const freqA = history.frequency[a] || 0;
      const freqB = history.frequency[b] || 0;
      return freqB - freqA;
    });
  };

  // Add device-specific suggestions first (sorted by frequency)
  if (device && history.suggestions[device]) {
    const deviceSuggestions = history.suggestions[device];
    if (deviceSuggestions) {
      addUnique(sortByFrequency([...deviceSuggestions]));
    }
  }

  // Add global suggestions (sorted by frequency)
  addUnique(sortByFrequency([...history.suggestions.global]));

  // If there's current input, also suggest pattern completions
  if (currentInput && currentInput.length > 3) {
    for (const pattern of history.patterns) {
      const patternStart = pattern.replace(' *', '');
      if (currentInput.toLowerCase().startsWith(patternStart.toLowerCase())) {
        // Don't add pattern suggestions, they're just for reference
        // The actual suggestions are already in the list
      }
    }
  }

  return suggestions.slice(0, 15); // Return top 15 suggestions
}

/**
 * Trim history to prevent it from growing too large
 */
function trimHistory(history: CaptionHistory): CaptionHistory {
  // Trim suggestions
  const trimmedSuggestions: CaptionSuggestions = {
    global: history.suggestions.global.slice(-MAX_SUGGESTIONS)
  };

  for (const [device, suggestions] of Object.entries(history.suggestions)) {
    if (device !== 'global' && suggestions) {
      trimmedSuggestions[device] = suggestions.slice(-MAX_SUGGESTIONS);
    }
  }

  // Trim frequency entries (keep most frequent)
  const freqEntries = Object.entries(history.frequency);
  freqEntries.sort((a, b) => b[1] - a[1]);
  const trimmedFrequency = Object.fromEntries(
    freqEntries.slice(0, MAX_FREQUENCY_ENTRIES)
  );

  // Trim patterns
  const trimmedPatterns = history.patterns.slice(-50);

  return {
    suggestions: trimmedSuggestions,
    frequency: trimmedFrequency,
    patterns: trimmedPatterns,
    lastUpdated: history.lastUpdated
  };
}

/**
 * Clear caption history
 */
export async function clearCaptionHistory(): Promise<void> {
  const historyPath = path.join(process.cwd(), HISTORY_FILE);

  try {
    await fs.unlink(historyPath);
  } catch {
    // File doesn't exist, that's okay
  }
}