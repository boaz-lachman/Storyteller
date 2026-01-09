/**
 * Network Service
 * Monitors network connectivity and provides network status information
 * Updates Redux store with network state changes
 * Detects network improvements (offline to online transitions)
 */
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { store } from '../../store';
import { setOnline } from '../../store/slices/syncSlice';

/**
 * Check current network status
 */
export async function checkNetworkStatus(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    const isConnected = Boolean(netInfo.isConnected && netInfo.isInternetReachable);
    
    // Update Redux store
    store.dispatch(setOnline(isConnected));
    
    return isConnected;
  } catch (error) {
    console.error('Error checking network status:', error);
    // Default to offline on error
    store.dispatch(setOnline(false));
    return false;
  }
}

/**
 * Get current network state without updating Redux
 */
export async function getNetworkState(): Promise<NetInfoState> {
  return await NetInfo.fetch();
}

/**
 * Check if device is currently online
 */
export async function isOnline(): Promise<boolean> {
  const netInfo = await NetInfo.fetch();
  return Boolean(netInfo.isConnected && netInfo.isInternetReachable);
}

/**
 * Start listening to network state changes
 * Updates Redux store when network state changes
 * Returns unsubscribe function
 */
export function subscribeToNetworkChanges(
  onNetworkChange?: (isOnline: boolean, wasOffline: boolean) => void
): () => void {
  let previousState: boolean | null = null;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = Boolean(state.isConnected && state.isInternetReachable);
    
    // Determine if this is a network improvement (offline to online)
    const wasOffline = previousState === false;
    const networkImproved = wasOffline && isConnected;
    
    // Update Redux store
    store.dispatch(setOnline(isConnected));
    
    // Call callback if provided
    if (onNetworkChange) {
      onNetworkChange(isConnected, networkImproved);
    }
    
    // Update previous state
    previousState = isConnected;
  });

  // Return unsubscribe function
  return () => {
    unsubscribe();
  };
}

/**
 * Initialize network monitoring
 * Checks initial network status and starts listening to changes
 */
export async function initializeNetworkMonitoring(
  onNetworkChange?: (isOnline: boolean, networkImproved: boolean) => void
): Promise<() => void> {
  // Check initial status
  await checkNetworkStatus();
  
  // Start listening to changes
  const unsubscribe = subscribeToNetworkChanges(onNetworkChange);
  
  return unsubscribe;
}
