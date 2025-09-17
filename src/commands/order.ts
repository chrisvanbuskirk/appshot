import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { select, confirm } from '@inquirer/prompts';
import {
  loadOrderConfig,
  saveOrderConfig,
  getAvailableScreenshots,
  displayOrder,
  applyOrder,
  type ScreenshotOrder
} from '../services/screenshot-order.js';

export default function orderCmd() {
  const cmd = new Command('order')
    .description('Manage screenshot ordering for App Store submissions')
    .option('--device <name>', 'Specific device to order (iphone|ipad|mac|watch)')
    .option('--source <dir>', 'Source directory containing screenshots', './final')
    .option('--lang <code>', 'Language code for screenshots', 'en')
    .option('--show', 'Display current order without editing')
    .option('--reset', 'Reset ordering to defaults')
    .option('--apply', 'Apply saved order by adding numeric prefixes to files')
    .option('--remove-prefixes', 'Remove numeric prefixes from filenames')
    .addHelpText('after', `
${pc.bold('Examples:')}
  ${pc.dim('# Interactive ordering for iPhone screenshots')}
  $ appshot order --device iphone

  ${pc.dim('# Show current order without editing')}
  $ appshot order --show

  ${pc.dim('# Apply numeric prefixes based on saved order')}
  $ appshot order --apply --device iphone

  ${pc.dim('# Remove numeric prefixes from files')}
  $ appshot order --remove-prefixes --device iphone

  ${pc.dim('# Reset to smart defaults')}
  $ appshot order --reset

${pc.bold('How it works:')}
  1. Run 'appshot order --device [device]' to set the order
  2. Use arrow keys to reorder screenshots interactively
  3. Order is saved to .appshot/screenshot-order.json
  4. Run 'appshot export --order' to use the saved order

${pc.bold('Smart Defaults:')}
  The command automatically prioritizes common screenshot names:
  • home/main/dashboard (first)
  • features/content screens (middle)
  • settings/about (last)
`)
    .action(async (opts) => {
      try {
        // Handle show option
        if (opts.show) {
          await showCurrentOrder(opts.source, opts.lang);
          return;
        }

        // Handle reset option
        if (opts.reset) {
          await resetOrder();
          return;
        }

        // Handle remove prefixes option
        if (opts.removePrefixes) {
          await removePrefixes(opts.device, opts.source, opts.lang);
          return;
        }

        // Handle apply option
        if (opts.apply) {
          if (!opts.device) {
            console.error(pc.red('Error: --device is required with --apply'));
            process.exit(1);
          }
          await applyOrderToFiles(opts.device, opts.source, opts.lang);
          return;
        }

        // Interactive ordering mode
        let device = opts.device;

        if (!device) {
          // Let user select device
          const devices = await getAvailableDevices(opts.source, opts.lang);

          if (devices.length === 0) {
            console.error(pc.red('No screenshots found in the source directory'));
            console.log(pc.dim(`  Checked: ${path.join(opts.source, '*', opts.lang)}`));
            process.exit(1);
          }

          // Build choices with screenshot counts
          const choices = [];
          for (const d of devices) {
            const count = (await getAvailableScreenshots(d, opts.source, opts.lang)).length;
            choices.push({
              name: `${d} (${count} screenshots)`,
              value: d
            });
          }

          device = await select({
            message: 'Select device to order screenshots for:',
            choices
          });
        }

        // Get screenshots for the device
        const screenshots = await getAvailableScreenshots(device, opts.source, opts.lang);

        if (screenshots.length === 0) {
          console.error(pc.red(`No screenshots found for ${device}`));
          console.log(pc.dim(`  Checked: ${path.join(opts.source, device, opts.lang)}`));
          process.exit(1);
        }

        // Load existing order or use smart defaults
        const existingConfig = await loadOrderConfig();
        const currentOrder = applyOrder(screenshots, device, existingConfig);

        console.log(pc.cyan(`\n📱 Ordering screenshots for ${device}`));
        console.log(pc.dim(`  Found ${screenshots.length} screenshots`));

        // Interactive reordering using a simpler approach
        const orderedScreenshots = await interactiveOrder(currentOrder);

        // Save the new order (always save clean names without prefixes)
        const orders: ScreenshotOrder = existingConfig?.orders || {};
        // Remove any numeric prefixes before saving
        const cleanOrderedScreenshots = orderedScreenshots.map(file =>
          file.replace(/^\d+[-_.]/, '')
        );
        orders[device as keyof ScreenshotOrder] = cleanOrderedScreenshots;

        await saveOrderConfig(orders);

        console.log(pc.green('\n✓ Screenshot order saved!'));
        displayOrder(orderedScreenshots, device);

        // Ask if user wants to apply prefixes now
        const shouldApply = await confirm({
          message: 'Add numeric prefixes to files now?',
          default: false
        });

        if (shouldApply) {
          await applyOrderToFiles(device, opts.source, opts.lang);
        } else {
          console.log(pc.dim('\nTo apply this order when exporting:'));
          console.log(pc.cyan('  $ appshot export --order'));
        }

      } catch (error) {
        console.error(pc.red('Error:'), error);
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Interactive ordering UI
 */
async function interactiveOrder(screenshots: string[]): Promise<string[]> {
  const ordered = [...screenshots];
  let currentIndex = 0;
  let done = false;

  console.log('\n' + pc.bold('Reorder screenshots:'));
  console.log(pc.dim('  ↑/↓: Navigate  │  Space: Select  │  ↑/↓: Move selected  │  Enter: Done\n'));

  while (!done) {
    // Display current order
    console.clear();
    console.log('\n' + pc.bold('Screenshot Order:'));
    console.log(pc.dim('  Use arrow keys to navigate, space to select/move, enter when done\n'));

    ordered.forEach((file, index) => {
      const num = String(index + 1).padStart(2, '0');
      const prefix = index === currentIndex ? pc.cyan('→') : ' ';
      const highlight = index === currentIndex ? pc.cyan(file) : file;
      console.log(`  ${prefix} ${pc.dim(num)}. ${highlight}`);
    });

    // Simple menu for now - will enhance later
    const action = await select({
      message: '\nChoose action:',
      choices: [
        { name: 'Move current item up', value: 'up', disabled: currentIndex === 0 },
        { name: 'Move current item down', value: 'down', disabled: currentIndex === ordered.length - 1 },
        { name: 'Jump to item...', value: 'jump' },
        { name: 'Reset to alphabetical', value: 'reset' },
        { name: 'Done - save this order', value: 'done' }
      ]
    });

    switch (action) {
    case 'up':
      if (currentIndex > 0) {
        [ordered[currentIndex - 1], ordered[currentIndex]] = [ordered[currentIndex], ordered[currentIndex - 1]];
        currentIndex--;
      }
      break;

    case 'down':
      if (currentIndex < ordered.length - 1) {
        [ordered[currentIndex], ordered[currentIndex + 1]] = [ordered[currentIndex + 1], ordered[currentIndex]];
        currentIndex++;
      }
      break;

    case 'jump':
      const target = await select({
        message: 'Select screenshot to jump to:',
        choices: ordered.map((file, idx) => ({
          name: `${String(idx + 1).padStart(2, '0')}. ${file}`,
          value: idx
        }))
      });
      currentIndex = target;
      break;

    case 'reset':
      ordered.sort();
      currentIndex = 0;
      break;

    case 'done':
      done = true;
      break;
    }
  }

  return ordered;
}

/**
 * Get available devices from source directory
 */
async function getAvailableDevices(sourcePath: string, language: string): Promise<string[]> {
  const devices = ['iphone', 'ipad', 'mac', 'watch'];
  const available: string[] = [];

  for (const device of devices) {
    const screenshots = await getAvailableScreenshots(device, sourcePath, language);
    if (screenshots.length > 0) {
      available.push(device);
    }
  }

  return available;
}

/**
 * Show current order for all devices
 */
async function showCurrentOrder(_sourcePath: string, _language: string): Promise<void> {
  const config = await loadOrderConfig();

  if (!config) {
    console.log(pc.yellow('No order configuration found'));
    console.log(pc.dim('Run "appshot order --device [device]" to create one'));
    return;
  }

  console.log(pc.bold('\nCurrent screenshot order:'));
  console.log(pc.dim('  Config: .appshot/screenshot-order.json'));
  console.log(pc.dim(`  Modified: ${new Date(config.modified).toLocaleString()}\n`));

  for (const [device, order] of Object.entries(config.orders)) {
    if (order && order.length > 0) {
      displayOrder(order, device);
    }
  }
}

/**
 * Reset order configuration
 */
async function resetOrder(): Promise<void> {
  const configPath = path.join(process.cwd(), '.appshot/screenshot-order.json');

  try {
    await fs.unlink(configPath);
    console.log(pc.green('✓ Order configuration reset'));
    console.log(pc.dim('Screenshots will use smart defaults'));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(pc.yellow('No order configuration to reset'));
    } else {
      throw error;
    }
  }
}

/**
 * Apply order to files by adding numeric prefixes
 */
async function applyOrderToFiles(
  device: string,
  sourcePath: string,
  language: string
): Promise<void> {
  const config = await loadOrderConfig();
  const screenshots = await getAvailableScreenshots(device, sourcePath, language);

  if (screenshots.length === 0) {
    console.error(pc.red(`No screenshots found for ${device}`));
    return;
  }

  const ordered = applyOrder(screenshots, device, config);
  const devicePath = path.join(sourcePath, device, language);

  console.log(pc.cyan(`\nApplying numeric prefixes to ${device} screenshots...`));

  for (let i = 0; i < ordered.length; i++) {
    const oldName = ordered[i];
    const oldPath = path.join(devicePath, oldName);

    // Remove existing prefix if present
    const cleanName = oldName.replace(/^\d+[-_.]/, '');
    const newName = `${String(i + 1).padStart(2, '0')}_${cleanName}`;
    const newPath = path.join(devicePath, newName);

    if (oldPath !== newPath) {
      await fs.rename(oldPath, newPath);
      console.log(pc.dim(`  ${oldName} → ${newName}`));
    }
  }

  console.log(pc.green(`✓ Applied order to ${ordered.length} screenshots`));
}

/**
 * Remove numeric prefixes from files
 */
async function removePrefixes(
  device: string | undefined,
  sourcePath: string,
  language: string
): Promise<void> {
  if (!device) {
    console.error(pc.red('Error: --device is required with --remove-prefixes'));
    process.exit(1);
  }

  const devicePath = path.join(sourcePath, device, language);
  const files = await fs.readdir(devicePath);
  const screenshots = files.filter(f =>
    f.match(/\.(png|jpg|jpeg)$/i) && !f.startsWith('.')
  );

  console.log(pc.cyan(`\nRemoving numeric prefixes from ${device} screenshots...`));

  let renamed = 0;
  for (const file of screenshots) {
    if (/^\d+[-_.]/.test(file)) {
      const oldPath = path.join(devicePath, file);
      const newName = file.replace(/^\d+[-_.]/, '');
      const newPath = path.join(devicePath, newName);

      // Check if target already exists
      try {
        await fs.access(newPath);
        console.log(pc.yellow(`  ⚠ Cannot rename ${file} → ${newName} (file exists)`));
        continue;
      } catch {
        // File doesn't exist, safe to rename
      }

      await fs.rename(oldPath, newPath);
      console.log(pc.dim(`  ${file} → ${newName}`));
      renamed++;
    }
  }

  if (renamed > 0) {
    console.log(pc.green(`✓ Removed prefixes from ${renamed} screenshots`));
  } else {
    console.log(pc.yellow('No numeric prefixes found'));
  }
}