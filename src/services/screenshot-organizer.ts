import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface OrganizeOptions {
  source: string;
  output: string;
  languageMap: Map<string, string>;
  devices?: string[];  // Filter specific devices
  flatten?: boolean;
  prefixDevice?: boolean;
  devicePrefixes?: Record<string, string>;
  copy?: boolean;
  clean?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface OrganizeResult {
  processed: number;
  skipped: number;
  errors: number;
  byLanguage: Record<string, number>;
  byDevice: Record<string, number>;
  actions?: FileAction[];
}

export interface FileAction {
  source: string;
  destination: string;
  device: string;
  language: string;
  renamed?: boolean;
  specialHandling?: string;
}

/**
 * Default device prefixes for filename
 */
const DEFAULT_DEVICE_PREFIXES: Record<string, string> = {
  iphone: 'iPhone_',
  ipad: 'iPad_',
  mac: 'Mac_',
  watch: 'Watch_'
};

/**
 * Check if image has iPad Pro 12.9" 3rd gen dimensions
 */
async function isIpadPro3rdGen(imagePath: string): Promise<boolean> {
  try {
    const metadata = await sharp(imagePath).metadata();
    const { width = 0, height = 0 } = metadata;

    // iPad Pro 12.9" (3rd generation) resolution
    return (width === 2048 && height === 2732) ||
           (width === 2732 && height === 2048);
  } catch {
    return false;
  }
}

/**
 * Generate appropriate filename for special devices
 */
async function generateFilename(
  originalName: string,
  device: string,
  imagePath: string,
  options: OrganizeOptions
): Promise<{ name: string; specialHandling?: string }> {
  let filename = originalName;
  let specialHandling: string | undefined;

  // Add device prefix if requested
  if (options.prefixDevice) {
    const prefixes = options.devicePrefixes || DEFAULT_DEVICE_PREFIXES;
    const prefix = prefixes[device];
    if (prefix && !filename.startsWith(prefix)) {
      filename = `${prefix}${filename}`;
    }
  }

  // Special handling for iPad Pro 3rd gen
  if (device === 'ipad' && await isIpadPro3rdGen(imagePath)) {
    // Check if already has the identifier
    if (!filename.includes('IPAD_PRO') &&
        !filename.includes('ipadPro129') &&
        !filename.includes('iPad Pro (12.9-inch) (3rd generation)')) {

      // Remove any existing ipad prefix before adding the special one
      filename = filename.replace(/^(ipad_|iPad_)/i, '');
      filename = `IPAD_PRO_3GEN_129_${filename}`;
      specialHandling = 'iPad Pro 12.9" (3rd gen) naming applied';
    }
  }

  return { name: filename, specialHandling };
}

/**
 * Create a file operation (copy or symlink)
 */
async function createFileOperation(
  source: string,
  destination: string,
  useCopy: boolean
): Promise<void> {
  // Ensure destination directory exists
  await fs.mkdir(path.dirname(destination), { recursive: true });

  if (useCopy) {
    await fs.copyFile(source, destination);
  } else {
    // Create relative symlink for portability
    const relPath = path.relative(
      path.dirname(destination),
      source
    );

    // Remove existing symlink if it exists
    try {
      await fs.unlink(destination);
    } catch {
      // File doesn't exist, which is fine
    }

    await fs.symlink(relPath, destination);
  }
}

/**
 * Organize screenshots for Fastlane export
 */
export async function organizeScreenshots(options: OrganizeOptions): Promise<OrganizeResult> {
  const result: OrganizeResult = {
    processed: 0,
    skipped: 0,
    errors: 0,
    byLanguage: {},
    byDevice: {},
    actions: options.dryRun ? [] : undefined
  };

  // Use specified devices or default to all
  const allDevices = ['iphone', 'ipad', 'mac', 'watch'];
  const devices = options.devices && options.devices.length > 0
    ? options.devices.filter(d => allDevices.includes(d.toLowerCase()))
    : allDevices;

  // Initialize counters
  for (const [, targetLang] of options.languageMap) {
    result.byLanguage[targetLang] = 0;
  }
  for (const device of allDevices) {
    result.byDevice[device] = 0;
  }

  // Clean output directory if requested
  if (options.clean && !options.dryRun) {
    try {
      await fs.rm(options.output, { recursive: true, force: true });
    } catch {
      // Directory might not exist
    }
  }

  // Process each device and language combination
  for (const device of devices) {
    const deviceDir = path.join(options.source, device);

    try {
      await fs.access(deviceDir);
    } catch {
      // Device directory doesn't exist, skip
      continue;
    }

    for (const [sourceLang, targetLang] of options.languageMap) {
      const langSourceDir = path.join(deviceDir, sourceLang);

      try {
        await fs.access(langSourceDir);
      } catch {
        // Language directory doesn't exist for this device, skip
        continue;
      }

      // Get all image files
      const files = await fs.readdir(langSourceDir);
      const screenshots = files.filter(f =>
        f.match(/\.(png|jpg|jpeg)$/i) && !f.startsWith('.')
      );

      for (const screenshot of screenshots) {
        const sourcePath = path.join(langSourceDir, screenshot);

        // Generate output filename
        const { name: outputName, specialHandling } = await generateFilename(
          screenshot,
          device,
          sourcePath,
          options
        );

        // Determine output path
        const destDir = options.flatten
          ? path.join(options.output, targetLang)
          : path.join(options.output, targetLang, device);

        const destPath = path.join(destDir, outputName);

        if (options.dryRun) {
          // Record action for dry run
          result.actions!.push({
            source: sourcePath,
            destination: destPath,
            device,
            language: targetLang,
            renamed: outputName !== screenshot,
            specialHandling
          });
        } else {
          // Perform actual file operation
          try {
            await createFileOperation(
              sourcePath,
              destPath,
              options.copy || false
            );

            if (options.verbose) {
              console.log(`  ✓ ${device}/${sourceLang}/${screenshot} → ${targetLang}/${outputName}`);
              if (specialHandling) {
                console.log(`    ${specialHandling}`);
              }
            }

            result.processed++;
            result.byLanguage[targetLang]++;
            result.byDevice[device]++;
          } catch (error) {
            result.errors++;
            if (options.verbose) {
              console.error(`  ✗ Failed to process ${screenshot}: ${error}`);
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Detect available languages from source directory
 */
export async function detectAvailableLanguages(sourceDir: string): Promise<Map<string, Set<string>>> {
  const languagesByDevice = new Map<string, Set<string>>();
  const devices = ['iphone', 'ipad', 'mac', 'watch'];

  for (const device of devices) {
    const devicePath = path.join(sourceDir, device);

    try {
      await fs.access(devicePath);
      const entries = await fs.readdir(devicePath, { withFileTypes: true });

      const langs = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name);

      if (langs.length > 0) {
        languagesByDevice.set(device, new Set(langs));
      }
    } catch {
      // Device directory doesn't exist
    }
  }

  return languagesByDevice;
}

/**
 * Get unique languages across all devices
 */
export async function getAllLanguages(sourceDir: string): Promise<string[]> {
  const languagesByDevice = await detectAvailableLanguages(sourceDir);
  const allLanguages = new Set<string>();

  for (const [, languages] of languagesByDevice) {
    for (const lang of languages) {
      allLanguages.add(lang);
    }
  }

  return Array.from(allLanguages).sort();
}