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
  .description(`Generate App Store–ready screenshots with frames, gradients, and captions.

${pc.bold('Features:')}
  • Auto-detects portrait/landscape orientation
  • 8 embedded font families with italic & bold variants  
  • 24+ gradient presets with visual preview
  • AI-powered translation to 25+ languages
  • Smart caption wrapping and positioning
  • All official App Store resolutions
  • Parallel processing for large batches

${pc.bold('Quick Start:')}
  $ appshot init                    # Initialize project
  $ appshot caption --device iphone  # Add captions
  $ appshot build                    # Generate screenshots

${pc.bold('Common Workflows:')}
  $ appshot fonts --set "Poppins Italic"     # Set italic font
  $ appshot gradients select                  # Pick gradient
  $ appshot build --preset iphone-6-9,ipad-13 # App Store presets
  $ appshot localize --langs es,fr,de        # Batch translate

${pc.dim('Docs: https://github.com/chrisvanbuskirk/appshot')}`)
  .version('0.6.0')
  .addHelpText('after', `\n${pc.bold('Environment Variables:')}
  OPENAI_API_KEY              API key for translation features
  APPSHOT_DISABLE_FONT_SCAN   Skip system font detection (CI optimization)

${pc.bold('Configuration Files:')}
  .appshot/config.json        Main configuration
  .appshot/captions/*.json    Per-device captions
  .appshot/caption-history.json  Autocomplete history

${pc.dim('Run \'appshot <command> --help\' for command details.')}`);

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