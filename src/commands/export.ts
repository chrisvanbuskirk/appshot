import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import {
  mapLanguages
} from '../services/fastlane-language-mapper.js';
import {
  getAllLanguages,
  organizeScreenshots,
  type OrganizeOptions,
  type FileAction
} from '../services/screenshot-organizer.js';
import {
  validateExport,
  validateOutputDirectory,
  isSafeToClean
} from '../services/export-validator.js';
import {
  generateDeliverfile,
  generateFastfileLane,
  generateFastlaneReadme,
  generateFastlaneGitignore
} from '../services/fastlane-config-generator.js';

export default function exportCmd() {
  const cmd = new Command('export')
    .description('Export screenshots for external tools (Fastlane, App Store Connect, etc.)')
    .argument('[format]', 'Export format (currently only "fastlane" supported)', 'fastlane')
    .option('--source <dir>', 'Source directory containing appshot output', './final')
    .option('--output <dir>', 'Output directory for exported screenshots', './fastlane/screenshots')
    .option('--langs <list>', 'Override auto-detected languages (e.g., en-US,de-DE,fr-FR)')
    .option('--devices <list>', 'Specific devices to export: iphone,ipad,mac,watch (default: all)')
    .option('--copy', 'Copy files instead of creating symlinks')
    .option('--flatten', 'Put all screenshots directly in language folders')
    .option('--prefix-device', 'Prefix filenames with device type (e.g., iPhone_screenshot.png)')
    .option('--clean', 'Clean output directory before exporting')
    .option('--generate-config', 'Generate Deliverfile and Fastfile for Fastlane')
    .option('--dry-run', 'Preview export without creating files')
    .option('--verbose', 'Show detailed output')
    .option('--json', 'Output results as JSON')
    .option('--config <file>', 'Path to export configuration file')
    .addHelpText('after', `
${pc.bold('Examples:')}
  ${pc.dim('# Auto-detect and export all screenshots')}
  $ appshot export

  ${pc.dim('# Export with specific languages')}
  $ appshot export --langs en-US,es-ES,fr-FR

  ${pc.dim('# Copy files instead of symlinks (for CI/CD)')}
  $ appshot export --copy --clean

  ${pc.dim('# Generate Fastlane configuration')}
  $ appshot export --generate-config

  ${pc.dim('# Preview without creating files')}
  $ appshot export --dry-run

  ${pc.dim('# Custom paths')}
  $ appshot export --source ./my-screenshots --output ./upload

${pc.bold('Language Auto-Detection:')}
  The command automatically detects available languages from your
  screenshots and maps them to Fastlane-compatible codes:

  • en → en-US
  • es → es-ES
  • fr → fr-FR
  • de → de-DE
  • zh → zh-Hans
  • pt → pt-PT

${pc.bold('Special Device Handling:')}
  • iPad Pro 12.9" (3rd gen) screenshots are automatically renamed
    with IPAD_PRO_3GEN_129_ prefix for proper Fastlane recognition

${pc.bold('Output Structure:')}
  fastlane/screenshots/
  ├── en-US/
  │   ├── screenshot1.png
  │   ├── screenshot2.png
  │   └── ...
  └── es-ES/
      └── ...

${pc.bold('Integration with Fastlane:')}
  After export, upload screenshots with:
  $ cd fastlane && fastlane deliver`)
    .action(async (format, opts) => {
      try {
        // Validate format
        if (format !== 'fastlane') {
          console.error(pc.red(`Error: Unsupported format '${format}'. Currently only 'fastlane' is supported.`));
          process.exit(1);
        }

        // Resolve paths
        const sourcePath = path.resolve(opts.source);
        const outputPath = path.resolve(opts.output);

        // Parse devices filter if provided
        let deviceFilter: string[] | undefined;
        if (opts.devices) {
          const validDevices = ['iphone', 'ipad', 'mac', 'watch'];
          const requestedDevices = opts.devices.split(',').map((d: any) => String(d).trim().toLowerCase());
          deviceFilter = requestedDevices.filter((d: string) => validDevices.includes(d));

          // Warn about invalid devices
          const invalidDevices = requestedDevices.filter((d: string) => !validDevices.includes(d));
          if (invalidDevices.length > 0 && !opts.json) {
            console.log(pc.yellow('Warning: Ignoring invalid devices:'), invalidDevices.join(', '));
            console.log(pc.dim('Valid devices are: iphone, ipad, mac, watch'));
          }

          if (deviceFilter && deviceFilter.length === 0) {
            console.error(pc.red('Error: No valid devices specified'));
            process.exit(1);
          }
        }

        // Auto-detect languages if not specified
        let detectedLanguages: string[];
        if (opts.langs) {
          detectedLanguages = opts.langs.split(',').map((l: string) => l.trim());
          if (!opts.json) {
            console.log(pc.cyan('Using specified languages:'), detectedLanguages.join(', '));
          }
        } else {
          detectedLanguages = await getAllLanguages(sourcePath);
          if (detectedLanguages.length === 0) {
            console.error(pc.red('Error: No screenshots found in'), sourcePath);
            console.log(pc.dim('Expected structure: final/[device]/[language]/'));
            process.exit(1);
          }
          if (!opts.json) {
            console.log(pc.cyan('✓ Auto-detected languages:'), detectedLanguages.join(', '));
          }
        }

        // Map to Fastlane language codes
        const languageMap = await mapLanguages(detectedLanguages, opts.config);

        // Show language mappings
        if (!opts.json && languageMap.size > 0) {
          const mappings: string[] = [];
          for (const [source, target] of languageMap) {
            if (source !== target) {
              mappings.push(`${source} → ${target}`);
            } else {
              mappings.push(source);
            }
          }
          console.log(pc.dim('Language mappings:'), mappings.join(', '));
        }

        // Validate before proceeding
        const validation = await validateExport(sourcePath, languageMap, deviceFilter);
        if (!validation.valid) {
          if (opts.json) {
            console.log(JSON.stringify({ success: false, errors: validation.issues }, null, 2));
          } else {
            console.error(pc.red('\nValidation failed:'));
            validation.issues.forEach(issue => console.error(pc.red('  ✗'), issue));
          }
          process.exit(1);
        }

        // Show warnings
        if (!opts.json && validation.warnings.length > 0) {
          console.log(pc.yellow('\nWarnings:'));
          validation.warnings.forEach(warning => console.log(pc.yellow('  ⚠'), warning));
        }

        // Validate output directory
        const outputValidation = await validateOutputDirectory(outputPath);
        if (!outputValidation.valid) {
          if (opts.json) {
            console.log(JSON.stringify({ success: false, errors: outputValidation.issues }, null, 2));
          } else {
            console.error(pc.red('\nOutput directory validation failed:'));
            outputValidation.issues.forEach(issue => console.error(pc.red('  ✗'), issue));
          }
          process.exit(1);
        }

        // Handle dry run
        if (opts.dryRun) {
          const organizeOpts: OrganizeOptions = {
            source: sourcePath,
            output: outputPath,
            languageMap,
            devices: deviceFilter,
            flatten: opts.flatten,
            prefixDevice: opts.prefixDevice,
            copy: opts.copy,
            clean: opts.clean,
            dryRun: true,
            verbose: opts.verbose
          };

          const dryRunResult = await organizeScreenshots(organizeOpts);

          if (opts.json) {
            console.log(JSON.stringify({
              dryRun: true,
              actions: dryRunResult.actions,
              stats: validation.stats
            }, null, 2));
          } else {
            console.log(pc.cyan('\n🔍 Dry Run - Would perform the following:'));
            console.log('\n' + pc.bold('Export Plan:'));
            console.log(`  Source: ${sourcePath}`);
            console.log(`  Output: ${outputPath}`);
            console.log(`  Method: ${opts.copy ? 'Copy files' : 'Create symlinks'}`);
            console.log(`  Clean: ${opts.clean ? 'Yes' : 'No'}`);

            if (dryRunResult.actions && dryRunResult.actions.length > 0) {
              console.log('\n' + pc.bold('Files to process:'));
              const sampleSize = Math.min(10, dryRunResult.actions.length);
              dryRunResult.actions.slice(0, sampleSize).forEach((action: FileAction) => {
                const sourceRelative = path.relative(process.cwd(), action.source);
                const destRelative = path.relative(process.cwd(), action.destination);
                console.log(pc.dim(`  ${sourceRelative}`));
                console.log(pc.green(`    → ${destRelative}`));
                if (action.specialHandling) {
                  console.log(pc.yellow(`    ${action.specialHandling}`));
                }
              });

              if (dryRunResult.actions.length > sampleSize) {
                console.log(pc.dim(`  ... and ${dryRunResult.actions.length - sampleSize} more files`));
              }
            }

            if (dryRunResult.actions && dryRunResult.actions.length > 0) {
              // Calculate actual device count from actions
              const devicesInActions = new Set(dryRunResult.actions.map((a: FileAction) => a.device));

              console.log('\n' + pc.bold('Summary:'));
              console.log(`  Total screenshots: ${dryRunResult.actions.length}`);
              console.log(`  Languages: ${languageMap.size}`);
              console.log(`  Devices: ${devicesInActions.size}`);
            } else if (validation.stats) {
              // Fallback to validation stats if no actions
              console.log('\n' + pc.bold('Summary:'));
              console.log(`  Total screenshots: ${validation.stats.totalScreenshots}`);
              console.log(`  Languages: ${languageMap.size}`);
              console.log(`  Devices: ${Object.keys(validation.stats.deviceCounts).filter(d => validation.stats!.deviceCounts[d] > 0).length}`);
            }
          }

          return;
        }

        // Clean output directory if requested
        if (opts.clean) {
          if (!isSafeToClean(outputPath)) {
            console.error(pc.red('Error: Refusing to clean unsafe directory:'), outputPath);
            process.exit(1);
          }

          try {
            await fs.rm(outputPath, { recursive: true, force: true });
            if (!opts.json) {
              console.log(pc.dim('Cleaned output directory'));
            }
          } catch {
            // Directory might not exist
          }
        }

        // Perform the export
        if (!opts.json) {
          console.log(pc.cyan('\n📦 Exporting screenshots...'));
        }

        const organizeOpts: OrganizeOptions = {
          source: sourcePath,
          output: outputPath,
          languageMap,
          devices: deviceFilter,
          flatten: opts.flatten,
          prefixDevice: opts.prefixDevice,
          copy: opts.copy,
          clean: false, // Already handled above
          dryRun: false,
          verbose: opts.verbose
        };

        const result = await organizeScreenshots(organizeOpts);

        // Generate config files if requested
        if (opts.generateConfig) {
          const fastlaneDir = path.dirname(outputPath);

          // Create Deliverfile
          const deliverfilePath = path.join(fastlaneDir, 'Deliverfile');
          const deliverfileContent = generateDeliverfile(
            Array.from(languageMap.values()),
            path.relative(fastlaneDir, outputPath)
          );
          await fs.writeFile(deliverfilePath, deliverfileContent);

          // Create or append to Fastfile
          const fastfilePath = path.join(fastlaneDir, 'Fastfile');
          const fastfileLanes = generateFastfileLane();

          try {
            // Check if Fastfile exists
            await fs.access(fastfilePath);
            // Append to existing file
            const existingContent = await fs.readFile(fastfilePath, 'utf-8');
            if (!existingContent.includes('lane :screenshots')) {
              await fs.appendFile(fastfilePath, '\n\n' + fastfileLanes);
              if (!opts.json) {
                console.log(pc.green('✓'), 'Added lanes to existing Fastfile');
              }
            } else {
              if (!opts.json) {
                console.log(pc.yellow('⚠'), 'Fastfile already contains screenshot lanes');
              }
            }
          } catch {
            // Create new file
            await fs.writeFile(fastfilePath, fastfileLanes);
            if (!opts.json) {
              console.log(pc.green('✓'), 'Created Fastfile');
            }
          }

          // Create README
          const readmePath = path.join(fastlaneDir, 'README.md');
          const readmeContent = generateFastlaneReadme(Array.from(languageMap.values()));
          await fs.writeFile(readmePath, readmeContent);

          // Create .gitignore
          const gitignorePath = path.join(fastlaneDir, '.gitignore');
          const gitignoreContent = generateFastlaneGitignore();
          await fs.writeFile(gitignorePath, gitignoreContent);

          if (!opts.json) {
            console.log(pc.green('✓'), 'Generated Fastlane configuration files');
          }
        }

        // Output results
        if (opts.json) {
          console.log(JSON.stringify({
            success: true,
            processed: result.processed,
            errors: result.errors,
            byLanguage: result.byLanguage,
            byDevice: result.byDevice,
            outputPath,
            configGenerated: opts.generateConfig || false
          }, null, 2));
        } else {
          console.log('\n' + pc.bold(pc.green('✓ Export complete!')));
          console.log('\n' + pc.bold('Summary:'));
          console.log(`  Screenshots exported: ${result.processed}`);

          if (Object.keys(result.byLanguage).length > 0) {
            console.log('\n' + pc.bold('By language:'));
            for (const [lang, count] of Object.entries(result.byLanguage)) {
              console.log(`  ${lang}: ${count} files`);
            }
          }

          if (Object.keys(result.byDevice).length > 0) {
            console.log('\n' + pc.bold('By device:'));
            // Show all requested devices, even if they have 0 files
            const devicesToShow = deviceFilter || Object.keys(result.byDevice);
            for (const device of devicesToShow) {
              const count = result.byDevice[device] || 0;
              if (deviceFilter || count > 0) {
                console.log(`  ${device}: ${count} files`);
                if (deviceFilter && count === 0) {
                  console.log(pc.yellow(`    ⚠ No screenshots found for ${device}`));
                }
              }
            }
          }

          console.log('\n' + pc.cyan('Ready for upload:'));
          console.log(pc.dim(`  cd ${path.relative(process.cwd(), path.dirname(outputPath))} && fastlane deliver`));

          if (!opts.generateConfig) {
            console.log('\n' + pc.dim('Tip: Use --generate-config to create Fastlane configuration files'));
          }
        }

      } catch (error) {
        if (opts.json) {
          console.log(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2));
        } else {
          console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        }
        process.exit(1);
      }
    });

  return cmd;
}