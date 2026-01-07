/**
 * Global Snackbar component using react-native-paper
 * Connected to Redux uiSlice for state management
 * Covers the entire app using absolute positioning
 * Complies with SafeAreaView for proper insets on all devices
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Snackbar as PaperSnackbar } from 'react-native-paper';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectSnackbar, hideSnackbar } from '../../store/slices/uiSlice';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

/**
 * Maps snackbar type to react-native-paper Snackbar style
 * Uses theme colors from constants
 */
const getSnackbarStyle = (type: 'success' | 'error' | 'info' | 'warning' | null) => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: colors.success,
      };
    case 'error':
      return {
        backgroundColor: colors.error,
      };
    case 'warning':
      return {
        backgroundColor: colors.warning,
      };
    case 'info':
      return {
        backgroundColor: colors.info,
      };
    default:
      return {
        backgroundColor: colors.primary,
      };
  }
};

/**
 * Global Snackbar component
 * Automatically displays messages from Redux state and hides on dismiss
 * Supports undo action when provided
 * Respects safe area insets for proper positioning on all devices
 */
export const Snackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector(selectSnackbar);
  const insets = useSafeAreaInsets();

  const visible = !!snackbar.message;
  const message = snackbar.message || '';
  const type = snackbar.type;
  const onUndo = snackbar.onUndo;

  const handleDismiss = () => {
    dispatch(hideSnackbar());
  };

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
    }
    dispatch(hideSnackbar());
  };

  if (!visible) {
    return null;
  }

  // Determine action button: show "Undo" if onUndo is provided, otherwise "Dismiss"
  const action = onUndo
    ? {
        label: 'Undo',
        onPress: handleUndo,
      }
    : {
        label: 'Dismiss',
        onPress: handleDismiss,
      };

  // Calculate bottom padding: use safe area inset or minimum spacing
  const bottomPadding = Math.max(insets.bottom, spacing.sm);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <PaperSnackbar
        visible={visible}
        onDismiss={handleDismiss}
        duration={onUndo ? 5000 : 3000} // Longer duration when undo is available
        style={[
          getSnackbarStyle(type), 
          styles.snackbar,
          { bottom: bottomPadding }
        ]}
        action={action}
      >
        {message}
      </PaperSnackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 9999,
  },
  snackbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '95%',
  },
});

export default Snackbar;
