import axios from 'axios';
import axiosRetry from 'axios-retry';
import NetInfo from '@react-native-community/netinfo';

/**
 * Configured axios instance with retry logic
 * Note: Timeout is set per-request for Claude API calls (5 minutes)
 * This default timeout is for other API calls
 */
const axiosInstance = axios.create({
  timeout: 30000, // 30 second default timeout (increased from 10s for better reliability)
});

/**
 * Configure axios retry
 */
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  // Attach callback to each retry to handle logging or tracking
  onRetry: (retryCount, err) => {
    console.log(`Retrying request: ${err.message}`);
  },
  // Specify conditions to retry on
  retryCondition: async (error) => {
    // Check network connectivity first
    const netInfo = await NetInfo.fetch();

    // Don't retry if no connectivity
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      return false;
    }

    // Use default retry condition for other errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error);
  },
});

export default axiosInstance;
