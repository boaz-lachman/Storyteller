/**
 * Story Card Component
 * Displays story information in a card format
 * Supports swipe-to-delete functionality
 */
import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { Card, Text, Dialog, Button, Portal } from 'react-native-paper';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { AntDesign } from '@expo/vector-icons';
import SyncIndicator from '../common/SyncIndicator';
import type { Story } from '../../types';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatDateTime, formatStoryLength, formatStoryTheme } from '../../utils/formatting';
import { useTranslation } from '../../hooks/useTranslation';

const AnimatedTouchableOpacity = Reanimated.createAnimatedComponent(TouchableOpacity);

export interface StoryCardProps {
  story: Story;
  onPress?: (story: Story) => void;
  onDelete?: (storyId: string) => void;
  onShare?: (story: Story) => void;
}

/**
 * Story Card Component
 * Displays story information with swipe-to-delete
 * Memoized to prevent unnecessary re-renders during sync
 */
export const StoryCard: React.FC<StoryCardProps> = React.memo(({
  story,
  onPress,
  onDelete,
  onShare,
}) => {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const swipeableRef = useRef<React.ComponentRef<typeof Swipeable>>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated style for press animation
  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
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
      onPress(story);
    }
  };

  // Handle delete action - show confirmation dialog
  const handleDelete = () => {
    // Close swipeable first
    swipeableRef.current?.close();
    // Show confirmation dialog
    setShowDeleteDialog(true);
  };

  // Confirm delete action
  const confirmDelete = () => {
    setShowDeleteDialog(false);
    if (onDelete) {
        onDelete(story.id);
      }
    // Animate out before deleting
   
  };

  // Cancel delete action
  const cancelDelete = () => {
    setShowDeleteDialog(false);
  };

  // Render delete action (right side when swiping left)
  const renderRightActions = (
    progress: SharedValue<number>,
    translation: SharedValue<number>
  ) => {
    const animatedStyle = useAnimatedStyle(() => {
      const scaleValue = interpolate(
        progress.value,
        [0, 1],
        [0.8, 1],
        'clamp'
      );

      const opacityValue = interpolate(
        progress.value,
        [0, 0.5, 1],
        [0, 0.5, 1],
        'clamp'
      );

      return {
        opacity: withTiming(opacityValue, { duration: 200 }),
        transform: [{ scale: withSpring(scaleValue, { damping: 15, stiffness: 300 }) }],
      };
    });

    return (
      <Reanimated.View
        style={[
          styles.deleteContainer,
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <AntDesign name="delete" size={28} color={colors.textInverse} />
        </TouchableOpacity>
      </Reanimated.View>
    );
  };

  // Get status badge color
  const getStatusColor = () => {
    return story.status === 'completed' ? colors.success : colors.primary;
  };

  // Get theme color
  const getThemeColor = () => {
    const themeColors: Record<string, string> = {
      horror: colors.themeHorror,
      comedy: colors.themeComedy,
      drama: colors.themeDrama,
      'sci-fi': colors.themeSciFi,
      fantasy: colors.themeFantasy,
      romance: colors.themeRomance,
      thriller: colors.themeThriller,
      mystery: colors.themeMystery,
    };
    return themeColors[story.theme] || colors.primary;
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={20}
    >
      <AnimatedTouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.touchable, animatedCardStyle]}
      >
        <Card
          style={[
            styles.card,
            isRTL && styles.cardRTL,
          ]}
          mode="outlined"
        >
          <Card.Content style={styles.cardContent}>
            {/* Header: Title, Status Badge, and Sync Indicator */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
              <Text
                style={[styles.title, isRTL && styles.titleRTL]}
                numberOfLines={2}
              >
                {story.title}
              </Text>
              <View style={styles.badgesContainer}>
                {/* Shared indicator */}
                {story.permission && story.permission !== 'owner' && (
                  <View style={styles.sharedBadge}>
                    <AntDesign name="share-alt" size={12} color={colors.textInverse} />
                    <Text style={styles.sharedBadgeText}>
                      {t('stories:sharing.sharedWithMe')}
                    </Text>
                  </View>
                )}
                {/* Permission badge for read-only */}
                {story.permission === 'read' && (
                  <View style={styles.permissionBadge}>
                    <Text style={styles.permissionBadgeText}>
                      {t('stories:sharing.permission.read')}
                    </Text>
                  </View>
                )}
                {/* Sync Indicator */}
                <SyncIndicator
                  synced={story.synced}
                  iconSize={16}
                  containerSize={24}
                />
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor() },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {story.status === 'completed' ? t('stories:card.completed') : t('stories:card.draft')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            {story.description && (
              <Text
                style={[styles.description, isRTL && styles.descriptionRTL]}
                numberOfLines={2}
              >
                {story.description}
              </Text>
            )}

            {/* Metadata Row */}
            <View style={[styles.metadata, isRTL && styles.metadataRTL]}>
              {/* Theme Badge */}
              <View
                style={[
                  styles.themeBadge,
                  { backgroundColor: getThemeColor() },
                ]}
              >
                <Text style={styles.themeText}>
                  {formatStoryTheme(story.theme, t)}
                </Text>
              </View>

              {/* Length */}
              <View style={styles.lengthContainer}>
                <AntDesign
                  name="file-text"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles.lengthText}>
                  {formatStoryLength(story.length, t)}
                </Text>
              </View>
            </View>

            {/* Footer: Creation Date and Share Button */}
            <View style={[styles.footer, isRTL && styles.footerRTL]}>
              <View style={styles.footerLeft}>
                <AntDesign
                  name="calendar"
                  size={12}
                  color={colors.textTertiary}
                />
                <Text style={styles.dateText}>
                  {formatDateTime(story.createdAt)}
                </Text>
              </View>
              {onShare && (
                <TouchableOpacity
                  onPress={() => onShare(story)}
                  style={styles.shareButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AntDesign name="share-alt" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </Card.Content>
        </Card>
      </AnimatedTouchableOpacity>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showDeleteDialog}
          onDismiss={cancelDelete}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{t('stories:delete.confirmTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogMessage}>
              {t('stories:delete.confirmMessage', { title: story.title })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={cancelDelete}
              textColor={colors.textSecondary}
              style={styles.dialogButton}
            >
              {t('stories:delete.cancelButton')}
            </Button>
            <Button
              onPress={confirmDelete}
              textColor={colors.error}
              style={styles.dialogButton}
            >
              {t('stories:delete.deleteButton')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Swipeable>
  );
}, (prevProps, nextProps) => {
  // Only re-render if story, onPress, or onDelete callback references change
  return (
    prevProps.story.id === nextProps.story.id &&
    prevProps.story.title === nextProps.story.title &&
    prevProps.story.description === nextProps.story.description &&
    prevProps.story.status === nextProps.story.status &&
    prevProps.story.theme === nextProps.story.theme &&
    prevProps.story.length === nextProps.story.length &&
    prevProps.story.createdAt === nextProps.story.createdAt &&
    prevProps.story.synced === nextProps.story.synced &&
    prevProps.story.permission === nextProps.story.permission &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onShare === nextProps.onShare
  );
});

const styles = StyleSheet.create({
  touchable: {
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
    borderRadius: spacing.md,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardRTL: {
    // RTL-specific card styles if needed
  },
  cardContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  titleRTL: {
    marginRight: 0,
    marginLeft: spacing.sm,
    textAlign: 'right',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    minHeight: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
    textTransform: 'capitalize',
  },
  sharedBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    backgroundColor: colors.primary,
    minHeight: 20,
  },
  sharedBadgeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
  },
  permissionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs,
    backgroundColor: colors.textTertiary,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionBadgeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
  },
  descriptionRTL: {
    textAlign: 'right',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metadataRTL: {
    flexDirection: 'row-reverse',
  },
  themeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
  },
  themeText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  lengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lengthText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  footerRTL: {
    flexDirection: 'row-reverse',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    color: colors.textTertiary,
  },
  shareButton: {
    padding: spacing.xs,
  },
  deleteContainer: {
    flex: 1,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderRadius: spacing.md,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
  },
  dialogTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  dialogMessage: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    lineHeight: typography.lineHeight.normal * typography.fontSize.md,
  },
  dialogActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  dialogButton: {
    marginLeft: spacing.sm,
  },
});

export default StoryCard;
