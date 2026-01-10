/**
 * Network Service
 * Manages network status checking and change listeners
 * Provides network state information and detects offline-to-online transitions
 */
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { store } from '../../store';
import { setOnline } from '../../store/slices/syncSlice';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType;
  lastChanged: number;
  previousState?: NetworkState;
}

type NetworkStateChangeCallback = (state: NetworkState) => void;
type NetworkStateChangeListener = (unsubscribe: () => void) => void;

class NetworkService {
  private currentState: NetworkState | null = null;
  private listeners: Set<NetworkStateChangeCallback> = new Set();
  private netInfoUnsubscribe: (() => void) | null = null;
  private isInitialized = false;

  /**
   * Get current network state
   */
  async getCurrentState(): Promise<NetworkState> {
    const netInfoState = await NetInfo.fetch();
    const state: NetworkState = {
      isConnected: Boolean(netInfoState.isConnected),
      isInternetReachable: netInfoState.isInternetReachable ?? null,
      type: netInfoState.type,
      lastChanged: Date.now(),
    };

    this.currentState = state;
    return state;
  }

  /**
   * Check if device is online (connected and internet reachable)
   */
  async isOnline(): Promise<boolean> {
    const state = await this.getCurrentState();
    return Boolean(state.isConnected && state.isInternetReachable);
  }

  /**
   * Check if device just came online (was offline, now online)
   */
  isOnlineTransition(newState: NetworkState): boolean {
    if (!this.currentState) {
      // First check, can't determine transition
      return false;
    }

    const wasOffline = !this.currentState.isConnected || this.currentState.isInternetReachable === false;
    const isNowOnline = newState.isConnected && newState.isInternetReachable === true;

    return wasOffline && isNowOnline;
  }

  /**
   * Check if device just went offline (was online, now offline)
   */
  isOfflineTransition(newState: NetworkState): boolean {
    if (!this.currentState) {
      // First check, can't determine transition
      return false;
    }

    const wasOnline = this.currentState.isConnected && this.currentState.isInternetReachable === true;
    const isNowOffline = !newState.isConnected || newState.isInternetReachable === false;

    return wasOnline && isNowOffline;
  }

  /**
   * Subscribe to network state changes
   */
  subscribe(callback: NetworkStateChangeCallback): () => void {
    this.listeners.add(callback);

    // Initialize if not already done
    if (!this.isInitialized) {
      this.initialize();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Initialize network monitoring
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Get initial state
    await this.getCurrentState();
    this.updateReduxState();

    // Subscribe to NetInfo changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((netInfoState: NetInfoState) => {
      const newState: NetworkState = {
        isConnected: Boolean(netInfoState.isConnected),
        isInternetReachable: netInfoState.isInternetReachable ?? null,
        type: netInfoState.type,
        lastChanged: Date.now(),
        previousState: this.currentState ? { ...this.currentState } : undefined,
      };

      const previousState = this.currentState;
      this.currentState = newState;

      // Update Redux state
      this.updateReduxState();

      // Notify all listeners
      this.listeners.forEach((callback) => {
        try {
          callback(newState);
        } catch (error) {
          console.error('Error in network state change callback:', error);
        }
      });
    });

    this.isInitialized = true;
  }

  /**
   * Update Redux state with current network status
   */
  private updateReduxState(): void {
    if (this.currentState) {
      const isOnline = Boolean(
        this.currentState.isConnected && this.currentState.isInternetReachable
      );
      store.dispatch(setOnline(isOnline));
    }
  }

  /**
   * Get current network state (synchronous, may be stale)
   */
  getState(): NetworkState | null {
    return this.currentState;
  }

  /**
   * Cleanup - unsubscribe from network monitoring
   */
  cleanup(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const networkService = new NetworkService();
