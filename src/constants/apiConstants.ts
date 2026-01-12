/**
 * API constants for external services
 */

/**
 * Claude AI API constants
 */
export const CLAUDE_API = {
  BASE_URL: 'https://api.anthropic.com/v1/messages',
  ANTHROPIC_VERSION: '2023-06-01',
  DEFAULT_MODEL: 'claude-sonnet-4-5',
  DEFAULT_MAX_TOKENS: 1024,
  // Token limits to control costs
  MAX_TOKENS_PER_CHAPTER: 8000, // Limit per chapter in chunked generation
  MAX_TOKENS_SINGLE_GENERATION: 8000, // Limit for single-call generation
  MAX_TOTAL_TOKENS_PER_GENERATION: 100000, // Max total tokens (input + output) for entire generation
  MAX_CHAPTERS_FOR_GENERATION: 10, // Maximum number of chapters that can be generated in one session
  WARNING_THRESHOLD_TOKENS: 50000, // Warn user when approaching this token usage
} as const;
