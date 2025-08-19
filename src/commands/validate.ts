import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import sharp from 'sharp';
import { validateResolution, recommendPreset, getRequiredPresets } from '../core/app-store-specs.js';
import { loadConfig } from '../core/files.js';

export default function validateCmd() {
  const cmd = new Command('validate')
    .description('Validate screenshots against App Store requirements')
    .option('--strict', 'validate against required presets only')
    .option('--fix', 'suggest fixes for invalid screenshots')
    .action(async (opts) => {
      try {
        console.log(pc.bold('🔍 Validating App Store Screenshots...\n'));

        const config = await loadConfig();
        const results: ValidationResult[] = [];

        // Check each device configuration
        for (const [deviceKey, deviceConfig] of Object.entries(config.devices)) {
          const deviceType = deviceKey.split('-')[0].split('_')[0]; // Extract base device type
          const inputDir = path.resolve(deviceConfig.input);

          // Check if input directory exists
          try {
            await fs.access(inputDir);
          } catch {
            results.push({
              device: deviceKey,
              status: 'error',
              message: `Input directory not found: ${inputDir}`
            });
            continue;
          }

          // Parse configured resolution
          const [configWidth, configHeight] = deviceConfig.resolution.split('x').map(Number);

          // Validate resolution against App Store specs
          const isValid = validateResolution(configWidth, configHeight, deviceType);
          const recommended = recommendPreset(configWidth, configHeight, deviceType);

          if (isValid) {
            results.push({
              device: deviceKey,
              status: 'valid',
              message: `✓ ${deviceConfig.resolution} - Matches ${recommended?.name || 'App Store specs'}`
            });
          } else {
            results.push({
              device: deviceKey,
              status: 'invalid',
              message: `✗ ${deviceConfig.resolution} - Not a valid App Store resolution`,
              fix: opts.fix ? await suggestFix(configWidth, configHeight, deviceType) : undefined
            });
          }

          // Check actual screenshots
          const screenshots = (await fs.readdir(inputDir))
            .filter(f => f.match(/\.(png|jpg|jpeg)$/i));

          for (const screenshot of screenshots) {
            const screenshotPath = path.join(inputDir, screenshot);
            const metadata = await sharp(screenshotPath).metadata();

            if (metadata.width !== configWidth || metadata.height !== configHeight) {
              results.push({
                device: deviceKey,
                status: 'warning',
                message: `⚠ ${screenshot}: ${metadata.width}x${metadata.height} doesn't match config ${configWidth}x${configHeight}`
              });
            }
          }
        }

        // Display results
        displayResults(results);

        // Check for required presets if strict mode
        if (opts.strict) {
          console.log(pc.bold('\n📋 Required Presets Check:\n'));
          checkRequiredPresets(config);
        }

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

interface ValidationResult {
  device: string;
  status: 'valid' | 'invalid' | 'warning' | 'error';
  message: string;
  fix?: string;
}

function displayResults(results: ValidationResult[]) {
  const valid = results.filter(r => r.status === 'valid');
  const invalid = results.filter(r => r.status === 'invalid');
  const warnings = results.filter(r => r.status === 'warning');
  const errors = results.filter(r => r.status === 'error');

  if (valid.length > 0) {
    console.log(pc.green('Valid Configurations:'));
    for (const result of valid) {
      console.log(`  ${result.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(pc.yellow('\nWarnings:'));
    for (const result of warnings) {
      console.log(`  ${result.message}`);
    }
  }

  if (invalid.length > 0) {
    console.log(pc.red('\nInvalid Configurations:'));
    for (const result of invalid) {
      console.log(`  ${result.message}`);
      if (result.fix) {
        console.log(pc.dim(`    Suggestion: ${result.fix}`));
      }
    }
  }

  if (errors.length > 0) {
    console.log(pc.red('\nErrors:'));
    for (const result of errors) {
      console.log(`  ${result.message}`);
    }
  }

  // Summary
  console.log(pc.bold('\n📊 Summary:'));
  console.log(`  Valid: ${pc.green(valid.length.toString())}`);
  console.log(`  Invalid: ${pc.red(invalid.length.toString())}`);
  console.log(`  Warnings: ${pc.yellow(warnings.length.toString())}`);
  console.log(`  Errors: ${pc.red(errors.length.toString())}`);

  if (invalid.length > 0 || errors.length > 0) {
    console.log(pc.dim('\nRun with --fix flag for suggestions'));
    process.exit(1);
  }
}

async function suggestFix(width: number, height: number, deviceType: string): Promise<string> {
  const aspectRatio = width / height;
  const orientation = width > height ? 'landscape' : 'portrait';

  // Find closest valid resolution
  const { ALL_PRESETS } = await import('../core/app-store-specs.js');
  const presets = ALL_PRESETS[deviceType as keyof typeof ALL_PRESETS] || [];

  let closestPreset = null;
  let minDiff = Infinity;

  for (const preset of presets) {
    const resolution = preset.resolutions[orientation as 'portrait' | 'landscape'];
    if (!resolution) continue;

    const [presetWidth, presetHeight] = resolution.split('x').map(Number);
    const presetRatio = presetWidth / presetHeight;
    const ratioDiff = Math.abs(aspectRatio - presetRatio);

    if (ratioDiff < minDiff) {
      minDiff = ratioDiff;
      closestPreset = preset;
    }
  }

  if (closestPreset) {
    const resolution = closestPreset.resolutions[orientation as 'portrait' | 'landscape'];
    return `Use ${resolution} (${closestPreset.name})`;
  }

  return 'No matching App Store resolution found';
}

function checkRequiredPresets(config: any) {
  const required = getRequiredPresets();
  const configured = new Set<string>();

  // Extract device types from config
  for (const deviceKey of Object.keys(config.devices)) {
    const deviceType = deviceKey.split('-')[0].split('_')[0];
    const resolution = config.devices[deviceKey].resolution;
    configured.add(`${deviceType}-${resolution}`);
  }

  // Check each required preset
  for (const [category, presets] of Object.entries(required)) {
    if (presets.length === 0) continue;

    console.log(pc.cyan(`${category.toUpperCase()}:`));

    for (const preset of presets) {
      const hasPortrait = preset.resolutions.portrait &&
        configured.has(`${category}-${preset.resolutions.portrait}`);
      const hasLandscape = preset.resolutions.landscape &&
        configured.has(`${category}-${preset.resolutions.landscape}`);

      const status = (hasPortrait || hasLandscape) ? pc.green('✓') : pc.red('✗');
      console.log(`  ${status} ${preset.name} (${preset.displaySize})`);

      if (!hasPortrait && preset.resolutions.portrait) {
        console.log(pc.dim(`    Missing portrait: ${preset.resolutions.portrait}`));
      }
      if (!hasLandscape && preset.resolutions.landscape) {
        console.log(pc.dim(`    Missing landscape: ${preset.resolutions.landscape}`));
      }
    }
  }
}