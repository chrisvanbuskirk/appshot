import { Command } from 'commander';
import pc from 'picocolors';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import { FontService } from '../services/fonts.js';
import { loadConfig } from '../core/files.js';
import type { AppshotConfig } from '../types.js';

/**
 * Save configuration to .appshot/config.json
 */
async function saveConfig(config: AppshotConfig): Promise<void> {
  const configPath = path.join(process.cwd(), '.appshot', 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export default function fontsCmd(): Command {
  const cmd = new Command('fonts')
    .description('Browse, validate, and configure fonts for captions')
    .option('--all', 'Show all system fonts')
    .option('--embedded', 'Show embedded fonts bundled with appshot')
    .option('--recommended', 'Show only recommended fonts')
    .option('--json', 'Output as JSON')
    .option('--validate <font>', 'Check if a font is available')
    .option('--set <font>', 'Set the caption font')
    .option('--select', 'Interactive font selection')
    .option('--device <name>', 'Set font for specific device (use with --set or --select)')
    .addHelpText('after', `
${pc.bold('Examples:')}
  ${pc.dim('# Browse recommended fonts')}
  $ appshot fonts
  
  ${pc.dim('# Show embedded fonts with variants')}
  $ appshot fonts --embedded
  
  ${pc.dim('# Set italic font variant')}
  $ appshot fonts --set "Poppins Italic"
  
  ${pc.dim('# Set bold variant for specific device')}
  $ appshot fonts --set "Montserrat Bold" --device iphone
  
  ${pc.dim('# Interactive font selection')}
  $ appshot fonts --select
  
  ${pc.dim('# Validate font availability')}
  $ appshot fonts --validate "Inter"
  
  ${pc.dim('# Export font list as JSON')}
  $ appshot fonts --embedded --json > fonts.json

${pc.bold('Embedded Fonts (8 families, 20+ variants):')}
  • ${pc.cyan('Modern UI:')} Inter, Poppins, Montserrat, DM Sans
  • ${pc.cyan('Popular:')} Roboto, Open Sans, Lato, Work Sans
  • ${pc.cyan('Variants:')} Regular, Italic, Bold, Bold Italic
  
${pc.bold('Font Variants:')}
  Simply append the variant to the font name:
  • "Poppins" → Regular weight
  • "Poppins Italic" → Italic style
  • "Poppins Bold" → Bold weight
  • "Poppins Bold Italic" → Bold + Italic
  
${pc.dim('All embedded fonts use OFL or Apache 2.0 licenses.')}
${pc.dim('Embedded fonts work consistently across all platforms.')}`)
    .action(async (options) => {
      const fontService = FontService.getInstance();

      // Set font mode
      if (options.set) {
        await handleSetFont(options.set, options.device, fontService);
        return;
      }

      // Interactive selection mode
      if (options.select) {
        await handleSelectFont(options.device, fontService);
        return;
      }

      // Validate a specific font
      if (options.validate) {
        const fontStatus = await fontService.getFontStatusWithEmbedded(options.validate);
        if (options.json) {
          console.log(JSON.stringify(fontStatus));
        } else {
          if (fontStatus.embedded) {
            console.log(pc.green(`✓ Font "${options.validate}" is embedded in appshot`));
            console.log(pc.dim(`  Path: ${fontStatus.path}`));
          } else if (fontStatus.installed) {
            console.log(pc.green(`✓ Font "${options.validate}" is installed and available`));
          } else {
            console.log(pc.red(`✗ Font "${options.validate}" is NOT installed on your system`));
            console.log(pc.yellow(`⚠ If used, will fall back to: ${fontStatus.fallback}`));
            if (fontStatus.warning) {
              console.log(pc.dim(fontStatus.warning));
            }
          }
        }
        return;
      }

      // Show embedded fonts
      if (options.embedded) {
        const embeddedFonts = await fontService.getEmbeddedFonts();

        if (options.json) {
          console.log(JSON.stringify(embeddedFonts, null, 2));
          return;
        }

        console.log(pc.bold('\n📦 Embedded Fonts (Bundled with Appshot)\n'));

        if (embeddedFonts.length === 0) {
          console.log(pc.yellow('No embedded fonts found'));
          console.log(pc.dim('Embedded fonts may not be available in development mode'));
          return;
        }

        for (const font of embeddedFonts) {
          console.log(pc.green(`✓ ${font.name}`) + pc.dim(' - Always available'));
        }

        console.log();
        console.log(pc.dim('These fonts are included with appshot and always available'));
        console.log(pc.dim('They provide consistent rendering across all platforms'));
        return;
      }

      // Show only recommended fonts
      if (options.recommended) {
        const recommended = await fontService.getRecommendedFonts();

        if (options.json) {
          console.log(JSON.stringify(recommended, null, 2));
          return;
        }

        console.log(pc.bold('\n📝 Recommended Fonts for Captions\n'));

        // Group by category and installation status
        const webSafeInstalled = recommended.filter(f => f.category === 'web-safe' && f.installed);
        const webSafeNotInstalled = recommended.filter(f => f.category === 'web-safe' && !f.installed);
        const popularInstalled = recommended.filter(f => f.category === 'recommended' && f.installed);
        const popularNotInstalled = recommended.filter(f => f.category === 'recommended' && !f.installed);
        const systemInstalled = recommended.filter(f => f.category === 'system' && f.installed);
        const embeddedFonts = await fontService.getEmbeddedFonts();

        if (embeddedFonts.length > 0) {
          console.log(pc.cyan('Embedded Fonts (always available):'));
          for (const font of embeddedFonts) {
            console.log(pc.green(`  ✓ ${font.name}`) + pc.dim(' [embedded]'));
          }
          console.log();
        }

        if (webSafeInstalled.length > 0) {
          console.log(pc.cyan('Web-Safe Fonts (installed):'));
          for (const font of webSafeInstalled) {
            console.log(pc.green(`  ✓ ${font.name}`));
          }
          console.log();
        }

        if (webSafeNotInstalled.length > 0) {
          console.log(pc.cyan('Web-Safe Fonts (not installed):'));
          for (const font of webSafeNotInstalled) {
            console.log(pc.yellow(`  ⚠ ${font.name}`) + pc.dim(` → ${font.fallback}`));
          }
          console.log();
        }

        if (popularInstalled.length > 0) {
          console.log(pc.cyan('Popular Fonts (installed):'));
          for (const font of popularInstalled) {
            console.log(pc.green(`  ✓ ${font.name}`));
          }
          console.log();
        }

        if (popularNotInstalled.length > 0) {
          console.log(pc.cyan('Popular Fonts (not installed - will use fallback):'));
          for (const font of popularNotInstalled) {
            console.log(pc.yellow(`  ⚠ ${font.name}`) + pc.dim(` → ${font.fallback}`));
          }
          console.log();
        }

        if (systemInstalled.length > 0) {
          console.log(pc.cyan('System Fonts (installed):'));
          for (const font of systemInstalled) {
            console.log(pc.green(`  ✓ ${font.name}`));
          }
          console.log();
        }

        console.log(pc.dim('✓ = Installed and will render correctly'));
        console.log(pc.dim('⚠ = Not installed, will use fallback font shown'));
        return;
      }

      // Show all fonts or categorized view
      if (options.all) {
        console.log(pc.bold('\n🔍 Detecting system fonts...\n'));

        const systemFonts = await fontService.getSystemFonts();

        if (options.json) {
          console.log(JSON.stringify(systemFonts, null, 2));
          return;
        }

        if (systemFonts.length === 0) {
          console.log(pc.yellow('Could not detect system fonts on this platform'));
          console.log(pc.dim('Use --recommended to see web-safe fonts that work everywhere'));
          return;
        }

        console.log(pc.cyan(`Found ${systemFonts.length} system fonts:\n`));

        // Display in columns for better readability
        const columns = 3;
        const columnWidth = 30;

        for (let i = 0; i < systemFonts.length; i += columns) {
          let row = '';
          for (let j = 0; j < columns && i + j < systemFonts.length; j++) {
            const font = systemFonts[i + j];
            row += font.padEnd(columnWidth);
          }
          console.log(row);
        }

        console.log();
        console.log(pc.dim('Note: Not all system fonts may render correctly in SVG'));
        console.log(pc.dim('Use --recommended for fonts that are guaranteed to work'));
      } else {
        // Default: Show categorized view
        const categories = await fontService.getFontCategories();

        if (options.json) {
          console.log(JSON.stringify(categories, null, 2));
          return;
        }

        console.log(pc.bold('\n🎨 Available Fonts for Captions\n'));

        for (const category of categories) {
          console.log(pc.cyan(`${category.name}:`));

          const fonts = category.fonts.slice(0, 15); // Limit display
          for (const font of fonts) {
            const marker = font.category === 'web-safe' ? pc.green('●') :
              font.category === 'recommended' ? pc.blue('●') :
                pc.gray('●');
            console.log(`  ${marker} ${font.name || font}`);
          }

          if (category.fonts.length > 15) {
            console.log(pc.dim(`  ... and ${category.fonts.length - 15} more`));
          }
          console.log();
        }

        console.log(pc.dim('Legend:'));
        console.log(`  ${pc.green('●')} Web-safe (works everywhere)`);
        console.log(`  ${pc.blue('●')} Popular (widely supported)`);
        console.log(`  ${pc.gray('●')} System (platform-specific)`);
        console.log();
        console.log(pc.dim('Tips:'));
        console.log(pc.dim('• Use --set "Font Name" to set caption font directly'));
        console.log(pc.dim('• Use --select for interactive font selection'));
        console.log(pc.dim('• Use --device <name> to set device-specific fonts'));
        console.log(pc.dim('• Use --validate "Font Name" to check availability'));
        console.log(pc.dim('• Or use "appshot style" for full configuration'));
      }
    });

  return cmd;
}

/**
 * Handle --set option: set font directly
 */
async function handleSetFont(fontName: string, deviceName: string | undefined, fontService: FontService): Promise<void> {
  try {
    // Get detailed font status
    const fontStatus = await fontService.getFontStatusWithEmbedded(fontName);

    if (fontStatus.embedded) {
      console.log(pc.green(`✓ Font "${fontName}" is embedded and always available`));
    } else if (!fontStatus.installed) {
      console.error(pc.red(`✗ Font "${fontName}" is not installed on your system`));
      console.log(pc.yellow(`⚠ Fallback will be used: ${fontStatus.fallback}`));
      console.log();

      // Ask if they want to continue anyway
      const answer = await inquirer.prompt([{
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to set this font anyway? (It will use the fallback)',
        default: false
      }]);

      if (!answer.continue) {
        console.log(pc.dim('Font not changed'));
        return;
      }

      console.log(pc.yellow('⚠ Warning: Setting font that will use fallback'));
    }

    // Load current config
    const config = await loadConfig();

    if (deviceName) {
      // Set device-specific font
      if (!config.devices[deviceName]) {
        console.error(pc.red(`Device "${deviceName}" not found in configuration`));
        console.log(pc.dim('Available devices: ' + Object.keys(config.devices).join(', ')));
        process.exit(1);
      }

      // Set device-specific font
      config.devices[deviceName].captionFont = fontName;
    } else {
      // Set global font
      config.caption.font = fontName;
    }

    // Save config
    await saveConfig(config);

    if (deviceName) {
      console.log(pc.green('✓'), `Set font to "${fontName}" for device: ${deviceName}`);
    } else {
      console.log(pc.green('✓'), `Set caption font to "${fontName}"`);
    }

  } catch (error) {
    console.error(pc.red('Error setting font:'), error);
    process.exit(1);
  }
}

/**
 * Handle --select option: interactive font selection
 */
async function handleSelectFont(deviceName: string | undefined, fontService: FontService): Promise<void> {
  try {
    // Load current config to show current font
    const config = await loadConfig();
    let currentFont = config.caption.font;
    let isDeviceSpecific = false;

    console.log(pc.bold('\n🎨 Font Selection\n'));

    if (deviceName) {
      if (!config.devices[deviceName]) {
        console.error(pc.red(`Device "${deviceName}" not found in configuration`));
        console.log(pc.dim('Available devices: ' + Object.keys(config.devices).join(', ')));
        process.exit(1);
      }
      console.log(pc.dim(`Configuring font for device: ${deviceName}`));

      // Check if device has specific font, otherwise use global
      if (config.devices[deviceName].captionFont) {
        currentFont = config.devices[deviceName].captionFont;
        isDeviceSpecific = true;
      }
    }

    const fontSource = isDeviceSpecific ? `${deviceName} device` : 'global';
    console.log(pc.dim(`Current font: ${currentFont} (${fontSource})\n`));

    // Get font categories for selection
    const categories = await fontService.getFontCategories();
    const recommended = await fontService.getRecommendedFonts();
    const embeddedFonts = await fontService.getEmbeddedFonts();

    // Build selection choices
    const choices: any[] = [];

    // Add current font at the top
    const currentFontStatus = await fontService.getFontStatusWithEmbedded(currentFont);
    const currentStatus = currentFontStatus.installed ? pc.green('✓') : pc.yellow('⚠');
    choices.push({
      name: `${currentStatus} Keep current: ${currentFont}`,
      value: currentFont
    });
    choices.push(new inquirer.Separator());

    // Embedded fonts (always available)
    if (embeddedFonts.length > 0) {
      choices.push(new inquirer.Separator(pc.magenta('── Embedded Fonts (Always Available) ──')));
      for (const font of embeddedFonts) {
        const marker = font.name === currentFont ? pc.cyan('● ') : '  ';
        choices.push({ name: `${marker}${pc.green('✓')} ${font.name} ${pc.dim('[embedded]')}`, value: font.name });
      }
    }

    // Web-Safe fonts (installed)
    const webSafeInstalled = recommended.filter(f => f.category === 'web-safe' && f.installed);
    if (webSafeInstalled.length > 0) {
      choices.push(new inquirer.Separator(pc.green('── Installed Web-Safe Fonts ──')));
      for (const font of webSafeInstalled) {
        const marker = font.name === currentFont ? pc.cyan('● ') : '  ';
        choices.push({ name: `${marker}${pc.green('✓')} ${font.name}`, value: font.name });
      }
    }

    // Popular fonts (separate installed and not installed)
    const popularInstalled = recommended.filter(f => f.category === 'recommended' && f.installed);
    const popularNotInstalled = recommended.filter(f => f.category === 'recommended' && !f.installed);

    if (popularInstalled.length > 0) {
      choices.push(new inquirer.Separator(pc.blue('── Installed Popular Fonts ──')));
      for (const font of popularInstalled) {
        const marker = font.name === currentFont ? pc.cyan('● ') : '  ';
        choices.push({ name: `${marker}${pc.green('✓')} ${font.name}`, value: font.name });
      }
    }

    if (popularNotInstalled.length > 0) {
      choices.push(new inquirer.Separator(pc.yellow('── Popular Fonts (Not Installed - Will Use Fallback) ──')));
      for (const font of popularNotInstalled) {
        const marker = font.name === currentFont ? pc.cyan('● ') : '  ';
        choices.push({
          name: `${marker}${pc.yellow('⚠')} ${font.name} → ${pc.dim(font.fallback)}`,
          value: font.name
        });
      }
    }

    // System fonts (limited to first 10 to avoid overwhelming)
    const systemCategory = categories.find(c => c.name === 'System Fonts');
    if (systemCategory && systemCategory.fonts.length > 0) {
      choices.push(new inquirer.Separator(pc.gray('── System Fonts (top 10) ──')));
      const systemFonts = systemCategory.fonts
        .filter(f => f.category === 'system' || !recommended.some(r => r.name === f.name))
        .slice(0, 10);

      for (const font of systemFonts) {
        const fontName = typeof font === 'string' ? font : font.name;
        const marker = fontName === currentFont ? pc.cyan('● ') : '  ';
        choices.push({ name: `${marker}${fontName}`, value: fontName });
      }
    }

    // Custom font option
    choices.push(new inquirer.Separator('── Custom ──'));
    choices.push({ name: pc.dim('Enter custom font name...'), value: '__custom__' });

    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'font',
      message: 'Select a font:',
      choices: choices,
      pageSize: 15
    }]);

    let selectedFont = answer.font;

    // Handle custom font input
    if (selectedFont === '__custom__') {
      const customAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'customFont',
        message: 'Enter font name:',
        validate: async (input: string) => {
          if (!input.trim()) return 'Font name cannot be empty';
          const fontStatus = await fontService.getFontStatus(input.trim());
          if (!fontStatus.installed) {
            return `Font "${input}" is not installed. It will use fallback: ${fontStatus.fallback}. Type it again to confirm.`;
          }
          return true;
        }
      }]);
      selectedFont = customAnswer.customFont.trim();
    }

    // Don't save if user selected current font
    if (selectedFont === currentFont) {
      console.log(pc.dim('No changes made'));
      return;
    }

    // Check if selected font is installed
    const selectedFontStatus = await fontService.getFontStatus(selectedFont);
    if (!selectedFontStatus.installed) {
      console.log();
      console.log(pc.yellow(`⚠ Warning: "${selectedFont}" is not installed on your system`));
      console.log(pc.dim(`Fallback will be used: ${selectedFontStatus.fallback}`));

      const answer = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Do you want to use this font anyway?',
        default: false
      }]);

      if (!answer.proceed) {
        console.log(pc.dim('Font not changed'));
        return;
      }
    }

    // Update config
    if (deviceName) {
      config.devices[deviceName].captionFont = selectedFont;
    } else {
      config.caption.font = selectedFont;
    }
    await saveConfig(config);

    if (deviceName) {
      console.log(pc.green('✓'), `Set font to "${selectedFont}" for device: ${deviceName}`);
    } else {
      console.log(pc.green('✓'), `Set caption font to "${selectedFont}"`);
    }

    if (!selectedFontStatus.installed) {
      console.log(pc.yellow(`Remember: This font will render as ${selectedFontStatus.fallback}`));
    }

  } catch (error) {
    console.error(pc.red('Error selecting font:'), error);
    process.exit(1);
  }
}