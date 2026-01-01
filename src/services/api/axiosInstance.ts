import axios from 'axios';
import axiosRetry from 'axios-retry';
import NetInfo from '@react-native-community/netinfo';

/**
 * Configured axios instance with retry logic
 */
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
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
