/**
 * Sync Queue Database Service
 * Handles SQLite persistence for sync queue operations
 * Implements queue structure with retry logic and error tracking
 */
import { getDatabase } from './sqlite';
import { generateId, getCurrentTimestamp } from '../../utils/helpers';
import type { SyncQueueItem } from '../../store/slices/syncSlice';

/**
 * Extended queue item with retry and error tracking
 */
export interface SyncQueueItemDB extends SyncQueueItem {
  retryCount: number;
  lastError: string | null;
  priority: number; // Higher priority items are processed first
  createdAt: number;
  updatedAt: number;
}

/**
 * Add item to sync queue
 * If an item with the same entityId and type exists, it will be replaced
 */
export async function addToQueue(
  type: SyncQueueItem['type'],
  entityId: string,
  operation: SyncQueueItem['operation'],
  priority: number = 0
): Promise<string> {
  const db = await getDatabase();
  const queueId = generateId();
  const now = getCurrentTimestamp();

  try {
    // Remove existing item for same entity/type to avoid duplicates
    await db.runAsync(
      `DELETE FROM SyncQueue 
       WHERE entityId = ? AND type = ?`,
      [entityId, type]
    );

    // Insert new queue item
    await db.runAsync(
      `INSERT INTO SyncQueue (
        id, type, entityId, operation, timestamp, 
        retryCount, lastError, priority, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueId,
        type,
        entityId,
        operation,
        now,
        0, // retryCount
        null, // lastError
        priority,
        now, // createdAt
        now, // updatedAt
      ]
    );

    return queueId;
  } catch (error: any) {
    console.error('Error adding item to sync queue:', error);
    throw new Error(`Failed to add item to sync queue: ${error.message}`);
  }
}

/**
 * Get all items in queue, ordered by priority (descending) then timestamp (ascending)
 */
export async function getAllQueueItems(): Promise<SyncQueueItemDB[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<SyncQueueItemDB>(
      `SELECT * FROM SyncQueue 
       ORDER BY priority DESC, timestamp ASC`
    );

    return results.map((row) => ({
      id: row.id,
      type: row.type,
      entityId: row.entityId,
      operation: row.operation,
      timestamp: row.timestamp,
      retryCount: row.retryCount,
      lastError: row.lastError,
      priority: row.priority,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  } catch (error: any) {
    console.error('Error getting queue items:', error);
    throw new Error(`Failed to get queue items: ${error.message}`);
  }
}

/**
 * Get items by type
 */
export async function getQueueItemsByType(
  type: SyncQueueItem['type']
): Promise<SyncQueueItemDB[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<SyncQueueItemDB>(
      `SELECT * FROM SyncQueue 
       WHERE type = ? 
       ORDER BY priority DESC, timestamp ASC`,
      [type]
    );

    return results.map((row) => ({
      id: row.id,
      type: row.type,
      entityId: row.entityId,
      operation: row.operation,
      timestamp: row.timestamp,
      retryCount: row.retryCount,
      lastError: row.lastError,
      priority: row.priority,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  } catch (error: any) {
    console.error('Error getting queue items by type:', error);
    throw new Error(`Failed to get queue items by type: ${error.message}`);
  }
}

/**
 * Get items ready to retry (failed but under max retries)
 */
export async function getRetryableQueueItems(
  maxRetries: number = 3
): Promise<SyncQueueItemDB[]> {
  const db = await getDatabase();

  try {
    const results = await db.getAllAsync<SyncQueueItemDB>(
      `SELECT * FROM SyncQueue 
       WHERE lastError IS NOT NULL 
       AND retryCount < ? 
       ORDER BY priority DESC, timestamp ASC`,
      [maxRetries]
    );

    return results.map((row) => ({
      id: row.id,
      type: row.type,
      entityId: row.entityId,
      operation: row.operation,
      timestamp: row.timestamp,
      retryCount: row.retryCount,
      lastError: row.lastError,
      priority: row.priority,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  } catch (error: any) {
    console.error('Error getting retryable queue items:', error);
    throw new Error(`Failed to get retryable queue items: ${error.message}`);
  }
}

/**
 * Get a single queue item by ID
 */
export async function getQueueItem(queueId: string): Promise<SyncQueueItemDB | null> {
  const db = await getDatabase();

  try {
    const result = await db.getFirstAsync<SyncQueueItemDB>(
      `SELECT * FROM SyncQueue WHERE id = ?`,
      [queueId]
    );

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      type: result.type,
      entityId: result.entityId,
      operation: result.operation,
      timestamp: result.timestamp,
      retryCount: result.retryCount,
      lastError: result.lastError,
      priority: result.priority,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  } catch (error: any) {
    console.error('Error getting queue item:', error);
    throw new Error(`Failed to get queue item: ${error.message}`);
  }
}

/**
 * Remove item from queue
 */
export async function removeFromQueue(queueId: string): Promise<void> {
  const db = await getDatabase();

  try {
    await db.runAsync(`DELETE FROM SyncQueue WHERE id = ?`, [queueId]);
  } catch (error: any) {
    console.error('Error removing item from queue:', error);
    throw new Error(`Failed to remove item from queue: ${error.message}`);
  }
}

/**
 * Mark item as failed and increment retry count
 */
export async function markQueueItemFailed(
  queueId: string,
  error: string
): Promise<void> {
  const db = await getDatabase();
  const now = getCurrentTimestamp();

  try {
    await db.runAsync(
      `UPDATE SyncQueue 
       SET lastError = ?, 
           retryCount = retryCount + 1, 
           updatedAt = ? 
       WHERE id = ?`,
      [error, now, queueId]
    );
  } catch (error: any) {
    console.error('Error marking queue item as failed:', error);
    throw new Error(`Failed to mark queue item as failed: ${error.message}`);
  }
}

/**
 * Clear all items from queue
 */
export async function clearQueue(): Promise<void> {
  const db = await getDatabase();

  try {
    await db.runAsync(`DELETE FROM SyncQueue`);
  } catch (error: any) {
    console.error('Error clearing queue:', error);
    throw new Error(`Failed to clear queue: ${error.message}`);
  }
}

/**
 * Clear processed items (successfully synced)
 */
export async function clearProcessedQueueItems(processedIds: string[]): Promise<void> {
  if (processedIds.length === 0) {
    return;
  }

  const db = await getDatabase();

  try {
    // Use parameterized query with placeholders
    const placeholders = processedIds.map(() => '?').join(',');
    await db.runAsync(
      `DELETE FROM SyncQueue WHERE id IN (${placeholders})`,
      processedIds
    );
  } catch (error: any) {
    console.error('Error clearing processed queue items:', error);
    throw new Error(`Failed to clear processed queue items: ${error.message}`);
  }
}

/**
 * Get queue size
 */
export async function getQueueSize(): Promise<number> {
  const db = await getDatabase();

  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM SyncQueue`
    );
    return result?.count || 0;
  } catch (error: any) {
    console.error('Error getting queue size:', error);
    throw new Error(`Failed to get queue size: ${error.message}`);
  }
}

/**
 * Check if queue is empty
 */
export async function isQueueEmpty(): Promise<boolean> {
  const size = await getQueueSize();
  return size === 0;
}

/**
 * Process queue items
 * Returns items ready to be processed, ordered by priority
 */
export async function processQueue(
  batchSize: number = 10,
  maxRetries: number = 3
): Promise<SyncQueueItemDB[]> {
  const db = await getDatabase();

  try {
    // Get items that haven't failed or are retryable, ordered by priority
    const results = await db.getAllAsync<SyncQueueItemDB>(
      `SELECT * FROM SyncQueue 
       WHERE (lastError IS NULL OR retryCount < ?)
       ORDER BY priority DESC, timestamp ASC 
       LIMIT ?`,
      [maxRetries, batchSize]
    );

    return results.map((row) => ({
      id: row.id,
      type: row.type,
      entityId: row.entityId,
      operation: row.operation,
      timestamp: row.timestamp,
      retryCount: row.retryCount,
      lastError: row.lastError,
      priority: row.priority,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  } catch (error: any) {
    console.error('Error processing queue:', error);
    throw new Error(`Failed to process queue: ${error.message}`);
  }
}
