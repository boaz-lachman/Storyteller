/**
 * Sync hook for managing data synchronization
 * Provides sync functionality and status
 * Uses syncManager to prevent concurrent syncs and handle all sync triggers
 */
import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  selectIsSyncing,
  selectLastSyncTime,
  selectIsOnline,
  selectSyncError,
  selectSyncQueue,
} from '../store/slices/syncSlice';
import { syncManager } from '../services/sync/syncManager';
import { networkService } from '../services/network/networkService';
import { useAuth } from './useAuth';

/**
 * Hook for managing sync operations
 * Integrates with syncManager to handle all sync triggers
 * Optimized with shallow equality to reduce re-renders
 */
export const useSync = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  // Use shallow equality to prevent re-renders when unrelated sync state changes
  const isSyncing = useAppSelector(selectIsSyncing, (left, right) => left === right);
  const lastSyncTime = useAppSelector(selectLastSyncTime, (left, right) => left === right);
  const isOnline = useAppSelector(selectIsOnline, (left, right) => left === right);
  const syncError = useAppSelector(selectSyncError, (left, right) => left === right);
  // For syncQueue, use shallow equality since it's an array
  const syncQueue = useAppSelector(selectSyncQueue, (left, right) => {
    if (left.length !== right.length) return false;
    return left.every((item, index) => item.id === right[index]?.id);
  });
  const isInitialized = useRef(false);

  /**
   * Initialize sync manager on mount
   */
  useEffect(() => {
    if (user?.uid && !isInitialized.current) {
      syncManager.initialize(user.uid);
      isInitialized.current = true;
    }

    // Cleanup on unmount
    return () => {
      if (isInitialized.current) {
        syncManager.cleanup();
        isInitialized.current = false;
      }
    };
  }, [user?.uid]);

  /**
   * Manual sync trigger
   */
  const performSync = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      return;
    }

    // Use syncManager for manual sync (always attempts, bypasses lock check)
    await syncManager.manualSync(user.uid);
  }, [user?.uid]);

  /**
   * Trigger sync on entity change (debounced)
   */
  const triggerSyncOnEntityChange = useCallback((): void => {
    if (!user?.uid) {
      return;
    }

    syncManager.triggerSyncOnEntityChange(user.uid);
  }, [user?.uid]);

  /**
   * Update online status
   */
  const updateOnlineStatus = useCallback(async (): Promise<boolean> => {
    return await networkService.isOnline();
  }, []);

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
    triggerSyncOnEntityChange,
    checkOnline: updateOnlineStatus,
  };
};
