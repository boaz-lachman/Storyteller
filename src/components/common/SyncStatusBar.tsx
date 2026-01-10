/**
 * Sync Status Bar Component
 * Displays sync status with progress indicator, sync button, and background sync status
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSync } from '../../hooks/useSync';
import { colors } from '../../constants/colors';
import MainBookActivityIndicator from './MainBookActivityIndicator';

export interface SyncStatusBarProps {
  /**
   * Show sync button (default: true)
   */
  showSyncButton?: boolean;
  /**
   * Show last sync time (default: true)
   */
  showLastSyncTime?: boolean;
  /**
   * Show background sync status (default: true)
   */
  showBackgroundStatus?: boolean;
  /**
   * Custom style
   */
  style?: any;
}

/**
 * Sync Status Bar Component
 */
export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  showSyncButton = true,
  showLastSyncTime = true,
  showBackgroundStatus = true,
  style,
}) => {
  const {
    isSyncing,
    lastSyncTime,
    isOnline,
    syncError,
    pendingCount,
    sync,
  } = useSync();

  const handleSync = async () => {
    await sync();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Online/Offline Indicator */}
      <View style={styles.statusIndicator}>
        <MaterialIcons
          name={isOnline ? 'wifi' : 'wifi-off'}
          size={16}
          color={isOnline ? colors.success : colors.error}
        />
      </View>

      {/* Sync Status */}
      {isSyncing ? (
        <View style={styles.syncingContainer}>
          <MainBookActivityIndicator size={24} speed={1.5} />
        </View>
      ) : syncError ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={16} color={colors.error} />
        </View>
      ) : (
        <View style={styles.idleContainer}>
          <MaterialIcons
            name="cloud-done"
            size={16}
            color={pendingCount > 0 ? colors.warning : colors.success}
          />
        </View>
      )}

      {/* Pending Count */}
      {pendingCount > 0 && (
        <View style={styles.pendingBadge}>
          <MaterialIcons name="sync-problem" size={14} color={colors.text} />
        </View>
      )}

      {/* Sync Button */}
      {showSyncButton && (
        <TouchableOpacity
          onPress={handleSync}
          disabled={isSyncing || !isOnline}
          style={[
            styles.syncButton,
            (isSyncing || !isOnline) && styles.syncButtonDisabled,
          ]}
        >
          <MaterialIcons
            name="sync"
            size={22}
            color={isSyncing || !isOnline ? colors.textSecondary : colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  statusIndicator: {
    marginRight: 8,
  },
  syncingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    width: 24,
    height: 24,
  },
  errorContainer: {
    marginRight: 8,
  },
  idleContainer: {
    marginRight: 8,
  },
  pendingBadge: {
    marginRight: 8,
  },
  lastSyncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  lastSyncIcon: {
    marginLeft: 4,
  },
  syncButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
});

export default SyncStatusBar;
