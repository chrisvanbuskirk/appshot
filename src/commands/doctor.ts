import { Command } from 'commander';
import pc from 'picocolors';
import { DoctorService } from '../services/doctor.js';

export default function doctorCmd() {
  return new Command('doctor')
    .description('Run diagnostics to check system requirements and dependencies')
    .option('--json', 'output results as JSON')
    .option('--verbose', 'show detailed diagnostic information')
    .option('--category <categories>', 'run specific checks (comma-separated: system,dependencies,fonts,filesystem,frames)')
    .action(async (opts) => {
      try {
        const doctor = new DoctorService();
        const categories = opts.category?.split(',').map((c: string) => c.trim());

        if (!opts.json) {
          console.log(pc.bold('\n🏥 Appshot Doctor - System Diagnostics\n'));
        }

        const report = await doctor.runAllChecks(categories);

        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
          return;
        }

        // Format and display results
        const categoryNames: Record<string, string> = {
          system: 'System Requirements',
          dependencies: 'Dependencies',
          fonts: 'Font System',
          filesystem: 'File System',
          frames: 'Frame Assets'
        };

        for (const [category, checks] of Object.entries(report.checks)) {
          console.log(pc.cyan(`${categoryNames[category] || category}:`));

          for (const check of checks) {
            const icon = check.status === 'pass' ? pc.green('✓')
              : check.status === 'warning' ? pc.yellow('⚠')
                : pc.red('✗');

            console.log(`  ${icon} ${check.message}`);

            if (opts.verbose && check.details) {
              console.log(pc.dim(`    Details: ${check.details}`));
            }
          }
          console.log();
        }

        // Display summary
        const { passed, warnings, errors } = report.summary;
        console.log(pc.bold('Summary: ') +
          pc.green(`${passed} passed`) + ', ' +
          pc.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`) + ', ' +
          pc.red(`${errors} error${errors !== 1 ? 's' : ''}`));

        // Display suggestions if any
        if (report.suggestions.length > 0) {
          console.log('\n' + pc.cyan('Suggestions:'));
          for (const suggestion of report.suggestions) {
            console.log(`  • ${suggestion}`);
          }
        }

        // Exit with error code if there are errors
        if (errors > 0) {
          process.exit(1);
        }
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}