/**
 * Button component with variants, loading state, and RTL/LTR support
 * Styled with theme and typography
 */
import React from 'react';
import { StyleSheet, I18nManager, ViewStyle, TextStyle } from 'react-native';
import { Button } from 'react-native-paper';
import type { ButtonProps as RNButtonProps } from 'react-native-paper';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { theme } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';

export interface PaperButtonProps extends Omit<RNButtonProps, 'theme' | 'mode' | 'buttonColor' | 'textColor'> {
  variant?: ButtonVariant;
  loading?: boolean;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
}

/**
 * Button component with variants and loading state
 */
export const PaperButton: React.FC<PaperButtonProps> = ({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  containerStyle,
  labelStyle,
  style,
  ...buttonProps
}) => {
  const isRTL = I18nManager.isRTL;

  // Get variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          buttonColor: colors.primary,
          textColor: colors.textInverse,
          mode: 'contained' as const,
        };
      case 'secondary':
        return {
          buttonColor: colors.secondary,
          textColor: colors.text,
          mode: 'contained' as const,
        };
      case 'outline':
        return {
          buttonColor: 'transparent',
          textColor: colors.primary,
          mode: 'outlined' as const,
        };
    case 'text':
      return {
        buttonColor: 'transparent',
        textColor: colors.primary,
        mode: 'text' as const,
      };
      default:
        return {
          buttonColor: colors.primary,
          textColor: colors.textInverse,
          mode: 'contained' as const,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const isDisabled = disabled || loading;

  return (
    <Button
      {...buttonProps}
      mode={variantStyles.mode}
      buttonColor={variantStyles.buttonColor}
      textColor={variantStyles.textColor}
      disabled={isDisabled}
      loading={loading}
      style={[
        styles.button,
        variant === 'outline' && styles.buttonOutline,
        style,
        containerStyle,
      ]}
      labelStyle={[
        styles.label,
        variant === 'outline' && styles.labelOutline,
        labelStyle,
      ]}
      contentStyle={[
        variant !== 'text' && styles.content,
        variant !== 'text' &&isRTL && styles.contentRTL,
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
    >
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
    elevation: 2,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },

  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
    letterSpacing: typography.letterSpacing.normal,
    textTransform: 'none', // Don't uppercase
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  labelOutline: {
    // Additional styles for outline variant if needed
  },
  labelRTL: {
    textAlign: 'right',
  },
  content: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  contentRTL: {
    // RTL-specific content styles if needed
  },
});

export default PaperButton;
