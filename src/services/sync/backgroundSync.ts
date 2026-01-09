/**
 * Background Sync Service
 * Handles background sync tasks using expo-task-manager
 */
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { syncAll } from './syncService';
import { store } from '../../store';
import { selectUser } from '../../store/slices/authSlice';

const BACKGROUND_SYNC_TASK = 'background-sync';

/**
 * Background sync task handler
 */
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const state = store.getState();
    const user = selectUser(state);
    
    if (!user?.uid) {
      console.log('Background sync skipped: No user');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    console.log('Starting background sync...');
    const result = await syncAll(user.uid); // Use incremental sync (default)
    
    if (result.success) {
      console.log(`Background sync completed: ${result.pushed} pushed, ${result.pulled} pulled`);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.error('Background sync failed:', result.errors);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register background sync task
 */
export async function registerBackgroundSync(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      console.log('Background sync task already registered');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes minimum interval
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('Background sync task registered');
    return true;
  } catch (error) {
    console.error('Failed to register background sync:', error);
    return false;
  }
}

/**
 * Unregister background sync task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('Background sync task unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister background sync:', error);
  }
}

/**
 * Check if background sync is registered
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
  } catch (error) {
    console.error('Failed to check background sync registration:', error);
    return false;
  }
}
