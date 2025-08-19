import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import type { AppshotConfig } from '../types.js';

export default function initCmd() {
  const cmd = new Command('init')
    .description('Scaffold appshot configuration and per-device captions files')
    .option('--force', 'overwrite existing files')
    .action(async (opts) => {
      try {
        const root = process.cwd();
        const appshotDir = path.join(root, '.appshot');
        const configPath = path.join(appshotDir, 'config.json');
        const devices = ['iphone', 'ipad', 'mac', 'watch'];

        const scaffold: AppshotConfig = {
          output: './final',
          frames: './frames',
          gradient: {
            colors: ['#FF5733', '#FFC300'],
            direction: 'top-bottom'
          },
          caption: {
            font: 'SF Pro',
            fontsize: 64,
            color: '#FFFFFF',
            align: 'center',
            paddingTop: 100
          },
          devices: {
            iphone: { input: './screenshots/iphone', resolution: '1284x2778', autoFrame: true },
            ipad:   { input: './screenshots/ipad',   resolution: '2048x2732', autoFrame: true },
            mac:    { input: './screenshots/mac',    resolution: '2880x1800', autoFrame: true },
            watch:  { input: './screenshots/watch',  resolution: '368x448', autoFrame: true }
          }
        };

        // Create .appshot directory
        await fs.mkdir(appshotDir, { recursive: true });

        if (!opts.force) {
          try {
            await fs.access(configPath);
            console.error(pc.red('Error:'), '.appshot/config.json already exists (use --force to overwrite)');
            process.exit(1);
          } catch {
            // File doesn't exist, proceed
          }
        }

        await fs.writeFile(configPath, JSON.stringify(scaffold, null, 2), 'utf8');
        console.log(pc.green('✓'), 'Created .appshot/config.json');

        for (const device of devices) {
          const dir = path.join(root, 'screenshots', device);
          await fs.mkdir(dir, { recursive: true });
          console.log(pc.green('✓'), `Created ${path.relative(root, dir)}/`);

          // Put captions in .appshot/captions/
          const captionsPath = path.join(appshotDir, 'captions', `${device}.json`);
          // Create captions directory
          await fs.mkdir(path.dirname(captionsPath), { recursive: true });
          
          try {
            await fs.access(captionsPath);
            if (!opts.force) {
              console.log(pc.yellow('⚠'), `Skipped ${path.relative(root, captionsPath)} (already exists)`);
              continue;
            }
          } catch {
            // File doesn't exist, proceed
          }

          await fs.writeFile(captionsPath, JSON.stringify({}, null, 2), 'utf8');
          console.log(pc.green('✓'), `Created ${path.relative(root, captionsPath)}`);
        }

        console.log('\n' + pc.bold('Initialized appshot project!'));
        console.log(pc.dim('Next steps:'));
        console.log(pc.dim('  1. Add screenshots to screenshots/[device]/ folders'));
        console.log(pc.dim('  2. Run'), pc.cyan('appshot caption --device iphone'), pc.dim('to add captions'));
        console.log(pc.dim('  3. Run'), pc.cyan('appshot build'), pc.dim('to generate final screenshots'));
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}