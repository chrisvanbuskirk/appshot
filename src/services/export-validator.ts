import { promises as fs } from 'fs';
import path from 'path';
import { FASTLANE_LANGUAGES } from './fastlane-language-mapper.js';

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  stats?: {
    totalScreenshots: number;
    deviceCounts: Record<string, number>;
    languageCounts: Record<string, number>;
  };
}

/**
 * Validate export operation before execution
 */
export async function validateExport(
  source: string,
  languages: Map<string, string>,
  requestedDevices?: string[]
): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];
  const deviceCounts: Record<string, number> = {};
  const languageCounts: Record<string, number> = {};

  // Check source directory exists
  try {
    await fs.access(source);
  } catch {
    issues.push(`Source directory not found: ${source}`);
    return { valid: false, issues, warnings };
  }

  // Check if source is the correct directory structure
  const sourceContents = await fs.readdir(source);
  const allDevices = ['iphone', 'ipad', 'mac', 'watch'];
  const hasDeviceDirectories = sourceContents.some(item =>
    allDevices.includes(item.toLowerCase())
  );

  if (!hasDeviceDirectories) {
    warnings.push(`No device directories found in ${source}. Expected: ${allDevices.join(', ')}`);
  }

  // Use requested devices or default to all
  const devices = requestedDevices && requestedDevices.length > 0
    ? requestedDevices
    : allDevices;

  // Count screenshots and validate structure
  let totalScreenshots = 0;

  for (const device of devices) {
    const deviceDir = path.join(source, device);
    deviceCounts[device] = 0;

    let deviceDirExists = false;
    try {
      await fs.access(deviceDir);
      deviceDirExists = true;
    } catch {
      // Device directory doesn't exist
      // If this device was specifically requested, warn about it
      if (requestedDevices && requestedDevices.includes(device)) {
        warnings.push(`No ${device} directory found - requested device will be skipped`);
      }
      continue;
    }

    for (const [sourceLang] of languages) {
      const langDir = path.join(deviceDir, sourceLang);

      try {
        await fs.access(langDir);
        const files = await fs.readdir(langDir);
        const screenshots = files.filter(f =>
          f.match(/\.(png|jpg|jpeg)$/i) && !f.startsWith('.')
        );

        totalScreenshots += screenshots.length;
        deviceCounts[device] += screenshots.length;

        if (!languageCounts[sourceLang]) {
          languageCounts[sourceLang] = 0;
        }
        languageCounts[sourceLang] += screenshots.length;

        // Check for empty directories
        if (screenshots.length === 0) {
          warnings.push(`No screenshots found in ${device}/${sourceLang}/`);
        }
      } catch {
        // Language directory doesn't exist for this device
      }
    }

    // After checking all languages, warn if a requested device has no screenshots
    if (requestedDevices && requestedDevices.includes(device) && deviceCounts[device] === 0 && deviceDirExists) {
      warnings.push(`No screenshots found for requested device: ${device}`);
    }
  }

  // Check if any screenshots were found for requested devices
  if (totalScreenshots === 0) {
    if (requestedDevices && requestedDevices.length > 0) {
      // User specifically requested devices, but none have screenshots
      issues.push(`No screenshots found for requested devices: ${requestedDevices.join(', ')}`);
    } else {
      // No screenshots at all
      issues.push('No screenshots found to export');
    }
  }

  // Validate language code mappings
  for (const [source, target] of languages) {
    if (!FASTLANE_LANGUAGES.has(target)) {
      warnings.push(
        `Language code '${target}' (mapped from '${source}') may not be recognized by Fastlane. ` +
        `Consider using one of: ${Array.from(FASTLANE_LANGUAGES).slice(0, 5).join(', ')}...`
      );
    }
  }

  // Only check for missing iPhone if we're exporting all devices or iPhone is requested
  const checkingIphone = !requestedDevices || requestedDevices.includes('iphone');
  if (checkingIphone && deviceCounts.iphone === 0 && totalScreenshots > 0) {
    warnings.push('No iPhone screenshots found. iPhone screenshots are typically required for App Store submission.');
  }

  // Only warn about App Store resolutions if we're actually exporting those devices
  const exportingIphone = requestedDevices ? requestedDevices.includes('iphone') : true;
  const exportingIpad = requestedDevices ? requestedDevices.includes('ipad') : true;

  if ((exportingIphone && deviceCounts.iphone > 0) || (exportingIpad && deviceCounts.ipad > 0)) {
    const requiredNote = 'Consider using `appshot build --preset iphone-6-9,ipad-13` for required App Store resolutions.';
    if (!warnings.find(w => w.includes('required App Store resolutions'))) {
      warnings.push(requiredNote);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    stats: {
      totalScreenshots,
      deviceCounts,
      languageCounts
    }
  };
}

/**
 * Validate output directory
 */
export async function validateOutputDirectory(
  outputPath: string,
  requireEmpty: boolean = false
): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  try {
    await fs.access(outputPath);

    if (requireEmpty) {
      const contents = await fs.readdir(outputPath);
      if (contents.length > 0) {
        warnings.push(
          `Output directory is not empty: ${outputPath}. ` +
          'Use --clean to remove existing files.'
        );
      }
    }
  } catch {
    // Directory doesn't exist, which is fine - we'll create it
  }

  // Check if we can write to the parent directory or create it
  const parentDir = path.dirname(outputPath);

  // Find the nearest existing ancestor directory
  let checkDir = parentDir;
  let foundExistingDir = false;

  while (checkDir && checkDir !== path.dirname(checkDir)) {
    try {
      await fs.access(checkDir);
      foundExistingDir = true;
      break;
    } catch {
      // Move up to parent
      checkDir = path.dirname(checkDir);
    }
  }

  // If we found an existing directory, check if it's writable
  if (foundExistingDir) {
    try {
      await fs.access(checkDir, fs.constants.W_OK);
    } catch {
      issues.push(`Cannot write to directory: ${checkDir}`);
    }
  } else {
    // No parent directory found at all (shouldn't happen on normal systems)
    issues.push(`No writable parent directory found for: ${outputPath}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Check if a path is safe to clean (not a system directory)
 */
export function isSafeToClean(targetPath: string): boolean {
  const normalizedPath = path.resolve(targetPath);
  const unsafePaths = [
    '/',
    '/Users',
    '/System',
    '/Applications',
    '/Library',
    '/usr',
    '/bin',
    '/sbin',
    '/etc',
    '/var',
    '/tmp',
    process.env.HOME || '',
    path.resolve('.'),  // Current directory
    path.resolve('..')  // Parent directory
  ].filter(Boolean);

  // Check if path is a system directory
  if (unsafePaths.includes(normalizedPath)) {
    return false;
  }

  // Check if path is too short (likely a mistake)
  const pathDepth = normalizedPath.split(path.sep).filter(Boolean).length;
  if (pathDepth < 2) {
    return false;
  }

  // Check if it's in the project directory
  const projectRoot = process.cwd();
  if (!normalizedPath.startsWith(projectRoot)) {
    return false;
  }

  return true;
}