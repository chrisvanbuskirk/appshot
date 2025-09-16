import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { platform } from 'os';
import sharp from 'sharp';
import { FontService } from './fonts.js';
import { loadConfig } from '../core/files.js';
import { frameRegistry } from '../core/devices.js';
import { systemRequirements } from './system-requirements.js';

const execAsync = promisify(exec);

export type CheckSeverity = 'pass' | 'warning' | 'error';

export interface CheckResult {
  name: string;
  category: string;
  status: CheckSeverity;
  message: string;
  details?: string;
  suggestion?: string;
}

export interface DoctorReport {
  timestamp: string;
  version: string;
  platform: string;
  checks: Record<string, CheckResult[]>;
  summary: {
    passed: number;
    warnings: number;
    errors: number;
  };
  suggestions: string[];
}

export class DoctorService {
  private results: CheckResult[] = [];
  private suggestions: string[] = [];

  async runAllChecks(categories?: string[]): Promise<DoctorReport> {
    this.results = [];
    this.suggestions = [];

    const availableCategories = ['system', 'xcode', 'dependencies', 'fonts', 'filesystem', 'frames'];
    const categoriesToRun = categories?.length
      ? categories.filter(c => availableCategories.includes(c))
      : availableCategories;

    if (categoriesToRun.includes('system')) {
      await this.checkSystemRequirements();
    }
    if (categoriesToRun.includes('xcode')) {
      await this.checkXcodeTools();
    }
    if (categoriesToRun.includes('dependencies')) {
      await this.checkDependencies();
    }
    if (categoriesToRun.includes('fonts')) {
      await this.checkFontSystem();
    }
    if (categoriesToRun.includes('filesystem')) {
      await this.checkFileSystem();
    }
    if (categoriesToRun.includes('frames')) {
      await this.checkFrameAssets();
    }

    return this.generateReport();
  }

  private addResult(result: CheckResult) {
    this.results.push(result);
    if (result.suggestion && result.status !== 'pass') {
      this.suggestions.push(result.suggestion);
    }
  }

  private async checkSystemRequirements() {
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    this.addResult({
      name: 'Node.js Version',
      category: 'system',
      status: majorVersion >= 18 ? 'pass' : 'error',
      message: `Node.js ${nodeVersion} (minimum: v18.0.0)`,
      suggestion: majorVersion < 18 ? 'Update Node.js to version 18 or higher' : undefined
    });

    // Check npm availability
    try {
      const { stdout } = await execAsync('npm --version');
      this.addResult({
        name: 'npm',
        category: 'system',
        status: 'pass',
        message: `npm v${stdout.trim()}`
      });
    } catch {
      this.addResult({
        name: 'npm',
        category: 'system',
        status: 'warning',
        message: 'npm not found',
        suggestion: 'Install npm or ensure it\'s in your PATH'
      });
    }

    // Platform detection
    const os = platform();
    this.addResult({
      name: 'Platform',
      category: 'system',
      status: 'pass',
      message: `${os} (${this.getPlatformName(os)})`
    });
  }

  private async checkXcodeTools() {
    // Skip on non-macOS platforms
    if (platform() !== 'darwin') {
      this.addResult({
        name: 'Xcode Tools',
        category: 'xcode',
        status: 'warning',
        message: 'Not applicable on this platform',
        details: 'Device features are only available on macOS'
      });
      return;
    }

    // Check Xcode Command Line Tools
    const xcodeCheck = await systemRequirements.checkXcodeTools();

    if (xcodeCheck.success && xcodeCheck.checks) {
      // Command Line Tools
      this.addResult({
        name: 'Xcode Command Line Tools',
        category: 'xcode',
        status: xcodeCheck.checks.commandLineTools ? 'pass' : 'error',
        message: xcodeCheck.checks.commandLineTools ? 'Installed' : 'Not installed',
        suggestion: !xcodeCheck.checks.commandLineTools ? 'Run: xcode-select --install' : undefined
      });

      // xcrun
      this.addResult({
        name: 'xcrun',
        category: 'xcode',
        status: xcodeCheck.checks.xcrun ? 'pass' : 'error',
        message: xcodeCheck.checks.xcrun ? 'Available' : 'Not available',
        suggestion: !xcodeCheck.checks.xcrun ? 'Ensure Xcode or Command Line Tools are properly installed' : undefined
      });

      // simctl
      this.addResult({
        name: 'simctl (Simulator Control)',
        category: 'xcode',
        status: xcodeCheck.checks.simctl ? 'pass' : 'warning',
        message: xcodeCheck.checks.simctl ? 'Available' : 'Not available',
        suggestion: !xcodeCheck.checks.simctl ? 'Install Xcode from Mac App Store for simulator support' : undefined
      });

      // devicectl
      this.addResult({
        name: 'devicectl (Physical Devices)',
        category: 'xcode',
        status: xcodeCheck.checks.devicectl ? 'pass' : 'warning',
        message: xcodeCheck.checks.devicectl ? 'Available (Xcode 15+)' : 'Not available',
        details: !xcodeCheck.checks.devicectl ? 'Requires Xcode 15 or later' : undefined,
        suggestion: !xcodeCheck.checks.devicectl ? 'Update to Xcode 15+ or install libimobiledevice' : undefined
      });

      // Xcode version
      if (xcodeCheck.checks.xcodeVersion) {
        const version = parseFloat(xcodeCheck.checks.xcodeVersion);
        this.addResult({
          name: 'Xcode Version',
          category: 'xcode',
          status: version >= 14.0 ? 'pass' : 'warning',
          message: `Xcode ${xcodeCheck.checks.xcodeVersion}`,
          suggestion: version < 14.0 ? 'Consider updating to Xcode 14.0 or later' : undefined
        });
      }
    } else {
      this.addResult({
        name: 'Xcode Tools',
        category: 'xcode',
        status: 'error',
        message: xcodeCheck.error || 'Failed to check Xcode tools',
        suggestion: xcodeCheck.fix
      });
    }

    // Check optional tools
    const optional = await systemRequirements.checkOptionalTools();

    this.addResult({
      name: 'libimobiledevice',
      category: 'xcode',
      status: optional.libimobiledevice ? 'pass' : 'warning',
      message: optional.libimobiledevice ? 'Installed' : 'Not installed (optional)',
      details: !optional.libimobiledevice ? 'Provides physical device screenshot support' : undefined,
      suggestion: !optional.libimobiledevice ? 'Install with: brew install libimobiledevice' : undefined
    });

    this.addResult({
      name: 'ios-deploy',
      category: 'xcode',
      status: optional.iosDeploy ? 'pass' : 'warning',
      message: optional.iosDeploy ? 'Installed' : 'Not installed (optional)',
      details: !optional.iosDeploy ? 'Provides app deployment to physical devices' : undefined,
      suggestion: !optional.iosDeploy ? 'Install with: npm install -g ios-deploy' : undefined
    });
  }

  private async checkDependencies() {
    // Check Sharp installation
    try {
      const sharpVersion = sharp.versions;
      this.addResult({
        name: 'Sharp Module',
        category: 'dependencies',
        status: 'pass',
        message: `Sharp v${sharpVersion.sharp} installed`
      });

      // Check Sharp native bindings
      if (sharpVersion.vips) {
        this.addResult({
          name: 'Sharp Native Bindings',
          category: 'dependencies',
          status: 'pass',
          message: `libvips v${sharpVersion.vips} loaded`
        });
      }

      // Test Sharp functionality
      try {
        await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 }
          }
        })
          .png()
          .toBuffer();

        this.addResult({
          name: 'Image Processing',
          category: 'dependencies',
          status: 'pass',
          message: 'Sharp image processing test passed'
        });
      } catch (error) {
        this.addResult({
          name: 'Image Processing',
          category: 'dependencies',
          status: 'error',
          message: 'Sharp image processing test failed',
          details: error instanceof Error ? error.message : String(error),
          suggestion: 'Try reinstalling sharp: npm install sharp --force'
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Sharp Module',
        category: 'dependencies',
        status: 'error',
        message: 'Sharp not installed or not functional',
        details: error instanceof Error ? error.message : String(error),
        suggestion: 'Install sharp: npm install sharp'
      });
    }

    // Check OpenAI API key
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    this.addResult({
      name: 'OpenAI API Key',
      category: 'dependencies',
      status: hasApiKey ? 'pass' : 'warning',
      message: hasApiKey ? 'OpenAI API key found' : 'OpenAI API key not found (translation features disabled)',
      suggestion: hasApiKey ? undefined : 'Set OPENAI_API_KEY environment variable to enable translation features'
    });
  }

  private async checkFontSystem() {
    const fontService = FontService.getInstance();
    const os = platform();

    // Check font detection command availability
    let fontCommandAvailable = false;
    let fontCommand = '';

    if (os === 'darwin') {
      fontCommand = 'system_profiler';
      try {
        await execAsync('which system_profiler');
        fontCommandAvailable = true;
      } catch {
        fontCommandAvailable = false;
      }
    } else if (os === 'win32') {
      fontCommand = 'PowerShell';
      fontCommandAvailable = true; // PowerShell is always available on Windows
    } else {
      fontCommand = 'fc-list';
      try {
        await execAsync('which fc-list');
        fontCommandAvailable = true;
      } catch {
        fontCommandAvailable = false;
      }
    }

    this.addResult({
      name: 'Font Detection',
      category: 'fonts',
      status: fontCommandAvailable ? 'pass' : 'warning',
      message: fontCommandAvailable
        ? `Font detection available (${fontCommand})`
        : `Font detection command not found (${fontCommand})`,
      suggestion: !fontCommandAvailable && os === 'linux'
        ? 'Install fontconfig: apt-get install fontconfig or yum install fontconfig'
        : undefined
    });

    // Try to load system fonts
    try {
      const fonts = await fontService.getSystemFonts();
      this.addResult({
        name: 'System Fonts',
        category: 'fonts',
        status: fonts.length > 0 ? 'pass' : 'warning',
        message: fonts.length > 0
          ? `System fonts loaded (${fonts.length} fonts)`
          : 'No system fonts detected',
        suggestion: fonts.length === 0
          ? 'Font detection may not be working properly on your system'
          : undefined
      });

      // Check for common fonts
      const commonFonts = ['Arial', 'Helvetica', 'Times New Roman'];
      for (const fontName of commonFonts) {
        const isInstalled = await fontService.isFontInstalled(fontName);
        if (isInstalled) {
          this.addResult({
            name: `${fontName} Font`,
            category: 'fonts',
            status: 'pass',
            message: `${fontName} font available`
          });
          break; // Just need one common font to pass
        }
      }
    } catch (error) {
      this.addResult({
        name: 'System Fonts',
        category: 'fonts',
        status: 'warning',
        message: 'Could not load system fonts',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async checkFileSystem() {
    // Check write permissions in current directory
    const testFile = path.join(process.cwd(), '.appshot-doctor-test');
    try {
      await fs.writeFile(testFile, 'test', 'utf8');
      await fs.unlink(testFile);
      this.addResult({
        name: 'Current Directory',
        category: 'filesystem',
        status: 'pass',
        message: 'Write permissions in current directory'
      });
    } catch (error) {
      this.addResult({
        name: 'Current Directory',
        category: 'filesystem',
        status: 'error',
        message: 'No write permissions in current directory',
        details: error instanceof Error ? error.message : String(error),
        suggestion: 'Check directory permissions'
      });
    }

    // Check write permissions in temp directory
    const tempDir = process.platform === 'win32' ? process.env.TEMP || 'C:\\Temp' : '/tmp';
    const tempFile = path.join(tempDir, '.appshot-doctor-test');
    try {
      await fs.writeFile(tempFile, 'test', 'utf8');
      await fs.unlink(tempFile);
      this.addResult({
        name: 'Temp Directory',
        category: 'filesystem',
        status: 'pass',
        message: 'Write permissions in temp directory'
      });
    } catch (error) {
      this.addResult({
        name: 'Temp Directory',
        category: 'filesystem',
        status: 'warning',
        message: 'No write permissions in temp directory',
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Check .appshot directory
    const appshotDir = path.join(process.cwd(), '.appshot');
    try {
      await fs.stat(appshotDir);
      this.addResult({
        name: '.appshot Directory',
        category: 'filesystem',
        status: 'pass',
        message: '.appshot directory exists'
      });

      // Check configuration file
      try {
        await loadConfig();
        this.addResult({
          name: 'Configuration File',
          category: 'filesystem',
          status: 'pass',
          message: 'Configuration file valid'
        });
      } catch {
        this.addResult({
          name: 'Configuration File',
          category: 'filesystem',
          status: 'warning',
          message: 'Configuration file missing or invalid',
          suggestion: 'Run "appshot init" to create configuration'
        });
      }
    } catch {
      this.addResult({
        name: '.appshot Directory',
        category: 'filesystem',
        status: 'warning',
        message: '.appshot directory not found',
        suggestion: 'Run "appshot init" to initialize project'
      });
    }
  }

  private async checkFrameAssets() {
    const framesDir = path.join(process.cwd(), 'frames');

    try {
      const files = await fs.readdir(framesDir);
      const frameFiles = files.filter(f => f.endsWith('.png'));

      this.addResult({
        name: 'Frames Directory',
        category: 'frames',
        status: 'pass',
        message: `Frames directory found (${frameFiles.length} files)`
      });

      // Check Frames.json
      const framesJsonPath = path.join(framesDir, 'Frames.json');
      try {
        const framesJson = await fs.readFile(framesJsonPath, 'utf8');
        JSON.parse(framesJson);

        this.addResult({
          name: 'Frames.json',
          category: 'frames',
          status: 'pass',
          message: 'Frames.json valid'
        });

        // Count frames by device type
        const deviceCounts: Record<string, number> = {
          iphone: 0,
          ipad: 0,
          mac: 0,
          watch: 0
        };

        for (const frame of frameRegistry) {
          deviceCounts[frame.deviceType]++;
        }

        for (const [device, count] of Object.entries(deviceCounts)) {
          if (count > 0) {
            this.addResult({
              name: `${device.charAt(0).toUpperCase() + device.slice(1)} Frames`,
              category: 'frames',
              status: 'pass',
              message: `${device === 'mac' ? 'Mac' : device.charAt(0).toUpperCase() + device.slice(1)} frames: ${count}`
            });
          }
        }

        // Check if all frame files referenced in registry exist
        let missingFrames = 0;
        for (const frame of frameRegistry) {
          const framePath = path.join(framesDir, `${frame.originalName || frame.displayName}.png`);
          try {
            await fs.access(framePath);
          } catch {
            missingFrames++;
          }
        }

        if (missingFrames === 0) {
          this.addResult({
            name: 'Frame Files',
            category: 'frames',
            status: 'pass',
            message: 'All frame files present'
          });
        } else {
          this.addResult({
            name: 'Frame Files',
            category: 'frames',
            status: 'warning',
            message: `${missingFrames} frame files missing`,
            suggestion: 'Some device frames may not be available'
          });
        }
      } catch (error) {
        this.addResult({
          name: 'Frames.json',
          category: 'frames',
          status: 'warning',
          message: 'Frames.json missing or invalid',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch {
      this.addResult({
        name: 'Frames Directory',
        category: 'frames',
        status: 'warning',
        message: 'Frames directory not found',
        suggestion: 'Device frames may not be available for the build command'
      });
    }
  }

  private getPlatformName(os: string): string {
    switch (os) {
    case 'darwin': return 'macOS';
    case 'win32': return 'Windows';
    case 'linux': return 'Linux';
    default: return os;
    }
  }

  private generateReport(): DoctorReport {
    const categorizedChecks: Record<string, CheckResult[]> = {};

    for (const result of this.results) {
      if (!categorizedChecks[result.category]) {
        categorizedChecks[result.category] = [];
      }
      categorizedChecks[result.category].push(result);
    }

    const summary = {
      passed: this.results.filter(r => r.status === 'pass').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      errors: this.results.filter(r => r.status === 'error').length
    };

    return {
      timestamp: new Date().toISOString(),
      version: '0.9.0',
      platform: platform(),
      checks: categorizedChecks,
      summary,
      suggestions: [...new Set(this.suggestions)] // Remove duplicates
    };
  }
}