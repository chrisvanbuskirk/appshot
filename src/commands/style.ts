import { Command } from 'commander';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { loadConfig } from '../core/files.js';
import { FontService } from '../services/fonts.js';
import type { AppshotConfig } from '../types.js';

export default function styleCmd() {
  const cmd = new Command('style')
    .description('Configure device positioning, frame options, and caption styling')
    .option('--device <name>', 'device name (iphone, ipad, mac, watch)')
    .option('--reset', 'reset device styling to defaults')
    .addHelpText('after', `
${pc.bold('Examples:')}
  ${pc.dim('# Interactive configuration for iPhone')}
  $ appshot style --device iphone
  
  ${pc.dim('# Reset device to default styling')}
  $ appshot style --device ipad --reset
  
  ${pc.dim('# Configure without specifying device (interactive)')}
  $ appshot style

${pc.bold('Configurable Options:')}
  ${pc.cyan('Frame Options:')}
  • Partial frame (cut off bottom portion)
  • Frame offset (15%, 25%, 35%, 50%, or custom)
  • Frame position (top, center, bottom, or 0-100)
  • Frame scale (0.5x to 2.0x)
  
  ${pc.cyan('Caption Options:')}
  • Caption font (with embedded fonts)
  • Caption size override
  • Caption position (above, below, or overlay)
  • Caption background (color, opacity, padding)
  • Caption border (color, width, corner radius)
  • Auto-sizing based on content
  • Maximum lines (1-10)
  • Line height (1.0-2.0)
  
${pc.bold('Special Handling:')}
  ${pc.cyan('Watch:')} Optimized caption positioning and text wrapping
  ${pc.cyan('iPad:')} Landscape-friendly caption scaling
  ${pc.cyan('Mac:')} Full-width caption support
  
${pc.bold('Output:')}
  Updates device configuration in ${pc.cyan('.appshot/config.json')}`)
    .action(async (opts) => {
      try {
        console.log(pc.bold('\n🎨 Device Style Configuration'));
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
        console.log(`  Caption font: ${config.caption.font}`);
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
        let captionFont: string | undefined;
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

          // Caption font
          const fontService = FontService.getInstance();
          const categories = await fontService.getFontCategories();

          // Create font choices
          const fontChoices: any[] = [];

          // Add current font
          fontChoices.push({
            name: `Current (${config.caption.font})`,
            value: config.caption.font
          });

          // Add separator
          fontChoices.push(new inquirer.Separator('── Recommended Fonts ──'));

          // Add recommended fonts
          for (const category of categories) {
            if (category.name === 'Recommended (Web-Safe)') {
              for (const font of category.fonts.slice(0, 8)) {
                fontChoices.push({
                  name: `${font.name} ${pc.green('●')}`,
                  value: font.name
                });
              }
              break;
            }
          }

          // Add separator
          fontChoices.push(new inquirer.Separator('── More Options ──'));

          // Add custom option
          fontChoices.push({
            name: 'Custom font...',
            value: 'custom'
          });

          // Add browse all fonts option
          fontChoices.push({
            name: 'Browse all fonts...',
            value: 'browse'
          });

          const fontAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'captionFont',
            message: 'Caption font:',
            choices: fontChoices,
            default: config.caption.font
          }]);

          if (fontAnswer.captionFont === 'custom') {
            const customFontAnswer = await inquirer.prompt([{
              type: 'input',
              name: 'font',
              message: 'Enter font name:',
              default: config.caption.font
            }]);
            captionFont = customFontAnswer.font;

            // Validate the font
            if (captionFont) {
              const isValid = await fontService.validateFont(captionFont);
              if (!isValid) {
                console.log(pc.yellow('⚠'), `Font "${captionFont}" may not be available on this system`);
                console.log(pc.dim('The font will be used but may fall back to a default font'));
              }
            }
          } else if (fontAnswer.captionFont === 'browse') {
            // Show all system fonts
            const systemFonts = await fontService.getSystemFonts();
            if (systemFonts.length > 0) {
              const browseFontAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'font',
                message: 'Select from system fonts:',
                choices: systemFonts.slice(0, 30).map(f => ({ name: f, value: f })),
                pageSize: 15
              }]);
              captionFont = browseFontAnswer.font;
            } else {
              console.log(pc.yellow('Could not detect system fonts'));
              captionFont = config.caption.font;
            }
          } else if (fontAnswer.captionFont !== config.caption.font) {
            captionFont = fontAnswer.captionFont;
          }

          // Caption position
          const posAnswer = await inquirer.prompt([{
            type: 'list',
            name: 'captionPosition',
            message: 'Caption position:',
            choices: [
              { name: 'Above device frame (default)', value: 'above' },
              { name: 'Below device frame', value: 'below' },
              { name: 'Overlay on gradient', value: 'overlay' },
              { name: 'Use global default', value: null }
            ],
            default: currentDevice.captionPosition || config.caption.position || 'above'
          }]);

          captionPosition = posAnswer.captionPosition || undefined;

          // Caption styling (background and border)
          const stylingAnswer = await inquirer.prompt([{
            type: 'confirm',
            name: 'customizeStyling',
            message: 'Add background or border styling to captions?',
            default: false
          }]);

          if (stylingAnswer.customizeStyling) {
            // Background configuration
            const backgroundAnswer = await inquirer.prompt([{
              type: 'confirm',
              name: 'addBackground',
              message: 'Add background behind caption text?',
              default: false
            }]);

            if (backgroundAnswer.addBackground) {
              const bgColorAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'color',
                message: 'Background color:',
                choices: [
                  { name: 'Black (semi-transparent)', value: '#000000' },
                  { name: 'White (semi-transparent)', value: '#FFFFFF' },
                  { name: 'Dark gray', value: '#333333' },
                  { name: 'Blue', value: '#007AFF' },
                  { name: 'Red', value: '#FF3B30' },
                  { name: 'Custom hex color...', value: 'custom' }
                ]
              }]);

              let bgColor = bgColorAnswer.color;
              if (bgColor === 'custom') {
                const customColorAnswer = await inquirer.prompt([{
                  type: 'input',
                  name: 'customColor',
                  message: 'Enter hex color (e.g., #FF5733):',
                  validate: (value) => /^#[0-9A-Fa-f]{6}$/.test(value) || 'Please enter a valid hex color (e.g., #FF5733)'
                }]);
                bgColor = customColorAnswer.customColor;
              }

              const bgOpacityAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'opacity',
                message: 'Background opacity:',
                choices: [
                  { name: '80% (recommended)', value: 0.8 },
                  { name: '60% (lighter)', value: 0.6 },
                  { name: '90% (darker)', value: 0.9 },
                  { name: '100% (solid)', value: 1.0 }
                ],
                default: 0.8
              }]);

              config.caption.background = {
                color: bgColor,
                opacity: bgOpacityAnswer.opacity,
                padding: 25
              };
            }

            // Side margin (applies to caption box width)
            const sideMarginAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'sideMargin',
              message: 'Caption side margin (px from edges, default 30):',
              default: (config.caption.background && (config.caption.background as any).sideMargin) || 30,
              validate: (v) => (v !== undefined && v >= 0 && v <= 100) || 'Enter a value between 0 and 100'
            }]);
            config.caption.background = {
              ...(config.caption.background || {}),
              sideMargin: sideMarginAnswer.sideMargin
            };

            // Border configuration
            const borderAnswer = await inquirer.prompt([{
              type: 'confirm',
              name: 'addBorder',
              message: 'Add border around caption?',
              default: false
            }]);

            let chosenRadius: number | undefined;
            if (borderAnswer.addBorder) {
              const borderColorAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'color',
                message: 'Border color:',
                choices: [
                  { name: 'White', value: '#FFFFFF' },
                  { name: 'Black', value: '#000000' },
                  { name: 'Gray', value: '#888888' },
                  { name: 'Blue', value: '#007AFF' },
                  { name: 'Custom hex color...', value: 'custom' }
                ]
              }]);

              let borderColor = borderColorAnswer.color;
              if (borderColor === 'custom') {
                const customBorderColorAnswer = await inquirer.prompt([{
                  type: 'input',
                  name: 'customColor',
                  message: 'Enter hex color (e.g., #FFFFFF):',
                  validate: (value) => /^#[0-9A-Fa-f]{6}$/.test(value) || 'Please enter a valid hex color (e.g., #FFFFFF)'
                }]);
                borderColor = customBorderColorAnswer.customColor;
              }

              const borderWidthAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'width',
                message: 'Border thickness:',
                choices: [
                  { name: 'Thin (2px)', value: 2 },
                  { name: 'Medium (3px)', value: 3 },
                  { name: 'Thick (4px)', value: 4 },
                  { name: 'Extra thick (6px)', value: 6 }
                ],
                default: 3
              }]);

              const borderRadiusAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'radius',
                message: 'Corner rounding:',
                choices: [
                  { name: 'Square (0)', value: 0 },
                  { name: 'Slightly rounded (8px)', value: 8 },
                  { name: 'Rounded (12px)', value: 12 },
                  { name: 'Very rounded (20px)', value: 20 }
                ],
                default: 12
              }]);
              chosenRadius = borderRadiusAnswer.radius;

              config.caption.border = {
                color: borderColor,
                width: borderWidthAnswer.width,
                radius: borderRadiusAnswer.radius
              };
            }

            // Even if border is not enabled, allow setting corner radius for background rounding
            if (!borderAnswer.addBorder) {
              const radiusOnlyAnswer = await inquirer.prompt([{
                type: 'list',
                name: 'radius',
                message: 'Caption corner radius (applies to background even without border):',
                choices: [
                  { name: 'Default (12px)', value: 12 },
                  { name: 'Square (0)', value: 0 },
                  { name: 'Slightly rounded (8px)', value: 8 },
                  { name: 'Very rounded (20px)', value: 20 },
                  { name: 'Custom...', value: 'custom' }
                ],
                default: 12
              }]);

              if (radiusOnlyAnswer.radius === 'custom') {
                const customRadius = await inquirer.prompt([{
                  type: 'number',
                  name: 'value',
                  message: 'Enter radius in pixels (0-30):',
                  default: 12,
                  validate: (v) => (v !== undefined && v >= 0 && v <= 30) || 'Enter a value between 0 and 30'
                }]);
                chosenRadius = customRadius.value;
              } else {
                chosenRadius = radiusOnlyAnswer.radius as number;
              }

              // Store radius in border config even without color/width so renderer can use it for background
              if (typeof chosenRadius === 'number') {
                config.caption.border = {
                  ...(config.caption.border || {}),
                  radius: chosenRadius
                };
              }
            }
          }

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

            // Vertical alignment
            const valignAnswer = await inquirer.prompt([{
              type: 'list',
              name: 'verticalAlign',
              message: 'Vertical alignment within caption area:',
              choices: [
                { name: 'Center', value: 'center' },
                { name: 'Top', value: 'top' }
              ],
              default: (config.caption.box && (config.caption.box as any).verticalAlign) || 'center'
            }]);
            captionBox.verticalAlign = valignAnswer.verticalAlign;

            // Max lines
            const maxLinesAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'maxLines',
              message: 'Maximum number of caption lines:',
              default: 3,
              validate: (value) => (value !== undefined && value >= 1 && value <= 10) || 'Please enter 1-10 lines'
            }]);
            captionBox.maxLines = maxLinesAnswer.maxLines;

            // Min/Max height (only applies when auto-size is OFF)
            if (!autoSizeAnswer.autoSize) {
              const minHeightAnswer = await inquirer.prompt([{
                type: 'number',
                name: 'minHeight',
                message: 'Minimum caption height (px):',
                default: (config.caption.box && (config.caption.box as any).minHeight) || 100,
                validate: (v) => (v !== undefined && v >= 0 && v <= 4000) || 'Enter a value between 0 and 4000'
              }]);
              captionBox.minHeight = minHeightAnswer.minHeight;

              const maxHeightAnswer = await inquirer.prompt([{
                type: 'number',
                name: 'maxHeight',
                message: 'Maximum caption height (px):',
                default: (config.caption.box && (config.caption.box as any).maxHeight) || 500,
                validate: (v) => (v !== undefined && v >= 0 && v <= 8000) || 'Enter a value between 0 and 8000'
              }]);
              captionBox.maxHeight = maxHeightAnswer.maxHeight;
            }

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

            // Outer margins
            const marginTopAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'marginTop',
              message: 'Outer margin above caption (px):',
              default: (config.caption.box && (config.caption.box as any).marginTop) || 0,
              validate: (v) => (v !== undefined && v >= 0 && v <= 400) || 'Enter a value between 0 and 400'
            }]);
            captionBox.marginTop = marginTopAnswer.marginTop;

            const marginBottomAnswer = await inquirer.prompt([{
              type: 'number',
              name: 'marginBottom',
              message: 'Outer margin below device/caption (px):',
              default: (config.caption.box && (config.caption.box as any).marginBottom) || 0,
              validate: (v) => (v !== undefined && v >= 0 && v <= 400) || 'Enter a value between 0 and 400'
            }]);
            captionBox.marginBottom = marginBottomAnswer.marginBottom;
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

        // Save font to global config (fonts apply globally, not per-device)
        if (captionFont && captionFont !== config.caption.font) {
          config.caption.font = captionFont;
        }

        // Save configuration
        await saveConfig(config);

        // Success message
        console.log('\n' + pc.green('✓'), 'Device styling updated!');
        console.log(pc.dim('Run "appshot build" to generate screenshots with new styling'));

        // Show what changed
        if (!autoFrameAnswer.autoFrame || framePosition !== 'center' || frameScale || captionSize || captionFont || captionPosition || currentDevice.partialFrame) {
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
          if (captionFont) {
            console.log(`  • Caption font: ${captionFont}`);
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
