import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { templates } from '../templates/registry.js';
import { execSync } from 'child_process';

interface PresetOptions {
  caption?: string;
  devices?: string;
  langs?: string;
  output?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export const presetCommand = new Command('preset')
  .description('Apply template preset and build in one command')
  .argument('<preset>', 'Preset name (modern, bold, minimal, elegant, corporate, playful, showcase, nerdy)')
  .option('-c, --caption <text>', 'Add caption to all screenshots')
  .option('-d, --devices <list>', 'Comma-separated device list (iphone,ipad,watch,mac)')
  .option('-l, --langs <list>', 'Comma-separated language codes (en,es,fr,de,etc)')
  .option('-o, --output <path>', 'Output directory', './final')
  .option('--dry-run', 'Preview without building')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (presetName: string, options: PresetOptions) => {
    try {
      // Get template from registry
      const template = templates.find((t: any) => t.id === presetName);

      if (!template) {
        console.error(chalk.red(`❌ Preset "${presetName}" not found`));
        console.log('\nAvailable presets:');
        templates.forEach((t: any) => {
          console.log(`  ${chalk.cyan(t.id.padEnd(12))} - ${t.name}`);
        });
        process.exit(1);
      }

      // Load current config
      const configPath = path.join(process.cwd(), '.appshot', 'config.json');
      if (!existsSync(configPath)) {
        console.error(chalk.red('❌ No appshot project found. Run "appshot init" first.'));
        process.exit(1);
      }

      if (options.dryRun) {
        console.log(chalk.cyan('🔍 Dry Run Mode - Preview Only\n'));
        console.log(chalk.bold(`Preset: ${template.name}`));
        console.log(`Description: ${template.description}`);
        console.log(`Style: ${template.category}`);

        if ((template as any).background?.gradient) {
          const colors = (template as any).background.gradient.colors;
          console.log(`Gradient: ${colors.join(' → ')}`);
        }

        console.log(`\nDevices: ${options.devices || 'all'}`);
        console.log(`Languages: ${options.langs || 'en'}`);
        console.log(`Output: ${options.output || './final'}`);

        if (options.caption) {
          console.log(`Caption: "${options.caption}"`);
        }

        console.log(chalk.gray('\nRun without --dry-run to build screenshots'));
        return;
      }

      // Step 1: Apply template
      if (options.verbose) {
        console.log(chalk.gray('Applying template...'));
      }

      // Backup current config
      const backupPath = path.join(process.cwd(), '.appshot', 'config.backup.json');
      const currentConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      writeFileSync(backupPath, JSON.stringify(currentConfig, null, 2));

      // Apply template config
      const templateConfig = (template as any);
      const newConfig = {
        ...currentConfig,
        background: templateConfig.background,
        caption: templateConfig.caption,
        devices: {
          ...currentConfig.devices,
          ...templateConfig.devices
        }
      };

      // Override output if specified
      if (options.output) {
        newConfig.output = options.output;
      }

      writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

      console.log(chalk.green(`✨ Preset "${template.name}" applied`));

      // Step 2: Add captions if provided
      if (options.caption) {
        if (options.verbose) {
          console.log(chalk.gray('Adding captions...'));
        }

        const devices = options.devices ? options.devices.split(',') : ['iphone', 'ipad', 'watch', 'mac'];

        for (const device of devices) {
          const captionFile = path.join(process.cwd(), '.appshot', 'captions', `${device.trim()}.json`);

          // Get screenshots for this device
          const screenshotDir = path.join(process.cwd(), 'screenshots', device.trim());
          if (!existsSync(screenshotDir)) continue;

          const screenshots = readdirSync(screenshotDir)
            .filter((f: string) => /\.(png|jpg|jpeg)$/i.test(f));

          if (screenshots.length > 0) {
            // Create captions object with the provided caption for first screenshot
            const captions: Record<string, string> = {};
            captions[screenshots[0]] = options.caption;

            // Ensure captions directory exists
            mkdirSync(path.dirname(captionFile), { recursive: true });
            writeFileSync(captionFile, JSON.stringify(captions, null, 2));

            if (options.verbose) {
              console.log(chalk.gray(`  Added caption for ${device}`));
            }
          }
        }
      }

      // Step 3: Build screenshots
      console.log(chalk.cyan('\n📸 Building screenshots...\n'));

      let buildCmd = 'appshot build';

      if (options.devices) {
        buildCmd += ` --devices ${options.devices}`;
      }

      if (options.langs) {
        buildCmd += ` --langs ${options.langs}`;
      }

      if (options.verbose) {
        console.log(chalk.gray(`Running: ${buildCmd}`));
      }

      try {
        execSync(buildCmd, {
          stdio: options.verbose ? 'inherit' : 'pipe',
          cwd: process.cwd()
        });

        console.log(chalk.green('\n✅ Screenshots generated successfully!'));
        console.log(chalk.gray(`Output: ${options.output || './final'}`));

      } catch {
        console.error(chalk.red('❌ Build failed'));
        if (!options.verbose) {
          console.log(chalk.gray('Run with --verbose for details'));
        }
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Also create a simpler alias
export const quickPresetCommand = new Command('qp')
  .description('Quick preset (alias for preset)')
  .argument('<preset>', 'Preset name')
  .option('-c, --caption <text>', 'Caption text')
  .option('-d, --devices <list>', 'Device list')
  .action((preset: string, options: any) => {
    // Redirect to main preset command
    const args = ['preset', preset];
    if (options.caption) args.push('--caption', options.caption);
    if (options.devices) args.push('--devices', options.devices);

    execSync(`appshot ${args.join(' ')}`, { stdio: 'inherit' });
  });

export default function presetCmd() {
  return presetCommand;
}