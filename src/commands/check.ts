import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { loadConfig, fileExists } from '../core/files.js';

export default function checkCmd() {
  return new Command('check')
    .description('Validate project configuration and assets')
    .option('--fix', 'attempt to fix issues automatically')
    .action(async (opts) => {
      try {
        console.log(pc.bold('Checking appshot project...\n'));
        
        let errors = 0;
        let warnings = 0;
        
        // Check config file
        console.log(pc.cyan('Configuration:'));
        try {
          const config = await loadConfig();
          console.log(pc.green('  ✓'), 'appshot.json found and valid');
          
          // Check output directory
          if (!await fileExists(config.output)) {
            if (opts.fix) {
              await fs.mkdir(config.output, { recursive: true });
              console.log(pc.green('  ✓'), `Created output directory: ${config.output}`);
            } else {
              console.log(pc.yellow('  ⚠'), `Output directory does not exist: ${config.output}`);
              warnings++;
            }
          } else {
            console.log(pc.green('  ✓'), `Output directory exists: ${config.output}`);
          }
          
          // Check device configurations
          console.log('\n' + pc.cyan('Devices:'));
          for (const [device, deviceConfig] of Object.entries(config.devices)) {
            console.log(`  ${device}:`);
            
            // Check input directory
            const inputPath = path.resolve(deviceConfig.input);
            if (!await fileExists(inputPath)) {
              if (opts.fix) {
                await fs.mkdir(inputPath, { recursive: true });
                console.log(pc.green('    ✓'), `Created: ${deviceConfig.input}`);
              } else {
                console.log(pc.red('    ✗'), `Input directory not found: ${deviceConfig.input}`);
                errors++;
              }
            } else {
              // Count screenshots
              const files = await fs.readdir(inputPath);
              const screenshots = files.filter(f => f.match(/\.(png|jpg|jpeg)$/i));
              console.log(pc.green('    ✓'), `${screenshots.length} screenshots found`);
              
              // Check captions file
              const captionsPath = path.join(inputPath, 'captions.json');
              if (!await fileExists(captionsPath)) {
                if (opts.fix) {
                  await fs.writeFile(captionsPath, '{}', 'utf8');
                  console.log(pc.green('    ✓'), 'Created captions.json');
                } else {
                  console.log(pc.yellow('    ⚠'), 'No captions.json file');
                  warnings++;
                }
              } else {
                console.log(pc.green('    ✓'), 'captions.json exists');
              }
            }
          }
          
          // Check frames directory
          console.log('\n' + pc.cyan('Frames:'));
          const framesPath = path.resolve(config.frames);
          if (!await fileExists(framesPath)) {
            if (opts.fix) {
              await fs.mkdir(framesPath, { recursive: true });
              console.log(pc.green('  ✓'), `Created frames directory: ${config.frames}`);
            } else {
              console.log(pc.yellow('  ⚠'), `Frames directory not found: ${config.frames}`);
              warnings++;
            }
          } else {
            const frames = await fs.readdir(framesPath);
            const frameFiles = frames.filter(f => f.match(/\.(png|jpg|jpeg)$/i));
            console.log(pc.green('  ✓'), `${frameFiles.length} frame files found`);
          }
          
        } catch (error) {
          console.log(pc.red('  ✗'), error instanceof Error ? error.message : String(error));
          errors++;
        }
        
        // Summary
        console.log('\n' + pc.bold('Summary:'));
        if (errors === 0 && warnings === 0) {
          console.log(pc.green('✓ All checks passed!'));
        } else {
          if (errors > 0) {
            console.log(pc.red(`✗ ${errors} error${errors !== 1 ? 's' : ''}`));
          }
          if (warnings > 0) {
            console.log(pc.yellow(`⚠ ${warnings} warning${warnings !== 1 ? 's' : ''}`));
          }
          if (!opts.fix) {
            console.log(pc.dim('\nRun with --fix to attempt automatic fixes'));
          }
        }
        
        if (errors > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}