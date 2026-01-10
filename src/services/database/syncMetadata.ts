/**
 * Sync Metadata Database Service
 * Stores sync metadata like last sync time for incremental sync
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentTimestamp } from '../../utils/helpers';

const SYNC_METADATA_KEY = '@storyteller:sync_metadata';

export interface SyncMetadata {
  lastSyncTime: number | null;
  lastIncrementalSyncTime: number | null;
  syncVersion: number;
}

/**
 * Get sync metadata
 */
export const getSyncMetadata = async (userId: string): Promise<SyncMetadata> => {
  try {
    const key = `${SYNC_METADATA_KEY}:${userId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (data) {
      return JSON.parse(data) as SyncMetadata;
    }

    // Default metadata
    return {
      lastSyncTime: null,
      lastIncrementalSyncTime: null,
      syncVersion: 1,
    };
  } catch (error) {
    console.error('Error getting sync metadata:', error);
    return {
      lastSyncTime: null,
      lastIncrementalSyncTime: null,
      syncVersion: 1,
    };
  }
};

/**
 * Update sync metadata
 */
export const updateSyncMetadata = async (
  userId: string,
  updates: Partial<SyncMetadata>
): Promise<void> => {
  try {
    const key = `${SYNC_METADATA_KEY}:${userId}`;
    const current = await getSyncMetadata(userId);
    const updated: SyncMetadata = {
      ...current,
      ...updates,
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating sync metadata:', error);
  }
};

/**
 * Update last sync time
 */
export const updateLastSyncTime = async (userId: string, timestamp?: number): Promise<void> => {
  const syncTime = timestamp || getCurrentTimestamp();
  await updateSyncMetadata(userId, {
    lastSyncTime: syncTime,
    lastIncrementalSyncTime: syncTime,
  });
};

/**
 * Get last sync time
 */
export const getLastSyncTime = async (userId: string): Promise<number | null> => {
  const metadata = await getSyncMetadata(userId);
  return metadata.lastSyncTime;
};

/**
 * Get last incremental sync time
 */
export const getLastIncrementalSyncTime = async (userId: string): Promise<number | null> => {
  const metadata = await getSyncMetadata(userId);
  return metadata.lastIncrementalSyncTime;
};
