/**
 * Logout hook
 * Handles user logout by clearing Firebase auth and Redux state
 * Also clears persisted storage, sync queue, and database
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from './redux';
import { logout, selectUser } from '../store/slices/authSlice';
import { signOutUser } from '../services/firebase/auth';
import { showSnackbar } from '../store/slices/uiSlice';
import { clearSyncQueue } from '../store/slices/syncSlice';
import { persistor } from '../store';
import { clearDatabase } from '../services/database/sqlite';
import { syncQueueManager } from '../services/sync/queueManager';
import { checkUnsyncedItems } from '../services/sync/syncHelpers';
import { unregisterBackgroundSync } from '../services/sync/backgroundSync';

/**
 * Hook to handle user logout
 * Clears Firebase auth credentials and Redux state
 * Removes persisted auth data from storage
 * Clears sync queue and database
 */
export const useLogout = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  const performLogout = useCallback(async () => {
    try {
      // Unregister background sync
      await unregisterBackgroundSync();

      // Clear sync queue
      await syncQueueManager.clear();
      dispatch(clearSyncQueue());

      // Clear database
      await clearDatabase();

      // Sign out from Firebase (this clears Firebase auth persistence)
      await signOutUser();
      
      // Clear Redux auth state
      dispatch(logout());
      
      // Purge persisted auth state from AsyncStorage
      await persistor.purge();
      
      // Show success message
      dispatch(showSnackbar({ 
        message: 'Logged out successfully', 
        type: 'success' 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to logout. Please try again.';
      
      // Even if Firebase signout fails, clear local state
      try {
        await syncQueueManager.clear();
        dispatch(clearSyncQueue());
        await clearDatabase();
      } catch (clearError) {
        console.error('Error clearing data on logout:', clearError);
      }

      dispatch(logout());
      await persistor.purge();
      
      dispatch(showSnackbar({ 
        message: errorMessage, 
        type: 'error' 
      }));
    }
  }, [dispatch]);

  const handleLogout = useCallback(async () => {
    if (!user?.uid) {
      // No user, just logout
      await performLogout();
      return;
    }

    // Check for unsynced items
    const unsynced = await checkUnsyncedItems(user.uid);

    if (unsynced.total > 0) {
      // Show confirmation dialog
      Alert.alert(
        'Unsaved Changes',
        `You have ${unsynced.total} unsynced item${unsynced.total > 1 ? 's' : ''}. All unsynced data will be permanently deleted if you logout. Are you sure you want to continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await performLogout();
            },
          },
        ],
        { cancelable: true }
      );
    } else {
      // No unsynced items, proceed with logout
      await performLogout();
    }
  }, [user, performLogout]);

  return {
    logout: handleLogout,
  };
};
