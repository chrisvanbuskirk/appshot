import { Command } from 'commander';
import pc from 'picocolors';
import { ALL_PRESETS, SPECS_LAST_UPDATED } from '../core/app-store-specs.js';

export default function specsCmd() {
  return new Command('specs')
    .description('Show device specifications and resolutions from Apple App Store requirements')
    .option('--device <name>', 'filter by device type (iphone|ipad|mac|watch|appletv|visionpro)')
    .option('--json', 'output as JSON')
    .option('--required', 'show only required presets')
    .action((opts) => {
      try {
        if (opts.json) {
          // For JSON output, return the exact Apple specifications
          let output: any = {
            lastUpdated: SPECS_LAST_UPDATED
          };

          if (opts.device) {
            const deviceType = opts.device.toLowerCase();
            if (deviceType in ALL_PRESETS) {
              const presets = ALL_PRESETS[deviceType as keyof typeof ALL_PRESETS];
              output[deviceType] = opts.required ? presets.filter(p => p.required) : presets;
            } else {
              console.error(pc.red(`Unknown device type: ${opts.device}`));
              process.exit(1);
            }
          } else {
            // Include all device types
            for (const [key, presets] of Object.entries(ALL_PRESETS)) {
              output[key] = opts.required ? presets.filter(p => p.required) : presets;
            }
          }

          console.log(JSON.stringify(output, null, 2));
          return;
        }

        // Non-JSON formatted output
        console.log(pc.bold('\nApple App Store Screenshot Specifications\n'));
        console.log(pc.dim('Source: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications'));
        console.log(pc.dim(`Last Updated: ${SPECS_LAST_UPDATED}\n`));

        const deviceTypes = opts.device
          ? [opts.device.toLowerCase() as keyof typeof ALL_PRESETS]
          : Object.keys(ALL_PRESETS) as (keyof typeof ALL_PRESETS)[];

        for (const deviceType of deviceTypes) {
          if (!ALL_PRESETS[deviceType]) {
            console.log(pc.red(`Unknown device type: ${deviceType}`));
            continue;
          }

          const presets = opts.required
            ? ALL_PRESETS[deviceType].filter(p => p.required)
            : ALL_PRESETS[deviceType];

          if (presets.length === 0) continue;

          console.log(pc.cyan(deviceType.toUpperCase()));

          for (const preset of presets) {
            const required = preset.required ? pc.green(' (REQUIRED)') : '';
            console.log(`  ${pc.bold(preset.name)}${required}`);
            console.log(`    Display: ${preset.displaySize}`);

            if (preset.resolutions.portrait) {
              console.log(`    Portrait:  ${pc.dim(preset.resolutions.portrait)}`);
            }
            if (preset.resolutions.landscape) {
              console.log(`    Landscape: ${pc.dim(preset.resolutions.landscape)}`);
            }

            if (preset.devices && preset.devices.length > 0) {
              const deviceList = preset.devices.slice(0, 3).join(', ');
              const more = preset.devices.length > 3 ? ` +${preset.devices.length - 3} more` : '';
              console.log(`    Devices: ${pc.dim(deviceList + more)}`);
            }

            if (preset.notes) {
              console.log(`    Note: ${pc.yellow(preset.notes)}`);
            }
            console.log();
          }
        }

        console.log(pc.dim('Use --json to get complete data for diffing and automation'));
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}