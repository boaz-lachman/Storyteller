/**
 * Custom Drawer Content Component
 * Displays user information at the top and logout button at the bottom
 * Complies with SafeAreaView for proper insets on all devices
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { Text, Divider, TouchableRipple } from 'react-native-paper';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/slices/authSlice';
import { useLogout } from '../../hooks/useLogout';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import PaperButton from '../forms/PaperButton';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../../navigation/types';

/**
 * Custom Drawer Content
 * Shows user info at top and logout button at bottom
 * Uses SafeAreaView to respect device safe areas
 */
export default function DrawerContent(props: DrawerContentComponentProps) {
  const user = useAppSelector(selectUser);
  const { logout } = useLogout();
  const insets = useSafeAreaInsets();

  // Get current route name - check if we're on StoriesList
  const currentRouteIndex = props.state?.index ?? 0;
  const currentRoute = props.state?.routes?.[currentRouteIndex];
  const nestedState = currentRoute?.state;
  const nestedRouteIndex = nestedState?.index ?? 0;
  const nestedRoute = nestedState?.routes?.[nestedRouteIndex]?.name;
  const isOnStoriesList = nestedRoute === 'StoriesList';

  const handleLogout = async () => {
    await logout();
    // Navigation will be handled by AppNavigator's auth state listener
  };

  const handleNavigateToStories = () => {
    props.navigation.navigate('AppStack', {
      screen: 'StoriesList',
    });
    props.navigation.closeDrawer();
  };

  // Get display name: displayName, email, or "User"
  const displayName = user?.displayName || user?.email || 'User';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Info Section at Top */}
        <View style={[styles.userSection, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
          <View style={styles.userIconContainer}>
            <Ionicons 
              name="person-circle" 
              size={64} 
              color={colors.primary} 
            />
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          {user?.email && user.email !== displayName && (
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Drawer Items - Navigation handled by DrawerNavigator */}
        <View style={styles.drawerItems}>
          {/* Stories List Button - Show if not on StoriesList */}
          {!isOnStoriesList && (
            <TouchableRipple
              onPress={handleNavigateToStories}
              style={styles.drawerItem}
              rippleColor={colors.primary + '20'}
            >
              <View style={styles.drawerItemContent}>
                <Ionicons 
                  name="book-outline" 
                  size={24} 
                  color={colors.primary} 
                  style={styles.drawerItemIcon}
                />
                <Text style={styles.drawerItemText}>Stories</Text>
              </View>
            </TouchableRipple>
          )}
        </View>
      </DrawerContentScrollView>

      {/* Logout Button at Bottom */}
      <View style={[styles.logoutSection, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.logoutButtonContainer}>
          <Ionicons 
            name="log-out-outline" 
            size={20} 
            color={colors.error} 
            style={styles.logoutIcon}
          />
          <PaperButton
            variant="text"
            onPress={handleLogout}
            style={styles.logoutButton}
            labelStyle={styles.logoutButtonText}
          >
            Logout
          </PaperButton>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    flexGrow: 1,
  },
  userSection: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  userIconContainer: {
    marginBottom: spacing.md,
  },
  userName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  userEmail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  drawerItems: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  drawerItem: {
    borderRadius: spacing.xs,
    marginVertical: spacing.xs,
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  drawerItemIcon: {
    marginRight: spacing.md,
  },
  drawerItemText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  drawerItemTextFocused: {
    fontFamily: typography.fontFamily.semibold,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  logoutSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  logoutButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    marginRight: spacing.sm,
  },
  logoutButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderColor: colors.error,
  },
  logoutButtonText: {
    color: colors.error,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});
