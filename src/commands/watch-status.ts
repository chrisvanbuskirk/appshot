import { Command } from 'commander';
import pc from 'picocolors';
import fs from 'fs/promises';
import { PIDManager } from '../utils/pid-manager.js';

export default function watchStatusCommand(): Command {
  return new Command('watch-status')
    .description('Check the status of the watch service')
    .option('--json', 'Output as JSON')
    .option('--verbose', 'Show detailed information')
    .action(async (options) => {
      try {
        const pidManager = new PIDManager('.appshot/watch.pid');
        const pid = await pidManager.readPID();

        // Basic status
        const status = {
          running: false,
          pid: null as number | null,
          pidFile: '.appshot/watch.pid',
          processedCache: false,
          cachedHashes: 0
        };

        if (pid) {
          status.pid = pid;
          status.running = await pidManager.isProcessRunning(pid);
        }

        // Check for processed cache
        try {
          const hashCacheFile = '.appshot/processed/hashes.json';
          const content = await fs.readFile(hashCacheFile, 'utf8');
          const hashes = JSON.parse(content) as string[];
          status.processedCache = true;
          status.cachedHashes = hashes.length;
        } catch {
          // Cache doesn't exist or is invalid
        }

        if (options.json) {
          console.log(JSON.stringify(status, null, 2));
          return;
        }

        // Human-readable output
        console.log(pc.bold('\n📊 Watch Service Status\n'));

        if (status.running) {
          console.log(pc.green('✅ Service is running'));
          console.log(pc.dim(`   PID: ${status.pid}`));
          console.log(pc.dim(`   PID file: ${status.pidFile}`));
        } else if (status.pid) {
          console.log(pc.yellow('⚠️  Service is not running'));
          console.log(pc.dim(`   Stale PID: ${status.pid}`));
          console.log(pc.dim('   Run "appshot watch stop" to clean up'));
        } else {
          console.log(pc.gray('⚪ Service is not running'));
          console.log(pc.dim('   Use "appshot watch start" to begin watching'));
        }

        if (options.verbose) {
          console.log(pc.bold('\n📁 Cache Information\n'));

          if (status.processedCache) {
            console.log(pc.dim(`   Processed hashes: ${status.cachedHashes}`));
            console.log(pc.dim('   Cache file: .appshot/processed/hashes.json'));
          } else {
            console.log(pc.dim('   No processing cache found'));
          }

          // Check for watch directories in config
          try {
            const configPath = '.appshot/config.json';
            const configContent = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configContent);

            if (config.watch) {
              console.log(pc.bold('\n⚙️  Watch Configuration\n'));

              if (config.watch.directories) {
                console.log(pc.dim('   Configured directories:'));
                for (const dir of config.watch.directories) {
                  const exists = await fs.stat(dir).then(() => true).catch(() => false);
                  const indicator = exists ? pc.green('✓') : pc.red('✗');
                  console.log(`     ${indicator} ${dir}`);
                }
              }

              if (config.watch.devices) {
                console.log(pc.dim('\n   Configured devices:'));
                for (const device of config.watch.devices) {
                  console.log(`     • ${device}`);
                }
              }

              if (config.watch.process !== undefined) {
                console.log(pc.dim(`\n   Auto-process: ${config.watch.process ? 'Yes' : 'No'}`));
                if (config.watch.frameOnly) {
                  console.log(pc.dim('   Mode: Frame only'));
                }
              }
            }
          } catch {
            // No config or invalid config
          }
        }

        // Quick actions
        console.log(pc.bold('\n🎯 Quick Actions\n'));

        if (status.running) {
          console.log(pc.dim('   appshot watch stop      - Stop the service'));
          console.log(pc.dim('   appshot watch status -v - Show detailed info'));
        } else {
          console.log(pc.dim('   appshot watch start     - Start watching'));
          console.log(pc.dim('   appshot watch setup     - Interactive setup'));
        }
      } catch (error) {
        console.error(pc.red('❌ Error checking status:'), error);
        process.exit(1);
      }
    });
}