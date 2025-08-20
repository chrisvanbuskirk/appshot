import { Command } from 'commander';
import { select, confirm } from '@inquirer/prompts';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import type { CaptionsFile, CaptionEntry } from '../types.js';
import type { OpenAIModel } from '../types/ai.js';
import { translationService } from '../services/translation.js';

export default function localizeCmd() {
  return new Command('localize')
    .description('Generate translations for all captions using AI')
    .requiredOption('--langs <codes>', 'comma-separated language codes (e.g., fr,de,es)')
    .option('--device <name>', 'specific device (iphone|ipad|mac|watch), or all devices')
    .option('--model <name>', 'OpenAI model to use', 'gpt-4o-mini')
    .option('--source <lang>', 'source language', 'en')
    .option('--review', 'review translations before saving')
    .option('--overwrite', 'overwrite existing translations')
    .action(async (opts) => {
      try {
        // Check for API key
        if (!translationService.hasApiKey()) {
          console.error(pc.red('Error:'), 'OpenAI API key not found');
          console.log(pc.dim('Set the OPENAI_API_KEY environment variable:'));
          console.log(pc.dim('  export OPENAI_API_KEY="your-api-key"'));
          process.exit(1);
        }

        // Parse languages
        const targetLanguages = opts.langs.split(',').map((l: string) => l.trim());
        const sourceLang = opts.source;

        // Select model
        let selectedModel = opts.model as OpenAIModel;
        const availableModels = translationService.getAvailableModels();

        if (!availableModels.includes(selectedModel)) {
          console.log(pc.yellow('\nSelect AI model for translation:'));
          selectedModel = await select({
            message: 'Choose model:',
            choices: availableModels.map(m => {
              const info = translationService.getModelInfo(m);
              return {
                value: m,
                name: m,
                description: info ? `Max output: ${info.maxTokens} tokens` : ''
              };
            })
          }) as OpenAIModel;
        }

        await translationService.loadConfig();

        console.log(pc.bold('\n📝 Batch Translation'));
        console.log('Source language:', pc.cyan(sourceLang));
        console.log('Target languages:', pc.cyan(targetLanguages.join(', ')));
        console.log('Model:', pc.cyan(selectedModel));
        console.log();

        // Determine which devices to process
        const captionsDir = path.join(process.cwd(), '.appshot', 'captions');
        let devices: string[] = [];

        if (opts.device && opts.device !== 'all') {
          devices = [opts.device];
        } else {
          // Get all device caption files
          try {
            const files = await fs.readdir(captionsDir);
            devices = files
              .filter(f => f.endsWith('.json'))
              .map(f => f.replace('.json', ''));
          } catch {
            console.error(pc.red('Error:'), 'No caption files found');
            console.log(pc.dim('Run'), pc.cyan('appshot caption'), pc.dim('to create captions first'));
            process.exit(1);
          }
        }

        // Process each device
        let totalTranslated = 0;
        let totalSkipped = 0;

        for (const device of devices) {
          const captionsFile = path.join(captionsDir, `${device}.json`);

          try {
            const content = await fs.readFile(captionsFile, 'utf8');
            const captions: CaptionsFile = JSON.parse(content);

            console.log(pc.cyan(`\n${device.toUpperCase()}`));
            console.log(pc.dim('─'.repeat(40)));

            // Collect unique captions to translate
            const textsToTranslate = new Set<string>();

            for (const [_filename, caption] of Object.entries(captions)) {
              if (typeof caption === 'string') {
                textsToTranslate.add(caption);
              } else if (caption && typeof caption === 'object') {
                const sourceText = caption[sourceLang];
                if (sourceText) {
                  // Check if we should translate (no existing translations or overwrite enabled)
                  const hasExistingTranslations = targetLanguages.some((lang: string) => caption[lang]);
                  if (!hasExistingTranslations || opts.overwrite) {
                    textsToTranslate.add(sourceText);
                  }
                }
              }
            }

            if (textsToTranslate.size === 0) {
              console.log(pc.yellow('  No captions to translate'));
              totalSkipped++;
              continue;
            }

            console.log(`  Found ${textsToTranslate.size} unique caption(s) to translate`);

            // Batch translate
            const translations = await translationService.translateBatch(
              Array.from(textsToTranslate),
              targetLanguages,
              selectedModel,
              (current, total) => {
                process.stdout.write(`\r  Translating: ${current}/${total}`);
              }
            );

            process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear progress line

            // Review translations if requested
            if (opts.review) {
              console.log(pc.yellow('\n  Review translations:'));
              for (const [text, trans] of translations.entries()) {
                console.log(`\n  Original: ${pc.white(text)}`);
                for (const [lang, translation] of Object.entries(trans)) {
                  console.log(`  ${lang}: ${pc.green(translation)}`);
                }
                const proceed = await confirm({
                  message: '  Accept these translations?',
                  default: true
                });
                if (!proceed) {
                  translations.delete(text);
                }
              }
            }

            // Apply translations to captions
            for (const [filename, caption] of Object.entries(captions)) {
              let sourceText: string | undefined;

              if (typeof caption === 'string') {
                sourceText = caption;
                // Convert to object format
                captions[filename] = { [sourceLang]: caption } as CaptionEntry;
              } else if (caption && typeof caption === 'object') {
                sourceText = caption[sourceLang];
              }

              if (sourceText && translations.has(sourceText)) {
                const trans = translations.get(sourceText)!;
                for (const [lang, translation] of Object.entries(trans)) {
                  (captions[filename] as CaptionEntry)[lang] = translation;
                }
              }
            }

            // Save updated captions
            await fs.writeFile(captionsFile, JSON.stringify(captions, null, 2), 'utf8');

            console.log(pc.green('  ✓'), `Translated ${translations.size} caption(s)`);
            totalTranslated += translations.size;

          } catch (error) {
            console.error(pc.red(`  Error processing ${device}:`), error instanceof Error ? error.message : String(error));
          }
        }

        // Summary
        console.log(pc.bold('\n📊 Summary'));
        console.log(pc.green('✓'), `Translated ${totalTranslated} unique caption(s)`);
        if (totalSkipped > 0) {
          console.log(pc.yellow('⚠'), `Skipped ${totalSkipped} device(s) with no captions`);
        }
        console.log(pc.dim('\nRun'), pc.cyan('appshot build --langs ' + targetLanguages.join(',')),
          pc.dim('to generate localized screenshots'));

      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}