import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { clearCaptionHistory } from '../utils/caption-history.js';

export function createCleanCommand(): Command {
  const command = new Command('clean');

  command
    .description('Clean generated screenshots and temporary files')
    .option('-o, --output <dir>', 'Output directory to clean', 'final')
    .option('-a, --all', 'Clean all generated files including .appshot config')
    .option('--history', 'Clear caption autocomplete history')
    .option('--keep-history', 'Keep caption history when using --all')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options) => {
      const dirs = [options.output];
      let shouldClearHistory = options.history;
      let historyFile: Buffer | null = null;

      if (options.all) {
        dirs.push('.appshot');
        // If --all is used without --keep-history, history will be cleared
        if (!options.keepHistory) {
          shouldClearHistory = true;
        } else {
          // Preserve history file before deletion
          try {
            historyFile = await fs.readFile(path.join(process.cwd(), '.appshot', 'caption-history.json'));
          } catch {
            // History file doesn't exist yet
          }
        }
      }

      // Check what exists
      const existingDirs = [];
      for (const dir of dirs) {
        try {
          await fs.access(dir);
          existingDirs.push(dir);
        } catch {
          // Directory doesn't exist, skip it
        }
      }

      // Handle history-only cleaning
      if (options.history && !options.all && existingDirs.length === 0) {
        await clearCaptionHistory();
        console.log(pc.green('✓'), 'Cleared caption history');
        return;
      }

      if (existingDirs.length === 0 && !shouldClearHistory) {
        console.log(pc.yellow('✓'), 'No files to clean');
        return;
      }

      // Show what will be deleted
      if (existingDirs.length > 0) {
        console.log(pc.bold('The following directories will be removed:'));
        for (const dir of existingDirs) {
          const stats = await fs.stat(dir);
          if (stats.isDirectory()) {
            const files = await countFiles(dir);
            console.log(pc.red('  •'), `${dir}/ (${files} files)`);
          }
        }
      }

      if (shouldClearHistory && !options.keepHistory) {
        console.log(pc.red('  •'), 'Caption autocomplete history');
      }

      // Confirm unless -y flag is set
      if (!options.yes) {
        const inquirer = await import('inquirer');
        const { confirm } = await inquirer.default.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete these files?',
          default: false
        }]);

        if (!confirm) {
          console.log(pc.gray('Cancelled'));
          return;
        }
      }

      // Delete directories
      for (const dir of existingDirs) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
          console.log(pc.green('✓'), `Removed ${dir}/`);
        } catch (error) {
          console.error(pc.red('✗'), `Failed to remove ${dir}:`, error);
        }
      }

      // Restore history file if it was preserved
      if (historyFile && options.keepHistory) {
        try {
          const historyPath = path.join(process.cwd(), '.appshot', 'caption-history.json');
          await fs.mkdir(path.dirname(historyPath), { recursive: true });
          await fs.writeFile(historyPath, historyFile);
          console.log(pc.green('✓'), 'Preserved caption history');
        } catch (error) {
          console.error(pc.red('✗'), 'Failed to restore caption history:', error);
        }
      } else if (shouldClearHistory && !options.all) {
        // Clear history if explicitly requested (and not already cleared by --all)
        await clearCaptionHistory();
        console.log(pc.green('✓'), 'Cleared caption history');
      }

      console.log(pc.green('✓'), 'Clean complete');
    });

  return command;
}

async function countFiles(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += await countFiles(path.join(dir, entry.name));
      } else {
        count++;
      }
    }
  } catch {
    // Ignore errors
  }
  return count;
}