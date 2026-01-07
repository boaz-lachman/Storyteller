/**
 * Root App Navigator
 * Handles authentication state and routes to appropriate navigators
 * Includes loading state handling while checking auth
 * Implements navigation guards for protected routes
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '../hooks/redux';
import { selectUser, selectAuthLoading } from '../store/slices/authSlice';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';
import type { RootStackParamList } from './types';
import { navigationTheme, appStackHeaderOptions } from './theme';
import { colors } from '../constants/colors';
import MainBookActivityIndicator from '../components/common/MainBookActivityIndicator';

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
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);


  // Navigation guard: Redirect to Auth if user logs out while on protected route
  useEffect(() => {
    if (!isLoading && !authLoading && !user && navigationRef.current?.isReady()) {
      // User logged out, ensure we're on a non-protected screen
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

  // Show loading indicator while checking auth state
  if (isLoading || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});