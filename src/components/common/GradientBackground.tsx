/**
 * Gradient Background Component
 * Provides a colorful gradient background for the app
 */
import React from 'react';
import { StyleSheet, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';

export interface GradientBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  gradientColors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

/**
 * Default gradient colors - warm peach to orange
 * Linear vertical gradient from top to bottom
 */
const defaultColors: readonly [ColorValue, ColorValue] = [
  colors.gradient.peach, // Warm peach (primary)
  colors.gradient.orange, // Light orange
];

const defaultStart = { x: 0, y: 0 }; // Top
const defaultEnd = { x: 0, y: 1 }; // Bottom - linear vertical gradient

/**
 * Gradient Background Component
 */
export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  style,
  gradientColors = defaultColors,
  start = defaultStart,
  end = defaultEnd,
}) => {
  return (
    <LinearGradient
      colors={gradientColors}
      start={start}
      end={end}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});
