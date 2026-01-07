/**
 * RTK Query API for Claude AI story generation
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig, AxiosError } from 'axios';
import axiosInstance from '../../services/api/axiosInstance';
import { CLAUDE_API } from '../../constants/apiConstants';

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
}

/**
 * Custom base query using axiosInstance
 */
const claudeBaseQuery: BaseQueryFn<
  {
    url?: string;
    method?: AxiosRequestConfig['method'];
    data?: any;
    params?: AxiosRequestConfig['params'];
  },
  unknown,
  unknown
> = async ({ url = '', method = 'POST', data, params }) => {
  try {
    // Get API key from environment
    const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;

    if (!apiKey) {
      return {
        error: {
          status: 401,
          data: { message: 'Claude API key is not configured' },
        },
      };
    }

    // Configure request with Claude API headers
    const config: AxiosRequestConfig = {
      url: `${CLAUDE_API.BASE_URL}${url}`,
      method,
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
        'anthropic-version': CLAUDE_API.ANTHROPIC_VERSION,
      },
      data,
      params,
    };

    const result = await axiosInstance.request(config);

    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError;
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data || err.message,
      },
    };
  }
};

/**
 * Claude API RTK Query instance
 */
export const claudeApi = createApi({
  reducerPath: 'claudeApi',
  baseQuery: claudeBaseQuery,
  tagTypes: ['GeneratedStory'],
  endpoints: (builder) => ({
    /**
     * Generate a story using Claude AI
     */
    generateStory: builder.mutation<ClaudeResponse, GenerateStoryRequest>({
      query: ({
        messages,
        maxTokens = CLAUDE_API.DEFAULT_MAX_TOKENS,
        model = CLAUDE_API.DEFAULT_MODEL,
      }) => {
        const requestBody: ClaudeRequest = {
          model,
          max_tokens: maxTokens,
          messages,
        };

        return {
          url: '',
          method: 'POST',
          data: requestBody,
        };
      },
      invalidatesTags: ['GeneratedStory'],
    }),

    /**
     * Stream story generation (if needed in the future)
     * Note: Streaming requires different handling, this is a placeholder
     */
    generateStoryStream: builder.mutation<ClaudeResponse, GenerateStoryRequest>({
      query: ({
        messages,
        maxTokens = CLAUDE_API.DEFAULT_MAX_TOKENS,
        model = CLAUDE_API.DEFAULT_MODEL,
      }) => {
        const requestBody: ClaudeRequest = {
          model,
          max_tokens: maxTokens,
          messages,
        };

        return {
          url: '',
          method: 'POST',
          data: requestBody,
          // Note: Streaming would require additional configuration
        };
      },
    }),
  }),
});

export const { useGenerateStoryMutation, useGenerateStoryStreamMutation } =
  claudeApi;
