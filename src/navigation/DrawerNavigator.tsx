/**
 * Drawer Navigator
 * Wraps the main app stack with a drawer menu
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AppStackParamList } from './types';
import StoriesListScreen from '../screens/stories/StoriesListScreen';
import StoryDetailScreen from '../screens/stories/StoryDetailScreen';
import LightModeStoryScreen from '../screens/stories/LightModeStoryScreen';
import DrawerContent from '../components/navigation/DrawerContent';
import { appStackHeaderOptions } from './theme';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { typography } from '../constants/typography';
import Logo from '../components/common/Logo';
import SyncStatusBar from '../components/common/SyncStatusBar';
import { useAppSelector } from '../hooks/redux';
import { selectLanguage } from '../store/slices/languageSlice';
import { Ionicons } from '@expo/vector-icons';

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
      <Stack.Screen
        name="LightModeStory"
        component={LightModeStoryScreen}
        options={{
          headerShown: false,
          gestureEnabled: true,
          presentation: 'fullScreenModal',
        }}
      />
    </Stack.Navigator>
  );
}


/**
 * Drawer Toggle Button Component
 * Explicitly shows the drawer toggle button
 */
function DrawerToggleButton({ navigation }: { navigation: DrawerNavigationProp<any> }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.toggleDrawer()}
      style={styles.drawerButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="menu" size={24} color={colors.text} />
    </TouchableOpacity>
  );
}

/**
 * Drawer Navigator Component
 * Provides drawer menu with user info and logout
 */
export default function DrawerNavigator() {
  const language = useAppSelector(selectLanguage);
  const isRTL = language === 'he';

  // Update I18nManager when language changes
  React.useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
      // Note: I18nManager changes require app restart on Android
      // On iOS, it works dynamically
    }
  }, [isRTL]);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        drawerType: 'front',
        drawerPosition: isRTL ? 'right' : 'left',
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
        headerTitleAlign: isRTL ? 'center' : 'left',
        // Explicitly set drawer button position based on RTL
        headerLeft: () => <DrawerToggleButton navigation={navigation} />,
       
      })}
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
          headerRight: () => <SyncStatusBar />, // Add sync status bar to the right
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    marginLeft: spacing.xs, // Small margin from drawer button (will be marginRight in RTL)
  },
  drawerButton: {
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
});
