/**
 * Drawer Navigator
 * Wraps the main app stack with a drawer menu
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import StoriesListScreen from '../screens/stories/StoriesListScreen';
import StoryDetailScreen from '../screens/stories/StoryDetailScreen';
import DrawerContent from '../components/navigation/DrawerContent';
import { appStackHeaderOptions } from './theme';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import { useAppSelector } from '../hooks/redux';
import { selectIsSyncing } from '../store/slices/syncSlice';
import MainBookActivityIndicator from '../components/common/MainBookActivityIndicator';
import Logo from '../components/common/Logo';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Main App Stack (without drawer)
 * Used inside the drawer navigator
 */
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="StoriesList" 
        component={StoriesListScreen}
        options={{ 
          ...appStackHeaderOptions,
          headerShown: false,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="StoryDetail" 
        component={StoryDetailScreen}
        options={{ 
          ...appStackHeaderOptions,
          headerShown: true,
          headerBackVisible: false,
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Sync Loader Component
 * Shows MainBookActivityIndicator when syncing
 */
const SyncLoader = () => {
  const isSyncing = useAppSelector(selectIsSyncing);

  if (!isSyncing) {
    return null;
  }

  return (
    <View style={styles.syncLoaderContainer}>
      <MainBookActivityIndicator size={24} />
    </View>
  );
};

/**
 * Drawer Navigator Component
 * Provides drawer menu with user info and logout
 */
export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerType: 'front',
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: {
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.regular,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.text,
        },
        headerTitleAlign: 'left' as const, // Align title to the left, next to drawer button
      }}
    >
      <Drawer.Screen 
        name="AppStack" 
        component={AppStack}
        options={{
          headerTitle: () => (
            <Logo 
              fontSize="lg" 
              color={colors.text}
              style={styles.logoContainer}
            />
          ),
          drawerLabel: 'Stories',
          headerRight: () => <SyncLoader />, // Add sync loader to the right
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    marginLeft: spacing.xs, // Small margin from drawer button
  },
  syncLoaderContainer: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
