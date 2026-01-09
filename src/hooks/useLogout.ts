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
    try {
      // Clear local database
      await clearDatabase();
      
      // Close database connection
      await closeDatabase();
      
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
