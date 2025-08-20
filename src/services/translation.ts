import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';
import type {
  OpenAIModel,
  ModelConfig,
  TranslationOptions,
  TranslationResult,
  AIConfig
} from '../types/ai.js';
import { MODEL_CONFIGS } from '../types/ai.js';

// Cache for translations to avoid duplicate API calls
const translationCache = new Map<string, TranslationResult>();

export class TranslationService {
  private client: OpenAI | null = null;
  private config: AIConfig;

  constructor() {
    this.config = {
      defaultModel: 'gpt-4o-mini',
      temperature: 0.3,
      cache: true
    };

    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  public hasApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  public async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), '.appshot', 'ai-config.json');
      const content = await fs.readFile(configPath, 'utf8');
      const loadedConfig = JSON.parse(content) as Partial<AIConfig>;
      this.config = { ...this.config, ...loadedConfig };
    } catch {
      // Config file doesn't exist, use defaults
    }
  }

  public async saveConfig(config: Partial<AIConfig>): Promise<void> {
    const configPath = path.join(process.cwd(), '.appshot', 'ai-config.json');
    this.config = { ...this.config, ...config };

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(this.config, null, 2), 'utf8');
  }

  private getCacheKey(text: string, languages: string[], model: OpenAIModel): string {
    return `${model}:${languages.sort().join(',')}:${text}`;
  }

  public async translate(options: TranslationOptions): Promise<TranslationResult> {
    if (!this.client) {
      throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
    }

    const model = options.model || this.config.defaultModel;
    const modelConfig = MODEL_CONFIGS[model];

    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`);
    }

    // Check cache
    if (this.config.cache) {
      const cacheKey = this.getCacheKey(options.text, options.targetLanguages, model);
      const cached = translationCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build language map for the prompt
    const languageNames: Record<string, string> = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'pt-BR': 'Brazilian Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh-CN': 'Simplified Chinese',
      'zh-TW': 'Traditional Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'no': 'Norwegian',
      'da': 'Danish',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'he': 'Hebrew'
    };

    const targetLangs = options.targetLanguages
      .map(code => `${code}: ${languageNames[code] || code}`)
      .join(', ');

    const systemPrompt = options.systemPrompt || this.config.systemPrompt ||
      `You are a professional app localization expert. Translate the given app screenshot caption into the requested languages. 
       The captions are marketing text for mobile app screenshots.
       Keep translations concise, impactful, and culturally appropriate.
       Maintain the marketing tone and appeal of the original text.`;

    const userPrompt = `Translate this app screenshot caption into the following languages: ${targetLangs}

Caption: "${options.text}"

Return ONLY a JSON object with language codes as keys and translations as values. Example:
{
  "es": "Spanish translation here",
  "fr": "French translation here"
}`;

    try {
      // Build the request parameters based on model type
      const params: any = {
        model: modelConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: modelConfig.temperature,
        response_format: { type: 'json_object' }
      };

      // Use the appropriate max tokens parameter based on model
      if (modelConfig.maxTokensParam === 'max_completion_tokens') {
        params.max_completion_tokens = Math.min(modelConfig.maxTokens, 2000); // Limit for translations
      } else {
        params.max_tokens = Math.min(modelConfig.maxTokens, 2000);
      }

      const response = await this.client.chat.completions.create(params);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const translations = JSON.parse(content) as TranslationResult;

      // Validate that we got all requested languages
      for (const lang of options.targetLanguages) {
        if (!translations[lang]) {
          console.warn(pc.yellow(`Warning: Translation for ${lang} not returned by API`));
        }
      }

      // Cache the result
      if (this.config.cache) {
        const cacheKey = this.getCacheKey(options.text, options.targetLanguages, model);
        translationCache.set(cacheKey, translations);
      }

      return translations;
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (error.status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (error.status === 404) {
          throw new Error(`Model ${model} not found. You may not have access to this model.`);
        }
      }
      throw error;
    }
  }

  public async translateBatch(
    captions: string[],
    targetLanguages: string[],
    model?: OpenAIModel,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, TranslationResult>> {
    const results = new Map<string, TranslationResult>();
    const total = captions.length;

    for (let i = 0; i < captions.length; i++) {
      if (onProgress) {
        onProgress(i + 1, total);
      }

      try {
        const translations = await this.translate({
          text: captions[i],
          targetLanguages,
          model
        });
        results.set(captions[i], translations);
      } catch (error) {
        console.error(pc.red(`Failed to translate: "${captions[i]}"`));
        console.error(pc.dim(error instanceof Error ? error.message : String(error)));
        // Continue with other translations
      }

      // Add a small delay to avoid rate limits
      if (i < captions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  public getAvailableModels(): OpenAIModel[] {
    return Object.keys(MODEL_CONFIGS) as OpenAIModel[];
  }

  public getModelInfo(model: OpenAIModel): ModelConfig | undefined {
    return MODEL_CONFIGS[model];
  }

  public clearCache(): void {
    translationCache.clear();
  }
}

// Singleton instance
export const translationService = new TranslationService();