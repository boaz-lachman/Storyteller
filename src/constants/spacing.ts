/**
 * Spacing scale for consistent layout
 * Based on 4px base unit
 */
/** Extra bottom padding for forms so content can scroll above the keyboard when it is shown */
export const KEYBOARD_BOTTOM_PADDING = 320;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export type SpacingKey = keyof typeof spacing;
