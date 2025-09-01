import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import sharp from 'sharp';
import { initializeFrameRegistry, getImageDimensions, autoSelectFrame, detectDeviceTypeFromDimensions } from '../core/devices.js';
import { composeFrameOnly } from '../core/compose.js';

type DeviceType = 'iphone' | 'ipad' | 'mac' | 'watch';

interface FrameCommandOptions {
  output?: string;
  device?: DeviceType;
  recursive?: boolean;
  format?: 'png' | 'jpeg';
  suffix?: string;
  overwrite?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

function isImage(file: string): boolean {
  return /\.(png|jpg|jpeg)$/i.test(file);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function listImagesRecursively(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await listImagesRecursively(full);
      files.push(...nested);
    } else if (entry.isFile() && isImage(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function processSingleFile(inputPath: string, framesDir: string, options: FrameCommandOptions) {
  const { width, height, orientation } = await getImageDimensions(inputPath);

  // Validate minimum dimensions
  if (width < 100 || height < 100) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim(`Image too small (${width}x${height}). Minimum 100x100 required.`));
    return { processed: 0, errors: 1 };
  }

  // Warn on extreme aspect ratios
  const aspect = Math.max(width, height) / Math.min(width, height);
  if (aspect > 3) {
    console.warn(pc.yellow('  ⚠'), path.basename(inputPath), pc.dim(`Extreme aspect ratio (${aspect.toFixed(2)}:1) may not match any device frame.`));
  }

  let device: DeviceType | null = options.device || detectDeviceTypeFromDimensions(width, height);
  if (!device) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim(`Unable to detect device type (${width}x${height}). Use --device to specify.`));
    return { processed: 0, errors: 1 };
  }

  // Choose frame
  const { frame, metadata } = await autoSelectFrame(
    inputPath,
    framesDir,
    device,
    undefined,
    Boolean(options.dryRun)
  );

  if (!metadata) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim('No matching frame found'));
    return { processed: 0, errors: 1 };
  }

  if (options.dryRun) {
    console.log(pc.cyan(`  ${path.basename(inputPath)}`) + pc.dim(` → ${device} (${orientation})`));
    console.log(pc.dim(`    Source: ${width}x${height}`));
    console.log(pc.dim(`    Frame: ${metadata.displayName} (${metadata.frameWidth}x${metadata.frameHeight})`));
    return { processed: 1, errors: 0 };
  }

  if (!frame) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim('Frame image failed to load'));
    return { processed: 0, errors: 1 };
  }

  // Load screenshot buffer
  let screenshotBuffer: Buffer;
  try {
    await fs.access(inputPath, fs.constants.R_OK);
    screenshotBuffer = await sharp(inputPath).toBuffer();
  } catch (err) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim(`Failed to read image: ${err instanceof Error ? err.message : String(err)}`));
    return { processed: 0, errors: 1 };
  }

  // Compose framed image with transparent background
  let outBuffer: Buffer;
  try {
    outBuffer = await composeFrameOnly({
      screenshot: screenshotBuffer,
      frame,
      frameMetadata: {
        frameWidth: metadata.frameWidth,
        frameHeight: metadata.frameHeight,
        screenRect: metadata.screenRect,
        maskPath: metadata.maskPath,
        deviceType: metadata.deviceType,
        displayName: metadata.displayName,
        name: metadata.name
      },
      outputFormat: options.format || 'png',
      jpegQuality: 92,
      verbose: options.verbose
    });
  } catch (err) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim(`Compose failed: ${err instanceof Error ? err.message : String(err)}`));
    return { processed: 0, errors: 1 };
  }

  // Determine output path
  const format = options.format || 'png';
  const ext = format === 'png' ? '.png' : '.jpg';
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputDir = options.output ? path.resolve(options.output) : path.dirname(inputPath);
  await ensureDir(outputDir);

  let suffix = options.suffix ?? '-framed';
  let outName = options.overwrite ? `${baseName}${ext}` : `${baseName}${suffix}${ext}`;
  let outPath = path.join(outputDir, outName);

  if (!options.overwrite) {
    try {
      await fs.access(outPath);
      // File exists; if suffix is empty, fall back to default '-framed'
      if (!suffix) {
        suffix = '-framed';
        outName = `${baseName}${suffix}${ext}`;
        outPath = path.join(outputDir, outName);
      }
    } catch {
      // ok, does not exist
    }
  }

  try {
    await fs.writeFile(outPath, outBuffer);
    console.log(pc.green('  ✓'), path.basename(outPath), pc.dim(`[${device}, ${orientation}, transparent]`));
    return { processed: 1, errors: 0 };
  } catch (err) {
    console.error(pc.red('  ✗'), path.basename(inputPath), pc.dim(`Write failed: ${err instanceof Error ? err.message : String(err)}`));
    return { processed: 0, errors: 1 };
  }
}

export default function frameCmd() {
  const cmd = new Command('frame')
    .description('Apply device frames to screenshots with a transparent background (no gradients or captions)')
    .argument('<input>', 'input image file or directory')
    .option('-o, --output <dir>', 'output directory (default: same as input)')
    .option('-d, --device <type>', 'force device type (iphone|ipad|mac|watch)')
    .option('-r, --recursive', 'process directories recursively')
    .option('-f, --format <type>', 'output format (png|jpeg)', 'png')
    .option('--suffix <text>', 'filename suffix when not overwriting', '-framed')
    .option('--overwrite', 'overwrite original file name')
    .option('--dry-run', 'preview files without processing')
    .option('--verbose', 'show detailed information')
    .addHelpText('after', `
${pc.bold('Examples:')}
  ${pc.dim('# Single file (auto-detect device)')}
  $ appshot frame screenshot.png

  ${pc.dim('# Specify output directory')}
  $ appshot frame screenshot.png -o framed/

  ${pc.dim('# Force device type')}
  $ appshot frame screenshot.png --device iphone

  ${pc.dim('# Batch process a directory')}
  $ appshot frame ./screenshots -o ./framed --recursive

  ${pc.dim('# Dry run with verbose logs')}
  $ appshot frame ./screenshots --dry-run --verbose`)
    .action(async (input: string, opts) => {
      const options: FrameCommandOptions = {
        output: opts.output,
        device: opts.device,
        recursive: Boolean(opts.recursive),
        format: (opts.format === 'jpeg' ? 'jpeg' : 'png'),
        suffix: opts.suffix,
        overwrite: Boolean(opts.overwrite),
        verbose: Boolean(opts.verbose),
        dryRun: Boolean(opts.dryRun)
      };

      // Validate device option if provided
      if (options.device && !['iphone', 'ipad', 'mac', 'watch'].includes(options.device)) {
        console.error(pc.red('Error:'), `Invalid --device value: ${options.device}`);
        process.exit(1);
      }

      try {
        // Initialize frames registry (use project frames dir by default)
        const framesDir = path.resolve('frames');
        await initializeFrameRegistry(framesDir);

        const inputPath = path.resolve(input);
        const stat = await fs.stat(inputPath);

        let totalProcessed = 0;
        let totalErrors = 0;

        if (stat.isFile()) {
          const res = await processSingleFile(inputPath, framesDir, options);
          totalProcessed += res.processed;
          totalErrors += res.errors;
        } else if (stat.isDirectory()) {
          // List images
          const files = options.recursive
            ? await listImagesRecursively(inputPath)
            : (await fs.readdir(inputPath))
              .filter(isImage)
              .map(f => path.join(inputPath, f));

          if (files.length === 0) {
            console.log(pc.yellow('⚠'), 'No images found');
            return;
          }

          console.log(pc.cyan(`\n${path.basename(inputPath)}:`), `${options.dryRun ? 'Would frame' : 'Framing'} ${files.length} images`);

          let currentIndex = 0;
          for (const file of files) {
            currentIndex++;
            if (!options.dryRun && files.length > 5) {
              process.stdout.write(pc.dim(`\r[${currentIndex}/${files.length}] Processing...`));
            }
            // Compute output for recursive structure
            if (options.output && options.recursive) {
              const rel = path.relative(inputPath, path.dirname(file));
              const outDir = path.join(path.resolve(options.output), rel);
              const res = await processSingleFile(file, framesDir, { ...options, output: outDir });
              totalProcessed += res.processed;
              totalErrors += res.errors;
            } else {
              const res = await processSingleFile(file, framesDir, options);
              totalProcessed += res.processed;
              totalErrors += res.errors;
            }
          }

          // Clear progress line
          if (!options.dryRun && files.length > 5) {
            process.stdout.write('\r' + ' '.repeat(30) + '\r');
          }
        } else {
          console.error(pc.red('Error:'), 'Input must be a file or directory');
          process.exit(1);
        }

        // Summary
        if (options.dryRun) {
          console.log('\n' + pc.bold('Dry run complete!'));
          console.log(pc.cyan(`→ ${totalProcessed} images would be framed`));
        } else {
          console.log('\n' + pc.bold('Framing complete!'));
          console.log(pc.green(`✓ ${totalProcessed} images processed`));
          if (totalErrors > 0) {
            console.log(pc.red(`✗ ${totalErrors} errors`));
          }
        }
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}
