import { Command } from 'commander';
import { promises as fs } from 'fs';
import pc from 'picocolors';
import { ALL_PRESETS, getRequiredPresets, getPresetById } from '../core/app-store-specs.js';
import type { AppshotConfig } from '../types.js';

export default function presetsCmd() {
  const cmd = new Command('presets')
    .description('Manage App Store screenshot presets')
    .option('--list', 'list all available presets')
    .option('--required', 'list only required presets for App Store')
    .option('--generate <ids>', 'generate config for specific preset IDs (comma-separated)')
    .option('--category <type>', 'filter by category (iphone, ipad, mac, appletv, visionpro, watch)')
    .option('--output <file>', 'output file for generated config', 'appshot-presets.json')
    .action(async (opts) => {
      try {
        if (opts.list || opts.required) {
          listPresets(opts);
        } else if (opts.generate) {
          await generateConfig(opts.generate, opts.output);
        } else {
          // Default: show required presets
          listPresets({ required: true });
        }
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

function listPresets(opts: { required?: boolean; category?: string }) {
  console.log(pc.bold('\n📱 App Store Screenshot Presets\n'));

  const presets = opts.required ? getRequiredPresets() : ALL_PRESETS;
  const categories = opts.category ? [opts.category] : Object.keys(presets);

  for (const category of categories) {
    const categoryPresets = presets[category as keyof typeof presets];
    if (!categoryPresets || categoryPresets.length === 0) continue;

    console.log(pc.cyan(`\n${category.toUpperCase()}`));
    console.log(pc.dim('─'.repeat(50)));

    for (const preset of categoryPresets) {
      const required = preset.required ? pc.red(' [REQUIRED]') : '';
      console.log(`\n  ${pc.bold(preset.id)}${required}`);
      console.log(`  ${preset.name} (${preset.displaySize})`);

      if (preset.resolutions.portrait) {
        console.log(`  Portrait:  ${pc.green(preset.resolutions.portrait)}`);
      }
      if (preset.resolutions.landscape) {
        console.log(`  Landscape: ${pc.green(preset.resolutions.landscape)}`);
      }

      if (preset.devices && preset.devices.length > 0) {
        console.log(`  Devices:   ${pc.dim(preset.devices.slice(0, 3).join(', '))}${preset.devices.length > 3 ? '...' : ''}`);
      }

      if (preset.notes) {
        console.log(`  Note:      ${pc.yellow(preset.notes)}`);
      }
    }
  }

  console.log(pc.dim('\n─'.repeat(50)));
  console.log(pc.dim('\nUse --generate <preset-ids> to create a configuration file'));
  console.log(pc.dim('Example: appshot presets --generate iphone-6-9,ipad-13,mac-2880'));
}

async function generateConfig(presetIds: string, outputFile: string) {
  const ids = presetIds.split(',').map(id => id.trim());
  const config: Partial<AppshotConfig> = {
    output: './app-store-screenshots',
    frames: './frames',
    gradient: {
      colors: ['#667eea', '#764ba2'],
      direction: 'diagonal'
    },
    caption: {
      font: 'SF Pro Display',
      fontsize: 72,
      color: '#FFFFFF',
      align: 'center',
      paddingTop: 120,
      paddingBottom: 80,
      position: 'above'
    },
    devices: {}
  };

  const foundPresets: string[] = [];
  const notFound: string[] = [];

  for (const id of ids) {
    const preset = getPresetById(id);
    if (!preset) {
      notFound.push(id);
      continue;
    }

    foundPresets.push(id);

    // Determine device type from preset ID
    const deviceType = id.split('-')[0];

    // Add both portrait and landscape configurations if available
    if (preset.resolutions.portrait) {
      const configId = `${id}-portrait`;
      config.devices![configId] = {
        input: `./screenshots/${deviceType}/${preset.displaySize.replace(/[^a-z0-9]/gi, '')}/portrait`,
        resolution: preset.resolutions.portrait,
        autoFrame: true,
        partialFrame: deviceType === 'iphone' || deviceType === 'ipad'
      };
    }

    if (preset.resolutions.landscape) {
      const configId = `${id}-landscape`;
      config.devices![configId] = {
        input: `./screenshots/${deviceType}/${preset.displaySize.replace(/[^a-z0-9]/gi, '')}/landscape`,
        resolution: preset.resolutions.landscape,
        autoFrame: true,
        partialFrame: deviceType === 'iphone' || deviceType === 'ipad'
      };
    }
  }

  if (notFound.length > 0) {
    console.log(pc.yellow('⚠ Warning: Preset IDs not found:'), notFound.join(', '));
  }

  if (foundPresets.length === 0) {
    console.log(pc.red('✗ No valid presets found'));
    return;
  }

  // Write config file
  await fs.writeFile(
    outputFile,
    JSON.stringify(config, null, 2),
    'utf-8'
  );

  console.log(pc.green('✓'), `Generated config for ${foundPresets.length} presets in ${outputFile}`);
  console.log(pc.dim('\nPresets included:'));
  for (const id of foundPresets) {
    const preset = getPresetById(id);
    console.log(`  - ${preset?.name} (${id})`);
  }

  console.log(pc.dim('\nNext steps:'));
  console.log('  1. Add your screenshots to the appropriate directories');
  console.log('  2. Run: appshot build --config', outputFile);
}