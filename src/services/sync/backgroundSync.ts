/**
 * Background Sync Service
 * Handles background sync tasks using expo-task-manager and expo-background-fetch
 */
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncAll, incrementalSync } from './syncService';
import { networkService } from '../network/networkService';
import { getLastIncrementalSyncTime } from '../database/syncMetadata';
import { getDatabase } from '../database/sqlite';

const BACKGROUND_SYNC_TASK = 'background-sync';
const BACKGROUND_SYNC_USER_ID_KEY = '@storyteller:background_sync_user_id';

/**
 * Background sync task function
 * Registered with TaskManager
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async ({ data, error, executionInfo }) => {
  if (error) {
    console.error('Background sync task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }

  try {
    // Get user ID from AsyncStorage (since background tasks can't receive data directly)
    const userId = await AsyncStorage.getItem(BACKGROUND_SYNC_USER_ID_KEY);
    if (!userId) {
      console.error('Background sync: No userId found in storage');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Check if online
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      console.log('Background sync: Not online, skipping');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Ensure database is initialized
    await getDatabase();

    // Check if we have a last sync time for incremental sync
    const lastSyncTime = await getLastIncrementalSyncTime(userId);
    const useIncremental = lastSyncTime !== null;

    // Perform sync
    let syncResult;
    if (useIncremental) {
      console.log('Background sync: Performing incremental sync');
      syncResult = await incrementalSync(userId);
    } else {
      console.log('Background sync: Performing full sync');
      syncResult = await syncAll(userId);
    }

    if (syncResult.success) {
      console.log(
        `Background sync completed: ${syncResult.pushed} pushed, ${syncResult.pulled} pulled`
      );
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.error('Background sync failed:', syncResult.errors);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('Background sync task exception:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background sync task
 */
export const registerBackgroundSync = async (userId: string): Promise<boolean> => {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (!isRegistered) {
      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background sync task registered');
    }

    // Store userId in AsyncStorage for background task to retrieve
    await AsyncStorage.setItem(BACKGROUND_SYNC_USER_ID_KEY, userId);

    return true;
  } catch (error) {
    console.error('Error registering background sync:', error);
    return false;
  }
};

/**
 * Unregister background sync task
 */
export const unregisterBackgroundSync = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('Background sync task unregistered');
    }

    // Remove userId from storage
    await AsyncStorage.removeItem(BACKGROUND_SYNC_USER_ID_KEY);
  } catch (error) {
    console.error('Error unregistering background sync:', error);
  }
};

/**
 * Check if background sync is registered
 */
export const isBackgroundSyncRegistered = async (): Promise<boolean> => {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch (error) {
    console.error('Error checking background sync status:', error);
    return false;
  }
};

/**
 * Get background fetch status
 */
export const getBackgroundFetchStatus = async (): Promise<BackgroundFetch.BackgroundFetchStatus> => {
  try {
    return await BackgroundFetch.getStatusAsync();
  } catch (error) {
    console.error('Error getting background fetch status:', error);
    return BackgroundFetch.BackgroundFetchStatus.Restricted;
  }
};
