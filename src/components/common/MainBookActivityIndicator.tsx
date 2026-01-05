/**
 * Customizable loader component using Lottie animation
 */
import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import FlipBookLoaderAnimation from '../../../assets/Flip_Book_Loader.json';

export interface MainBookActivityIndicatorProps {
  /**
   * Size of the loader (width and height)
   * Can be a number (pixels) or 'small' | 'medium' | 'large'
   * @default 100
   */
  size?: number | 'small' | 'medium' | 'large';
  /**
   * Animation speed multiplier
   * @default 1
   */
  speed?: number;
  /**
   * Custom color for the loader (applied via color filter)
   * @default undefined (uses original colors)
   */
  color?: string;
  /**
   * Additional container styles
   */
  style?: ViewStyle;
  /**
   * Whether to loop the animation
   * @default true
   */
  loop?: boolean;
  /**
   * Whether to auto-play the animation
   * @default true
   */
  autoPlay?: boolean;
}

/**
 * Size presets
 */
const SIZE_PRESETS = {
  small: 60,
  medium: 100,
  large: 150,
};

/**
 * Convert hex color to RGB
 */
const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : null;
};

/**
 * MainBookActivityIndicator component with customizable size, speed, and color
 */
export const MainBookActivityIndicator: React.FC<MainBookActivityIndicatorProps> = ({
  size = 100,
  speed = 1,
  color,
  style,
  loop = true,
  autoPlay = true,
}) => {
  // Calculate actual size
  const actualSize = useMemo(() => {
    if (typeof size === 'number') {
      return size;
    }
    return SIZE_PRESETS[size] || SIZE_PRESETS.medium;
  }, [size]);

  // Prepare color filters if color is provided
  const colorFilters = useMemo(() => {
    if (!color) return undefined;

    const rgb = hexToRgb(color);
    if (!rgb) return undefined;

    // Apply color filter to stroke colors in the animation
    // This targets the "Stroke" fills in the Lottie animation
    return [
      {
        keypath: '**',
        color: `rgb(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)})`,
      },
    ];
  }, [color]);

  return (
    <View style={[styles.container, style]}>
      <LottieView
        source={FlipBookLoaderAnimation}
        style={[
          styles.animation,
          {
            width: actualSize,
            height: actualSize,
          },
        ]}
        speed={speed}
        loop={loop}
        autoPlay={autoPlay}
        colorFilters={colorFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    // Size is applied dynamically via style prop
  },
});

export default MainBookActivityIndicator;
