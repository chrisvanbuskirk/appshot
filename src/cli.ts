import { Command } from 'commander';
import pc from 'picocolors';
import initCmd from './commands/init.js';
import captionCmd from './commands/caption.js';
import localizeCmd from './commands/localize.js';
import buildCmd from './commands/build.js';
import specsCmd from './commands/specs.js';
import checkCmd from './commands/check.js';
import doctorCmd from './commands/doctor.js';
import presetsCmd from './commands/presets.js';
import validateCmd from './commands/validate.js';
import styleCmd from './commands/style.js';
import gradientsCmd from './commands/gradients.js';
import fontsCmd from './commands/fonts.js';
import migrateCmd from './commands/migrate.js';
import { createCleanCommand } from './commands/clean.js';

const program = new Command();

program
  .name('appshot')
  .description('Generate App Store–ready screenshots with frames, gradients, and captions.')
  .version('0.5.1');

program.addCommand(initCmd());
program.addCommand(captionCmd());
program.addCommand(styleCmd());
program.addCommand(gradientsCmd());
program.addCommand(fontsCmd());
program.addCommand(localizeCmd());
program.addCommand(buildCmd());
program.addCommand(specsCmd());
program.addCommand(checkCmd());
program.addCommand(doctorCmd());
program.addCommand(presetsCmd());
program.addCommand(validateCmd());
program.addCommand(migrateCmd());
program.addCommand(createCleanCommand());

program.showHelpAfterError(pc.dim('\nUse --help for usage.'));

program.parseAsync().catch((err) => {
  console.error(pc.red('Error:'), err.message);
  process.exit(1);
});