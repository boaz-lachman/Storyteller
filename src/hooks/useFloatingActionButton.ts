/**
 * Custom hook for FloatingActionButton logic
 * Manages state, animations, and position calculations
 */
import React, { useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from './redux';
import { selectSnackbar } from '../store/slices/uiSlice';
import { spacing } from '../constants/spacing';

export interface FABOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  color?: string;
}

export interface UseFloatingActionButtonProps {
  options: FABOption[];
  onMainPress?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: number;
}

export interface UseFloatingActionButtonReturn {
  // State
  isExpanded: boolean;
  isRTL: boolean;
  isSnackbarVisible: boolean;
  
  // Handlers
  handleMainPress: () => void;
  handleOptionPress: (option: FABOption) => void;
  toggleExpanded: () => void;
  
  // Styles
  positionStyle: {
    top?: number;
    right?: number;
    left?: number;
  };
  animatedPositionStyle: any;
  mainButtonStyle: any;
  optionsContainerStyle: any;
  getOptionStyle: (index: number) => any;
}

/**
 * Hook for FloatingActionButton component logic
 */
export const useFloatingActionButton = ({
  options,
  onMainPress,
  position = 'bottom-right',
  size = 56,
}: UseFloatingActionButtonProps): UseFloatingActionButtonReturn => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRTL = I18nManager.isRTL;
  const snackbar = useAppSelector(selectSnackbar);
  const isSnackbarVisible = !!snackbar.message;
  const insets = useSafeAreaInsets();

  // Snackbar height (typical height for react-native-paper Snackbar)
  const SNACKBAR_HEIGHT = 48;
  const SNACKBAR_OFFSET = SNACKBAR_HEIGHT + spacing.md; // Height + spacing

  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const optionsOpacity = useSharedValue(0);
  const optionsScale = useSharedValue(0);
  const bottomOffset = useSharedValue(0);

  // Update bottom offset when snackbar visibility changes
  useEffect(() => {
    const isBottom = position.includes('bottom');
    if (isBottom) {
      bottomOffset.value = withSpring(
        isSnackbarVisible ? SNACKBAR_OFFSET : 0,
        { damping: 15 }
      );
    }
  }, [isSnackbarVisible, position, bottomOffset]);

  // Animated position style for bottom position
  const animatedPositionStyle = useAnimatedStyle(() => {
    const isBottom = position.includes('bottom');
    if (!isBottom) return {};

    // Add safe area bottom inset to conform with SafeAreaView
    const safeAreaBottom = insets.bottom;
    return {
      bottom: spacing.lg + safeAreaBottom + bottomOffset.value,
    };
  });

  // Determine position styles based on position prop and RTL
  const getPositionStyle = () => {
    const isBottom = position.includes('bottom');
    const isRight = position.includes('right');
    
    // In RTL, flip left/right
    const actualIsRight = isRTL ? !isRight : isRight;

    return {
      // bottom will be handled by animated style if it's a bottom position
      top: !isBottom ? spacing.lg : undefined,
      right: actualIsRight ? spacing.lg : undefined,
      left: !actualIsRight ? spacing.lg : undefined,
    };
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    if (newExpanded) {
      // Expand animation
      rotation.value = withSpring(45, { damping: 15 });
      scale.value = withSpring(0.9, { damping: 15 });
      optionsOpacity.value = withTiming(1, { duration: 200 });
      optionsScale.value = withSpring(1, { damping: 15 });
    } else {
      // Collapse animation
      rotation.value = withSpring(0, { damping: 15 });
      scale.value = withSpring(1, { damping: 15 });
      optionsOpacity.value = withTiming(0, { duration: 150 });
      optionsScale.value = withSpring(0, { damping: 15 });
    }
  };

  const handleMainPress = () => {
    if (onMainPress && !isExpanded) {
      onMainPress();
    } else {
      toggleExpanded();
    }
  };

  const handleOptionPress = (option: FABOption) => {
    option.onPress();
    toggleExpanded();
  };

  // Main button animated style
  const mainButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  // Options container animated style
  const optionsContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: optionsOpacity.value,
      transform: [{ scale: optionsScale.value }],
    };
  });

  // Individual option animated style
  const getOptionStyle = (index: number) => {
    return useAnimatedStyle(() => {
      const optionIndex = index;
      const isBottom = position.includes('bottom');
      const translateY = isBottom
        ? interpolate(
            optionsScale.value,
            [0, 1],
            [0, -(optionIndex + 1) * (size + spacing.md)],
            Extrapolation.CLAMP
          )
        : interpolate(
            optionsScale.value,
            [0, 1],
            [0, (optionIndex + 1) * (size + spacing.md)],
            Extrapolation.CLAMP
          );

      const opacity = interpolate(
        optionsScale.value,
        [0, 0.5, 1],
        [0, 0, 1],
        Extrapolation.CLAMP
      );

      return {
        transform: [{ translateY }],
        opacity,
      };
    });
  };

  const positionStyle = getPositionStyle();

  return {
    // State
    isExpanded,
    isRTL,
    isSnackbarVisible,
    
    // Handlers
    handleMainPress,
    handleOptionPress,
    toggleExpanded,
    
    // Styles
    positionStyle,
    animatedPositionStyle,
    mainButtonStyle,
    optionsContainerStyle,
    getOptionStyle,
  };
};
