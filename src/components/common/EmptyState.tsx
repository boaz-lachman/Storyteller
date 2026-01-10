/**
 * Empty State Component
 * Displays when a list is empty
 * Shows syncing indicator when syncing is in progress
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { useAppSelector } from '../../hooks/redux';
import { selectIsSyncing } from '../../store/slices/syncSlice';
import { MainBookActivityIndicator } from './MainBookActivityIndicator';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
}

/**
 * Empty State Component
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
}) => {
  const isSyncing = useAppSelector(selectIsSyncing);
  
  // Default icon if none provided
  const defaultIcon = <AntDesign name="file-text" size={64} color={colors.textTertiary} />;
  const displayIcon = icon || defaultIcon;

  // Show syncing indicator when syncing
  if (isSyncing) {
    return (
      <View style={styles.container}>
        <MainBookActivityIndicator size="large" />
        <Text style={styles.title}>loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayIcon}
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
});

export default EmptyState;
