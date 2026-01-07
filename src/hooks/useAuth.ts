/**
 * Auth hook that integrates Firebase Auth with Redux
 */
import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAppDispatch, useAppSelector } from './redux';
import {
  setUser,
  setLoading,
  setError,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  User,
} from '../store/slices/authSlice';

/**
 * Convert Firebase User to app User type
 */
const mapFirebaseUser = (firebaseUser: FirebaseUser | null): User | null => {
  if (!firebaseUser) return null;

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
  };
};

/**
 * Hook to access auth state and Firebase auth integration
 * Automatically syncs Firebase auth state with Redux
 * Respects persisted state and only updates when Firebase auth state changes
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  // Sync Firebase auth state with Redux
  useEffect(() => {
    // Only set loading to true if we don't have a persisted user
    // This prevents overwriting persisted state during rehydration
    if (!user) {
      dispatch(setLoading(true));
    }

    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        const appUser = mapFirebaseUser(firebaseUser);
        // Only update if the user state has actually changed
        // This prevents overwriting persisted state unnecessarily
        if (
          (appUser && (!user || appUser.uid !== user.uid)) ||
          (!appUser && user)
        ) {
          dispatch(setUser(appUser));
          console.log('appUser', appUser);
        }
        dispatch(setLoading(false));
      },
      (error) => {
        dispatch(setError(error.message));
        dispatch(setLoading(false));
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch, user]); // Include user in dependencies to check for changes

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
  };
};
