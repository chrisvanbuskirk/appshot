import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';

export interface ScreenshotOrder {
  iphone?: string[];
  ipad?: string[];
  mac?: string[];
  watch?: string[];
}

export interface OrderConfig {
  version: string;
  orders: ScreenshotOrder;
  created: string;
  modified: string;
}

const CONFIG_VERSION = '1.0';
const ORDER_FILE = '.appshot/screenshot-order.json';

/**
 * Load screenshot order configuration
 */
export async function loadOrderConfig(projectPath?: string): Promise<OrderConfig | null> {
  try {
    const configPath = path.join(projectPath || process.cwd(), ORDER_FILE);
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Silently return null for missing file, but log other errors
    if ((error as any).code !== 'ENOENT') {
      console.error('Error loading order config:', error);
    }
    return null;
  }
}

/**
 * Save screenshot order configuration
 */
export async function saveOrderConfig(
  orders: ScreenshotOrder,
  projectPath?: string
): Promise<void> {
  const configPath = path.join(projectPath || process.cwd(), ORDER_FILE);
  const configDir = path.dirname(configPath);

  // Ensure directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Load existing config or create new
  const existing = await loadOrderConfig(projectPath);

  const config: OrderConfig = {
    version: CONFIG_VERSION,
    orders,
    created: existing?.created || new Date().toISOString(),
    modified: new Date().toISOString()
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

/**
 * Apply ordering to screenshots based on saved configuration
 */
export function applyOrder(
  screenshots: string[],
  device: string,
  orderConfig: OrderConfig | null
): string[] {
  if (!orderConfig || !orderConfig.orders[device as keyof ScreenshotOrder]) {
    // No order config, try to detect existing numeric prefixes
    return sortByExistingPrefixes(screenshots);
  }

  const deviceOrder = orderConfig.orders[device as keyof ScreenshotOrder]!;
  const ordered: string[] = [];
  const remaining = new Set(screenshots);

  // Create a map of clean names to actual filenames for matching
  const cleanToActual = new Map<string, string>();
  for (const file of screenshots) {
    // Remove numeric prefix for matching
    const cleanName = file.replace(/^\d+[-_.]/, '');
    cleanToActual.set(cleanName, file);
  }

  // First, add screenshots in the defined order
  for (const orderedFile of deviceOrder) {
    // Clean the ordered filename too (in case it has prefixes)
    const cleanOrderedFile = orderedFile.replace(/^\d+[-_.]/, '');

    // Try to find a match by clean name
    const actualFile = cleanToActual.get(cleanOrderedFile) ||
                      cleanToActual.get(orderedFile) || // Also try exact match
                      (remaining.has(orderedFile) ? orderedFile : null); // Fallback to exact

    if (actualFile && remaining.has(actualFile)) {
      ordered.push(actualFile);
      remaining.delete(actualFile);
    }
  }

  // Then add any remaining screenshots (new ones not in config)
  const sortedRemaining = Array.from(remaining).sort();
  ordered.push(...sortedRemaining);

  return ordered;
}

/**
 * Sort screenshots by existing numeric prefixes if present
 */
function sortByExistingPrefixes(screenshots: string[]): string[] {
  // Check if any files have numeric prefixes
  const withPrefixes = screenshots.map(file => {
    // Match patterns like: 01_, 1-, 1., 1_
    const match = file.match(/^(\d+)[-_.]/);
    return {
      file,
      prefix: match ? parseInt(match[1], 10) : null
    };
  });

  const hasPrefixes = withPrefixes.some(item => item.prefix !== null);

  if (!hasPrefixes) {
    // No prefixes found, use smart defaults
    return applySmartDefaults(screenshots);
  }

  // Sort by prefix, then alphabetically for those without
  return withPrefixes.sort((a, b) => {
    if (a.prefix !== null && b.prefix !== null) {
      return a.prefix - b.prefix;
    }
    if (a.prefix !== null) return -1;
    if (b.prefix !== null) return 1;
    return a.file.localeCompare(b.file);
  }).map(item => item.file);
}

/**
 * Apply smart defaults for common screenshot naming patterns
 */
function applySmartDefaults(screenshots: string[]): string[] {
  const priority: Record<string, number> = {
    // Home/main screens get top priority
    'home': 1,
    'main': 1,
    'dashboard': 2,
    'overview': 2,

    // Feature screens
    'features': 10,
    'feature': 10,

    // Content screens
    'feed': 20,
    'list': 21,
    'detail': 22,
    'details': 22,

    // Interactive screens
    'search': 30,
    'filter': 31,
    'sort': 32,

    // User screens
    'profile': 40,
    'account': 41,
    'settings': 42,

    // Other common screens
    'about': 50,
    'help': 51,
    'support': 52
  };

  return screenshots.sort((a, b) => {
    // Remove extension for comparison
    const aName = path.parse(a).name.toLowerCase();
    const bName = path.parse(b).name.toLowerCase();

    // Check for exact matches first
    const aPriority = priority[aName] || 100;
    const bPriority = priority[bName] || 100;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Check for partial matches
    for (const [pattern, value] of Object.entries(priority)) {
      const aContains = aName.includes(pattern);
      const bContains = bName.includes(pattern);

      if (aContains && !bContains) return -1;
      if (!aContains && bContains) return 1;
      if (aContains && bContains) {
        return value - value; // Same priority, continue
      }
    }

    // Fallback to alphabetical
    return a.localeCompare(b);
  });
}

/**
 * Get available screenshots for a device
 */
export async function getAvailableScreenshots(
  device: string,
  sourcePath?: string,
  language: string = 'en'
): Promise<string[]> {
  const baseDir = sourcePath || './final';
  const devicePath = path.join(baseDir, device, language);

  try {
    const files = await fs.readdir(devicePath);
    return files.filter(f =>
      f.match(/\.(png|jpg|jpeg)$/i) && !f.startsWith('.')
    ).sort();
  } catch {
    return [];
  }
}

/**
 * Add numeric prefixes to filenames based on order
 */
export function addNumericPrefixes(filenames: string[], startFrom: number = 1): string[] {
  return filenames.map((file, index) => {
    // Check if file already has a numeric prefix
    if (/^\d+[-_.]/.test(file)) {
      // Remove existing prefix
      file = file.replace(/^\d+[-_.]/, '');
    }

    const num = String(startFrom + index).padStart(2, '0');
    return `${num}_${file}`;
  });
}

/**
 * Remove numeric prefixes from filenames
 */
export function removeNumericPrefixes(filenames: string[]): string[] {
  return filenames.map(file => {
    // Remove patterns like: 01_, 1-, 1., 1_
    return file.replace(/^\d+[-_.]/, '');
  });
}

/**
 * Display current order for review
 */
export function displayOrder(screenshots: string[], device: string): void {
  console.log(`\n${pc.bold(`Screenshot order for ${device}:`)}`);
  screenshots.forEach((file, index) => {
    const num = String(index + 1).padStart(2, '0');
    console.log(`  ${pc.dim(num)}. ${file}`);
  });
}