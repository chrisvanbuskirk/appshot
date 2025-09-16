import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import sharp from 'sharp';
import { loadConfig, loadCaptions } from '../core/files.js';
import { autoSelectFrame, getImageDimensions, initializeFrameRegistry } from '../core/devices.js';
import { composeAppStoreScreenshot } from '../core/compose.js';
import { resolveLanguages, normalizeLanguageCode } from '../utils/language.js';

export default function buildCmd() {
  const cmd = new Command('build')
    .description('Generate final screenshots with frames, gradients, and captions')
    .option('--devices <list>', 'comma-separated device list (e.g., iphone,ipad)', 'iphone,ipad,mac,watch')
    .option('--preset <ids>', 'use specific App Store presets (e.g., iphone-6-9,ipad-13)')
    .option('--config <file>', 'use specific config file', 'appshot.json')
    .option('--langs <list>', 'comma-separated language codes (e.g., en,fr,de)')
    .option('--preview', 'generate low-res preview images')
    .option('--concurrency <n>', 'number of parallel renders', '4')
    .option('--no-frame', 'skip device frames')
    .option('--no-gradient', 'skip gradient backgrounds')
    .option('--no-caption', 'skip captions')
    .option('--background <image>', 'use specific background image')
    .option('--no-background', 'disable background (transparent)')
    .option('--background-fit <mode>', 'background fit mode: cover, contain, fill, scale-down', 'cover')
    .option('--auto-background', 'auto-detect background.png in device folders')
    .option('--dry-run', 'show what would be rendered without generating images')
    .option('--verbose', 'show detailed rendering information')
    .addHelpText('after', `
${pc.bold('Examples:')}
  ${pc.dim('# Build all devices')}
  $ appshot build
  
  ${pc.dim('# Build specific devices')}
  $ appshot build --devices iphone,ipad
  
  ${pc.dim('# Build for multiple languages')}
  $ appshot build --langs en,es,fr,de
  
  ${pc.dim('# Use App Store presets')}
  $ appshot build --preset iphone-6-9,ipad-13
  
  ${pc.dim('# Fast preview mode')}
  $ appshot build --preview --concurrency 8
  
  ${pc.dim('# Frames only (no gradient/caption)')}
  $ appshot build --no-gradient --no-caption
  
  ${pc.dim('# Use custom background image')}
  $ appshot build --background ./assets/sunset.jpg
  
  ${pc.dim('# Auto-detect background.png in device folders')}
  $ appshot build --auto-background
  
  ${pc.dim('# Preview what would be built')}
  $ appshot build --dry-run
  
  ${pc.dim('# Show detailed rendering info')}
  $ appshot build --verbose

${pc.bold('Output:')}
  Screenshots are saved to: ${pc.cyan('final/[device]/[language]/')}
  
${pc.bold('Language Detection:')}
  1. --langs parameter (if provided)
  2. Languages in caption files
  3. defaultLanguage in config.json
  4. System locale
  5. Fallback to 'en'`)
    .action(async (opts) => {
      try {
        const logo = String.raw`     _                       _           _   
    / \   _ __  _ __  ___| |__   ___ | |_ 
   / _ \ | '_ \| '_ \/ __| '_ \ / _ \| __|
  / ___ \| |_) | |_) \__ \ | | | (_) | |_ 
 /_/   \_\ .__/| .__/|___/_| |_|\___/ \__|
         |_|   |_|                          `;

        if (opts.dryRun) {
          console.log(pc.cyan(logo));
          console.log(pc.bold('\nDry run mode - no images will be generated\n'));
        } else {
          console.log(pc.cyan(logo));
          console.log(pc.bold('\nBuilding screenshots...'));
          // Layout behavior note for 0.9.0
          console.log(
            pc.yellow('\n⚠ Layout behavior notice (v0.9.0):') +
            pc.dim('\n  • "below/above" captions now enforce a minimum optical gap from the device, and will adjust placement to remain truly below/above.') +
            pc.dim('\n  • Overlay captions anchor to the bottom of their outer box (padding/border included); explicit zeros are respected.') +
            pc.dim('\n  • In edge cases where device + caption cannot both fit, the engine adapts placement; visuals may differ from 0.8.x.') +
            '\n'
          );
        }

        // Load configuration
        const config = await loadConfig(opts.config);
        const devices = opts.devices.split(',').map((d: string) => d.trim());
        const concurrency = parseInt(opts.concurrency, 10);

        // Initialize frame registry from Frames.json if available
        await initializeFrameRegistry(path.resolve(config.frames));

        // Ensure output directory exists
        await fs.mkdir(config.output, { recursive: true });

        let totalProcessed = 0;
        let totalErrors = 0;

        // Process each device
        for (const device of devices) {
          if (!config.devices[device]) {
            console.log(pc.yellow('⚠'), `Device '${device}' not configured in appshot.json`);
            continue;
          }

          const deviceConfig = config.devices[device];
          const inputDir = path.resolve(deviceConfig.input);
          const outputDir = path.join(config.output, device);

          // Check if input directory exists
          try {
            await fs.access(inputDir);
          } catch {
            console.log(pc.yellow('⚠'), `Input directory not found: ${inputDir}`);
            continue;
          }

          // Create device output directory
          await fs.mkdir(outputDir, { recursive: true });

          // Get screenshots (excluding background images)
          const screenshots = (await fs.readdir(inputDir))
            .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
            .filter(f => !f.match(/^background\.(png|jpg|jpeg)$/i))
            .sort();

          if (screenshots.length === 0) {
            console.log(pc.yellow('⚠'), `No screenshots found in ${inputDir}`);
            continue;
          }

          // Load captions from .appshot/captions/
          const captionsPath = path.join(process.cwd(), '.appshot', 'captions', `${device}.json`);
          const captions = await loadCaptions(captionsPath);

          // Resolve languages for this device
          const cliLangs = opts.langs ? opts.langs.split(',').map((l: string) => normalizeLanguageCode(l.trim())) : undefined;
          const { languages, source } = resolveLanguages(cliLangs, captions, config);

          console.log(pc.cyan(`\n${device}:`), `${opts.dryRun ? 'Would process' : 'Processing'} ${screenshots.length} screenshots`);
          if (!cliLangs) {
            console.log(pc.dim(`  Using language: ${languages.join(', ')} (from ${source})`));
          }

          // Process each language
          for (const lang of languages) {
            // Always use language subdirectory
            const langDir = path.join(outputDir, lang);
            if (!opts.dryRun) {
              await fs.mkdir(langDir, { recursive: true });
            }

            // Process screenshots in batches
            for (let i = 0; i < screenshots.length; i += concurrency) {
              const batch = screenshots.slice(i, i + concurrency);
              const promises = batch.map(async (screenshot) => {
                try {
                  const inputPath = path.join(inputDir, screenshot);
                  const outputPath = path.join(langDir, screenshot);

                  // Get caption for this screenshot and language
                  const captionData = captions[screenshot];
                  let captionText = '';
                  if (typeof captionData === 'string') {
                    captionText = captionData;
                  } else if (captionData && typeof captionData === 'object') {
                    captionText = captionData[lang] || '';
                  }

                  // Get screenshot dimensions and orientation
                  const { width: srcWidth, height: srcHeight, orientation } = await getImageDimensions(inputPath);

                  // In dry-run mode, skip loading the screenshot buffer
                  let screenshotBuffer: Buffer | undefined;
                  if (!opts.dryRun) {
                    try {
                      // First verify the file exists and is readable
                      await fs.access(inputPath, fs.constants.R_OK);

                      // Load the screenshot into a buffer
                      screenshotBuffer = await sharp(inputPath)
                        .png() // Ensure output is PNG
                        .toBuffer();
                    } catch (error) {
                      console.error(pc.red(`  ✗ ${path.basename(inputPath)}`), `Failed to load screenshot: ${error instanceof Error ? error.message : String(error)}`);
                      return;
                    }
                  }

                  // Parse resolution for output dimensions
                  const [configWidth, configHeight] = deviceConfig.resolution.split('x').map(Number);

                  // Ensure output dimensions match screenshot orientation
                  let outWidth: number;
                  let outHeight: number;

                  if (orientation === 'portrait') {
                    // For portrait, ensure height > width
                    outWidth = Math.min(configWidth, configHeight);
                    outHeight = Math.max(configWidth, configHeight);
                  } else {
                    // For landscape, ensure width > height
                    outWidth = Math.max(configWidth, configHeight);
                    outHeight = Math.min(configWidth, configHeight);
                  }

                  // Warn if orientation mismatch detected
                  const configOrientation = configWidth > configHeight ? 'landscape' : 'portrait';
                  if (configOrientation !== orientation) {
                    console.log(pc.yellow('    ⚠'), pc.dim(`Config specifies ${configOrientation} (${deviceConfig.resolution}) but screenshot is ${orientation} - auto-adjusting`));
                  }

                  // Auto-select frame if enabled
                  let frame = null;
                  let frameMetadata = null;
                  let frameUsed = false;

                  // Load frame if not disabled via CLI
                  if (opts.frame !== false) {
                    // If autoFrame is disabled but preferredFrame is set, use the preferred frame
                    // Otherwise, auto-select a frame
                    const result = await autoSelectFrame(
                      inputPath,
                      path.resolve(config.frames),
                      device as 'iphone' | 'ipad' | 'mac' | 'watch',
                      deviceConfig.preferredFrame,
                      opts.dryRun // Pass dry-run flag
                    );

                    frame = result.frame;
                    frameMetadata = result.metadata;

                    if (frameMetadata) {
                      frameUsed = true;
                      if (opts.verbose || opts.dryRun) {
                        console.log(pc.dim(`    ${opts.dryRun ? 'Would use' : 'Using'} ${frameMetadata.displayName} ${orientation} frame`));
                      }
                    } else if (!opts.dryRun && frameMetadata && !frame) {
                      console.error(pc.red('    ERROR: Frame metadata found but image failed to load!'));
                    }
                  }

                  // Handle dry-run vs actual rendering
                  if (opts.dryRun) {
                    // Dry-run output
                    console.log(pc.cyan(`  ${screenshot}`) + pc.dim(` → ${lang}`));

                    // Show source dimensions
                    console.log(pc.dim(`    Source: ${srcWidth}x${srcHeight} (${orientation})`));

                    // Show frame info
                    if (frameMetadata) {
                      console.log(pc.dim(`    Frame: ${frameMetadata.displayName} (${frameMetadata.frameWidth}x${frameMetadata.frameHeight})`));
                    } else if (opts.frame !== false) {
                      console.log(pc.dim('    Frame: No matching frame found'));
                    }

                    // Show caption info
                    if (captionText && opts.caption !== false) {
                      const lines = captionText.split('\n').length;
                      console.log(pc.dim(`    Caption: "${captionText.substring(0, 50)}${captionText.length > 50 ? '...' : ''}" (${captionText.length} chars, ${lines} line${lines > 1 ? 's' : ''})`));

                      // Show font info
                      const fontName = deviceConfig.captionFont || config.caption.font;
                      console.log(pc.dim(`    Font: ${fontName}`));
                    }

                    // Show output info
                    console.log(pc.dim(`    Output: ${outWidth}x${outHeight} → ${outputPath}`));

                    totalProcessed++;
                  } else {
                    // Actual rendering
                    let image: Buffer;
                    try {
                      // Configure background
                      let backgroundConfig = config.background;

                      // Override with command line options
                      if (opts.background) {
                        backgroundConfig = {
                          mode: 'image',
                          image: opts.background,
                          fit: opts.backgroundFit || 'cover',
                          warnOnMismatch: true
                        };
                      } else if (opts.autoBackground) {
                        backgroundConfig = {
                          mode: 'auto',
                          fit: opts.backgroundFit || 'cover',
                          warnOnMismatch: true
                        };
                      } else if (opts.noBackground) {
                        backgroundConfig = undefined;
                      }

                      image = await composeAppStoreScreenshot({
                        screenshot: screenshotBuffer!,
                        frame: frame,
                        frameMetadata: frameMetadata ? {
                          frameWidth: frameMetadata.frameWidth,
                          frameHeight: frameMetadata.frameHeight,
                          screenRect: frameMetadata.screenRect,
                          maskPath: frameMetadata.maskPath,
                          deviceType: frameMetadata.deviceType,
                          displayName: frameMetadata.displayName,
                          name: frameMetadata.name
                        } : undefined,
                        caption: opts.caption !== false ? captionText : undefined,
                        captionConfig: config.caption,
                        gradientConfig: opts.gradient === false ? undefined : config.gradient,
                        backgroundConfig: backgroundConfig,
                        deviceConfig: deviceConfig,
                        outputWidth: outWidth,
                        outputHeight: outHeight,
                        verbose: opts.verbose
                      });
                    } catch (error) {
                      console.error(pc.red(`  ✗ ${path.basename(inputPath)}`), error instanceof Error ? error.message : String(error));
                      return;
                    }

                    // Save final image
                    await sharp(image)
                      .resize(opts.preview ? 800 : undefined, undefined, {
                        fit: 'inside',
                        withoutEnlargement: true
                      })
                      .png()  // Ensure output is PNG
                      .toFile(outputPath);

                    console.log(pc.green('  ✓'), path.basename(outputPath),
                      pc.dim(`[${orientation}${frameUsed ? ', framed' : ''}${captionText ? ', captioned' : ''}]`));
                    totalProcessed++;
                  }
                } catch (error) {
                  console.log(pc.red('  ✗'), screenshot, pc.dim(error instanceof Error ? error.message : String(error)));
                  totalErrors++;
                }
              });

              await Promise.all(promises);
            }
          }
        }

        // Summary
        if (opts.dryRun) {
          console.log('\n' + pc.bold('Dry run complete!'));
          console.log(pc.cyan(`→ ${totalProcessed} screenshots would be generated`));
        } else {
          console.log('\n' + pc.bold('Build complete!'));
          console.log(pc.green(`✓ ${totalProcessed} screenshots processed`));
          if (totalErrors > 0) {
            console.log(pc.red(`✗ ${totalErrors} errors`));
          }
          console.log(pc.dim(`Output directory: ${config.output}`));
        }

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}
