import { Command } from 'commander';
import { platform } from 'os';
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
import backgroundsCmd from './commands/backgrounds.js';
import fontsCmd from './commands/fonts.js';
import migrateCmd from './commands/migrate.js';
import { createCleanCommand } from './commands/clean.js';
import frameCmd from './commands/frame.js';
import deviceCmd from './commands/device.js';
import watchCmd from './commands/watch.js';
import unwatchCmd from './commands/unwatch.js';
import watchStatusCmd from './commands/watch-status.js';

const program = new Command();

program
  .name('appshot')
  .description(`Generate App Store–ready screenshots with frames, backgrounds, and captions.

${pc.bold('Features:')}
  • Auto-detects portrait/landscape orientation
  • 8 embedded font families with italic & bold variants  
  • Custom background images or 24+ gradient presets
  • AI-powered translation to 25+ languages
  • Smart caption wrapping and positioning
  • All official App Store resolutions
  • File system watch mode for auto-processing
  • Device capture from simulators/physical devices (macOS)

${pc.bold('Quick Start:')}
  $ appshot init                    # Initialize project
  $ appshot caption --device iphone  # Add captions
  $ appshot frame screenshot.png     # Apply device frame only
  $ appshot build                    # Generate full screenshots

${pc.bold('Common Workflows:')}
  $ appshot fonts --set "Poppins Italic"     # Set italic font
  $ appshot gradients select                  # Pick gradient
  $ appshot backgrounds set iphone bg.jpg     # Set background image
  $ appshot frame ./screenshots --recursive   # Batch frame images
  $ appshot build --preset iphone-6-9,ipad-13 # App Store presets
  $ appshot localize --langs es,fr,de        # Batch translate${platform() === 'darwin' ? `
  $ appshot device capture                    # Capture from simulator/device (macOS)
  $ appshot watch start --process             # Auto-process new screenshots` : ''}

${pc.dim('Docs: https://github.com/chrisvanbuskirk/appshot')}`)
  .version('0.8.6')
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
program.addCommand(backgroundsCmd());
program.addCommand(fontsCmd());
program.addCommand(localizeCmd());
program.addCommand(buildCmd());
program.addCommand(frameCmd());

// Add device and watch commands only on macOS
if (platform() === 'darwin') {
  program.addCommand(deviceCmd());
  program.addCommand(watchCmd());
  program.addCommand(unwatchCmd());
  program.addCommand(watchStatusCmd());
}

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
