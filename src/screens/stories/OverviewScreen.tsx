/**
 * Overview Screen
 * Displays overview information for a specific story
 * Shows story metadata, statistics cards, and description
 * Includes edit mode for updating story details
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card } from 'react-native-paper';
import Animated, { FadeInDown, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import { useGetStoryQuery, useUpdateStoryMutation } from '../../store/api/storiesApi';
import { calculateStoryStatistics } from '../../hooks/useStoryStatistics';
import type { StoryStatistics } from '../../hooks/useStoryStatistics';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatStoryLength, formatStoryTheme } from '../../utils/formatting';
import { Ionicons } from '@expo/vector-icons';
import SyncIndicator from '../../components/common/SyncIndicator';
import EditStoryModal from '../../components/modals/EditStoryModal';
import { PaperIconButton } from '../../components/forms/PaperIconButton';
import { StatisticsCards } from '../../components/common/StatisticsCards';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import type { StoryUpdateInput } from '../../types';
import type { EditStoryFormData } from '../../hooks/useEditStoryForm';

type OverviewScreenRouteProp = RouteProp<StoryTabParamList, 'Overview'>;

interface OverviewScreenProps {
  route: OverviewScreenRouteProp;
}

/**
 * Metadata Item Component
 */
const MetadataItem: React.FC<{
  label: string;
  value: string | undefined;
}> = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={styles.metadataItem}>
      <Text style={styles.metadataLabel}>{label}:</Text>
      <Text style={styles.metadataValue}>{value}</Text>
    </View>
  );
};

/**
 * Overview Screen Component
 */
export default function OverviewScreen({ route }: OverviewScreenProps) {
  const { storyId } = route.params;
  const [statistics, setStatistics] = useState<StoryStatistics | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const hasAnimated = useRef(false);

  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Fetch story data
  const {
    data: story,
    isLoading: isLoadingStory,
    isError,
    error,
  } = useGetStoryQuery(storyId);

  // Update story mutation with optimistic updates
  const [updateStory, { isLoading: isUpdating }] = useUpdateStoryMutation();

  // Function to calculate statistics
  const loadStatistics = useCallback(() => {
    if (storyId) {
      setIsLoadingStats(true);
      calculateStoryStatistics(storyId)
        .then((stats) => {
          setStatistics(stats);
          setIsLoadingStats(false);
        })
        .catch((err) => {
          console.error('Error calculating statistics:', err);
          setIsLoadingStats(false);
        });
    }
  }, [storyId]);

  // Calculate statistics when story is loaded
  useEffect(() => {
    if (story) {
      loadStatistics();
    }
  }, [story, loadStatistics]);

  // Mark animations as shown after first successful render
  useEffect(() => {
    if (story && statistics && !isLoadingStats) {
      hasAnimated.current = true;
    }
  }, [story, statistics, isLoadingStats]);

  // Recalculate statistics when tab is focused
  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [loadStatistics])
  );

  // Handle edit form submission
  const handleEditSubmit = async (formData: EditStoryFormData) => {
    if (!story || !user) return;

    try {
      const updateData: StoryUpdateInput = {
        title: formData.title,
        description: formData.description,
        length: formData.length,
        theme: formData.theme,
        tone: formData.tone,
        pov: formData.pov,
        targetAudience: formData.targetAudience,
        setting: formData.setting,
        timePeriod: formData.timePeriod,
      };

      await updateStory({
        id: storyId,
        data: updateData,
      }).unwrap();

      // Success
      setIsEditModalVisible(false);
      dispatch(
        showSnackbar({
          message: 'Story updated successfully',
          type: 'success',
        })
      );
    } catch (err: any) {
      // Error handling
      console.error('Error updating story:', err);
      dispatch(
        showSnackbar({
          message:
            err?.error || err?.data?.error || 'Failed to update story. Please try again.',
          type: 'error',
        })
      );
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsEditModalVisible(false);
  };

  // Open edit modal
  const handleOpenEditModal = () => {
    setIsEditModalVisible(true);
  };

  // Show loading state with animation (only on first load)
  if (isLoadingStory || isLoadingStats) {
    return (
      <Animated.View 
        entering={!hasAnimated.current ? FadeIn.duration(300) : undefined}
        style={styles.loadingContainer}
      >
        <MainBookActivityIndicator size={80} />
        <Animated.Text 
          entering={!hasAnimated.current ? FadeInDown.delay(200).duration(400) : undefined}
          style={styles.loadingText}
        >
          Loading story overview...
        </Animated.Text>
      </Animated.View>
    );
  }

  // Show error state with animation (only on first load)
  if (isError || !story) {
    return (
      <Animated.View 
        entering={!hasAnimated.current ? FadeIn.duration(300) : undefined}
        style={styles.container}
      >
        <Animated.Text 
          entering={!hasAnimated.current ? FadeInDown.delay(100).duration(400) : undefined}
          style={styles.errorTitle}
        >
          Error Loading Story
        </Animated.Text>
        <Animated.Text 
          entering={!hasAnimated.current ? FadeInDown.delay(200).duration(400) : undefined}
          style={styles.errorText}
        >
          {error && 'error' in error ? error.error : 'Story not found'}
        </Animated.Text>
      </Animated.View>
    );
  }

  return (
    <>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Story Title and Status */}
        <Animated.View 
          entering={!hasAnimated.current ? FadeInDown.delay(100).duration(500) : undefined}
          style={styles.header}
        >
          <Text style={styles.title}>{story.title}</Text>
          <View style={styles.headerBadges}>
            {/* Edit Button */}
            <PaperIconButton
              icon="pencil"
              onPress={handleOpenEditModal}
              size={20}
              style={styles.editButton}
            />
            {/* Sync Indicator */}
            <SyncIndicator
              synced={story.synced}
              iconSize={20}
              containerSize={28}
            />
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: story.status === 'completed' ? colors.success : colors.primary }
              ]}
            >
              <Text style={styles.statusBadgeLabel}>{story.status}</Text>
            </View>
          </View>
        </Animated.View>

      {/* Statistics Cards */}
      {statistics && (
        <Animated.View 
          entering={!hasAnimated.current ? FadeInDown.delay(200).duration(500) : undefined}
        >
          <StatisticsCards 
            statistics={statistics} 
            animated={!hasAnimated.current}
          />
        </Animated.View>
      )}

      {/* Story Metadata */}
      <Animated.View entering={!hasAnimated.current ? FadeInDown.delay(450).duration(500) : undefined}>
        <Card style={styles.metadataCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Story Details</Text>
            <MetadataItem label="Theme" value={formatStoryTheme(story.theme)} />
            <MetadataItem label="Length" value={formatStoryLength(story.length)} />
            <MetadataItem label="Tone" value={story.tone} />
            <MetadataItem label="Point of View" value={story.pov} />
            <MetadataItem label="Target Audience" value={story.targetAudience} />
            <MetadataItem label="Setting" value={story.setting} />
            <MetadataItem label="Time Period" value={story.timePeriod} />
            {story.wordCount && (
              <MetadataItem label="Word Count" value={story.wordCount.toLocaleString()} />
            )}
          </Card.Content>
        </Card>
      </Animated.View>

      {/* Story Description */}
      {story.description && (
        <Animated.View entering={!hasAnimated.current ? FadeInDown.delay(500).duration(500) : undefined}>
          <Card style={styles.descriptionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{story.description}</Text>
            </Card.Content>
          </Card>
        </Animated.View>
      )}
      </ScrollView>
      
      {/* Edit Story Modal */}
      <EditStoryModal
        visible={isEditModalVisible}
        story={story}
        onClose={handleCloseModal}
        onSubmit={handleEditSubmit}
        isLoading={isUpdating}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginRight: spacing.md,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    marginRight: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeLabel: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.textInverse,
    textTransform: 'capitalize',
  },
  metadataCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  descriptionCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  metadataLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    minWidth: 120,
  },
  metadataValue: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    textTransform: 'capitalize',
  },
  descriptionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
    lineHeight: 24,
  },
});
