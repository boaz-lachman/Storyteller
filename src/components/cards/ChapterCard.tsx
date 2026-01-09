/**
 * Chapter Card Component
 * Displays chapter information in a card format
 * Shows chapter number, title, description preview, importance indicator, and order controls
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import SyncIndicator from '../common/SyncIndicator';
import type { Chapter } from '../../types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { truncate } from '../../utils/formatting';

const AnimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

export interface ChapterCardProps {
  chapter: Chapter;
  onPress?: (chapter: Chapter) => void;
  onDelete?: (chapter: Chapter) => void;
  onMoveUp?: (chapter: Chapter) => void;
  onMoveDown?: (chapter: Chapter) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

/**
 * Get color for importance indicator based on value (1-10)
 */
const getImportanceColor = (importance: number): string => {
  if (importance >= 8) return colors.error;
  if (importance >= 6) return colors.warning;
  if (importance >= 4) return colors.info;
  return colors.textSecondary;
};

/**
 * Chapter Card Component
 */
export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  onPress,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}) => {
  const isRTL = I18nManager.isRTL;
  
  // Animation values
  const scale = useSharedValue(1);

  // Animated style for press animation
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Handle card press with animation
  const handlePressIn = () => {
    scale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePress = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    if (onPress) {
      onPress(chapter);
    }
  };

  const importanceColor = getImportanceColor(chapter.importance);
  const descriptionPreview = truncate(chapter.description, 100);

  return (
    <AnimatedTouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={animatedCardStyle}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {/* Header Row: Chapter Number, Title, Sync Indicator, and Delete Button */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <View style={styles.chapterNumberContainer}>
                <Text style={styles.chapterNumber}>Chapter {chapter.order}</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {chapter.title}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <SyncIndicator
                synced={chapter.synced}
                iconSize={16}
                containerSize={20}
              />
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(chapter)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Description Preview */}
          {chapter.description && (
            <Text style={styles.description} numberOfLines={2}>
              {descriptionPreview}
            </Text>
          )}

          {/* Footer Row: Order Controls and Importance Indicator */}
          <View style={styles.footerRow}>
            {/* Order Controls */}
            <View style={styles.orderControls}>
              <TouchableOpacity
                onPress={() => onMoveUp && onMoveUp(chapter)}
                disabled={isFirst || !onMoveUp}
                style={[
                  styles.orderButton,
                  (isFirst || !onMoveUp) && styles.orderButtonDisabled,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={isFirst || !onMoveUp ? colors.textTertiary : colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onMoveDown && onMoveDown(chapter)}
                disabled={isLast || !onMoveDown}
                style={[
                  styles.orderButton,
                  (isLast || !onMoveDown) && styles.orderButtonDisabled,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={isLast || !onMoveDown ? colors.textTertiary : colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Importance Indicator */}
            <View style={styles.importanceContainer}>
              <Ionicons
                name="star"
                size={16}
                color={importanceColor}
              />
              <Text style={[styles.importanceText, { color: importanceColor }]}>
                {chapter.importance}/10
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  chapterNumberContainer: {
    marginBottom: spacing.xs,
  },
  chapterNumber: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  orderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  orderButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderButtonDisabled: {
    opacity: 0.3,
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  importanceText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ChapterCard;
