import fs from 'fs/promises';
import path from 'path';
import pc from 'picocolors';
import { UnifiedDevice, DeviceCategory } from '../types/device.js';

export interface RoutingOptions {
  strategy: 'smart' | 'manual' | 'strict';
  deleteOriginal: boolean;
  filenamePattern: string;
  overwrite: boolean;
}

export interface RouteResult {
  sourcePath: string;
  targetPath: string;
  category: DeviceCategory;
  filename: string;
}

export class ScreenshotRouter {
  private projectRoot: string | null = null;
  private fileCounter: Map<string, number> = new Map();

  constructor(private options: RoutingOptions = {
    strategy: 'smart',
    deleteOriginal: false,
    filenamePattern: '{screen}-{counter}.png',
    overwrite: false
  }) {}

  async routeScreenshot(
    device: UnifiedDevice,
    screenshotPath: string,
    screenName?: string
  ): Promise<RouteResult> {
    // 1. Determine category
    const category = device.category;

    // 2. Find or create project directory
    const projectDir = await this.getProjectDirectory();

    // 3. Build target directory path
    const targetDir = path.join(projectDir, 'screenshots', category);

    // 4. Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // 5. Generate filename
    const filename = await this.generateFilename(device, targetDir, screenName);

    // 6. Build full target path
    const targetPath = path.join(targetDir, filename);

    // 7. Check if file exists and handle accordingly
    if (!this.options.overwrite && await this.fileExists(targetPath)) {
      const newFilename = await this.generateUniqueFilename(targetDir, filename);
      const newTargetPath = path.join(targetDir, newFilename);

      console.log(pc.yellow(`⚠️  File exists, saving as: ${newFilename}`));

      return {
        sourcePath: screenshotPath,
        targetPath: newTargetPath,
        category,
        filename: newFilename
      };
    }

    return {
      sourcePath: screenshotPath,
      targetPath,
      category,
      filename
    };
  }

  async moveScreenshot(result: RouteResult): Promise<void> {
    try {
      // Copy file to target
      await fs.copyFile(result.sourcePath, result.targetPath);

      console.log(pc.green(`✅ Saved to: ${result.targetPath}`));

      // Delete original if configured
      if (this.options.deleteOriginal) {
        await fs.unlink(result.sourcePath);
        console.log(pc.dim(`   Removed original: ${result.sourcePath}`));
      }
    } catch (error) {
      console.error(pc.red(`❌ Failed to move screenshot: ${error}`));
      throw error;
    }
  }

  async routeAndMove(
    device: UnifiedDevice,
    screenshotPath: string,
    screenName?: string
  ): Promise<string> {
    const result = await this.routeScreenshot(device, screenshotPath, screenName);
    await this.moveScreenshot(result);
    return result.targetPath;
  }

  private async getProjectDirectory(): Promise<string> {
    if (this.projectRoot) {
      return this.projectRoot;
    }

    // Strategy 1: Look for .appshot directory
    const cwd = process.cwd();
    let currentDir = cwd;

    while (currentDir !== '/') {
      const appshotDir = path.join(currentDir, '.appshot');

      try {
        const stat = await fs.stat(appshotDir);
        if (stat.isDirectory()) {
          this.projectRoot = currentDir;
          return currentDir;
        }
      } catch {
        // Directory doesn't exist, continue searching
      }

      currentDir = path.dirname(currentDir);
    }

    // Strategy 2: Look for package.json or Xcode project
    currentDir = cwd;

    while (currentDir !== '/') {
      const indicators = [
        'package.json',
        '*.xcodeproj',
        '*.xcworkspace',
        'pubspec.yaml',  // Flutter
        'app.json'       // React Native
      ];

      for (const indicator of indicators) {
        try {
          if (indicator.includes('*')) {
            // Handle glob patterns
            const files = await fs.readdir(currentDir);
            const pattern = indicator.replace('*', '');

            if (files.some(f => f.endsWith(pattern))) {
              this.projectRoot = currentDir;
              return currentDir;
            }
          } else {
            // Check for specific file
            await fs.stat(path.join(currentDir, indicator));
            this.projectRoot = currentDir;
            return currentDir;
          }
        } catch {
          // File doesn't exist
        }
      }

      currentDir = path.dirname(currentDir);
    }

    // Strategy 3: Use current working directory
    console.log(pc.yellow('⚠️  No project detected, using current directory'));
    this.projectRoot = cwd;
    return cwd;
  }

  private async generateFilename(
    device: UnifiedDevice,
    targetDir: string,
    screenName?: string
  ): Promise<string> {
    const pattern = this.options.filenamePattern;

    // Get or initialize counter for this directory
    const counterKey = targetDir;
    let counter = this.fileCounter.get(counterKey) || 1;

    // Find next available counter
    while (true) {
      const filename = this.expandPattern(pattern, {
        screen: screenName || 'screenshot',
        counter: counter.toString().padStart(3, '0'),
        device: device.name.replace(/[^a-zA-Z0-9]/g, '-'),
        category: device.category,
        timestamp: new Date().toISOString().replace(/[:.]/g, '-')
      });

      const fullPath = path.join(targetDir, filename);

      if (!await this.fileExists(fullPath) || this.options.overwrite) {
        this.fileCounter.set(counterKey, counter + 1);
        return filename;
      }

      counter++;
    }
  }

  private expandPattern(pattern: string, values: Record<string, string>): string {
    let result = pattern;

    for (const [key, value] of Object.entries(values)) {
      result = result.replace(`{${key}}`, value);
    }

    // Ensure .png extension
    if (!result.endsWith('.png')) {
      result += '.png';
    }

    return result;
  }

  private async generateUniqueFilename(directory: string, baseFilename: string): Promise<string> {
    const ext = path.extname(baseFilename);
    const base = path.basename(baseFilename, ext);

    let counter = 1;
    let newFilename: string;

    do {
      newFilename = `${base}-${counter}${ext}`;
      counter++;
    } while (await this.fileExists(path.join(directory, newFilename)));

    return newFilename;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  detectCategoryFromDimensions(width: number, height: number): DeviceCategory {
    // Portrait orientation
    if (height > width) {
      // iPhone dimensions
      if (width >= 750 && width <= 1320 && height >= 1334 && height <= 2868) {
        return 'iphone';
      }

      // iPad dimensions
      if (width >= 1488 && width <= 2064 && height >= 2266 && height <= 2752) {
        return 'ipad';
      }

      // Watch dimensions
      if (width >= 352 && width <= 410 && height >= 430 && height <= 502) {
        return 'watch';
      }
    } else {
      // Landscape orientation - swap width/height checks
      if (height >= 750 && height <= 1320 && width >= 1334 && width <= 2868) {
        return 'iphone';
      }

      if (height >= 1488 && height <= 2064 && width >= 2266 && width <= 2752) {
        return 'ipad';
      }
    }

    // Mac dimensions (16:10 aspect ratio)
    if (width >= 2560 && height >= 1600) {
      return 'mac';
    }

    // Vision Pro
    if (width === 3840 && height === 2160) {
      return 'vision';
    }

    // Apple TV
    if ((width === 1920 && height === 1080) || (width === 3840 && height === 2160)) {
      return 'tv';
    }

    // Default to iPhone if unclear
    return 'iphone';
  }

  async setProjectRoot(root: string): Promise<void> {
    this.projectRoot = root;
  }
}

export const screenshotRouter = new ScreenshotRouter();