/**
 * Floating Action Button with expandable options
 * Supports RTL/LTR layouts and uses react-native-reanimated for animations
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Pressable,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { theme } from '../../constants/theme';
import { typography } from '../../constants/typography';
import { useFloatingActionButton, type FABOption } from '../../hooks/useFloatingActionButton';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Re-export FABOption for convenience
export type { FABOption };

export interface FloatingActionButtonProps {
  options: FABOption[];
  onMainPress?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  mainButtonColor?: string;
  mainButtonIconColor?: string;
  size?: number;
}

/**
 * Floating Action Button component
 */
export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  options,
  onMainPress,
  position = 'bottom-right',
  mainButtonColor = colors.primary,
  mainButtonIconColor = colors.textInverse,
  size = 56,
}) => {
  const {
    isExpanded,
    isRTL,
    handleMainPress,
    handleOptionPress,
    toggleExpanded,
    positionStyle,
    animatedPositionStyle,
    mainButtonStyle,
    optionsContainerStyle,
    getOptionStyle,
  } = useFloatingActionButton({
    options,
    onMainPress,
    position,
    size,
  });

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <Pressable
          style={styles.backdrop}
          onPress={toggleExpanded}
        />
      )}

      <Animated.View style={[styles.container, positionStyle, animatedPositionStyle]}>
        {/* Options */}
        {options.length > 0 && (
          <Animated.View
            style={[
              styles.optionsContainer,
              optionsContainerStyle,
              isRTL && styles.optionsContainerRTL,
            ]}
          >
            {options.map((option, index) => {
              const optionStyle = getOptionStyle(index);
              return (
                <AnimatedPressable
                  key={option.id}
                  style={[optionStyle, styles.optionWrapper]}
                  onPress={() => handleOptionPress(option)}
                >
                  <View
                    style={[
                      styles.optionButton,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: option.color || colors.surface,
                      },
                    ]}
                  >
                    {option.icon ? (
                      option.icon
                    ) : (
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: colors.text },
                        ]}
                      >
                        {option.label.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.optionLabelContainer,
                      isRTL ? styles.optionLabelContainerRTL : styles.optionLabelContainerLTR,
                    ]}
                  >
                    <Text style={styles.optionLabelText}>{option.label}</Text>
                  </View>
                </AnimatedPressable>
              );
            })}
          </Animated.View>
        )}

        {/* Main FAB button */}
        <AnimatedTouchable
          style={[
            styles.mainButton,
            mainButtonStyle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: mainButtonColor,
            },
          ]}
          onPress={handleMainPress}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Text
              style={[
                styles.plusIcon,
                {
                  color: mainButtonIconColor,
                  fontSize: size * 0.4, // Dynamic size based on button size
                },
              ]}
            >
              +
            </Text>
          </View>
        </AnimatedTouchable>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
    zIndex: 999,
  },
  optionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
    elevation: 8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.tight,
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  optionsContainerRTL: {
    left: 0,
    right: 'auto',
    alignItems: 'center',
  },
  optionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionLabelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
    elevation: 2,
    maxWidth: 200,
  },
  optionLabelContainerLTR: {
    marginRight: spacing.md,
  },
  optionLabelContainerRTL: {
    marginLeft: spacing.md,
  },
  optionLabelText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    lineHeight: typography.lineHeight.normal,
    letterSpacing: typography.letterSpacing.normal,
  },
  optionLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
});

export default FloatingActionButton;
