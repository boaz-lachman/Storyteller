/**
 * Navigation Theme Configuration
 * Defines colors, header styles, and tab bar styles for React Navigation
 */
import type { Theme as NavigationTheme } from '@react-navigation/native';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { spacing } from '../constants/spacing';

/**
 * Default navigation theme for React Navigation
 * Used by NavigationContainer
 */
export const navigationTheme: NavigationTheme = {
    dark: false,
    colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.error,
    },
    fonts: {
        regular: {
            fontFamily: typography.fontFamily.regular,
            fontWeight: typography.fontWeight.regular as any,
        },
        medium: {
            fontFamily: typography.fontFamily.medium,
            fontWeight: typography.fontWeight.medium as any,
        },
        bold: {
            fontFamily: typography.fontFamily.bold,
            fontWeight: typography.fontWeight.bold as any,
        },
        heavy: {
            fontFamily: typography.fontFamily.bold,
          fontWeight: typography.fontWeight.bold as any,
        }
    }
};

/**
 * Stack Navigator Header Options
 * Default header configuration for stack navigators
 */
export const stackHeaderOptions = {
  headerStyle: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    elevation: 0, // Android
    shadowOpacity: 0, // iOS
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  headerBackTitleVisible: false,
  headerShadowVisible: false,
  headerTitleAlign: 'center' as const,
};

/**
 * Material Top Tab Navigator Options
 * Default tab bar configuration for material top tab navigator
 */
export const materialTopTabOptions = {
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    elevation: 0, // Android
    shadowOpacity: 0, // iOS
  },
  tabBarIndicatorStyle: {
    backgroundColor: colors.primary,
    height: 3,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textTertiary,
  tabBarLabelStyle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'none' as const,
    marginTop: spacing.xs,
  },
  tabBarItemStyle: {
    paddingVertical: spacing.sm,
  },
  tabBarScrollEnabled: true,
  tabBarGap: spacing.md,
};

/**
 * Bottom Tab Navigator Options (if needed in the future)
 * Default tab bar configuration for bottom tab navigator
 */
export const bottomTabOptions = {
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    elevation: 0, // Android
    shadowOpacity: 0, // iOS
    height: 60,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textTertiary,
  tabBarLabelStyle: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  tabBarIconStyle: {
    marginTop: spacing.xs,
  },
};

/**
 * Auth Stack Header Options
 * Specific header configuration for auth screens (typically hidden)
 */
export const authStackHeaderOptions = {
  headerShown: false,
};

/**
 * App Stack Header Options
 * Header configuration for main app screens
 */
export const appStackHeaderOptions = {
  ...stackHeaderOptions,
  headerShown: true,
  headerBackTitle: '',
  headerBackTitleVisible: false,
};

/**
 * Story Detail Header Options
 * Header configuration for story detail screens
 */
export const storyDetailHeaderOptions = {
  ...stackHeaderOptions,
  headerShown: false, // StoryNavigator uses tabs, so header is hidden
};
