/**
 * Logout hook
 * Handles user logout by clearing Firebase auth and Redux state
 * Also clears persisted storage and local database
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch } from './redux';
import { useAuth } from './useAuth';
import { logout } from '../store/slices/authSlice';
import { signOutUser } from '../services/firebase/auth';
import { showSnackbar } from '../store/slices/uiSlice';
import { persistor } from '../store';
import { clearDatabase, closeDatabase } from '../services/database/sqlite';
import { hasUnsyncedItems } from '../utils/unsyncedHelpers';
import { clearAppState } from '../services/autosave/autosaveService';
import { unregisterBackgroundSync } from '../services/sync/backgroundSync';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook to handle user logout
 * Clears Firebase auth credentials and Redux state
 * Removes persisted auth data from storage
 * Clears local database after user confirmation
 */
export const useLogout = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const performLogout = useCallback(async () => {
    let databaseCleared = false;
    // Capture user ID early before logout clears it
    const userId = user?.uid;
    
    try {
      // Step 1: Clear local database (critical - must happen first)
      try {
        await clearDatabase();
        databaseCleared = true;
        console.log('✓ Database cleared successfully');
      } catch (dbError) {
        console.error('Error clearing database:', dbError);
        // Try to close database even if clear failed
        try {
          await closeDatabase();
        } catch (closeError) {
          console.error('Error closing database:', closeError);
        }
        throw dbError; // Re-throw to trigger outer catch
      }
      
      // Step 2: Close database connection
      await closeDatabase();
      console.log('✓ Database connection closed');
      
      // Step 3: Sign out from Firebase (this clears Firebase auth persistence)
      await signOutUser();
      console.log('✓ Signed out from Firebase');
      
      // Step 4: Clear Redux auth state
      dispatch(logout());
      console.log('✓ Redux auth state cleared');
      
      // Step 5: Clear autosave state (navigation, activity context)
      await clearAppState();
      console.log('✓ Autosave state cleared');
      
      // Step 6: Unregister background sync and clear sync metadata
      await unregisterBackgroundSync();
      if (userId) {
        // Clear sync metadata for this user
        await AsyncStorage.removeItem(`@storyteller:sync_metadata:${userId}`);
      }
      console.log('✓ Background sync unregistered and sync metadata cleared');
      
      // Step 7: Purge persisted auth state from AsyncStorage (Redux Persist)
      await persistor.purge();
      console.log('✓ Persisted Redux state purged');
      
      // Show success message
      dispatch(showSnackbar({ 
        message: 'Logged out successfully', 
        type: 'success' 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to logout completely. Some data may remain.';
      
      // Ensure database is cleared even if other steps fail
      if (!databaseCleared) {
        try {
          await clearDatabase();
          await closeDatabase();
          console.log('✓ Database cleared in error handler');
        } catch (dbError) {
          console.error('Failed to clear database in error handler:', dbError);
        }
      }
      
      // Always clear local state even if Firebase signout fails
      // Try to clear all user data storage
      try {
        await clearAppState();
      } catch (clearError) {
        console.error('Failed to clear autosave state:', clearError);
      }
      
      try {
        await unregisterBackgroundSync();
        if (userId) {
          await AsyncStorage.removeItem(`@storyteller:sync_metadata:${userId}`);
        }
      } catch (syncError) {
        console.error('Failed to clear sync data:', syncError);
      }
      
      dispatch(logout());
      try {
        await persistor.purge();
      } catch (purgeError) {
        console.error('Failed to purge persisted state:', purgeError);
      }
      
      dispatch(showSnackbar({ 
        message: errorMessage, 
        type: 'error' 
      }));
    }
  }, [dispatch, user?.uid]);

  const handleLogout = useCallback(async () => {
    if (!user?.uid) {
      // No user, just perform logout
      await performLogout();
      return;
    }

    // Check for unsynced items
    const hasUnsynced = await hasUnsyncedItems(user.uid);

    if (hasUnsynced) {
      // Show confirmation dialog warning about unsynced data
      Alert.alert(
        'Confirm Logout',
        'You have unsynced data. Logging out will clear all local data including unsynced changes. Are you sure you want to continue?',
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
      // No unsynced data, proceed with logout
      await performLogout();
    }
  }, [user?.uid, performLogout]);

  return {
    logout: handleLogout,
  };
};
