/**
 * Sync Queue Database Service
 * Handles CRUD operations for sync queue items in SQLite
 */
import { getDatabase } from './sqlite';
import { getCurrentTimestamp, safeJsonStringify, safeJsonParse } from '../../utils/helpers';
import type { SyncQueueItem } from '../../store/slices/syncSlice';

export interface SyncQueueItemRecord {
  id: string;
  type: SyncQueueItem['type'] | 'generatedStory';
  entityId: string;
  operation: SyncQueueItem['operation'];
  timestamp: number;
  retryCount: number;
  lastError: string | null;
  data: string | null; // JSON string
  createdAt: number;
}

/**
 * Add item to sync queue in database
 */
export const addSyncQueueItem = async (
  item: Omit<SyncQueueItem, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: number;
    retryCount?: number;
    lastError?: string;
    data?: any;
  }
): Promise<string> => {
  const db = await getDatabase();
  const timestamp = item.timestamp || getCurrentTimestamp();
  const createdAt = getCurrentTimestamp();
  const id = item.id || `queue_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Remove existing item for same entity/type to avoid duplicates
  await removeSyncQueueItemByEntity(item.type, item.entityId);

  const dataJson = item.data ? safeJsonStringify(item.data) : null;

  await db.runAsync(
    `INSERT INTO SyncQueue (id, type, entityId, operation, timestamp, retryCount, lastError, data, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      item.type,
      item.entityId,
      item.operation,
      timestamp,
      item.retryCount || 0,
      item.lastError || null,
      dataJson,
      createdAt,
    ]
  );

  return id;
};

/**
 * Get all items from sync queue
 */
export const getAllSyncQueueItems = async (): Promise<SyncQueueItemRecord[]> => {
  const db = await getDatabase();
  
  const results = await db.getAllAsync<SyncQueueItemRecord>(
    `SELECT * FROM SyncQueue ORDER BY timestamp ASC, createdAt ASC`
  );

  return results || [];
};

/**
 * Get items by type
 */
export const getSyncQueueItemsByType = async (
  type: SyncQueueItem['type'] | 'generatedStory'
): Promise<SyncQueueItemRecord[]> => {
  const db = await getDatabase();
  
  const results = await db.getAllAsync<SyncQueueItemRecord>(
    `SELECT * FROM SyncQueue WHERE type = ? ORDER BY timestamp ASC, createdAt ASC`,
    [type]
  );

  return results || [];
};

/**
 * Get items ready to retry (failed but under max retries)
 */
export const getRetryableSyncQueueItems = async (
  maxRetries: number = 3
): Promise<SyncQueueItemRecord[]> => {
  const db = await getDatabase();
  
  const results = await db.getAllAsync<SyncQueueItemRecord>(
    `SELECT * FROM SyncQueue 
     WHERE lastError IS NOT NULL AND retryCount < ?
     ORDER BY timestamp ASC, createdAt ASC`,
    [maxRetries]
  );

  return results || [];
};

/**
 * Get item by ID
 */
export const getSyncQueueItem = async (id: string): Promise<SyncQueueItemRecord | null> => {
  const db = await getDatabase();
  
  const result = await db.getFirstAsync<SyncQueueItemRecord>(
    `SELECT * FROM SyncQueue WHERE id = ?`,
    [id]
  );

  return result || null;
};

/**
 * Remove item from sync queue
 */
export const removeSyncQueueItem = async (id: string): Promise<void> => {
  const db = await getDatabase();
  
  await db.runAsync(`DELETE FROM SyncQueue WHERE id = ?`, [id]);
};

/**
 * Remove item by entity type and ID
 */
export const removeSyncQueueItemByEntity = async (
  type: SyncQueueItem['type'] | 'generatedStory',
  entityId: string
): Promise<void> => {
  const db = await getDatabase();
  
  await db.runAsync(`DELETE FROM SyncQueue WHERE type = ? AND entityId = ?`, [type, entityId]);
};

/**
 * Mark item as failed and increment retry count
 */
export const markSyncQueueItemFailed = async (
  id: string,
  error: string
): Promise<void> => {
  const db = await getDatabase();
  
  await db.runAsync(
    `UPDATE SyncQueue 
     SET lastError = ?, retryCount = retryCount + 1 
     WHERE id = ?`,
    [error, id]
  );
};

/**
 * Clear all items from sync queue
 */
export const clearSyncQueue = async (): Promise<void> => {
  const db = await getDatabase();
  
  await db.runAsync(`DELETE FROM SyncQueue`);
};

/**
 * Clear processed items (by IDs)
 */
export const clearProcessedSyncQueueItems = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  
  await db.runAsync(
    `DELETE FROM SyncQueue WHERE id IN (${placeholders})`,
    ids
  );
};

/**
 * Get queue size
 */
export const getSyncQueueSize = async (): Promise<number> => {
  const db = await getDatabase();
  
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM SyncQueue`
  );

  return result?.count || 0;
};

/**
 * Convert database record to SyncQueueItem
 */
export const recordToSyncQueueItem = (record: SyncQueueItemRecord): SyncQueueItem => {
  return {
    id: record.id,
    type: record.type as SyncQueueItem['type'],
    entityId: record.entityId,
    operation: record.operation,
    timestamp: record.timestamp,
  };
};
