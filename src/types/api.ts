/**
 * API response and request types
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp?: number;
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
  details?: any;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages?: number;
}

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  url: string;
  method: HttpMethod;
  requiresAuth?: boolean;
}

/**
 * Request status
 */
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * API state for a request
 */
export interface ApiState<T = any> {
  data: T | null;
  status: RequestStatus;
  error: ApiError | null;
  isLoading: boolean;
  lastFetch?: number;
}

/**
 * Mutation response
 */
export interface MutationResponse<T = any> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

/**
 * Query parameters
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
