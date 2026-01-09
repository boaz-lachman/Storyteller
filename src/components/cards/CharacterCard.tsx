/**
 * Character Card Component
 * Displays character information in a card format
 * Shows name, description preview, importance indicator, and role badge
 */
import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import SyncIndicator from '../common/SyncIndicator';
import type { Character } from '../../types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatCharacterRole, truncate } from '../../utils/formatting';

const AnimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

export interface CharacterCardProps {
  character: Character;
  onPress?: (character: Character) => void;
  onDelete?: (character: Character) => void;
}

/**
 * Get color for role badge
 */
const getRoleColor = (role: Character['role']): string => {
  switch (role) {
    case 'protagonist':
      return colors.primary;
    case 'antagonist':
      return colors.error;
    case 'supporting':
      return colors.info;
    case 'minor':
      return colors.textSecondary;
    default:
      return colors.primary;
  }
};

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
 * Character Card Component
 */
export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
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
      onPress(character);
    }
  };

  const roleColor = getRoleColor(character.role);
  const importanceColor = getImportanceColor(character.importance);
  const descriptionPreview = truncate(character.description, 100);

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
          {/* Header Row: Name, Sync Indicator, and Delete Button */}
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1}>
                {character.name}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <SyncIndicator
                synced={character.synced}
                iconSize={16}
                containerSize={20}
              />
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete(character)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Description Preview */}
          {character.description && (
            <Text style={styles.description} numberOfLines={2}>
              {descriptionPreview}
            </Text>
          )}

          {/* Footer Row: Role Badge and Importance Indicator */}
          <View style={styles.footerRow}>
            {/* Role Badge */}
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: roleColor },
              ]}
            >
              <Text style={styles.roleBadgeText}>
                {formatCharacterRole(character.role)}
              </Text>
            </View>

            {/* Importance Indicator */}
            <View style={styles.importanceContainer}>
              <Ionicons
                name="star"
                size={16}
                color={importanceColor}
              />
              <Text style={[styles.importanceText, { color: importanceColor }]}>
                {character.importance}/10
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
    marginBottom: spacing.sm,
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
  nameContainer: {
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
  name: {
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
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadgeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
    textTransform: 'capitalize',
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

export default CharacterCard;
