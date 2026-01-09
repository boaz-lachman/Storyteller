/**
 * Sync Hook
 * Handles automatic sync triggers:
 * - Sync on app start (if online)
 * - Sync when app enters foreground
 * - Sync when network improves (offline to online)
 * - Manual sync trigger
 */
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { debounce } from 'lodash';
import { useAppSelector, useAppDispatch } from './redux';
import { selectUser } from '../store/slices/authSlice';
import { selectIsOnline, selectIsSyncing } from '../store/slices/syncSlice';
import { syncAll } from '../services/sync/syncService';
import { initializeNetworkMonitoring } from '../services/network/networkService';
import { getCurrentTimestamp } from '../utils/helpers';

/**
 * Hook for managing sync operations
 * Provides automatic sync triggers and manual sync function
 */
export const useSync = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isOnline = useAppSelector(selectIsOnline);
  const isSyncing = useAppSelector(selectIsSyncing);
  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const networkUnsubscribeRef = useRef<(() => void) | null>(null);
  const hasInitialSyncRef = useRef(false);
  const networkInitializedRef = useRef(false);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async () => {
    if (!user?.uid) {
      console.log('Sync skipped: No user');
      return;
    }

    if (syncInProgressRef.current) {
      console.log('Sync skipped: Already in progress');
      return;
    }

    if (!isOnline) {
      console.log('Sync skipped: Offline');
      return;
    }

    try {
      syncInProgressRef.current = true;
      console.log('Starting sync...');
      
      const result = await syncAll(user.uid);
      
      if (result.success) {
        console.log(`Sync completed: ${result.pushed} pushed, ${result.pulled} pulled`);
        lastSyncTimeRef.current = getCurrentTimestamp();
      } else {
        console.error('Sync failed:', result.errors);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [user, isOnline]);

  /**
   * Debounced sync for entity changes and all automatic triggers
   * Prevents multiple syncs from happening in quick succession
   */
  const debouncedSync = useRef(
    debounce(() => {
      performSync();
    }, 6000) // 6 second debounce to prevent rapid syncs
  ).current;

  /**
   * Manual sync trigger
   */
  const triggerSync = useCallback(() => {
    performSync();
  }, [performSync]);

  /**
   * Trigger sync on entity change (debounced)
   */
  const triggerSyncOnChange = useCallback(() => {
    debouncedSync();
  }, [debouncedSync]);

  /**
   * Initialize network monitoring
   */
  useEffect(() => {
    if (!user?.uid) {
      // Reset flags when user logs out
      networkInitializedRef.current = false;
      if (networkUnsubscribeRef.current) {
        networkUnsubscribeRef.current();
        networkUnsubscribeRef.current = null;
      }
      return;
    }

    // Only initialize network monitoring once
    if (networkInitializedRef.current) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    const initNetwork = async () => {
      unsubscribe = await initializeNetworkMonitoring(
        (isOnline, networkImproved) => {
          console.log(`Network status: ${isOnline ? 'online' : 'offline'}, improved: ${networkImproved}`);
          
          // Sync when network improves (offline to online)
          // But skip if this is the initial network status detection (not a real improvement)
          if (networkImproved && networkInitializedRef.current) {
            console.log('Network improved, triggering debounced sync...');
            debouncedSync();
          }
        }
      );

      networkInitializedRef.current = true;
      networkUnsubscribeRef.current = unsubscribe;
    };

    initNetwork();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      networkInitializedRef.current = false;
    };
  }, [user?.uid, performSync]);

  /**
   * Sync on app start (if online)
   * Only runs once when user is first authenticated and online
   */
  useEffect(() => {
    if (!user?.uid) {
      // Reset flag when user logs out
      hasInitialSyncRef.current = false;
      return;
    }

    // Only sync once on initial app start
    if (hasInitialSyncRef.current) {
      return;
    }

    // Small delay to ensure app is fully initialized
    const timer = setTimeout(() => {
      if (isOnline && !syncInProgressRef.current && !hasInitialSyncRef.current) {
        console.log('App started, triggering debounced initial sync...');
        hasInitialSyncRef.current = true;
        debouncedSync();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [user?.uid, isOnline, performSync]);

  /**
   * Sync when app enters foreground
   */
  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      appStateRef.current = nextAppState;

      // Sync when app enters foreground
      if (wasInBackground && isNowActive) {
        console.log('App entered foreground, triggering debounced sync...');
        debouncedSync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, performSync]);

  return {
    triggerSync,
    triggerSyncOnChange,
    isSyncing,
    isOnline,
  };
};
