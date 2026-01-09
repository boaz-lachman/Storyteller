/**
 * Root App Navigator
 * Handles authentication state and routes to appropriate navigators
 * Includes loading state handling while checking auth
 * Implements navigation guards for protected routes
 * Includes auto-save functionality for navigation state and activity context
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer, NavigationContainerRef, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { selectUser, selectAuthLoading } from '../store/slices/authSlice';
import { 
  selectActivityContext, 
  setRestoring, 
  restoreActivityContext,
  setLastSavedAt,
} from '../store/slices/autosaveSlice';
import { selectIsSyncing, selectLastSyncTime } from '../store/slices/syncSlice';
import { useAuth } from '../hooks/useAuth';
import { useSync } from '../hooks/useSync';
import { registerBackgroundSync } from '../services/sync/backgroundSync';
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';
import type { RootStackParamList } from './types';
import { navigationTheme } from './theme';
import { colors } from '../constants/colors';
import MainBookActivityIndicator from '../components/common/MainBookActivityIndicator';
import {
  saveAppState,
  loadAppState,
  clearAppState,
} from '../services/autosave/autosaveService';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root App Navigator Component
 * - Checks authentication state
 * - Shows loading indicator while checking auth
 * - Routes to AuthNavigator if not authenticated
 * - Routes to App screens if authenticated
 * - Implements navigation guards to prevent unauthorized access
 */
export default function AppNavigator() {
  // Use useAuth hook to ensure auth state is synced
  const { isLoading: authLoading } = useAuth();
  const user = useAppSelector(selectUser);
  const isLoading = useAppSelector(selectAuthLoading);
  const activityContext = useAppSelector(selectActivityContext);
  const isSyncing = useAppSelector(selectIsSyncing);
  const lastSyncTime = useAppSelector(selectLastSyncTime);
  const dispatch = useAppDispatch();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [isRestoringState, setIsRestoringState] = useState(true);
  const [initialNavigationState, setInitialNavigationState] = useState<NavigationState<RootStackParamList> | undefined>(undefined);
  
  // Check if this is the first sync (no previous sync time and currently syncing)
  const isFirstSync = lastSyncTime === null && isSyncing && !!user;

  // Initialize sync triggers (handles network monitoring, app state, etc.)
  useSync();

  // Register background sync when user is authenticated
  useEffect(() => {
    if (user?.uid && !isLoading && !authLoading) {
      registerBackgroundSync().catch((error) => {
        console.error('Failed to register background sync:', error);
      });
    }
  }, [user, isLoading, authLoading]);

  // Restore app state on mount (only if authenticated)
  useEffect(() => {
    const restoreState = async () => {
      if (!isLoading && !authLoading && user) {
        try {
          dispatch(setRestoring(true));
          const savedState = await loadAppState();
          
          if (savedState) {
            // Restore activity context
            if (savedState.activityContext) {
              dispatch(restoreActivityContext(savedState.activityContext));
            }
            
            // Restore navigation state if available
            if (savedState.navigationState) {
              setInitialNavigationState(savedState.navigationState);
            }
            
            dispatch(setLastSavedAt(savedState.savedAt));
          }
        } catch (error) {
          console.error('Error restoring app state:', error);
          // Clear corrupted state
          await clearAppState();
        } finally {
          dispatch(setRestoring(false));
          setIsRestoringState(false);
        }
      } else if (!isLoading && !authLoading && !user) {
        // Not authenticated, clear any saved state
        await clearAppState();
        setIsRestoringState(false);
      }
    };

    restoreState();
  }, [isLoading, authLoading, user, dispatch]);

  // Save navigation state on navigation changes
  const handleNavigationStateChange = useCallback(
    async (state: NavigationState<RootStackParamList> | undefined) => {
      if (user && state && navigationRef.current?.isReady()) {
        try {
          await saveAppState(state, activityContext);
          dispatch(setLastSavedAt(Date.now()));
        } catch (error) {
          console.error('Error saving navigation state:', error);
        }
      }
    },
    [user, activityContext, dispatch]
  );

  // Save state when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && user && navigationRef.current?.isReady()) {
        const currentState = navigationRef.current.getRootState();
        try {
          await saveAppState(currentState, activityContext);
          dispatch(setLastSavedAt(Date.now()));
        } catch (error) {
          console.error('Error saving state on background:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, activityContext, dispatch]);

  // Navigation guard: Redirect to Auth if user logs out while on protected route
  useEffect(() => {
    if (!isLoading && !authLoading && !user && navigationRef.current?.isReady()) {
      // User logged out, clear saved state and ensure we're on a non-protected screen
      clearAppState();
      const currentRoute = navigationRef.current.getCurrentRoute();
      if (
        currentRoute?.name !== 'Login' &&
        currentRoute?.name !== 'Signup' &&
        currentRoute?.name !== 'ForgotPassword'
      ) {
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    }
  }, [user, isLoading, authLoading]);

  // Show loading indicator while checking auth state or restoring state
  if (isLoading || authLoading || isRestoringState) {
    return (
      <View style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        initialState={initialNavigationState}
        onStateChange={handleNavigationStateChange}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            // Auth flow - only accessible when not authenticated
            <Stack.Screen 
              name="Auth" 
              component={AuthNavigator}
              options={{ gestureEnabled: false }} // Prevent back gesture on auth screen
            />
          ) : (
            // Protected routes - only accessible when authenticated
            // Use DrawerNavigator which wraps the app stack
            <Stack.Screen 
              name="App" 
              component={DrawerNavigator}
              options={{ 
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Full-screen loading overlay for first sync */}
      {isFirstSync && (
        <View style={styles.syncLoadingOverlay}>
          <MainBookActivityIndicator size={80} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});