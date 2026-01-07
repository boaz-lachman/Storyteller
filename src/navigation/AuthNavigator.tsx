/**
 * Auth Navigator
 * Handles authentication-related screens (Login, Signup, ForgotPassword)
 * Note: Navigation guards are handled at the AppNavigator level
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { authStackHeaderOptions } from './theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Auth Navigator Component
 * - Provides navigation for authentication screens
 * - Navigation guards are handled by AppNavigator which conditionally renders this navigator
 */
export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={authStackHeaderOptions}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ gestureEnabled: false }} // Prevent back gesture on initial auth screen
      />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
