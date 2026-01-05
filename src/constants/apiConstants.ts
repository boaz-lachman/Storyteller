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
} as const;
