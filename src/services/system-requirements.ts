import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import pc from 'picocolors';

const exec = promisify(execCallback);

export interface SystemCheck {
  success: boolean;
  error?: string;
  fix?: string;
  checks?: {
    xcrun: boolean;
    simctl: boolean;
    devicectl: boolean;
    xcodebuild: boolean;
    xcodeVersion: string | null;
    commandLineTools: boolean;
  };
}

export interface OptionalTools {
  libimobiledevice: boolean;
  iosDeploy: boolean;
}

export class SystemRequirements {
  private isMacOS = platform() === 'darwin';

  async checkXcodeTools(): Promise<SystemCheck> {
    // Only available on macOS
    if (!this.isMacOS) {
      return {
        success: false,
        error: 'Device features are only available on macOS',
        fix: 'Use a Mac to capture screenshots from iOS devices and simulators'
      };
    }

    const checks = {
      xcrun: false,
      simctl: false,
      devicectl: false,
      xcodebuild: false,
      xcodeVersion: null as string | null,
      commandLineTools: false
    };

    // Check for Xcode Command Line Tools
    try {
      const { stdout } = await exec('xcode-select -p');
      if (stdout.trim()) {
        checks.commandLineTools = true;
      }
    } catch {
      return {
        success: false,
        error: 'Xcode Command Line Tools not installed',
        fix: 'Run: xcode-select --install'
      };
    }

    // Check for xcrun
    try {
      await exec('xcrun --version');
      checks.xcrun = true;
    } catch {
      return {
        success: false,
        error: 'xcrun not available',
        fix: 'Ensure Xcode or Command Line Tools are properly installed'
      };
    }

    // Check for simctl (simulator control)
    try {
      await exec('xcrun simctl help');
      checks.simctl = true;
    } catch {
      return {
        success: false,
        error: 'simctl not available - simulator features will not work',
        fix: 'Install Xcode from the Mac App Store for full simulator support'
      };
    }

    // Check for devicectl (physical device control, Xcode 15+)
    try {
      await exec('xcrun devicectl --version 2>/dev/null');
      checks.devicectl = true;
    } catch {
      // Not fatal - can fallback to libimobiledevice
      console.warn(pc.yellow('⚠️  devicectl not available (requires Xcode 15+)'));
      console.warn(pc.dim('   Physical device support may be limited'));
    }

    // Check for xcodebuild
    try {
      await exec('xcodebuild -version');
      checks.xcodebuild = true;
    } catch {
      // Not fatal but limits functionality
      console.warn(pc.yellow('⚠️  xcodebuild not available'));
    }

    // Check Xcode version if available
    if (checks.xcodebuild) {
      try {
        const { stdout } = await exec('xcodebuild -version');
        const match = stdout.match(/Xcode (\d+\.\d+)/);
        if (match) {
          checks.xcodeVersion = match[1];

          const version = parseFloat(match[1]);
          if (version < 14.0) {
            return {
              success: false,
              error: `Xcode ${checks.xcodeVersion} is too old`,
              fix: 'Update to Xcode 14.0 or later from the Mac App Store'
            };
          }
        }
      } catch {
        // Ignore version check errors
      }
    }

    return {
      success: true,
      checks
    };
  }

  async checkOptionalTools(): Promise<OptionalTools> {
    const tools: OptionalTools = {
      libimobiledevice: false,
      iosDeploy: false
    };

    // Only check on macOS
    if (!this.isMacOS) {
      return tools;
    }

    // Check for libimobiledevice (alternative for physical devices)
    try {
      await exec('which idevicescreenshot');
      tools.libimobiledevice = true;
    } catch {
      // Tool not installed - this is optional
    }

    // Check for ios-deploy
    try {
      await exec('which ios-deploy');
      tools.iosDeploy = true;
    } catch {
      // Tool not installed - this is optional
    }

    return tools;
  }

  async printDiagnostics(): Promise<void> {
    console.log(pc.bold('\n📱 Xcode Tools Check:\n'));

    const xcodeCheck = await this.checkXcodeTools();

    if (xcodeCheck.success && xcodeCheck.checks) {
      console.log('  ' + (xcodeCheck.checks.commandLineTools ? pc.green('✅') : pc.red('❌')) + ' Xcode Command Line Tools');
      console.log('  ' + (xcodeCheck.checks.xcrun ? pc.green('✅') : pc.red('❌')) + ' xcrun');
      console.log('  ' + (xcodeCheck.checks.simctl ? pc.green('✅') : pc.red('❌')) + ' simctl (simulator control)');
      console.log('  ' + (xcodeCheck.checks.devicectl ? pc.green('✅') : pc.yellow('⚠️')) + ' devicectl (physical devices, Xcode 15+)');
      console.log('  ' + (xcodeCheck.checks.xcodebuild ? pc.green('✅') : pc.yellow('⚠️')) + ' xcodebuild');

      if (xcodeCheck.checks.xcodeVersion) {
        console.log(`  ${pc.green('✅')} Xcode version: ${xcodeCheck.checks.xcodeVersion}`);
      }
    } else {
      console.log(pc.red(`  ❌ ${xcodeCheck.error}`));
      console.log(pc.cyan(`     Fix: ${xcodeCheck.fix}`));
    }

    console.log(pc.bold('\n📦 Optional Tools:\n'));

    const optional = await this.checkOptionalTools();

    console.log('  ' + (optional.libimobiledevice ? pc.green('✅') : pc.yellow('⚠️')) + ' libimobiledevice');
    if (!optional.libimobiledevice) {
      console.log(pc.dim('     Install: brew install libimobiledevice'));
      console.log(pc.dim('     Provides: idevicescreenshot for physical devices'));
    }

    console.log('  ' + (optional.iosDeploy ? pc.green('✅') : pc.yellow('⚠️')) + ' ios-deploy');
    if (!optional.iosDeploy) {
      console.log(pc.dim('     Install: npm install -g ios-deploy'));
      console.log(pc.dim('     Provides: App deployment to physical devices'));
    }
  }

  async ensureRequirements(): Promise<boolean> {
    const check = await this.checkXcodeTools();

    if (!check.success) {
      console.error(pc.red('\n❌ System requirements not met'));
      console.error(pc.yellow(`\nError: ${check.error}`));
      console.error(pc.cyan(`\nHow to fix:\n  ${check.fix}`));

      if (check.error?.includes('Command Line Tools')) {
        console.error(pc.dim('\nAfter installation, you may need to:'));
        console.error(pc.dim('  1. Restart your terminal'));
        console.error(pc.dim('  2. Accept the license: sudo xcodebuild -license accept'));
      }

      return false;
    }

    // Check for optional tools and provide helpful messages
    const optional = await this.checkOptionalTools();

    if (!optional.libimobiledevice && (!check.checks?.devicectl)) {
      console.warn(pc.yellow('\n⚠️  Limited physical device support'));
      console.warn(pc.dim('   For physical device screenshots, install:'));
      console.warn(pc.cyan('   brew install libimobiledevice'));
    }

    return true;
  }
}

export const systemRequirements = new SystemRequirements();