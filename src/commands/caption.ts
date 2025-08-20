import { Command } from 'commander';
import autocomplete from 'inquirer-autocomplete-standalone';
import { select } from '@inquirer/prompts';
import fuzzy from 'fuzzy';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import type { CaptionsFile, CaptionEntry } from '../types.js';
import type { OpenAIModel } from '../types/ai.js';
import { translationService } from '../services/translation.js';
import {
  loadCaptionHistory,
  saveCaptionHistory,
  updateFrequency,
  addToSuggestions,
  getSuggestions,
  learnFromExistingCaptions
} from '../utils/caption-history.js';

export default function captionCmd() {
  const cmd = new Command('caption')
    .description('Interactively add/edit captions in a device folder')
    .requiredOption('--device <name>', 'device name (iphone|ipad|mac|watch)')
    .option('--lang <code>', 'primary language code', 'en')
    .option('--translate', 'enable AI-powered translation')
    .option('--langs <codes>', 'target languages for translation (comma-separated)')
    .option('--model <name>', 'OpenAI model to use', 'gpt-4o-mini')
    .action(async ({ device, lang, translate, langs, model }) => {
      try {
        const dir = path.join(process.cwd(), 'screenshots', device);
        const captionsFile = path.join(process.cwd(), '.appshot', 'captions', `${device}.json`);

        // Check if directory exists
        try {
          await fs.access(dir);
        } catch {
          console.error(pc.red('Error:'), `Directory ${dir} does not exist`);
          console.log(pc.dim('Run'), pc.cyan('appshot init'), pc.dim('first to set up the project structure'));
          process.exit(1);
        }

        // Get all image files
        const files = (await fs.readdir(dir))
          .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
          .sort();

        if (files.length === 0) {
          console.log(pc.yellow('No screenshots found in'), dir);
          console.log(pc.dim('Add .png, .jpg, or .jpeg files to this directory first'));
          process.exit(0);
        }

        // Load existing captions
        let captions: CaptionsFile = {};
        try {
          const content = await fs.readFile(captionsFile, 'utf8');
          captions = JSON.parse(content);
        } catch {
          // File doesn't exist or is invalid, start fresh
        }

        // Load caption history for autocomplete
        const history = await loadCaptionHistory();
        await learnFromExistingCaptions(history);

        // Check translation setup
        let targetLanguages: string[] = [];
        let selectedModel = model as OpenAIModel;

        if (translate) {
          if (!translationService.hasApiKey()) {
            console.error(pc.red('Error:'), 'OpenAI API key not found');
            console.log(pc.dim('Set the OPENAI_API_KEY environment variable to enable translations'));
            process.exit(1);
          }

          // Parse target languages
          if (langs) {
            targetLanguages = langs.split(',').map((l: string) => l.trim());
          } else {
            // Ask for target languages if not provided
            console.log(pc.cyan('\nSelect target languages for translation:'));
            console.log(pc.dim('Common options: es, fr, de, it, pt, ja, ko, zh-CN'));
            const langsInput = await autocomplete({
              message: 'Target languages (comma-separated):',
              default: 'es,fr,de',
              source: async () => []
            });
            targetLanguages = (langsInput as string).split(',').map((l: string) => l.trim());
          }

          // Validate model selection
          const availableModels = translationService.getAvailableModels();
          if (!availableModels.includes(selectedModel)) {
            console.log(pc.yellow('\nSelect AI model for translation:'));
            selectedModel = await select({
              message: 'Choose model:',
              choices: availableModels.map(m => {
                const info = translationService.getModelInfo(m);
                return {
                  value: m,
                  description: info ? `Context: ${info.contextWindow}, Max output: ${info.maxTokens}` : ''
                };
              })
            }) as OpenAIModel;
          }

          await translationService.loadConfig();
          console.log(pc.green('✓'), `Translation enabled: ${lang} → ${targetLanguages.join(', ')}`);
          console.log(pc.dim(`Using model: ${selectedModel}\n`));
        }

        console.log(pc.bold(`\nAdding captions for ${device} (${lang}):`));
        console.log(pc.dim('Type to search suggestions, use arrow keys to navigate'));
        console.log(pc.dim('Press Tab to autocomplete, Enter to confirm\n'));

        // Process each file
        for (const file of files) {
          const existing = captions[file];
          let currentCaption = '';

          if (typeof existing === 'string') {
            currentCaption = existing;
          } else if (existing && typeof existing === 'object') {
            currentCaption = existing[lang] || '';
          }

          // Get suggestions for this device
          const suggestions = getSuggestions(history, device);

          // Use autocomplete prompt
          const text = await autocomplete({
            message: `${file}:`,
            default: currentCaption,
            source: async (input) => {
              if (!input) {
                // Show all suggestions when no input
                return suggestions.map(s => ({
                  value: s,
                  description: history.frequency[s] ?
                    pc.dim(` (used ${history.frequency[s]} times)`) : ''
                }));
              }

              // Use fuzzy search to filter suggestions
              const results = fuzzy.filter(input, suggestions);

              // Also allow typing a new caption not in suggestions
              const matches = results.map(r => ({
                value: r.string,
                description: history.frequency[r.string] ?
                  pc.dim(` (used ${history.frequency[r.string]} times)`) : ''
              }));

              // Add the current input as an option if it's not in suggestions
              if (!suggestions.includes(input)) {
                matches.unshift({
                  value: input,
                  description: pc.cyan(' (new caption)')
                });
              }

              return matches;
            }
          });

          // Update history with the new caption
          if (text && text !== currentCaption) {
            updateFrequency(history, text);
            addToSuggestions(history, text, device);
          }

          // Store caption in structured format
          if (!captions[file] || typeof captions[file] === 'string') {
            captions[file] = {} as CaptionEntry;
          }
          (captions[file] as CaptionEntry)[lang] = text;

          // Translate if enabled
          if (translate && text && targetLanguages.length > 0) {
            process.stdout.write(pc.dim('  Translating...'));

            try {
              const translations = await translationService.translate({
                text,
                targetLanguages,
                model: selectedModel
              });

              // Clear the "Translating..." message
              process.stdout.write('\r\x1b[K');

              // Store translations
              for (const [langCode, translation] of Object.entries(translations)) {
                (captions[file] as CaptionEntry)[langCode] = translation;
                console.log(pc.dim(`  ${langCode}: ${translation}`));
              }
            } catch (error) {
              // Clear the "Translating..." message
              process.stdout.write('\r\x1b[K');
              console.error(pc.yellow('  Translation failed:'), error instanceof Error ? error.message : String(error));
              // Continue without translations
            }
          }
        }

        // Save updated captions
        await fs.writeFile(captionsFile, JSON.stringify(captions, null, 2), 'utf8');

        // Save updated history
        await saveCaptionHistory(history);

        console.log('\n' + pc.green('✓'), `Updated ${path.relative(process.cwd(), captionsFile)}`);
        console.log(pc.dim('Run'), pc.cyan('appshot build'), pc.dim('to generate screenshots with these captions'));
      } catch (error) {
        console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}