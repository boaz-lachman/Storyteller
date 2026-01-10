/**
 * Sync Queue Manager
 * Manages the queue of items waiting to be synced
 * Persists to SQLite for reliability across app restarts
 */
import { generateId, getCurrentTimestamp } from '../../utils/helpers';
import type { SyncQueueItem } from '../../store/slices/syncSlice';
import {
  addSyncQueueItem as dbAddSyncQueueItem,
  getAllSyncQueueItems,
  getSyncQueueItemsByType,
  getRetryableSyncQueueItems,
  getSyncQueueItem as dbGetSyncQueueItem,
  removeSyncQueueItem as dbRemoveSyncQueueItem,
  removeSyncQueueItemByEntity,
  markSyncQueueItemFailed as dbMarkSyncQueueItemFailed,
  clearSyncQueue as dbClearSyncQueue,
  clearProcessedSyncQueueItems,
  getSyncQueueSize,
  recordToSyncQueueItem,
  type SyncQueueItemRecord,
} from '../database/syncQueue';
import { networkService } from '../network/networkService';
import { store } from '../../store';
import { firestoreApi } from '../../store/api/firestoreApi';

export interface QueueItem extends SyncQueueItem {
  retryCount?: number;
  lastError?: string;
  data?: any;
}

class SyncQueueManager {
  private maxRetries = 3;
  private isProcessing = false;

  /**
   * Add item to sync queue (persists to SQLite)
   */
  async add(
    type: SyncQueueItem['type'],
    entityId: string,
    operation: SyncQueueItem['operation'],
    data?: any
  ): Promise<string> {
    const id = generateId();
    
    await dbAddSyncQueueItem({
      id,
      type,
      entityId,
      operation,
      timestamp: getCurrentTimestamp(),
      retryCount: 0,
      data,
    });

    return id;
  }

  /**
   * Get all items in queue (from SQLite)
   */
  async getAll(): Promise<QueueItem[]> {
    const records = await getAllSyncQueueItems();
    return records.map(this.recordToQueueItem);
  }

  /**
   * Get items by type
   */
  async getByType(type: SyncQueueItem['type']): Promise<QueueItem[]> {
    const records = await getSyncQueueItemsByType(type);
    return records.map(this.recordToQueueItem);
  }

  /**
   * Get items ready to retry (failed but under max retries)
   */
  async getRetryable(): Promise<QueueItem[]> {
    const records = await getRetryableSyncQueueItems(this.maxRetries);
    return records.map(this.recordToQueueItem);
  }

  /**
   * Remove item from queue
   */
  async remove(queueId: string): Promise<void> {
    await dbRemoveSyncQueueItem(queueId);
  }

  /**
   * Mark item as failed and increment retry count
   */
  async markFailed(queueId: string, error: string): Promise<void> {
    await dbMarkSyncQueueItemFailed(queueId, error);
  }

  /**
   * Clear all items from queue
   */
  async clear(): Promise<void> {
    await dbClearSyncQueue();
  }

  /**
   * Clear processed items (successfully synced)
   */
  async clearProcessed(processedIds: string[]): Promise<void> {
    if (processedIds.length > 0) {
      await clearProcessedSyncQueueItems(processedIds);
    }
  }

  /**
   * Get queue size
   */
  async size(): Promise<number> {
    return await getSyncQueueSize();
  }

  /**
   * Check if queue is empty
   */
  async isEmpty(): Promise<boolean> {
    const size = await this.size();
    return size === 0;
  }

  /**
   * Process all items in the sync queue
   * Attempts to sync queued operations when online
   */
  async processQueue(userId: string): Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('Queue processing already in progress, skipping...');
      return { processed: 0, failed: 0, errors: [] };
    }

    this.isProcessing = true;
    const errors: string[] = [];
    let processed = 0;
    let failed = 0;

    try {
      // Check if online
      const online = await networkService.isOnline();
      if (!online) {
        console.log('Not online, cannot process queue');
        return { processed: 0, failed: 0, errors: ['No network connection'] };
      }

      // Get all items in queue
      const queueItems = await this.getAll();

      if (queueItems.length === 0) {
        console.log('Queue is empty, nothing to process');
        return { processed: 0, failed: 0, errors: [] };
      }

      console.log(`Processing ${queueItems.length} items in sync queue...`);

      // Separate delete operations from create/update operations
      const deleteItems = queueItems.filter((item) => item.operation === 'delete');
      const otherItems = queueItems.filter((item) => item.operation !== 'delete');
      
      const processedIds: string[] = [];

      // Process delete operations first
      for (const item of deleteItems) {
        try {
          // Delete from Firestore
          let deleteResult;
          switch (item.type) {
            case 'story':
              deleteResult = await store.dispatch(
                firestoreApi.endpoints.deleteStory.initiate(item.entityId)
              );
              break;
            case 'character':
              deleteResult = await store.dispatch(
                firestoreApi.endpoints.deleteCharacter.initiate(item.entityId)
              );
              break;
            case 'blurb':
              deleteResult = await store.dispatch(
                firestoreApi.endpoints.deleteBlurb.initiate(item.entityId)
              );
              break;
            case 'scene':
              deleteResult = await store.dispatch(
                firestoreApi.endpoints.deleteScene.initiate(item.entityId)
              );
              break;
            case 'chapter':
              deleteResult = await store.dispatch(
                firestoreApi.endpoints.deleteChapter.initiate(item.entityId)
              );
              break;
            default:
              throw new Error(`Unknown entity type: ${item.type}`);
          }

          if (deleteResult.error) {
            throw new Error(deleteResult.error as string);
          }

          // Delete succeeded, mark as processed
          processedIds.push(item.id);
          processed++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.markFailed(item.id, errorMessage);
          failed++;
          errors.push(`Item ${item.id}: ${errorMessage}`);
        }
      }

      // Process create/update operations using full sync
      // Use callback pattern to avoid circular dependency with syncService
      if (otherItems.length > 0) {
        try {
          // Lazy load syncService to avoid circular dependency
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { syncAll } = require('./syncService');
          const syncResult = await syncAll(userId);
          if (syncResult.success) {
            // Mark all non-delete items as processed
            for (const item of otherItems) {
              processedIds.push(item.id);
              processed++;
            }
          } else {
            // Sync failed, mark items as failed
            for (const item of otherItems) {
              await this.markFailed(item.id, syncResult.errors.join('; ') || 'Sync failed');
              failed++;
              errors.push(`Item ${item.id}: ${syncResult.errors.join('; ')}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          for (const item of otherItems) {
            await this.markFailed(item.id, errorMessage);
            failed++;
            errors.push(`Item ${item.id}: ${errorMessage}`);
          }
        }
      }

      // Clear processed items
      await this.clearProcessed(processedIds);

      // Also attempt to sync unsynced changes (items not in queue but marked as unsynced)
      // Use require to avoid circular dependency with syncService
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { pushUnsyncedChanges } = require('./syncService');
        await pushUnsyncedChanges(userId);
      } catch (error) {
        console.error('Error pushing unsynced changes:', error);
        errors.push('Error pushing unsynced changes');
      }

      console.log(`Queue processing complete: ${processed} processed, ${failed} failed`);

      return { processed, failed, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error processing queue:', error);
      errors.push(`Queue processing error: ${errorMessage}`);
      return { processed, failed, errors };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Convert database record to QueueItem
   */
  private recordToQueueItem(record: SyncQueueItemRecord): QueueItem {
    return {
      id: record.id,
      type: record.type as SyncQueueItem['type'],
      entityId: record.entityId,
      operation: record.operation,
      timestamp: record.timestamp,
      retryCount: record.retryCount,
      lastError: record.lastError || undefined,
      data: record.data ? JSON.parse(record.data) : undefined,
    };
  }
}

// Singleton instance
export const syncQueueManager = new SyncQueueManager();
