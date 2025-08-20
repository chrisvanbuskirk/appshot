import { Command } from 'commander';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { loadConfig } from '../core/files.js';
import type { AppshotConfig } from '../types.js';

export default function styleCmd() {
  const cmd = new Command('style')
    .description('Configure device positioning and caption styling')
    .option('--device <name>', 'device name (iphone, ipad, mac, watch)')
    .option('--reset', 'reset device styling to defaults')
    .action(async (opts) => {
      try {
        console.log(pc.bold('Device Style Configuration'));
        console.log(pc.dim('Configure how devices appear in screenshots\n'));

        // Load current configuration
        const config = await loadConfig();

        // Get device to configure
        let device = opts.device;
        if (!device) {
          const deviceAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'device',
            message: 'Which device would you like to style?',
            choices: Object.keys(config.devices)
          }]);
          device = deviceAnswer.device;
        }

        if (!config.devices[device]) {
          console.error(pc.red(`Device "${device}" not found in configuration`));
          process.exit(1);
        }

        const currentDevice = config.devices[device];

        // Reset option
        if (opts.reset) {
          delete currentDevice.framePosition;
          delete currentDevice.frameScale;
          delete currentDevice.captionSize;
          delete currentDevice.captionPosition;
          await saveConfig(config);
          console.log(pc.green('✓'), `Reset styling for ${device}`);
          return;
        }

        // Show current settings
        console.log(pc.cyan('Current settings:'));
        console.log(`  Auto frame selection: ${currentDevice.autoFrame !== false ? 'Enabled' : 'Disabled'}`);
        console.log(`  Frame position: ${formatFramePosition(currentDevice.framePosition)}`);
        console.log(`  Frame scale: ${currentDevice.frameScale ? `${currentDevice.frameScale * 100}%` : 'Auto'}`);
        console.log(`  Partial frame: ${currentDevice.partialFrame ? `Yes (${currentDevice.frameOffset || 25}% cut)` : 'No'}`);
        console.log(`  Caption size: ${currentDevice.captionSize || 'Default'}`);
        console.log(`  Caption position: ${currentDevice.captionPosition || 'Default'}\n`);

        // Auto frame selection first
        const autoFrameAnswer = await inquirer.prompt([{
          type: 'confirm',
          name: 'autoFrame',
          message: 'Enable automatic frame selection based on screenshot dimensions?',
          default: currentDevice.autoFrame !== false
        }]);

        // If auto frame is disabled, let user select a specific frame
        let preferredFrame: string | undefined;
        if (!autoFrameAnswer.autoFrame) {
          // Import frame registry to show available options
          const { frameRegistry } = await import('../core/devices.js');

          // Filter frames for current device type
          const deviceFrames = frameRegistry.filter(f => {
            const frameName = f.name.toLowerCase();
            if (device === 'iphone') return frameName.includes('iphone');
            if (device === 'ipad') return frameName.includes('ipad');
            if (device === 'mac') return frameName.includes('mac') || frameName.includes('imac');
            if (device === 'watch') return frameName.includes('watch');
            return false;
          });

          // Create choices from available frames
          const frameChoices = deviceFrames.map(f => ({
            name: `${f.displayName || f.name} (${f.orientation})`,
            value: f.name
          }));

          if (frameChoices.length === 0) {
            console.error(pc.red(`No frames available for device "${device}"`));
            process.exit(1);
          }

          const frameChoiceAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'preferredFrame',
            message: 'Select preferred frame:',
            choices: frameChoices,
            default: currentDevice.preferredFrame || frameChoices[0].value
          }]);
          preferredFrame = frameChoiceAnswer.preferredFrame;
        }

        // Partial frame settings
        const partialAnswer = await inquirer.prompt([{
          type: 'confirm',
          name: 'partialFrame',
          message: 'Use partial frame (cut off bottom portion)?',
          default: currentDevice.partialFrame || false
        }]);

        let frameOffset = currentDevice.frameOffset;
        if (partialAnswer.partialFrame) {
          const offsetAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'frameOffset',
            message: 'How much to cut off from the bottom?',
            choices: [
              { name: 'Subtle (15%)', value: 15 },
              { name: 'Standard (25%)', value: 25 },
              { name: 'Dramatic (35%)', value: 35 },
              { name: 'Half (50%)', value: 50 },
              { name: 'Custom...', value: 'custom' }
            ],
            default: currentDevice.frameOffset || 25
          }]);

          if (offsetAnswer.frameOffset === 'custom') {
            const customOffsetAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'offset',
              message: 'Enter percentage to cut off (10-50):',
              default: 25,
              validate: (value) => (value !== undefined && value >= 10 && value <= 50) || 'Please enter a value between 10 and 50'
            }]);
            frameOffset = customOffsetAnswer.offset;
          } else {
            frameOffset = offsetAnswer.frameOffset;
          }
        }

        // Frame positioning
        const positionAnswer = await inquirer.prompt([{
          type: 'list',
          name: 'framePosition',
          message: 'How should the device frame be positioned vertically?',
          choices: [
            { name: 'Centered (default)', value: 'center' },
            { name: 'Top aligned', value: 'top' },
            { name: 'Bottom aligned', value: 'bottom' },
            { name: 'Custom offset...', value: 'custom' }
          ],
          default: currentDevice.framePosition || 'center'
        }]);

        let framePosition = positionAnswer.framePosition;
        if (framePosition === 'custom') {
          const offsetAnswer = await inquirer.prompt([{
            type: 'number',
            name: 'offset',
            message: 'Enter vertical position (0=top, 50=center, 100=bottom):',
            default: 50,
            validate: (value) => (value !== undefined && value >= 0 && value <= 100) || 'Please enter a value between 0 and 100'
          }]);
          framePosition = offsetAnswer.offset;
        }

        // Frame scaling
        const scaleAnswer = await inquirer.prompt([{
          type: 'list',
          name: 'frameScale',
          message: 'How large should the device appear?',
          choices: [
            { name: 'Small (75%)', value: 0.75 },
            { name: 'Medium (90% - default)', value: 0.9 },
            { name: 'Large (110%)', value: 1.1 },
            { name: 'Extra Large (130%)', value: 1.3 },
            { name: 'Custom...', value: 'custom' },
            { name: 'Auto (based on device)', value: null }
          ],
          default: currentDevice.frameScale || 0.9
        }]);

        let frameScale = scaleAnswer.frameScale;
        if (frameScale === 'custom') {
          const customScaleAnswer = await inquirer.prompt([{
            type: 'number',
            name: 'scale',
            message: 'Enter scale percentage (50-200):',
            default: 100,
            validate: (value) => (value !== undefined && value >= 50 && value <= 200) || 'Please enter a value between 50 and 200'
          }]);
          frameScale = customScaleAnswer.scale / 100;
        }

        // Caption customization
        const captionAnswer = await inquirer.prompt([{
          type: 'confirm',
          name: 'customizeCaption',
          message: 'Customize caption settings for this device?',
          default: false
        }]);

        let captionSize: number | undefined;
        let captionPosition: 'above' | 'overlay' | undefined;
        let captionBox: any = undefined;

        if (captionAnswer.customizeCaption) {
          // Caption size
          const sizeAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'captionSize',
            message: 'Caption text size:',
            choices: [
              { name: 'Small (36px)', value: 36 },
              { name: 'Medium (48px)', value: 48 },
              { name: 'Large (64px - default)', value: 64 },
              { name: 'Extra Large (80px)', value: 80 },
              { name: 'Custom...', value: 'custom' },
              { name: 'Use global default', value: null }
            ],
            default: currentDevice.captionSize || config.caption.fontsize
          }]);

          const sizeChoice = sizeAnswer.captionSize;
          if (sizeChoice === 'custom') {
            const customSizeAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'size',
              message: 'Enter font size in pixels:',
              default: 64,
              validate: (value) => (value !== undefined && value >= 12 && value <= 120) || 'Please enter a value between 12 and 120'
            }]);
            captionSize = customSizeAnswer.size;
          } else if (sizeChoice !== null) {
            captionSize = sizeChoice;
          }

          // Caption position
          const posAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'captionPosition',
            message: 'Caption position:',
            choices: [
              { name: 'Above device frame (default)', value: 'above' },
              { name: 'Overlay on gradient', value: 'overlay' },
              { name: 'Use global default', value: null }
            ],
            default: currentDevice.captionPosition || config.caption.position || 'above'
          }]);

          captionPosition = posAnswer.captionPosition || undefined;

          // Caption box settings
          const boxAnswer = await inquirer.prompt([{
            type: 'confirm',
            name: 'customizeBox',
            message: 'Configure caption box behavior (auto-sizing, max lines)?',
            default: false
          }]);

          if (boxAnswer.customizeBox) {
            captionBox = {};

            // Auto-size
            const autoSizeAnswer = await inquirer.prompt([{
              type: 'confirm',
              name: 'autoSize',
              message: 'Auto-size caption box based on content?',
              default: true
            }]);
            captionBox.autoSize = autoSizeAnswer.autoSize;

            // Max lines
            const maxLinesAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'maxLines',
              message: 'Maximum number of caption lines:',
              default: 3,
              validate: (value) => (value !== undefined && value >= 1 && value <= 10) || 'Please enter 1-10 lines'
            }]);
            captionBox.maxLines = maxLinesAnswer.maxLines;

            // Line height
            const lineHeightAnswer = await inquirer.prompt([{
              type: 'list',
              name: 'lineHeight',
              message: 'Line spacing:',
              choices: [
                { name: 'Compact (1.2)', value: 1.2 },
                { name: 'Normal (1.4)', value: 1.4 },
                { name: 'Relaxed (1.6)', value: 1.6 },
                { name: 'Loose (1.8)', value: 1.8 }
              ],
              default: 1.4
            }]);
            captionBox.lineHeight = lineHeightAnswer.lineHeight;
          }
        }

        // Update configuration
        // Auto frame settings
        if (autoFrameAnswer.autoFrame) {
          currentDevice.autoFrame = true;
          delete currentDevice.preferredFrame; // Remove preferred frame if auto is enabled
        } else {
          currentDevice.autoFrame = false;
          currentDevice.preferredFrame = preferredFrame;
        }

        // Partial frame settings
        if (partialAnswer.partialFrame) {
          currentDevice.partialFrame = true;
          currentDevice.frameOffset = frameOffset;
        } else {
          delete currentDevice.partialFrame;
          delete currentDevice.frameOffset;
        }

        if (framePosition !== 'center') {
          currentDevice.framePosition = framePosition;
        } else {
          delete currentDevice.framePosition;
        }

        if (frameScale !== null && frameScale !== 0.9) {
          currentDevice.frameScale = frameScale;
        } else {
          delete currentDevice.frameScale;
        }

        if (captionSize && captionSize !== config.caption.fontsize) {
          currentDevice.captionSize = captionSize;
        } else {
          delete currentDevice.captionSize;
        }

        if (captionPosition && captionPosition !== (config.caption.position || 'above')) {
          currentDevice.captionPosition = captionPosition;
        } else {
          delete currentDevice.captionPosition;
        }

        if (captionBox && Object.keys(captionBox).length > 0) {
          currentDevice.captionBox = captionBox;
        } else {
          delete currentDevice.captionBox;
        }

        // Save configuration
        await saveConfig(config);

        // Success message
        console.log('\n' + pc.green('✓'), 'Device styling updated!');
        console.log(pc.dim('Run "appshot build" to generate screenshots with new styling'));

        // Show what changed
        if (!autoFrameAnswer.autoFrame || framePosition !== 'center' || frameScale || captionSize || captionPosition || currentDevice.partialFrame) {
          console.log('\n' + pc.cyan('Applied settings:'));
          if (!autoFrameAnswer.autoFrame) {
            console.log(`  • Auto frame: Disabled (using ${preferredFrame})`);
          }
          if (framePosition !== 'center') {
            console.log(`  • Frame position: ${formatFramePosition(framePosition)}`);
          }
          if (frameScale) {
            console.log(`  • Frame scale: ${frameScale * 100}%`);
          }
          if (currentDevice.partialFrame) {
            console.log(`  • Partial frame: Yes (${currentDevice.frameOffset}% cut)`);
          }
          if (captionSize) {
            console.log(`  • Caption size: ${captionSize}px`);
          }
          if (captionPosition) {
            console.log(`  • Caption position: ${captionPosition}`);
          }
        }

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

function formatFramePosition(position: any): string {
  if (position === undefined || position === 'center') return 'Centered';
  if (position === 'top') return 'Top aligned';
  if (position === 'bottom') return 'Bottom aligned';
  if (typeof position === 'number') return `${position}% from top`;
  return String(position);
}

async function saveConfig(config: AppshotConfig): Promise<void> {
  const configPath = path.join(process.cwd(), '.appshot', 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}