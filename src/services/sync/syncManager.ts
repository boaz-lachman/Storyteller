/**
 * Sync Manager
 * Coordinates all sync operations and prevents concurrent syncs
 * Manages sync triggers: app start, foreground, network changes, entity changes, manual
 */
import { AppState, AppStateStatus } from 'react-native';
import { store } from '../../store';
import {
  setSyncing,
  setLastSyncTime,
  setSyncError,
  selectIsSyncing,
} from '../../store/slices/syncSlice';
import { networkService, type NetworkState } from '../network/networkService';
import { syncAll, incrementalSync } from './syncService';
import { getLastIncrementalSyncTime } from '../database/syncMetadata';
import { syncQueueManager } from './queueManager';
import { registerBackgroundSync } from './backgroundSync';
import { getCurrentTimestamp, debounce } from '../../utils/helpers';

type SyncTriggerReason =
  | 'app-start'
  | 'foreground'
  | 'network-online'
  | 'entity-change'
  | 'manual'
  | 'scheduled';

interface SyncOptions {
  skipIfSyncing?: boolean;
  processQueue?: boolean;
  reason?: SyncTriggerReason;
}

class SyncManager {
  private syncLock = false;
  private pendingSyncRequest: { userId: string; options: SyncOptions } | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  private isInitialized = false;

  // Debounced sync for entity changes (wait 2 seconds after last change)
  private debouncedSync = debounce(async (userId: string) => {
    await this.performSync(userId, {
      skipIfSyncing: true,
      processQueue: true,
      reason: 'entity-change',
    });
  }, 2000);

  /**
   * Initialize sync manager with all listeners
   */
  async initialize(userId: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Set up AppState listener for foreground detection
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground
        this.triggerSync(userId, {
          skipIfSyncing: true,
          processQueue: true,
          reason: 'foreground',
        });
      }
    });

    // Set up network state listener
    this.networkUnsubscribe = networkService.subscribe((state: NetworkState) => {
      // Detect offline-to-online transition
      if (networkService.isOnlineTransition(state)) {
        console.log('Network came online, triggering sync...');
        this.triggerSync(userId, {
          skipIfSyncing: true,
          processQueue: true,
          reason: 'network-online',
        });
      }
    });

    this.isInitialized = true;

    // Register background sync
    registerBackgroundSync(userId).catch((error) => {
      console.error('Failed to register background sync:', error);
    });

    // Initial sync on app start if online
    const isOnline = await networkService.isOnline();
    if (isOnline) {
      // Small delay to ensure everything is initialized
      setTimeout(() => {
        this.triggerSync(userId, {
          skipIfSyncing: true,
          processQueue: true,
          reason: 'app-start',
        });
      }, 1000);
    }
  }

  /**
   * Trigger a sync operation
   * This method handles queuing and prevents concurrent syncs
   */
  async triggerSync(userId: string, options: SyncOptions = {}): Promise<void> {
    const {
      skipIfSyncing = true,
      processQueue = true,
      reason = 'manual',
    } = options;

    // Check if already syncing
    const isSyncing = store.getState().sync.isSyncing || this.syncLock;

    if (skipIfSyncing && isSyncing) {
      console.log(`Sync skipped (already syncing) - reason: ${reason}`);
      // Store as pending request
      this.pendingSyncRequest = { userId, options };
      return;
    }

    // If lock is held, queue the request
    if (this.syncLock) {
      console.log(`Sync request queued - reason: ${reason}`);
      this.pendingSyncRequest = { userId, options };
      return;
    }

    // Perform sync
    await this.performSync(userId, { ...options, reason });
  }

  /**
   * Trigger sync on entity change (debounced)
   */
  triggerSyncOnEntityChange(userId: string): void {
    this.debouncedSync(userId);
  }

  /**
   * Perform manual sync (always attempts, even if already syncing)
   */
  async manualSync(userId: string): Promise<void> {
    await this.performSync(userId, {
      skipIfSyncing: false,
      processQueue: true,
      reason: 'manual',
    });
  }

  /**
   * Internal method to perform sync with lock management
   */
  private async performSync(
    userId: string,
    options: SyncOptions
  ): Promise<void> {
    // Acquire lock
    if (this.syncLock) {
      console.log('Sync lock already held, queuing request');
      this.pendingSyncRequest = { userId, options };
      return;
    }

    this.syncLock = true;

    try {
      const { processQueue = true, reason = 'manual' } = options;

      // Check if online
      const isOnline = await networkService.isOnline();
      if (!isOnline) {
        console.log('Sync skipped - no network connection');
        store.dispatch(setSyncError('No network connection'));
        return;
      }

      // Update Redux state
      store.dispatch(setSyncing(true));
      store.dispatch(setSyncError(null));

      console.log(`Starting sync - reason: ${reason}`);

      // Process sync queue first if enabled
      if (processQueue) {
        try {
          const queueResult = await syncQueueManager.processQueue(userId);
          console.log(
            `Queue processed: ${queueResult.processed} processed, ${queueResult.failed} failed`
          );
        } catch (error) {
          console.error('Error processing sync queue:', error);
        }
      }

      // Check if we should use incremental sync
      const lastSyncTime = await getLastIncrementalSyncTime(userId);
      const useIncremental = lastSyncTime !== null;

      // Perform sync (incremental if possible, full otherwise)
      let syncResult;
      if (useIncremental) {
        console.log(`Sync: Performing incremental sync (last sync: ${new Date(lastSyncTime).toISOString()})`);
        syncResult = await incrementalSync(userId);
      } else {
        console.log('Sync: Performing full sync (no previous sync found)');
        syncResult = await syncAll(userId);
      }

      if (syncResult.success) {
        store.dispatch(setLastSyncTime(getCurrentTimestamp()));
        console.log(
          `Sync completed: ${syncResult.pushed} pushed, ${syncResult.pulled} pulled - reason: ${reason}`
        );

        // Invalidate RTK Query cache to update sync indicators across all screens
        // This ensures entities refetch with updated synced status
        // Use require to avoid circular dependencies (only load when needed)
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { storiesApi } = require('../../store/api/storiesApi');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { charactersApi } = require('../../store/api/charactersApi');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { blurbsApi } = require('../../store/api/blurbsApi');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { scenesApi } = require('../../store/api/scenesApi');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { chaptersApi } = require('../../store/api/chaptersApi');
          
          store.dispatch(storiesApi.util.invalidateTags([{ type: 'Story' }]));
          store.dispatch(charactersApi.util.invalidateTags([{ type: 'Character' }]));
          store.dispatch(blurbsApi.util.invalidateTags([{ type: 'Blurb' }]));
          store.dispatch(scenesApi.util.invalidateTags([{ type: 'Scene' }]));
          store.dispatch(chaptersApi.util.invalidateTags([{ type: 'Chapter' }]));
          console.log('RTK Query cache invalidated - sync indicators will update');
        } catch (error) {
          console.error('Error invalidating RTK Query cache:', error);
          // Non-critical error, continue
        }
      } else {
        const errorMessage = syncResult.errors.join(', ') || 'Sync failed';
        store.dispatch(setSyncError(errorMessage));
        console.error(`Sync failed - reason: ${reason}`, errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      store.dispatch(setSyncError(errorMessage));
      console.error('Sync error:', error);
    } finally {
      // Release lock
      this.syncLock = false;
      store.dispatch(setSyncing(false));

      // Process pending request if any
      if (this.pendingSyncRequest) {
        const pending = this.pendingSyncRequest;
        this.pendingSyncRequest = null;

        // Small delay before processing pending request
        setTimeout(() => {
          this.performSync(pending.userId, pending.options);
        }, 500);
      }
    }
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncing(): boolean {
    return this.syncLock || store.getState().sync.isSyncing;
  }

  /**
   * Cleanup - remove all listeners
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.debouncedSync.cancel();
    this.pendingSyncRequest = null;
    this.isInitialized = false;
    this.syncLock = false;
  }
}

// Singleton instance
export const syncManager = new SyncManager();
