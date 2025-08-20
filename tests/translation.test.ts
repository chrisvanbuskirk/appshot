import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationService } from '../src/services/translation.js';
import { MODEL_CONFIGS } from '../src/types/ai.js';
import type { OpenAIModel } from '../src/types/ai.js';

describe('translation service', () => {
  let service: TranslationService;

  beforeEach(() => {
    // Clear environment and create new service instance
    delete process.env.OPENAI_API_KEY;
    service = new TranslationService();
  });

  describe('API key detection', () => {
    it('should detect when API key is not set', () => {
      expect(service.hasApiKey()).toBe(false);
    });

    it('should detect when API key is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const newService = new TranslationService();
      expect(newService.hasApiKey()).toBe(true);
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('model configuration', () => {
    it('should return available models', () => {
      const models = service.getAvailableModels();
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-5');
      expect(models).toContain('gpt-5-mini');
      expect(models).toContain('o1');
      expect(models).toContain('o3');
    });

    it('should return correct model info for GPT-4o', () => {
      const info = service.getModelInfo('gpt-4o');
      expect(info).toBeDefined();
      expect(info?.maxTokensParam).toBe('max_tokens');
      expect(info?.maxTokens).toBe(16384);
      expect(info?.temperature).toBe(0.3);
    });

    it('should return correct model info for GPT-5', () => {
      const info = service.getModelInfo('gpt-5');
      expect(info).toBeDefined();
      expect(info?.maxTokensParam).toBe('max_completion_tokens');
      expect(info?.maxTokens).toBe(16384);
      expect(info?.temperature).toBe(1); // Fixed temperature for reasoning models
    });

    it('should return undefined for unknown model', () => {
      const info = service.getModelInfo('unknown-model' as OpenAIModel);
      expect(info).toBeUndefined();
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys', () => {
      // Access private method through any type casting for testing
      const serviceAny = service as any;
      const key1 = serviceAny.getCacheKey('Hello', ['es', 'fr'], 'gpt-4o');
      const key2 = serviceAny.getCacheKey('Hello', ['fr', 'es'], 'gpt-4o');
      expect(key1).toBe(key2); // Should sort languages
    });

    it('should generate different keys for different inputs', () => {
      const serviceAny = service as any;
      const key1 = serviceAny.getCacheKey('Hello', ['es'], 'gpt-4o');
      const key2 = serviceAny.getCacheKey('World', ['es'], 'gpt-4o');
      const key3 = serviceAny.getCacheKey('Hello', ['fr'], 'gpt-4o');
      const key4 = serviceAny.getCacheKey('Hello', ['es'], 'gpt-5');
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key1).not.toBe(key4);
    });
  });

  describe('translation without API key', () => {
    it('should throw error when translating without API key', async () => {
      await expect(service.translate({
        text: 'Hello',
        targetLanguages: ['es'],
      })).rejects.toThrow('OpenAI API key not found');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      service.clearCache();
      // Cache should be empty (no errors)
      expect(() => service.clearCache()).not.toThrow();
    });
  });
});

describe('MODEL_CONFIGS', () => {
  it('should have all required fields for each model', () => {
    for (const [modelName, config] of Object.entries(MODEL_CONFIGS)) {
      expect(config.model).toBe(modelName);
      expect(config.maxTokensParam).toMatch(/^(max_tokens|max_completion_tokens)$/);
      expect(config.maxTokens).toBeGreaterThan(0);
      expect(config.temperature).toBeGreaterThanOrEqual(0);
      expect(config.temperature).toBeLessThanOrEqual(2);
      expect(config.contextWindow).toBeGreaterThan(0);
    }
  });

  it('should use max_tokens for GPT-4 models', () => {
    expect(MODEL_CONFIGS['gpt-4o'].maxTokensParam).toBe('max_tokens');
    expect(MODEL_CONFIGS['gpt-4o-mini'].maxTokensParam).toBe('max_tokens');
    expect(MODEL_CONFIGS['gpt-4-turbo'].maxTokensParam).toBe('max_tokens');
  });

  it('should use max_completion_tokens for GPT-5 models', () => {
    expect(MODEL_CONFIGS['gpt-5'].maxTokensParam).toBe('max_completion_tokens');
    expect(MODEL_CONFIGS['gpt-5-mini'].maxTokensParam).toBe('max_completion_tokens');
    expect(MODEL_CONFIGS['gpt-5-nano'].maxTokensParam).toBe('max_completion_tokens');
  });

  it('should use max_completion_tokens for o1 and o3 models', () => {
    expect(MODEL_CONFIGS['o1'].maxTokensParam).toBe('max_completion_tokens');
    expect(MODEL_CONFIGS['o1-mini'].maxTokensParam).toBe('max_completion_tokens');
    expect(MODEL_CONFIGS['o3'].maxTokensParam).toBe('max_completion_tokens');
    expect(MODEL_CONFIGS['o3-mini'].maxTokensParam).toBe('max_completion_tokens');
  });

  it('should have temperature=1 for reasoning models', () => {
    // GPT-5 series
    expect(MODEL_CONFIGS['gpt-5'].temperature).toBe(1);
    expect(MODEL_CONFIGS['gpt-5-mini'].temperature).toBe(1);
    expect(MODEL_CONFIGS['gpt-5-nano'].temperature).toBe(1);
    
    // o1 series
    expect(MODEL_CONFIGS['o1'].temperature).toBe(1);
    expect(MODEL_CONFIGS['o1-mini'].temperature).toBe(1);
    
    // o3 series
    expect(MODEL_CONFIGS['o3'].temperature).toBe(1);
    expect(MODEL_CONFIGS['o3-mini'].temperature).toBe(1);
  });

  it('should have configurable temperature for GPT-4 models', () => {
    expect(MODEL_CONFIGS['gpt-4o'].temperature).toBe(0.3);
    expect(MODEL_CONFIGS['gpt-4o-mini'].temperature).toBe(0.3);
    expect(MODEL_CONFIGS['gpt-4-turbo'].temperature).toBe(0.3);
  });
});