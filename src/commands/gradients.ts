import { Command } from 'commander';
import pc from 'picocolors';
import inquirer from 'inquirer';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { gradientPresets, getGradientCategories, getGradientsByCategory, getGradientPreset } from '../core/gradient-presets.js';
import { loadConfig } from '../core/files.js';
import { renderGradient } from '../core/render.js';

/**
 * Convert hex color to ANSI color block for terminal display
 */
function getColorBlock(color: string): string {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Use bright colors for better visibility
  if (r > 200 && g < 100 && b < 100) return pc.red('█');
  if (r > 200 && g > 200 && b < 100) return pc.yellow('█');
  if (r < 100 && g > 200 && b < 100) return pc.green('█');
  if (r < 100 && g < 100 && b > 200) return pc.blue('█');
  if (r > 200 && g < 100 && b > 200) return pc.magenta('█');
  if (r < 100 && g > 200 && b > 200) return pc.cyan('█');
  if (r > 200 && g > 200 && b > 200) return pc.white('█');
  if (r < 100 && g < 100 && b < 100) return pc.gray('█');
  return pc.dim('█');
}

export default function gradientsCmd() {
  const cmd = new Command('gradients')
    .description('Browse and preview gradient presets')
    .option('--list', 'list all available gradients')
    .option('--category <name>', 'filter by category (warm, cool, vibrant, subtle, monochrome, brand)')
    .option('--preview <id>', 'generate preview image for a gradient')
    .option('--sample', 'generate sample images for all gradients')
    .option('--apply <id>', 'apply gradient preset to current project')
    .action(async (opts) => {
      try {
        // List mode
        if (opts.list || (!opts.preview && !opts.sample && !opts.apply)) {
          console.log(pc.bold('\n📊 Gradient Presets\n'));

          const categories = opts.category ? [opts.category] : getGradientCategories();

          for (const category of categories) {
            const categoryGradients = getGradientsByCategory(category);
            if (categoryGradients.length === 0) continue;

            // Category header with emoji
            const categoryEmoji = getCategoryEmoji(category);
            console.log(pc.bold(`${categoryEmoji} ${category.charAt(0).toUpperCase() + category.slice(1)} Gradients`));
            console.log(pc.dim('─'.repeat(50)));

            for (const gradient of categoryGradients) {
              // Display gradient with color blocks
              const colorBlocks = gradient.colors.map(getColorBlock).join('');

              const directionIcon = getDirectionIcon(gradient.direction);

              console.log(
                `  ${pc.cyan(gradient.id.padEnd(12))} ${colorBlocks} ${directionIcon}  ${pc.dim(gradient.description)}`
              );
            }
            console.log();
          }

          console.log(pc.dim('Usage:'));
          console.log(pc.dim('  appshot gradients --preview <id>     Preview a gradient'));
          console.log(pc.dim('  appshot gradients --apply <id>       Apply to project'));
          console.log(pc.dim('  appshot gradients --sample           Generate all samples'));
          return;
        }

        // Preview mode
        if (opts.preview) {
          const gradient = getGradientPreset(opts.preview);
          if (!gradient) {
            console.error(pc.red(`Gradient "${opts.preview}" not found`));
            process.exit(1);
          }

          console.log(pc.cyan('Generating preview for:'), gradient.name);
          console.log(pc.dim(`Colors: ${gradient.colors.join(' → ')}`));
          console.log(pc.dim(`Direction: ${gradient.direction}`));

          // Generate preview image
          const previewPath = path.join(process.cwd(), `gradient-${gradient.id}.png`);
          const buffer = await renderGradient(400, 800, {
            colors: gradient.colors,
            direction: gradient.direction
          });

          await sharp(buffer).toFile(previewPath);
          console.log(pc.green('✓'), `Preview saved to ${previewPath}`);
          return;
        }

        // Sample mode - generate all gradient samples
        if (opts.sample) {
          console.log(pc.cyan('Generating gradient samples...\n'));

          const samplesDir = path.join(process.cwd(), 'gradient-samples');
          await fs.mkdir(samplesDir, { recursive: true });

          for (const gradient of gradientPresets) {
            const buffer = await renderGradient(200, 400, {
              colors: gradient.colors,
              direction: gradient.direction
            });

            const filePath = path.join(samplesDir, `${gradient.id}.png`);
            await sharp(buffer).toFile(filePath);

            const colorBlocks = gradient.colors.map(getColorBlock).join('');

            console.log(pc.green('✓'), `${gradient.id.padEnd(12)} ${colorBlocks}`);
          }

          console.log('\n' + pc.green('✓'), `${gradientPresets.length} samples saved to gradient-samples/`);

          // Generate HTML preview page
          const html = generatePreviewHTML();
          await fs.writeFile(path.join(samplesDir, 'preview.html'), html);
          console.log(pc.green('✓'), 'Preview page saved to gradient-samples/preview.html');

          return;
        }

        // Apply mode
        if (opts.apply) {
          const gradient = getGradientPreset(opts.apply);
          if (!gradient) {
            console.error(pc.red(`Gradient "${opts.apply}" not found`));
            process.exit(1);
          }

          // Load current config
          const config = await loadConfig();

          // Update gradient settings
          config.gradient = {
            colors: gradient.colors,
            direction: gradient.direction
          };

          // Save config
          const configPath = path.join(process.cwd(), '.appshot', 'config.json');
          await fs.writeFile(configPath, JSON.stringify(config, null, 2));

          console.log(pc.green('✓'), `Applied "${gradient.name}" gradient`);
          console.log(pc.dim(`Colors: ${gradient.colors.join(' → ')}`));
          console.log(pc.dim(`Direction: ${gradient.direction}`));
          console.log('\nRun', pc.cyan('appshot build'), 'to generate screenshots with the new gradient');
          return;
        }

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // Interactive selection subcommand
  cmd.command('select')
    .description('Interactively select and apply a gradient')
    .action(async () => {
      try {
        // Category selection
        const categoryAnswer = await inquirer.prompt([{
          type: 'list',
          name: 'category',
          message: 'Choose a gradient category:',
          choices: [
            { name: '🌅 Warm - Sunset, sunrise, autumn colors', value: 'warm' },
            { name: '❄️  Cool - Ocean, ice, mint colors', value: 'cool' },
            { name: '🎨 Vibrant - Bold, bright, energetic', value: 'vibrant' },
            { name: '☁️  Subtle - Soft, muted, professional', value: 'subtle' },
            { name: '⚫ Monochrome - Black, white, gray', value: 'monochrome' },
            { name: '🏢 Brand - Popular brand colors', value: 'brand' },
            { name: 'All Categories', value: 'all' }
          ]
        }]);

        // Get gradients for selected category
        const gradients = categoryAnswer.category === 'all'
          ? gradientPresets
          : getGradientsByCategory(categoryAnswer.category);

        // Gradient selection with colored preview
        const gradientChoices = gradients.map(g => {
          const colorPreview = g.colors.map(getColorBlock).join('');
          return {
            name: `${colorPreview} ${g.name} - ${g.description}`,
            value: g.id
          };
        });

        const gradientAnswer = await inquirer.prompt([{
          type: 'list',
          name: 'gradient',
          message: 'Select a gradient:',
          choices: gradientChoices,
          pageSize: 15
        }]);

        // Preview before applying
        const selectedGradient = getGradientPreset(gradientAnswer.gradient)!;
        console.log('\n' + pc.cyan('Selected:'), selectedGradient.name);
        console.log(pc.dim(`Colors: ${selectedGradient.colors.join(' → ')}`));
        console.log(pc.dim(`Direction: ${selectedGradient.direction}`));

        const confirmAnswer = await inquirer.prompt([{
          type: 'confirm',
          name: 'apply',
          message: 'Apply this gradient to your project?',
          default: true
        }]);

        if (confirmAnswer.apply) {
          // Load and update config
          const config = await loadConfig();
          config.gradient = {
            colors: selectedGradient.colors,
            direction: selectedGradient.direction
          };

          const configPath = path.join(process.cwd(), '.appshot', 'config.json');
          await fs.writeFile(configPath, JSON.stringify(config, null, 2));

          console.log(pc.green('✓'), 'Gradient applied successfully!');
          console.log('\nRun', pc.cyan('appshot build'), 'to generate screenshots with the new gradient');
        }

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    warm: '🌅',
    cool: '❄️',
    vibrant: '🎨',
    subtle: '☁️',
    monochrome: '⚫',
    brand: '🏢'
  };
  return emojis[category] || '📊';
}

function getDirectionIcon(direction: string): string {
  const icons: Record<string, string> = {
    'top-bottom': '↓',
    'bottom-top': '↑',
    'left-right': '→',
    'right-left': '←',
    'diagonal': '↘'
  };
  return pc.dim(icons[direction] || '');
}

function generatePreviewHTML(): string {
  const categories = getGradientCategories();

  let html = `<!DOCTYPE html>
<html>
<head>
  <title>Appshot Gradient Presets</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      margin: 0;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 40px;
    }
    .category {
      margin-bottom: 40px;
    }
    .category h2 {
      color: #555;
      border-bottom: 2px solid #ddd;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .gradients {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }
    .gradient {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .gradient:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .gradient img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    .gradient-info {
      padding: 12px;
    }
    .gradient-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    .gradient-desc {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    .gradient-colors {
      display: flex;
      height: 20px;
      border-radius: 4px;
      overflow: hidden;
    }
    .color-block {
      flex: 1;
    }
    .gradient-id {
      font-family: monospace;
      font-size: 11px;
      color: #999;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <h1>🎨 Appshot Gradient Presets</h1>`;

  for (const category of categories) {
    const gradients = getGradientsByCategory(category);
    const emoji = getCategoryEmoji(category);

    html += `
  <div class="category">
    <h2>${emoji} ${category.charAt(0).toUpperCase() + category.slice(1)}</h2>
    <div class="gradients">`;

    for (const gradient of gradients) {
      const colorBlocks = gradient.colors.map(color =>
        `<div class="color-block" style="background: ${color}"></div>`
      ).join('');

      html += `
      <div class="gradient">
        <img src="${gradient.id}.png" alt="${gradient.name}">
        <div class="gradient-info">
          <div class="gradient-name">${gradient.name}</div>
          <div class="gradient-desc">${gradient.description}</div>
          <div class="gradient-colors">${colorBlocks}</div>
          <div class="gradient-id">ID: ${gradient.id}</div>
        </div>
      </div>`;
    }

    html += `
    </div>
  </div>`;
  }

  html += `
</body>
</html>`;

  return html;
}