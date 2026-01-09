/**
 * Logout hook
 * Handles user logout by clearing Firebase auth and Redux state
 * Also clears persisted storage
 */
import { useCallback } from 'react';
import { useAppDispatch } from './redux';
import { logout } from '../store/slices/authSlice';
import { signOutUser } from '../services/firebase/auth';
import { showSnackbar } from '../store/slices/uiSlice';
import { persistor } from '../store';

/**
 * Hook to handle user logout
 * Clears Firebase auth credentials and Redux state
 * Removes persisted auth data from storage
 */
export const useLogout = () => {
  const dispatch = useAppDispatch();

  const handleLogout = useCallback(async () => {
    try {
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

  return {
    logout: handleLogout,
  };
};
