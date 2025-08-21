import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import inquirer from 'inquirer';
import { loadConfig } from '../core/files.js';
import { getSystemLanguage } from '../utils/language.js';

export default function migrateCmd(): Command {
  const cmd = new Command('migrate')
    .description('Migrate project structure to latest version')
    .option('--output-structure', 'Migrate to language subdirectory structure')
    .option('--dry-run', 'Preview changes without making them')
    .option('--lang <code>', 'Language to use for migration (default: system language)')
    .action(async (opts) => {
      if (opts.outputStructure) {
        await migrateOutputStructure(opts);
      } else {
        console.log(pc.yellow('Please specify what to migrate:'));
        console.log('  --output-structure  Migrate to language subdirectory structure');
      }
    });

  return cmd;
}

async function migrateOutputStructure(opts: any) {
  try {
    console.log(pc.bold('Migrating output structure to language subdirectories...'));

    const config = await loadConfig();
    const outputDir = path.resolve(config.output);

    // Check if output directory exists
    try {
      await fs.access(outputDir);
    } catch {
      console.log(pc.yellow('No output directory found. Nothing to migrate.'));
      return;
    }

    // Determine target language
    let targetLang = opts.lang;
    if (!targetLang) {
      // Try to detect from config or system
      targetLang = config.defaultLanguage || getSystemLanguage();

      // In dry-run mode, just use the detected language
      if (!opts.dryRun) {
        // Ask user to confirm
        const answer = await inquirer.prompt([{
          type: 'input',
          name: 'lang',
          message: 'Which language should existing screenshots be moved to?',
          default: targetLang
        }]);
        targetLang = answer.lang;
      }
    }

    console.log(pc.dim(`Using language: ${targetLang}`));

    // Get all device directories
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    const deviceDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

    let movedCount = 0;
    let skippedCount = 0;

    for (const device of deviceDirs) {
      const devicePath = path.join(outputDir, device);
      const deviceEntries = await fs.readdir(devicePath, { withFileTypes: true });

      // Find root-level image files
      const rootImages = deviceEntries.filter(e =>
        e.isFile() && e.name.match(/\.(png|jpg|jpeg)$/i)
      );

      if (rootImages.length === 0) {
        console.log(pc.dim(`  ${device}: No root-level images found`));
        continue;
      }

      console.log(pc.cyan(`\n${device}:`), `Found ${rootImages.length} root-level images`);

      // Create language subdirectory
      const langDir = path.join(devicePath, targetLang);

      if (opts.dryRun) {
        console.log(pc.dim(`  Would create: ${langDir}`));
        for (const img of rootImages) {
          console.log(pc.dim(`  Would move: ${img.name} → ${targetLang}/${img.name}`));
        }
        movedCount += rootImages.length;
      } else {
        await fs.mkdir(langDir, { recursive: true });

        // Move each image
        for (const img of rootImages) {
          const oldPath = path.join(devicePath, img.name);
          const newPath = path.join(langDir, img.name);

          // Check if target already exists
          try {
            await fs.access(newPath);
            console.log(pc.yellow(`  ⚠ Skipping ${img.name} (already exists in ${targetLang}/)`));
            skippedCount++;
          } catch {
            // Move the file
            await fs.rename(oldPath, newPath);
            console.log(pc.green('  ✓'), `${img.name} → ${targetLang}/${img.name}`);
            movedCount++;
          }
        }
      }
    }

    // Summary
    console.log('\n' + pc.bold('Migration complete!'));
    if (opts.dryRun) {
      console.log(pc.dim('This was a dry run. No files were actually moved.'));
      console.log(pc.dim(`Would have moved ${movedCount} files`));
    } else {
      console.log(pc.green(`✓ Moved ${movedCount} files`));
      if (skippedCount > 0) {
        console.log(pc.yellow(`⚠ Skipped ${skippedCount} files (already existed)`));
      }
    }

    console.log(pc.dim('\nNew structure:'));
    console.log(pc.dim('  final/'));
    console.log(pc.dim('    device/'));
    console.log(pc.dim(`      ${targetLang}/  ← Screenshots now here`));

  } catch (error) {
    console.error(pc.red('Migration failed:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}