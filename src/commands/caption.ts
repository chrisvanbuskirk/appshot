import { Command } from 'commander';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import type { CaptionsFile, CaptionEntry } from '../types.js';

export default function captionCmd() {
  const cmd = new Command('caption')
    .description('Interactively add/edit captions in a device folder')
    .requiredOption('--device <name>', 'device name (iphone|ipad|mac|watch)')
    .option('--lang <code>', 'language code', 'en')
    .action(async ({ device, lang }) => {
      try {
        const dir = path.join(process.cwd(), 'screenshots', device);
        const captionsFile = path.join(dir, 'captions.json');

        // Check if directory exists
        try {
          await fs.access(dir);
        } catch {
          console.error(pc.red('Error:'), `Directory ${dir} does not exist`);
          console.log(pc.dim('Run'), pc.cyan('appshot init'), pc.dim('first to set up the project structure'));
          process.exit(1);
        }

        // Get all image files
        const files = (await fs.readdir(dir))
          .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
          .sort();

        if (files.length === 0) {
          console.log(pc.yellow('No screenshots found in'), dir);
          console.log(pc.dim('Add .png, .jpg, or .jpeg files to this directory first'));
          process.exit(0);
        }

        // Load existing captions
        let captions: CaptionsFile = {};
        try {
          const content = await fs.readFile(captionsFile, 'utf8');
          captions = JSON.parse(content);
        } catch {
          // File doesn't exist or is invalid, start fresh
        }

        console.log(pc.bold(`\nAdding captions for ${device} (${lang}):`));
        console.log(pc.dim('Press Enter to keep existing caption, or type a new one\n'));

        // Process each file
        for (const file of files) {
          const existing = captions[file];
          let currentCaption = '';
          
          if (typeof existing === 'string') {
            currentCaption = existing;
          } else if (existing && typeof existing === 'object') {
            currentCaption = existing[lang] || '';
          }

          const { text } = await inquirer.prompt([{
            type: 'input',
            name: 'text',
            message: `${file}:`,
            default: currentCaption
          }]);

          // Store caption in structured format
          if (!captions[file] || typeof captions[file] === 'string') {
            captions[file] = {} as CaptionEntry;
          }
          (captions[file] as CaptionEntry)[lang] = text;
        }

        // Save updated captions
        await fs.writeFile(captionsFile, JSON.stringify(captions, null, 2), 'utf8');
        
        console.log('\n' + pc.green('✓'), `Updated ${path.relative(process.cwd(), captionsFile)}`);
        console.log(pc.dim('Run'), pc.cyan('appshot build'), pc.dim('to generate screenshots with these captions'));
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}