import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import inquirer from 'inquirer';
import {
  getTemplate,
  getTemplateCaptionSuggestions
} from '../templates/registry.js';
import type { AppshotConfig } from '../types.js';

export default function quickstartCmd() {
  const cmd = new Command('quickstart')
    .description('Get started with App Store screenshots in seconds')
    .option('--template <id>', 'template to use (default: modern)')
    .option('--caption <text>', 'main caption for screenshots')
    .option('--no-interactive', 'skip interactive prompts')
    .option('--force', 'overwrite existing configuration')
    .addHelpText('after', `
${pc.bold('What This Does:')}
  1. Initializes project structure
  2. Applies a professional template
  3. Sets up example captions
  4. Shows you exactly what to do next

${pc.bold('Examples:')}
  ${pc.dim('# Interactive quickstart')}
  $ appshot quickstart
  
  ${pc.dim('# With specific template')}
  $ appshot quickstart --template minimal
  
  ${pc.dim('# Non-interactive with caption')}
  $ appshot quickstart --template bold --caption "Amazing App" --no-interactive

${pc.bold('Templates:')}
  ${pc.cyan('modern')}    - Eye-catching gradient (default)
  ${pc.cyan('minimal')}   - Clean and simple
  ${pc.cyan('bold')}      - Dark and dramatic
  ${pc.cyan('elegant')}   - Professional monochrome
  ${pc.cyan('showcase')}  - Feature your backgrounds
  ${pc.cyan('playful')}   - Bright and fun
  ${pc.cyan('corporate')} - Business professional`)
    .action(async (opts) => {
      try {
        console.log(pc.cyan(`
     _                       _           _   
    / \\   _ __  _ __  ___| |__   ___ | |_ 
   / _ \\ | '_ \\| '_ \\/ __| '_ \\ / _ \\| __|
  / ___ \\| |_) | |_) \\__ \\ | | | (_) | |_ 
 /_/   \\_\\ .__/| .__/|___/_| |_|\\___/ \\__|
         |_|   |_|  Quick Start                        
        `));

        console.log(pc.bold('\n🚀 Welcome to Appshot Quick Start!\n'));
        console.log('Let\'s set up professional App Store screenshots in seconds.\n');

        // Check if already initialized
        const configPath = path.join(process.cwd(), '.appshot', 'config.json');
        const configExists = await fileExists(configPath);

        if (configExists && !opts.force) {
          const overwrite = opts.interactive === false ? false : await confirmOverwrite();
          if (!overwrite) {
            console.log(pc.yellow('Setup cancelled. Use --force to overwrite existing configuration.'));
            process.exit(0);
          }
        }

        // Interactive or direct mode
        let templateId = opts.template || 'modern';
        let caption = opts.caption;
        let devices = ['iphone', 'ipad'];

        if (opts.interactive !== false && (!opts.template || !opts.caption)) {
          // Interactive prompts
          const answers = await inquirer.prompt([
            {
              type: 'list',
              name: 'template',
              message: 'Choose a visual style:',
              choices: [
                { name: '🎨 Modern - Vibrant gradient with floating device', value: 'modern' },
                { name: '⚪ Minimal - Clean and simple', value: 'minimal' },
                { name: '⚫ Bold - Dark and dramatic', value: 'bold' },
                { name: '✨ Elegant - Professional monochrome', value: 'elegant' },
                { name: '🖼️ Showcase - Custom backgrounds', value: 'showcase' },
                { name: '🎮 Playful - Bright and fun', value: 'playful' },
                { name: '💼 Corporate - Business professional', value: 'corporate' }
              ],
              default: templateId
            },
            {
              type: 'input',
              name: 'caption',
              message: 'Enter your main caption:',
              default: caption || 'Your App Name',
              validate: (input) => input.length > 0 || 'Caption is required'
            },
            {
              type: 'checkbox',
              name: 'devices',
              message: 'Which devices do you need?',
              choices: [
                { name: 'iPhone', value: 'iphone', checked: true },
                { name: 'iPad', value: 'ipad', checked: true },
                { name: 'Mac', value: 'mac' },
                { name: 'Apple Watch', value: 'watch' }
              ],
              validate: (choices) => choices.length > 0 || 'Select at least one device'
            }
          ]);

          templateId = answers.template;
          caption = answers.caption;
          devices = answers.devices;
        }

        // Step 1: Initialize project structure
        console.log('\n' + pc.bold('Step 1:'), 'Creating project structure...');
        await initializeProject(devices);

        // Step 2: Apply template
        console.log(pc.bold('Step 2:'), `Applying "${templateId}" template...`);
        const config = await applyTemplate(templateId, devices);

        // Step 3: Set up captions
        console.log(pc.bold('Step 3:'), 'Setting up captions...');
        await setupCaptions(devices, caption || 'Your App Name', templateId);

        // Step 4: Save configuration
        console.log(pc.bold('Step 4:'), 'Saving configuration...');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        // Success!
        console.log('\n' + pc.green('✨ Quick Start Complete!'));

        const template = getTemplate(templateId);
        if (template) {
          console.log(pc.dim(`Template: ${template.name} - ${template.description}`));
        }

        // Instructions
        console.log('\n' + pc.bold('📋 Next Steps:'));
        console.log();
        console.log('1. Add your screenshots:');
        for (const device of devices) {
          console.log(`   ${pc.cyan(`cp your-screenshots/*.png screenshots/${device}/`)}`);
        }
        console.log();
        console.log('2. Build your App Store screenshots:');
        console.log(`   ${pc.cyan('appshot build')}`);
        console.log();
        console.log('3. Find your screenshots in:', pc.green('final/'));
        console.log();

        // Tips
        console.log(pc.bold('💡 Pro Tips:'));
        console.log('• Customize captions:', pc.cyan('appshot caption --device iphone'));
        console.log('• Try other templates:', pc.cyan('appshot template --list'));
        console.log('• Add translations:', pc.cyan('appshot caption --translate --langs es,fr'));
        console.log('• Validate for App Store:', pc.cyan('appshot validate'));

        // Check if in Big Brother project
        const isBigBrother = process.cwd().includes('bigbrother');
        if (isBigBrother) {
          console.log('\n' + pc.yellow('📱 Big Brother Project Detected!'));
          console.log('You already have screenshots ready. Just run:', pc.cyan('appshot build'));
        }

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

/**
 * Initialize project structure
 */
async function initializeProject(devices: string[]) {
  const dirs = [
    '.appshot',
    '.appshot/captions',
    ...devices.map(d => `screenshots/${d}`),
    'final'
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Create caption files
  for (const device of devices) {
    const captionFile = path.join('.appshot', 'captions', `${device}.json`);
    if (!await fileExists(captionFile)) {
      await fs.writeFile(captionFile, '{}');
    }
  }
}

/**
 * Apply template and create configuration
 */
async function applyTemplate(templateId: string, devices: string[]): Promise<AppshotConfig> {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template "${templateId}" not found`);
  }

  // Create base configuration
  const baseConfig: AppshotConfig = {
    output: './final',
    frames: './frames',
    background: template.background,
    caption: {
      font: template.captionStyle.font || 'SF Pro Display',
      fontsize: template.captionStyle.fontsize || 64,
      color: template.captionStyle.color || '#FFFFFF',
      align: template.captionStyle.align || 'center',
      paddingTop: 100,
      paddingBottom: 60,
      ...template.captionStyle
    },
    devices: {}
  };

  // Device-specific resolutions
  const resolutions: Record<string, string> = {
    iphone: '1290x2796',
    ipad: '2048x2732',
    mac: '2880x1800',
    watch: '410x502'
  };

  // Add device configurations
  for (const device of devices) {
    const deviceOverride = template.deviceOverrides?.[device as keyof typeof template.deviceOverrides];

    baseConfig.devices[device] = {
      input: `./screenshots/${device}`,
      resolution: resolutions[device] || '1290x2796',
      autoFrame: true,
      frameScale: deviceOverride?.frameScale || template.deviceStyle.frameScale,
      framePosition: deviceOverride?.framePosition ?? template.deviceStyle.framePosition,
      partialFrame: deviceOverride?.partialFrame ?? template.deviceStyle.partialFrame,
      frameOffset: deviceOverride?.frameOffset ?? template.deviceStyle.frameOffset,
      captionPosition: deviceOverride?.captionPosition ?? template.captionStyle.position
    };

    // Add caption size override for specific devices
    if (deviceOverride?.captionSize) {
      baseConfig.devices[device].captionSize = deviceOverride.captionSize;
    }

    // Special handling for watch
    if (device === 'watch') {
      baseConfig.devices[device].captionFont = 'SF Pro';
      if (!deviceOverride?.captionSize) {
        baseConfig.devices[device].captionSize = 36;
      }
    }
  }

  return baseConfig;
}

/**
 * Set up example captions
 */
async function setupCaptions(devices: string[], mainCaption: string, templateId: string) {
  const suggestions = getTemplateCaptionSuggestions(templateId);

  // Create example captions for common screenshot names
  const exampleCaptions: Record<string, string> = {
    'home.png': mainCaption,
    'dashboard.png': mainCaption,
    'main.png': mainCaption,
    'features.png': suggestions.features[0],
    'settings.png': 'Customize Everything',
    'profile.png': 'Your Personal Space',
    'search.png': 'Find What You Need',
    'notifications.png': 'Stay Updated'
  };

  for (const device of devices) {
    const captionFile = path.join('.appshot', 'captions', `${device}.json`);

    // Load existing captions if any
    let captions: Record<string, string> = {};
    try {
      const existing = await fs.readFile(captionFile, 'utf-8');
      captions = JSON.parse(existing);
    } catch {
      // File doesn't exist or is empty
    }

    // Merge with example captions (don't overwrite existing)
    for (const [file, caption] of Object.entries(exampleCaptions)) {
      if (!captions[file]) {
        captions[file] = caption;
      }
    }

    // Save captions
    await fs.writeFile(captionFile, JSON.stringify(captions, null, 2));
  }
}

/**
 * Confirm overwrite of existing configuration
 */
async function confirmOverwrite(): Promise<boolean> {
  const answer = await inquirer.prompt([{
    type: 'confirm',
    name: 'overwrite',
    message: 'Configuration already exists. Overwrite?',
    default: false
  }]);

  return answer.overwrite;
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}