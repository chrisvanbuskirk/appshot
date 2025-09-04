import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { select, input } from '@inquirer/prompts';
import { validateBackgroundDimensions, detectBestFit } from '../core/background.js';
import { loadConfig, saveConfig } from '../core/files.js';

export default function backgroundsCommand(): Command {
  const cmd = new Command('backgrounds')
    .description('Manage background images for screenshots')
    .addHelpText('after', `
${pc.bold('Examples:')}
  $ appshot backgrounds set iphone ./backgrounds/sunset.jpg
  $ appshot backgrounds validate
  $ appshot backgrounds preview
  $ appshot backgrounds clear iphone
  $ appshot backgrounds list

${pc.bold('Background Locations:')}
  Device-specific:  screenshots/<device>/background.png
  Global:          screenshots/background.png
  Custom:          Specified via config or command

${pc.bold('Fit Modes:')}
  cover      Scale to cover entire area (may crop)
  contain    Scale to fit within area (may add bars)
  fill       Stretch to exact dimensions (may distort)
  scale-down Only scale down if larger, never scale up
`);

  // Set background for a device
  cmd
    .command('set')
    .description('Set background image for a device')
    .argument('[device]', 'Device type (iphone, ipad, mac, watch)')
    .argument('[image]', 'Path to background image')
    .option('-f, --fit <mode>', 'Fit mode: cover, contain, fill, scale-down', 'cover')
    .option('--global', 'Set as global background for all devices')
    .action(async (device, image, options) => {
      try {
        // Interactive mode if arguments not provided
        if (!device && !options.global) {
          device = await select({
            message: 'Select device type:',
            choices: [
              { name: 'iPhone', value: 'iphone' },
              { name: 'iPad', value: 'ipad' },
              { name: 'Mac', value: 'mac' },
              { name: 'Watch', value: 'watch' },
              { name: 'All Devices (Global)', value: 'global' }
            ]
          });

          if (device === 'global') {
            options.global = true;
            device = undefined;
          }
        }

        if (!image) {
          image = await input({
            message: 'Enter path to background image:',
            validate: async (value) => {
              try {
                await fs.access(value);
                return true;
              } catch {
                return 'File not found';
              }
            }
          });
        }

        // Validate image exists
        try {
          await fs.access(image);
        } catch {
          console.error(pc.red(`❌ Background image not found: ${image}`));
          process.exit(1);
        }

        // Load config
        const config = await loadConfig();

        // Initialize background config if not exists
        if (!config.background) {
          config.background = {
            mode: 'image',
            warnOnMismatch: true
          };
        }

        // Set background
        if (options.global) {
          config.background.image = image;
          config.background.fit = options.fit;
          console.log(pc.green(`✅ Set global background: ${image}`));
        } else {
          // Device-specific background
          if (!config.devices[device]) {
            console.error(pc.red(`❌ Device '${device}' not found in config`));
            console.log(pc.dim(`Available devices: ${Object.keys(config.devices).join(', ')}`));
            process.exit(1);
          }

          if (!config.devices[device].background) {
            config.devices[device].background = {};
          }

          config.devices[device].background!.image = image;
          config.devices[device].background!.fit = options.fit;

          console.log(pc.green(`✅ Set ${device} background: ${image}`));
        }

        // Save config
        await saveConfig(config);
        console.log(pc.dim('Configuration saved'));

      } catch (error) {
        console.error(pc.red('Error setting background:'), error);
        process.exit(1);
      }
    });

  // Validate backgrounds
  cmd
    .command('validate')
    .description('Validate background dimensions against App Store specs')
    .option('-d, --device <type>', 'Validate specific device only')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        let hasWarnings = false;

        // Get devices to validate
        const devices = options.device
          ? [options.device]
          : Object.keys(config.devices);

        console.log(pc.bold('\n📐 Validating background dimensions...\n'));

        for (const device of devices) {
          const deviceConfig = config.devices[device];
          if (!deviceConfig) continue;

          // Find background image
          let backgroundPath: string | null = null;

          if (deviceConfig.background?.image) {
            backgroundPath = deviceConfig.background.image;
          } else if (config.background?.image) {
            backgroundPath = config.background.image;
          } else {
            // Check for auto-detected background
            const candidates = [
              path.join(deviceConfig.input, 'background.png'),
              path.join(deviceConfig.input, 'background.jpg'),
              path.join('screenshots', 'background.png'),
              path.join('screenshots', 'background.jpg')
            ];

            for (const candidate of candidates) {
              try {
                await fs.access(candidate);
                backgroundPath = candidate;
                break;
              } catch {
                // Continue checking
              }
            }
          }

          if (!backgroundPath) {
            console.log(pc.dim(`${device}: No background image found`));
            continue;
          }

          // Get target dimensions
          const [width, height] = deviceConfig.resolution.split('x').map(Number);

          // Validate
          const validation = await validateBackgroundDimensions(
            backgroundPath,
            width,
            height
          );

          // Display results
          console.log(pc.cyan(`${device}:`));
          console.log(pc.dim(`  Background: ${backgroundPath}`));
          console.log(pc.dim(`  Source: ${validation.dimensions.source.width}x${validation.dimensions.source.height}`));
          console.log(pc.dim(`  Target: ${validation.dimensions.target.width}x${validation.dimensions.target.height}`));

          if (validation.warnings.length > 0) {
            hasWarnings = true;
            validation.warnings.forEach(warning => {
              console.log(pc.yellow(`  ⚠️  ${warning}`));
            });

            // Suggest best fit mode
            const bestFit = detectBestFit(
              validation.dimensions.source.width,
              validation.dimensions.source.height,
              validation.dimensions.target.width,
              validation.dimensions.target.height
            );
            console.log(pc.cyan(`  💡 Suggested fit mode: ${bestFit}`));
          } else {
            console.log(pc.green('  ✅ Dimensions OK'));
          }

          console.log();
        }

        if (hasWarnings) {
          console.log(pc.yellow('⚠️  Some backgrounds have dimension warnings'));
          console.log(pc.dim('Run "appshot backgrounds set" to adjust fit modes'));
        } else {
          console.log(pc.green('✅ All backgrounds validated successfully'));
        }

      } catch (error) {
        console.error(pc.red('Error validating backgrounds:'), error);
        process.exit(1);
      }
    });

  // Preview backgrounds
  cmd
    .command('preview')
    .description('Generate preview of screenshots with backgrounds')
    .option('-d, --device <type>', 'Preview specific device only')
    .option('-o, --output <dir>', 'Output directory', './preview')
    .action(async (options) => {
      try {
        const config = await loadConfig();
        const outputDir = options.output;

        // Create output directory
        await fs.mkdir(outputDir, { recursive: true });

        console.log(pc.bold('\n🎨 Generating background previews...\n'));

        // This would integrate with the compose system
        // For now, just show what would be generated
        const devices = options.device
          ? [options.device]
          : Object.keys(config.devices);

        for (const device of devices) {
          console.log(pc.cyan(`${device}:`));
          console.log(pc.dim(`  Would generate preview in ${outputDir}/${device}/`));
        }

        console.log(pc.dim('\nNote: Full preview generation requires running "appshot build --preview"'));

      } catch (error) {
        console.error(pc.red('Error generating preview:'), error);
        process.exit(1);
      }
    });

  // Clear background
  cmd
    .command('clear')
    .description('Remove background configuration')
    .argument('[device]', 'Device type to clear (or "all" for global)')
    .action(async (device) => {
      try {
        if (!device) {
          device = await select({
            message: 'Clear background for:',
            choices: [
              { name: 'iPhone', value: 'iphone' },
              { name: 'iPad', value: 'ipad' },
              { name: 'Mac', value: 'mac' },
              { name: 'Watch', value: 'watch' },
              { name: 'All Devices (Global)', value: 'all' }
            ]
          });
        }

        const config = await loadConfig();

        if (device === 'all') {
          // Clear global background
          if (config.background) {
            delete config.background.image;
            console.log(pc.green('✅ Cleared global background'));
          }
        } else {
          // Clear device-specific background
          if (config.devices[device]?.background) {
            delete config.devices[device].background!.image;
            console.log(pc.green(`✅ Cleared ${device} background`));
          }
        }

        await saveConfig(config);
        console.log(pc.dim('Configuration saved'));

      } catch (error) {
        console.error(pc.red('Error clearing background:'), error);
        process.exit(1);
      }
    });

  // List backgrounds
  cmd
    .command('list')
    .description('List configured backgrounds')
    .action(async () => {
      try {
        const config = await loadConfig();

        console.log(pc.bold('\n📋 Configured Backgrounds:\n'));

        // Global background
        if (config.background?.image) {
          console.log(pc.cyan('Global:'));
          console.log(pc.dim(`  Image: ${config.background.image}`));
          console.log(pc.dim(`  Fit: ${config.background.fit || 'cover'}`));
          console.log();
        }

        // Device-specific backgrounds
        for (const [device, deviceConfig] of Object.entries(config.devices)) {
          if (deviceConfig.background?.image) {
            console.log(pc.cyan(`${device}:`));
            console.log(pc.dim(`  Image: ${deviceConfig.background.image}`));
            console.log(pc.dim(`  Fit: ${deviceConfig.background.fit || 'cover'}`));
            console.log();
          }
        }

        // Auto-detected backgrounds
        console.log(pc.bold('Auto-detected backgrounds:'));
        for (const [device, deviceConfig] of Object.entries(config.devices)) {
          const candidates = [
            path.join(deviceConfig.input, 'background.png'),
            path.join(deviceConfig.input, 'background.jpg')
          ];

          for (const candidate of candidates) {
            try {
              await fs.access(candidate);
              console.log(pc.dim(`  ${device}: ${candidate}`));
              break;
            } catch {
              // Not found
            }
          }
        }

      } catch (error) {
        console.error(pc.red('Error listing backgrounds:'), error);
        process.exit(1);
      }
    });

  return cmd;
}
