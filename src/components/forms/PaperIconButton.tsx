/**
 * IconButton component with RTL/LTR support
 * Styled with theme and typography
 */
import React from 'react';
import { StyleSheet, I18nManager, ViewStyle } from 'react-native';
import { IconButton } from 'react-native-paper';
import type { IconButtonProps as RNIconButtonProps } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export interface PaperIconButtonProps extends Omit<RNIconButtonProps, 'theme'> {
  containerStyle?: ViewStyle;
}

/**
 * IconButton component with theme styling and RTL/LTR support
 */
export const PaperIconButton: React.FC<PaperIconButtonProps> = ({
  containerStyle,
  style,
  iconColor,
  size = 24,
  ...iconButtonProps
}) => {
  const isRTL = I18nManager.isRTL;

  return (
    <IconButton
      {...iconButtonProps}
      icon={iconButtonProps.icon}
      size={size}
      iconColor={iconColor || colors.text}
      style={[
        styles.iconButton,
        isRTL && styles.iconButtonRTL,
        style,
        containerStyle,
      ]}
      theme={{
        colors: {
          primary: colors.primary,
          onPrimary: colors.textInverse,
          secondary: colors.secondary,
          onSecondary: colors.text,
          error: colors.error,
          surface: colors.surface,
          onSurface: colors.text,
        },
      }}
    />
  );
};

const styles = StyleSheet.create({
  iconButton: {
    margin: spacing.xs,
  },
  iconButtonRTL: {
    // RTL-specific icon button styles if needed
  },
});

export default PaperIconButton;
