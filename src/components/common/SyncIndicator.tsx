/**
 * Sync Indicator Component
 * Displays sync status with MainBookActivityIndicator and cloud-sync icon
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../../hooks/redux';
import { selectIsSyncing, selectIsOnline, selectLastSyncTime, selectSyncError } from '../../store/slices/syncSlice';
import { AntDesign } from '@expo/vector-icons';
import MainBookActivityIndicator from './MainBookActivityIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface SyncIndicatorProps {
  onPress?: () => void;
  size?: number;
}

/**
 * Sync Indicator Component
 * Shows sync status with icon and loading indicator
 */
export default function SyncIndicator({ onPress, size = 24 }: SyncIndicatorProps) {
  const isSyncing = useAppSelector(selectIsSyncing);
  const isOnline = useAppSelector(selectIsOnline);
  const lastSyncTime = useAppSelector(selectLastSyncTime);
  const syncError = useAppSelector(selectSyncError);

  // Determine icon color based on status
  const getIconColor = () => {
    if (syncError) {
      return colors.error;
    }
    if (!isOnline) {
      return colors.textSecondary;
    }
    if (isSyncing) {
      return colors.primary;
    }
    return colors.success;
  };

  const content = (
    <View style={styles.container}>
      {isSyncing ? (
        <View style={styles.loadingContainer}>
          <MainBookActivityIndicator size={size} />
        </View>
      ) : (
        <AntDesign
          name="cloud-sync"
          size={size}
          color={getIconColor()}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchable: {
    padding: spacing.xs,
  },
});
