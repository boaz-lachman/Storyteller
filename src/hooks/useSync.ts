/**
 * Sync hook for managing data synchronization
 * Provides sync functionality and status
 */
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setSyncing,
  setLastSyncTime,
  setOnline,
  setSyncError,
  selectIsSyncing,
  selectLastSyncTime,
  selectIsOnline,
  selectSyncError,
  selectSyncQueue,
} from '../store/slices/syncSlice';
import { syncAll } from '../services/sync/syncService';
import { isOnline as checkOnline } from '../utils/networkHelpers';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './useAuth';
import { getCurrentTimestamp } from '../utils/helpers';

/**
 * Hook for managing sync operations
 */
export const useSync = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const isSyncing = useAppSelector(selectIsSyncing);
  const lastSyncTime = useAppSelector(selectLastSyncTime);
  const isOnline = useAppSelector(selectIsOnline);
  const syncError = useAppSelector(selectSyncError);
  const syncQueue = useAppSelector(selectSyncQueue);

  /**
   * Update online status
   */
  const updateOnlineStatus = useCallback(async () => {
    const online = await checkOnline();
    dispatch(setOnline(online));
    return online;
  }, [dispatch]);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      dispatch(setSyncError('User not authenticated'));
      return;
    }

    if (isSyncing) {

      return;
    }

    const online = await updateOnlineStatus();
    if (!online) {
      dispatch(setSyncError('No network connection'));
      return;
    }

    try {
      dispatch(setSyncing(true));
      dispatch(setSyncError(null));

      const result = await syncAll(user.uid);

      if (result.success) {
        dispatch(setLastSyncTime(getCurrentTimestamp()));
        console.log(`Sync completed: ${result.pushed} pushed, ${result.pulled} pulled`);
      } else {
        dispatch(setSyncError(result.errors.join(', ')));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      dispatch(setSyncError(errorMessage));
      console.error('Sync error:', error);
    } finally {
      dispatch(setSyncing(false));
    }
  }, [user, isSyncing, dispatch, updateOnlineStatus]);

  /**
   * Monitor network status
   */
  useEffect(() => {
    // Initial check
    updateOnlineStatus();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      dispatch(setOnline(!!online ?? false));

      // Auto-sync when connection is restored
      if (online && user?.uid && !isSyncing) {
        // Small delay to ensure connection is stable
        setTimeout(() => {
          performSync();
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, updateOnlineStatus, user, isSyncing, performSync]);

  /**
   * Auto-sync on mount if online
   */
  useEffect(() => {
    if (user?.uid && isOnline && !isSyncing && lastSyncTime === null) {
      // First sync on app start
      performSync();
    }
  }, [user, isOnline, isSyncing, lastSyncTime, performSync]);

  return {
    // State
    isSyncing,
    lastSyncTime,
    isOnline,
    syncError,
    syncQueue,
    pendingCount: syncQueue.length,

    // Actions
    sync: performSync,
    checkOnline: updateOnlineStatus,
  };
};
