/**
 * Sync Queue Manager
 * Manages the queue of items waiting to be synced
 */
import { generateId, getCurrentTimestamp } from '../../utils/helpers';
import type { SyncQueueItem } from '../../store/slices/syncSlice';

export interface QueueItem extends SyncQueueItem {
  retryCount?: number;
  lastError?: string;
}

class SyncQueueManager {
  private queue: QueueItem[] = [];
  private maxRetries = 3;

  /**
   * Add item to sync queue
   */
  add(
    type: SyncQueueItem['type'],
    entityId: string,
    operation: SyncQueueItem['operation']
  ): string {
    const queueId = generateId();
    
    // Remove existing item for same entity/type to avoid duplicates
    this.queue = this.queue.filter(
      (item) => !(item.entityId === entityId && item.type === type)
    );

    const item: QueueItem = {
      id: queueId,
      type,
      entityId,
      operation,
      timestamp: getCurrentTimestamp(),
      retryCount: 0,
    };

    this.queue.push(item);
    return queueId;
  }

  /**
   * Get all items in queue
   */
  getAll(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Get items by type
   */
  getByType(type: SyncQueueItem['type']): QueueItem[] {
    return this.queue.filter((item) => item.type === type);
  }

  /**
   * Get items ready to retry (failed but under max retries)
   */
  getRetryable(): QueueItem[] {
    return this.queue.filter(
      (item) => item.lastError && (item.retryCount || 0) < this.maxRetries
    );
  }

  /**
   * Remove item from queue
   */
  remove(queueId: string): void {
    this.queue = this.queue.filter((item) => item.id !== queueId);
  }

  /**
   * Mark item as failed and increment retry count
   */
  markFailed(queueId: string, error: string): void {
    const item = this.queue.find((i) => i.id === queueId);
    if (item) {
      item.lastError = error;
      item.retryCount = (item.retryCount || 0) + 1;
    }
  }

  /**
   * Clear all items from queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Clear processed items (successfully synced)
   */
  clearProcessed(processedIds: string[]): void {
    this.queue = this.queue.filter((item) => !processedIds.includes(item.id));
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}

// Singleton instance
export const syncQueueManager = new SyncQueueManager();
