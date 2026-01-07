/**
 * Story Detail Screen
 * Displays detailed information about a specific story
 * Placeholder implementation - StoryNavigator is used instead
 * This screen is kept for type compatibility
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

/**
 * Story Detail Screen Component
 * Note: This is a placeholder. The actual story detail view
 * is handled by StoryNavigator which contains tabs for
 * Characters, Blurbs, Scenes, and Chapters.
 */
export default function StoryDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Detail</Text>
      <Text style={styles.subtitle}>
        Story detail view with tabs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
});
