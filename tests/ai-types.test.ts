import { describe, it, expect } from 'vitest';
import type { OpenAIModel, ModelConfig, TranslationOptions, TranslationResult, AIConfig } from '../src/types/ai.js';
import { MODEL_CONFIGS } from '../src/types/ai.js';

describe('AI types', () => {
  describe('OpenAIModel type', () => {
    it('should include all expected models', () => {
      const models: OpenAIModel[] = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'o1',
        'o1-mini',
        'o3',
        'o3-mini'
      ];
      
      // Ensure all models are valid OpenAIModel types
      models.forEach(model => {
        expect(MODEL_CONFIGS).toHaveProperty(model);
      });
    });
  });

  describe('ModelConfig interface', () => {
    it('should have required fields', () => {
      const config: ModelConfig = {
        model: 'gpt-4o',
        maxTokensParam: 'max_tokens',
        maxTokens: 16384,
        temperature: 0.3,
        contextWindow: 128000
      };

      expect(config.model).toBeDefined();
      expect(config.maxTokensParam).toBeDefined();
      expect(config.maxTokens).toBeDefined();
      expect(config.contextWindow).toBeDefined();
    });
  });

  describe('TranslationOptions interface', () => {
    it('should have required and optional fields', () => {
      const options: TranslationOptions = {
        text: 'Hello world',
        targetLanguages: ['es', 'fr', 'de']
      };

      expect(options.text).toBeDefined();
      expect(options.targetLanguages).toBeDefined();
      expect(options.model).toBeUndefined(); // Optional
      expect(options.systemPrompt).toBeUndefined(); // Optional
    });

    it('should accept optional fields', () => {
      const options: TranslationOptions = {
        text: 'Hello world',
        targetLanguages: ['es'],
        model: 'gpt-5',
        systemPrompt: 'Custom prompt'
      };

      expect(options.model).toBe('gpt-5');
      expect(options.systemPrompt).toBe('Custom prompt');
    });
  });

  describe('TranslationResult interface', () => {
    it('should be a record of language codes to strings', () => {
      const result: TranslationResult = {
        'es': 'Hola mundo',
        'fr': 'Bonjour le monde',
        'de': 'Hallo Welt'
      };

      expect(result['es']).toBe('Hola mundo');
      expect(result['fr']).toBe('Bonjour le monde');
      expect(result['de']).toBe('Hallo Welt');
    });
  });

  describe('AIConfig interface', () => {
    it('should have required and optional fields', () => {
      const config: AIConfig = {
        defaultModel: 'gpt-4o-mini'
      };

      expect(config.defaultModel).toBeDefined();
      expect(config.temperature).toBeUndefined(); // Optional
      expect(config.systemPrompt).toBeUndefined(); // Optional
      expect(config.cache).toBeUndefined(); // Optional
    });

    it('should accept all optional fields', () => {
      const config: AIConfig = {
        defaultModel: 'gpt-5',
        temperature: 0.5,
        systemPrompt: 'You are a translator',
        cache: true
      };

      expect(config.defaultModel).toBe('gpt-5');
      expect(config.temperature).toBe(0.5);
      expect(config.systemPrompt).toBe('You are a translator');
      expect(config.cache).toBe(true);
    });
  });

  describe('MODEL_CONFIGS completeness', () => {
    it('should have configs for all OpenAI models', () => {
      const expectedModels: OpenAIModel[] = [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'o1',
        'o1-mini',
        'o3',
        'o3-mini'
      ];

      expectedModels.forEach(model => {
        expect(MODEL_CONFIGS[model]).toBeDefined();
        expect(MODEL_CONFIGS[model].model).toBe(model);
      });
    });

    it('should have valid token limits', () => {
      Object.values(MODEL_CONFIGS).forEach(config => {
        expect(config.maxTokens).toBeGreaterThan(0);
        expect(config.maxTokens).toBeLessThanOrEqual(200000); // Max observed limit
      });
    });

    it('should have valid context windows', () => {
      Object.values(MODEL_CONFIGS).forEach(config => {
        expect(config.contextWindow).toBeGreaterThanOrEqual(64000); // Min observed
        expect(config.contextWindow).toBeLessThanOrEqual(200000); // Max observed
      });
    });
  });
});