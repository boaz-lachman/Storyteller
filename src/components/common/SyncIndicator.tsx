/**
 * Sync Indicator Component
 * Reusable component to display sync status with icon
 * Shows green circle with cloud-sync icon when synced, red when not synced
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

export interface SyncIndicatorProps {
  /**
   * Whether the item is synced
   */
  synced: boolean;
  /**
   * Size of the icon (default: 16)
   */
  iconSize?: number;
  /**
   * Size of the container (default: 24)
   * If not provided, will be calculated as iconSize * 1.5
   */
  containerSize?: number;
  /**
   * Custom style for the container
   */
  style?: any;
}

/**
 * Sync Indicator Component
 * Displays a circular indicator with cloud-sync icon
 * Green when synced, red when not synced
 */
export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  synced,
  iconSize = 16,
  containerSize,
  style,
}) => {
  const size = containerSize || iconSize * 1.5;
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: synced ? colors.success : colors.error,
        },
        style,
      ]}
    >
      <MaterialIcons
        name="cloud-sync"
        size={iconSize}
        color={colors.textInverse}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SyncIndicator;
