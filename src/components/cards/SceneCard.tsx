/**
 * Scene Card Component
 * Displays scene information in a card format
 * Shows title, description preview, setting badge, importance indicator, and sync status
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
import type { Scene } from '../../types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { truncate } from '../../utils/formatting';

const AnimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

export interface SceneCardProps {
  scene: Scene;
  onPress?: (scene: Scene) => void;
  onDelete?: (scene: Scene) => void;
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
 * Get color for conflict level indicator based on value (1-10)
 */
const getConflictColor = (conflictLevel?: number): string => {
  if (!conflictLevel) return colors.textTertiary;
  if (conflictLevel >= 8) return colors.error;
  if (conflictLevel >= 6) return colors.warning;
  if (conflictLevel >= 4) return colors.info;
  return colors.textSecondary;
};

/**
 * Scene Card Component
 */
export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  onPress,
  onDelete,
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
      onPress(scene);
    }
  };

  const importanceColor = getImportanceColor(scene.importance);
  const conflictColor = getConflictColor(scene.conflictLevel);
  const descriptionPreview = truncate(scene.description, 100);
  const characterCount = scene.characters?.length || 0;

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
          {/* Header Row: Title, Sync Indicator, and Delete Button */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {scene.title}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <SyncIndicator
                synced={scene.synced}
                iconSize={16}
                containerSize={20}
              />
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(scene)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Description Preview */}
          {scene.description && (
            <Text style={styles.description} numberOfLines={2}>
              {descriptionPreview}
            </Text>
          )}

          {/* Footer Row: Setting Badge, Character Count, Importance, and Conflict Level */}
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              {/* Setting Badge */}
              {scene.setting && (
                <View style={styles.settingBadge}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                  <Text style={styles.settingBadgeText} numberOfLines={1}>
                    {truncate(scene.setting, 20)}
                  </Text>
                </View>
              )}

              {/* Character Count */}
              {characterCount > 0 && (
                <View style={styles.characterBadge}>
                  <Ionicons name="people" size={14} color={colors.info} />
                  <Text style={styles.characterBadgeText}>
                    {characterCount}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.footerRight}>
              {/* Conflict Level */}
              {scene.conflictLevel !== undefined && (
                <View style={styles.conflictContainer}>
                  <Ionicons
                    name="flash"
                    size={14}
                    color={conflictColor}
                  />
                  <Text style={[styles.conflictText, { color: conflictColor }]}>
                    {scene.conflictLevel}/10
                  </Text>
                </View>
              )}

              {/* Importance Indicator */}
              <View style={styles.importanceContainer}>
                <Ionicons
                  name="star"
                  size={16}
                  color={importanceColor}
                />
                <Text style={[styles.importanceText, { color: importanceColor }]}>
                  {scene.importance}/10
                </Text>
              </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  settingBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    maxWidth: 100,
  },
  characterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  characterBadgeText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
  conflictContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  conflictText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
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

export default SceneCard;
