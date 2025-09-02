import { Command } from 'commander';
import { select, confirm } from '@inquirer/prompts';
import { platform } from 'os';
import pc from 'picocolors';
import fs from 'fs/promises';
import path from 'path';
import { systemRequirements } from '../services/system-requirements.js';
import { deviceManager } from '../services/device-manager.js';
import { screenshotRouter } from '../services/screenshot-router.js';
import { createComposeBridge } from '../services/compose-bridge.js';
import { UnifiedDevice } from '../types/device.js';
import { loadConfig } from '../core/files.js';

export default function deviceCommand(): Command {
  const cmd = new Command('device')
    .description('Capture screenshots from simulators and physical devices (macOS only)');

  // Capture subcommand
  cmd
    .command('capture')
    .description('Capture screenshot from a device')
    .option('-d, --device <name>', 'Device name or alias')
    .option('--all', 'Capture from all connected/booted devices')
    .option('--physical', 'Physical devices only')
    .option('--simulators', 'Simulators only')
    .option('--booted', 'Use currently booted simulator')
    .option('--process', 'Auto-process with frames and gradients')
    .option('--app <bundleId>', 'Launch app before capture')
    .option('--screen <name>', 'Screen name for filename')
    .action(async (options) => {
      // Check platform first
      if (platform() !== 'darwin') {
        console.error(pc.red('❌ Device features are only available on macOS'));
        console.error(pc.yellow('\nThis feature requires:'));
        console.error(pc.dim('  • macOS operating system'));
        console.error(pc.dim('  • Xcode or Xcode Command Line Tools'));
        console.error(pc.dim('  • iOS simulators or connected iOS devices'));
        process.exit(1);
      }

      // Check system requirements
      const hasRequirements = await systemRequirements.ensureRequirements();
      if (!hasRequirements) {
        process.exit(1);
      }

      try {
        // Get list of devices
        let devices = await deviceManager.listAllDevices();

        // Apply filters
        if (options.physical) {
          devices = devices.filter(d => d.type === 'physical');
        } else if (options.simulators) {
          devices = devices.filter(d => d.type === 'simulator');
        }

        if (options.booted) {
          devices = devices.filter(d => d.state === 'booted');
          if (devices.length === 0) {
            console.error(pc.red('❌ No booted simulators found'));
            console.log(pc.dim('   Boot a simulator first or use --device to select one'));
            process.exit(1);
          }
        }

        // Handle device selection
        let selectedDevices: UnifiedDevice[] = [];

        if (options.all) {
          // Capture from all available devices
          selectedDevices = devices.filter(d =>
            d.type === 'physical' ? d.state === 'connected' : true
          );

          if (selectedDevices.length === 0) {
            console.error(pc.red('❌ No available devices found'));
            process.exit(1);
          }
        } else if (options.device) {
          // Find device by name or alias
          const device = await findDevice(devices, options.device);
          if (!device) {
            console.error(pc.red(`❌ Device not found: ${options.device}`));
            console.log(pc.dim('   Use "appshot device list" to see available devices'));
            process.exit(1);
          }
          selectedDevices = [device];
        } else if (options.booted && devices.length === 1) {
          // Single booted device, use it automatically
          selectedDevices = devices;
        } else {
          // Interactive selection
          const device = await selectDevice(devices);
          if (!device) {
            console.log(pc.yellow('Cancelled'));
            process.exit(0);
          }
          selectedDevices = [device];
        }

        // Launch app if specified
        if (options.app) {
          for (const device of selectedDevices) {
            try {
              console.log(pc.cyan(`Launching ${options.app} on ${device.name}...`));
              await deviceManager.launchApp({
                device,
                bundleId: options.app
              });

              // Wait for app to load
              await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (error) {
              console.error(pc.red(`❌ Failed to launch app on ${device.name}:`), error);
            }
          }
        }

        // Capture screenshots
        for (const device of selectedDevices) {
          await captureFromDevice(device, {
            screenName: options.screen,
            process: options.process
          });
        }

        console.log(pc.green('\n✅ Screenshot capture complete!'));
      } catch (error) {
        console.error(pc.red('❌ Error:'), error);
        process.exit(1);
      }
    });

  // List subcommand
  cmd
    .command('list')
    .description('List available devices')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      // Check platform first
      if (platform() !== 'darwin') {
        console.error(pc.red('❌ Device features are only available on macOS'));
        process.exit(1);
      }

      const hasRequirements = await systemRequirements.ensureRequirements();
      if (!hasRequirements) {
        process.exit(1);
      }

      try {
        const devices = await deviceManager.listAllDevices();

        if (options.json) {
          console.log(JSON.stringify(devices, null, 2));
          return;
        }

        // Group devices
        const physical = devices.filter(d => d.type === 'physical');
        const simulators = devices.filter(d => d.type === 'simulator');

        console.log(pc.bold('\n📱 Available Devices:\n'));

        if (physical.length > 0) {
          console.log(pc.bold('Physical Devices:'));
          for (const device of physical) {
            const status = device.state === 'connected' ? pc.green('🟢') : pc.gray('⚪');
            const info = `${device.displaySize || ''} ${device.resolution || ''}`.trim();
            console.log(`  ${status} ${device.name.padEnd(30)} ${device.osVersion || ''} ${pc.dim(info)}`);
          }
          console.log();
        }

        if (simulators.length > 0) {
          console.log(pc.bold('Simulators:'));

          // Group by category
          const iphones = simulators.filter(d => d.category === 'iphone');
          const ipads = simulators.filter(d => d.category === 'ipad');
          const watches = simulators.filter(d => d.category === 'watch');
          const others = simulators.filter(d => !['iphone', 'ipad', 'watch'].includes(d.category));

          if (iphones.length > 0) {
            console.log(pc.dim('  iPhone:'));
            for (const device of iphones) {
              const status = device.state === 'booted' ? pc.green('🟢') : pc.gray('⚪');
              const info = `${device.displaySize || ''} ${device.resolution || ''}`.trim();
              console.log(`    ${status} ${device.name.padEnd(28)} ${device.osVersion || ''} ${pc.dim(info)}`);
            }
          }

          if (ipads.length > 0) {
            console.log(pc.dim('  iPad:'));
            for (const device of ipads) {
              const status = device.state === 'booted' ? pc.green('🟢') : pc.gray('⚪');
              const info = `${device.displaySize || ''} ${device.resolution || ''}`.trim();
              console.log(`    ${status} ${device.name.padEnd(28)} ${device.osVersion || ''} ${pc.dim(info)}`);
            }
          }

          if (watches.length > 0) {
            console.log(pc.dim('  Apple Watch:'));
            for (const device of watches) {
              const status = device.state === 'booted' ? pc.green('🟢') : pc.gray('⚪');
              const info = `${device.displaySize || ''} ${device.resolution || ''}`.trim();
              console.log(`    ${status} ${device.name.padEnd(28)} ${device.osVersion || ''} ${pc.dim(info)}`);
            }
          }

          if (others.length > 0) {
            console.log(pc.dim('  Other:'));
            for (const device of others) {
              const status = device.state === 'booted' ? pc.green('🟢') : pc.gray('⚪');
              const info = `${device.displaySize || ''} ${device.resolution || ''}`.trim();
              console.log(`    ${status} ${device.name.padEnd(28)} ${device.osVersion || ''} ${pc.dim(info)}`);
            }
          }
        }

        if (devices.length === 0) {
          console.log(pc.yellow('No devices found'));
          console.log(pc.dim('\nTips:'));
          console.log(pc.dim('  • Connect a physical device via USB'));
          console.log(pc.dim('  • Open Xcode > Window > Devices and Simulators'));
          console.log(pc.dim('  • Create simulators in Xcode'));
        }
      } catch (error) {
        console.error(pc.red('❌ Error listing devices:'), error);
        process.exit(1);
      }
    });

  // Prepare subcommand (boot simulators)
  cmd
    .command('prepare')
    .description('Boot required simulators for App Store presets')
    .option('--preset <name>', 'App Store preset (e.g., iphone-6-9,ipad-13)')
    .option('--device <name>', 'Specific device to boot')
    .action(async (options) => {
      // Check platform first
      if (platform() !== 'darwin') {
        console.error(pc.red('❌ Device features are only available on macOS'));
        process.exit(1);
      }

      const hasRequirements = await systemRequirements.ensureRequirements();
      if (!hasRequirements) {
        process.exit(1);
      }

      try {
        const devices = await deviceManager.listSimulators();

        if (options.device) {
          // Boot specific device
          const device = await findDevice(devices, options.device);
          if (!device) {
            console.error(pc.red(`❌ Device not found: ${options.device}`));
            process.exit(1);
          }

          if (device.state === 'booted') {
            console.log(pc.green(`✅ ${device.name} is already booted`));
          } else {
            await deviceManager.bootSimulator(device);
            console.log(pc.green(`✅ ${device.name} booted successfully`));
          }
        } else if (options.preset) {
          // Boot devices for preset
          console.log(pc.cyan('🚀 Preparing devices for App Store preset...'));
          // TODO: Implement preset device selection
          console.log(pc.yellow('Preset support coming soon!'));
        } else {
          // Interactive selection
          const device = await selectDevice(devices.filter(d => d.state !== 'booted'));
          if (device) {
            await deviceManager.bootSimulator(device);
            console.log(pc.green(`✅ ${device.name} booted successfully`));
          }
        }
      } catch (error) {
        console.error(pc.red('❌ Error:'), error);
        process.exit(1);
      }
    });

  return cmd;
}

async function selectDevice(devices: UnifiedDevice[]): Promise<UnifiedDevice | null> {
  if (devices.length === 0) {
    console.error(pc.red('No devices available'));
    return null;
  }

  // Group devices for better display
  const choices = [];

  // Physical devices
  const physical = devices.filter(d => d.type === 'physical');
  if (physical.length > 0) {
    choices.push({
      name: pc.dim('━━━ 📱 Physical Devices ━━━'),
      value: null,
      disabled: true
    });

    for (const device of physical) {
      const status = device.state === 'connected' ? '🟢' : '⚪';
      const info = device.displaySize ? `• ${device.displaySize}" display` : '';
      choices.push({
        name: `${status} ${device.name.padEnd(30)} ${device.osVersion || ''} ${pc.dim(info)}`,
        value: device
      });
    }
  }

  // Simulators
  const simulators = devices.filter(d => d.type === 'simulator');
  if (simulators.length > 0) {
    if (choices.length > 0) {
      choices.push({
        name: '',
        value: null,
        disabled: true
      });
    }

    choices.push({
      name: pc.dim('━━━ 💻 Simulators ━━━'),
      value: null,
      disabled: true
    });

    // Group by category
    const categories = ['iphone', 'ipad', 'watch', 'tv', 'vision'];

    for (const category of categories) {
      const categoryDevices = simulators.filter(d => d.category === category);

      if (categoryDevices.length > 0) {
        for (const device of categoryDevices) {
          const status = device.state === 'booted' ? '🟢' : '⚪';
          const info = device.displaySize ? `• ${device.displaySize}" • ${device.resolution || ''}` : '';
          choices.push({
            name: `${status} ${device.name.padEnd(30)} ${device.osVersion || ''} ${pc.dim(info)}`,
            value: device
          });
        }
      }
    }
  }

  try {
    const selected = await select({
      message: 'Select a device for screenshot capture:',
      choices: choices.filter(c => c.value !== null || c.disabled),
      pageSize: 15
    });

    return selected as UnifiedDevice;
  } catch {
    // User cancelled
    return null;
  }
}

async function findDevice(devices: UnifiedDevice[], query: string): Promise<UnifiedDevice | null> {
  // Try exact match
  let device = devices.find(d => d.name === query);
  if (device) return device;

  // Try case-insensitive match
  device = devices.find(d => d.name.toLowerCase() === query.toLowerCase());
  if (device) return device;

  // Try partial match
  device = devices.find(d => d.name.toLowerCase().includes(query.toLowerCase()));
  if (device) return device;

  // Try by index (if numeric)
  if (/^\d+$/.test(query)) {
    const index = parseInt(query) - 1;
    if (devices[index]) return devices[index];
  }

  return null;
}

async function captureFromDevice(
  device: UnifiedDevice,
  options: {
    screenName?: string;
    process?: boolean;
  }
): Promise<void> {
  // Boot simulator if needed
  if (device.type === 'simulator' && device.state !== 'booted') {
    const shouldBoot = await confirm({
      message: `${device.name} is not booted. Boot it now?`,
      default: true
    });

    if (shouldBoot) {
      console.log(pc.cyan(`Booting ${device.name}...`));
      await deviceManager.bootSimulator(device);

      // Wait for boot to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      console.log(pc.yellow('Skipping device'));
      return;
    }
  }

  // Capture screenshot
  console.log(pc.cyan(`📸 Capturing from ${device.name}...`));

  try {
    const screenshot = await deviceManager.captureScreenshot({
      device,
      format: 'png'
    });

    // Route to correct directory
    const tempPath = path.join('/tmp', `appshot-temp-${Date.now()}.png`);
    await fs.writeFile(tempPath, screenshot);

    const targetPath = await screenshotRouter.routeAndMove(
      device,
      tempPath,
      options.screenName
    );

    console.log(pc.green(`✅ Saved to: ${targetPath}`));

    // Process if requested
    if (options.process) {
      console.log(pc.cyan('🎨 Processing with frame and gradient...'));

      const config = await loadConfig();
      const composeBridge = createComposeBridge(config);

      const result = await composeBridge.processDeviceScreenshot({
        screenshotPath: targetPath,
        device,
        processOptions: {
          frameOnly: false,
          format: 'png'
        }
      });

      if (result.success) {
        console.log(pc.green(`✅ Final: ${result.outputPath}`));
        if (result.frameUsed) {
          console.log(pc.dim(`   Frame: ${result.frameUsed}`));
        }
      } else {
        console.log(pc.red(`❌ Processing failed: ${result.error}`));
      }
    }
  } catch (error) {
    console.error(pc.red(`❌ Failed to capture from ${device.name}:`), error);
    throw error;
  }
}