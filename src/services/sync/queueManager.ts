/**
 * Sync Queue Manager
 * Manages the queue of items waiting to be synced
 * Uses SQLite for persistence across app restarts
 */
import type { SyncQueueItem } from '../../store/slices/syncSlice';
import {
  addToQueue as addToQueueDB,
  getAllQueueItems,
  getQueueItemsByType,
  getRetryableQueueItems,
  getQueueItem,
  removeFromQueue,
  markQueueItemFailed,
  clearQueue as clearQueueDB,
  clearProcessedQueueItems,
  getQueueSize,
  isQueueEmpty,
  processQueue as processQueueDB,
  type SyncQueueItemDB,
} from '../database/syncQueue';

export interface QueueItem extends SyncQueueItem {
  retryCount?: number;
  lastError?: string;
  priority?: number;
}

class SyncQueueManager {
  private maxRetries = 3;

  /**
   * Add item to sync queue
   * Uses SQLite for persistence
   */
  async add(
    type: SyncQueueItem['type'],
    entityId: string,
    operation: SyncQueueItem['operation'],
    priority: number = 0
  ): Promise<string> {
    return await addToQueueDB(type, entityId, operation, priority);
  }

  /**
   * Get all items in queue
   * Loads from SQLite
   */
  async getAll(): Promise<QueueItem[]> {
    const items = await getAllQueueItems();
    return items.map((item) => ({
      id: item.id,
      type: item.type,
      entityId: item.entityId,
      operation: item.operation,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      lastError: item.lastError || undefined,
      priority: item.priority,
    }));
  }

  /**
   * Get items by type
   * Loads from SQLite
   */
  async getByType(type: SyncQueueItem['type']): Promise<QueueItem[]> {
    const items = await getQueueItemsByType(type);
    return items.map((item) => ({
      id: item.id,
      type: item.type,
      entityId: item.entityId,
      operation: item.operation,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      lastError: item.lastError || undefined,
      priority: item.priority,
    }));
  }

  /**
   * Get items ready to retry (failed but under max retries)
   * Loads from SQLite
   */
  async getRetryable(): Promise<QueueItem[]> {
    const items = await getRetryableQueueItems(this.maxRetries);
    return items.map((item) => ({
      id: item.id,
      type: item.type,
      entityId: item.entityId,
      operation: item.operation,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      lastError: item.lastError || undefined,
      priority: item.priority,
    }));
  }

  /**
   * Get a single queue item by ID
   */
  async get(queueId: string): Promise<QueueItem | null> {
    const item = await getQueueItem(queueId);
    if (!item) {
      return null;
    }
    return {
      id: item.id,
      type: item.type,
      entityId: item.entityId,
      operation: item.operation,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      lastError: item.lastError || undefined,
      priority: item.priority,
    };
  }

  /**
   * Remove item from queue
   * Removes from SQLite
   */
  async remove(queueId: string): Promise<void> {
    await removeFromQueue(queueId);
  }

  /**
   * Mark item as failed and increment retry count
   * Updates in SQLite
   */
  async markFailed(queueId: string, error: string): Promise<void> {
    await markQueueItemFailed(queueId, error);
  }

  /**
   * Clear all items from queue
   * Clears from SQLite
   */
  async clear(): Promise<void> {
    await clearQueueDB();
  }

  /**
   * Clear processed items (successfully synced)
   * Removes from SQLite
   */
  async clearProcessed(processedIds: string[]): Promise<void> {
    await clearProcessedQueueItems(processedIds);
  }

  /**
   * Get queue size
   * Queries SQLite
   */
  async size(): Promise<number> {
    return await getQueueSize();
  }

  /**
   * Check if queue is empty
   * Queries SQLite
   */
  async isEmpty(): Promise<boolean> {
    return await isQueueEmpty();
  }

  /**
   * Process queue items
   * Returns items ready to be processed, ordered by priority
   * Loads from SQLite
   */
  async processQueue(batchSize: number = 10): Promise<QueueItem[]> {
    const items = await processQueueDB(batchSize, this.maxRetries);
    return items.map((item) => ({
      id: item.id,
      type: item.type,
      entityId: item.entityId,
      operation: item.operation,
      timestamp: item.timestamp,
      retryCount: item.retryCount,
      lastError: item.lastError || undefined,
      priority: item.priority,
    }));
  }

  /**
   * Set max retries
   */
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }
}

// Singleton instance
export const syncQueueManager = new SyncQueueManager();
