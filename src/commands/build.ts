import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import sharp from 'sharp';
import type { AppshotConfig, CaptionsFile } from '../types.js';
import { renderGradient, compositeScreenshot, addCaption } from '../core/render.js';
import { loadConfig, loadCaptions } from '../core/files.js';
import { autoSelectFrame, getImageDimensions, initializeFrameRegistry } from '../core/devices.js';
import { composeAppStoreScreenshot } from '../core/compose.js';

export default function buildCmd() {
  const cmd = new Command('build')
    .description('Render screenshots using frames, gradients, and captions')
    .option('--devices <list>', 'comma-separated device list (e.g., iphone,ipad)', 'iphone,ipad,mac,watch')
    .option('--preset <ids>', 'use specific App Store presets (e.g., iphone-6-9,ipad-13)')
    .option('--config <file>', 'use specific config file', 'appshot.json')
    .option('--langs <list>', 'comma-separated language codes (e.g., en,fr,de)', 'en')
    .option('--preview', 'generate low-res preview images')
    .option('--concurrency <n>', 'number of parallel renders', '4')
    .option('--no-frame', 'skip device frames')
    .option('--no-gradient', 'skip gradient backgrounds')
    .option('--no-caption', 'skip captions')
    .action(async (opts) => {
      try {
        console.log(pc.bold('Building screenshots...'));
        
        // Load configuration
        const config = await loadConfig();
        const devices = opts.devices.split(',').map((d: string) => d.trim());
        const langs = opts.langs.split(',').map((l: string) => l.trim());
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
          
          // Get screenshots
          const screenshots = (await fs.readdir(inputDir))
            .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
            .sort();
          
          if (screenshots.length === 0) {
            console.log(pc.yellow('⚠'), `No screenshots found in ${inputDir}`);
            continue;
          }
          
          // Load captions
          const captions = await loadCaptions(path.join(inputDir, 'captions.json'));
          
          console.log(pc.cyan(`\n${device}:`), `Processing ${screenshots.length} screenshots`);
          
          // Process each language
          for (const lang of langs) {
            const langDir = langs.length > 1 ? path.join(outputDir, lang) : outputDir;
            await fs.mkdir(langDir, { recursive: true });
            
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
                  const { width, height, orientation } = await getImageDimensions(inputPath);
                  
                  // Load screenshot
                  const screenshotBuffer = await sharp(inputPath).toBuffer();
                  
                  // Parse resolution for output dimensions
                  const [outWidth, outHeight] = deviceConfig.resolution.split('x').map(Number);
                  
                  // Auto-select frame if enabled
                  let frame = null;
                  let frameMetadata = null;
                  let frameUsed = false;
                  
                  if (opts.frame !== false && (deviceConfig.autoFrame !== false)) {
                    const result = await autoSelectFrame(
                      inputPath,
                      path.resolve(config.frames),
                      device as 'iphone' | 'ipad' | 'mac' | 'watch',
                      deviceConfig.preferredFrame
                    );
                    
                    frame = result.frame;
                    frameMetadata = result.metadata;
                    
                    if (frame && frameMetadata) {
                      frameUsed = true;
                      console.log(pc.dim(`    Using ${frameMetadata.displayName} ${orientation} frame`));
                    }
                  }
                  
                  // Use the new compose function
                  const image = await composeAppStoreScreenshot({
                    screenshot: screenshotBuffer,
                    frame: frame,
                    frameMetadata: frameMetadata ? {
                      frameWidth: frameMetadata.frameWidth,
                      frameHeight: frameMetadata.frameHeight,
                      screenRect: frameMetadata.screenRect
                    } : undefined,
                    caption: opts.caption !== false ? captionText : undefined,
                    captionConfig: config.caption,
                    gradientConfig: config.gradient,
                    deviceConfig: deviceConfig,
                    outputWidth: outWidth,
                    outputHeight: outHeight
                  });
                  
                  // Save final image
                  await sharp(image)
                    .resize(opts.preview ? 800 : undefined, undefined, {
                      fit: 'inside',
                      withoutEnlargement: true
                    })
                    .toFile(outputPath);
                  
                  console.log(pc.green('  ✓'), path.basename(outputPath), 
                    pc.dim(`[${orientation}${frameUsed ? ', framed' : ''}${captionText ? ', captioned' : ''}]`));
                  totalProcessed++;
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
        console.log('\n' + pc.bold('Build complete!'));
        console.log(pc.green(`✓ ${totalProcessed} screenshots processed`));
        if (totalErrors > 0) {
          console.log(pc.red(`✗ ${totalErrors} errors`));
        }
        console.log(pc.dim(`Output directory: ${config.output}`));
        
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}