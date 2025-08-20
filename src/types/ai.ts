export type OpenAIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano'
  | 'o1'
  | 'o1-mini'
  | 'o3'
  | 'o3-mini';

export interface ModelConfig {
  model: OpenAIModel;
  maxTokensParam: 'max_tokens' | 'max_completion_tokens';
  maxTokens: number;
  temperature?: number;
  contextWindow: number;
}

export const MODEL_CONFIGS: Record<OpenAIModel, ModelConfig> = {
  'gpt-4o': {
    model: 'gpt-4o',
    maxTokensParam: 'max_tokens',
    maxTokens: 16384,
    temperature: 0.3,
    contextWindow: 128000
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    maxTokensParam: 'max_tokens',
    maxTokens: 16384,
    temperature: 0.3,
    contextWindow: 128000
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    maxTokensParam: 'max_tokens',
    maxTokens: 4096,
    temperature: 0.3,
    contextWindow: 128000
  },
  'gpt-5': {
    model: 'gpt-5',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 16384,
    temperature: 1, // GPT-5 models have fixed temperature
    contextWindow: 200000
  },
  'gpt-5-mini': {
    model: 'gpt-5-mini',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 8192,
    temperature: 1, // GPT-5 models have fixed temperature
    contextWindow: 128000
  },
  'gpt-5-nano': {
    model: 'gpt-5-nano',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 4096,
    temperature: 1, // GPT-5 models have fixed temperature
    contextWindow: 64000
  },
  'o1': {
    model: 'o1',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 100000,
    temperature: 1, // o1 models have fixed temperature
    contextWindow: 200000
  },
  'o1-mini': {
    model: 'o1-mini',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 65536,
    temperature: 1,
    contextWindow: 128000
  },
  'o3': {
    model: 'o3',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 100000,
    temperature: 1,
    contextWindow: 200000
  },
  'o3-mini': {
    model: 'o3-mini',
    maxTokensParam: 'max_completion_tokens',
    maxTokens: 65536,
    temperature: 1,
    contextWindow: 128000
  }
};

export interface TranslationOptions {
  text: string;
  targetLanguages: string[];
  model?: OpenAIModel;
  systemPrompt?: string;
}

export interface TranslationResult {
  [lang: string]: string;
}

export interface AIConfig {
  defaultModel: OpenAIModel;
  temperature?: number;
  systemPrompt?: string;
  cache?: boolean;
}