/**
 * Claude AI Service
 * Handles API communication with Claude AI for story generation
 */
import axiosInstance from './axiosInstance';
import { CLAUDE_API } from '../../constants/apiConstants';
import type { AxiosError } from 'axios';
import Constants from 'expo-constants';

/**
 * Claude API message structure
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Request body for Claude API
 */
export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string; // Optional system prompt
}

/**
 * Response from Claude API
 */
export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Story generation request parameters
 */
export interface GenerateStoryRequest {
  messages: ClaudeMessage[];
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
}

/**
 * Story generation response
 */
export interface GenerateStoryResponse {
  content: string;
  wordCount: number;
  prompt: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Claude API error
 */
export class ClaudeServiceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ClaudeServiceError';
  }
}

/**
 * Get API key from environment
 * Throws error if not configured
 */
const getApiKey = (): string => {
  const apiKey = Constants.expoConfig?.extra?.claudeAPIKey;
  
  if (!apiKey) {
    throw new ClaudeServiceError(
      'Claude API key is not configured. Please set CLAUDE_API_KEY in your environment variables.',
      401,
      'API_KEY_MISSING'
    );
  }

  return apiKey;
};

/**
 * Parse Claude API response
 */
const parseClaudeResponse = (response: ClaudeResponse): string => {
  if (!response.content || response.content.length === 0) {
    throw new ClaudeServiceError(
      'Empty response from Claude API',
      500,
      'EMPTY_RESPONSE'
    );
  }

  // Extract text from content array
  const textContent = response.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('');

  if (!textContent) {
    throw new ClaudeServiceError(
      'No text content in Claude API response',
      500,
      'NO_TEXT_CONTENT'
    );
  }

  return textContent;
};

/**
 * Count words in text
 */
const countWords = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }
  // Split by whitespace and filter out empty strings
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
};

/**
 * Handle API errors
 */
const handleApiError = (error: unknown): never => {
  if (error instanceof ClaudeServiceError) {
    throw error;
  }

  const axiosError = error as AxiosError<{ error?: { message?: string; type?: string } }>;
  
  if (axiosError.response) {
    const status = axiosError.response.status;
    const errorData = axiosError.response.data;
    const errorMessage = errorData?.error?.message || axiosError.message || 'Unknown API error';
    const errorCode = errorData?.error?.type || `HTTP_${status}`;

    throw new ClaudeServiceError(errorMessage, status, errorCode);
  }

  if (axiosError.request) {
    throw new ClaudeServiceError(
      'No response received from Claude API. Please check your internet connection.',
      0,
      'NO_RESPONSE'
    );
  }

  throw new ClaudeServiceError(
    axiosError.message || 'An unexpected error occurred',
    500,
    'UNKNOWN_ERROR'
  );
};

/**
 * Generate a story using Claude AI
 * @param request - Story generation request parameters
 * @returns Generated story content and metadata
 */
export const generateStory = async (
  request: GenerateStoryRequest
): Promise<GenerateStoryResponse | undefined> => {
  try {
    const apiKey = getApiKey();

    // Build request body
    const requestBody: ClaudeRequest = {
      model: request.model || CLAUDE_API.DEFAULT_MODEL,
      max_tokens: request.maxTokens || CLAUDE_API.DEFAULT_MAX_TOKENS,
      messages: request.messages,
    };

    // Add system prompt if provided
    if (request.systemPrompt) {
      requestBody.system = request.systemPrompt;
    }

    // Make API request
    const response = await axiosInstance.post<ClaudeResponse>(
      CLAUDE_API.BASE_URL,
      requestBody,
      {
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
          'anthropic-version': CLAUDE_API.ANTHROPIC_VERSION,
        },
        timeout: 1200000, // 20 minutes timeout for story generation
      }
    );

    // Parse response
    const content = parseClaudeResponse(response.data);

    // Build prompt string from messages
    const prompt = request.messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    // Count words
    const wordCount = countWords(content);

    return {
      content,
      wordCount,
      prompt,
      usage: {
        inputTokens: response.data.usage.input_tokens,
        outputTokens: response.data.usage.output_tokens,
      },
    };
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Validate API key configuration
 * @returns true if API key is configured, false otherwise
 */
export const isApiKeyConfigured = (): boolean => {
  try {
    getApiKey();
    return true;
  } catch {
    return false;
  }
};

/**
 * Test API connection
 * @returns true if connection is successful, throws error otherwise
 */
export const testApiConnection = async (): Promise<boolean> => {
  try {
    const apiKey = getApiKey();

    // Make a minimal test request
    const testRequest: ClaudeRequest = {
      model: CLAUDE_API.DEFAULT_MODEL,
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Say "test"',
        },
      ],
    };

    await axiosInstance.post(
      CLAUDE_API.BASE_URL,
      testRequest,
      {
        headers: {
          'x-api-key': apiKey,
          'content-type': 'application/json',
          'anthropic-version': CLAUDE_API.ANTHROPIC_VERSION,
        },
        timeout: 10000, // 10 seconds timeout for test
      }
    );

    return true;
  } catch (error) {
    handleApiError(error);
    return false;
  }
};
