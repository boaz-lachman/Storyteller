/**
 * Global Snackbar component using react-native-paper
 * Connected to Redux uiSlice for state management
 */
import React from 'react';
import { Snackbar as PaperSnackbar } from 'react-native-paper';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { selectSnackbar, hideSnackbar } from '../../store/slices/uiSlice';
import { colors } from '../../constants/colors';

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
 */
export const Snackbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const snackbar = useAppSelector(selectSnackbar);

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

  return (
    <PaperSnackbar
      visible={visible}
      onDismiss={handleDismiss}
      duration={onUndo ? 5000 : 3000} // Longer duration when undo is available
      style={getSnackbarStyle(type)}
      action={action}
    >
      {message}
    </PaperSnackbar>
  );
};

export default Snackbar;
