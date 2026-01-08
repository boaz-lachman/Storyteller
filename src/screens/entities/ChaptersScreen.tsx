/**
 * Chapters Screen
 * Displays chapters for a specific story in order
 * Includes empty state, pull-to-refresh, and CRUD operations
 */
import React, { useCallback, useState } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import BigList from 'react-native-big-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FontAwesome6 } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import {
  useGetChaptersQuery,
  useCreateChapterMutation,
  useUpdateChapterMutation,
  useDeleteChapterMutation,
  useReorderChaptersMutation,
} from '../../store/api/chaptersApi';
import { ChapterCard } from '../../components/cards/ChapterCard';
import { EmptyState } from '../../components/common/EmptyState';
import { ChapterModal } from '../../components/modals/ChapterModal';
import { FloatingActionButton, type FABOption } from '../../components/common/FloatingActionButton';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Chapter } from '../../types';
import type { ChapterFormData } from '../../hooks/useChapterForm';
import { Ionicons } from '@expo/vector-icons';

type ChaptersScreenRouteProp = RouteProp<StoryTabParamList, 'Chapters'>;

interface ChaptersScreenProps {
  route: ChaptersScreenRouteProp;
}

/**
 * Chapters Screen Component
 */
export default function ChaptersScreen({ route }: ChaptersScreenProps) {
  const { storyId } = route.params;
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // RTK Query hooks - always sort by order ASC for chapters
  const {
    data: chapters = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetChaptersQuery(
    {
      storyId,
      sortBy: 'order',
      order: 'ASC',
    },
    { skip: !storyId }
  );

  const [createChapterMutation, { isLoading: isCreating }] = useCreateChapterMutation();
  const [updateChapterMutation, { isLoading: isUpdating }] = useUpdateChapterMutation();
  const [deleteChapterMutation, { isLoading: isDeleting }] = useDeleteChapterMutation();
  const [reorderChaptersMutation, { isLoading: isReordering }] = useReorderChaptersMutation();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle chapter press - open edit modal
  const handleChapterPress = useCallback((chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsModalVisible(true);
  }, []);

  // Handle create chapter
  const handleCreateChapter = useCallback(() => {
    setSelectedChapter(null);
    setIsModalVisible(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedChapter(null);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(
    async (data: ChapterFormData) => {
      if (!user?.uid || !storyId) return;

      try {
        if (selectedChapter) {
          // Update existing chapter
          await updateChapterMutation({
            id: selectedChapter.id,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: 'Chapter updated',
              type: 'success',
            })
          );
        } else {
          // Create new chapter
          await createChapterMutation({
            userId: user.uid,
            storyId,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: 'Chapter created',
              type: 'success',
            })
          );
        }
        handleCloseModal();
      } catch (err: any) {
        console.error('Error saving chapter:', err);
        dispatch(
          showSnackbar({
            message: err?.error || err?.data?.error || 'Failed to save chapter. Please try again.',
            type: 'error',
          })
        );
      }
    },
    [user, storyId, selectedChapter, createChapterMutation, updateChapterMutation, dispatch, handleCloseModal]
  );

  // Handle delete chapter
  const handleDeleteChapter = useCallback(
    (chapter: Chapter) => {
      Alert.alert(
        'Delete Chapter',
        `Are you sure you want to delete "${chapter.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteChapterMutation({
                  id: chapter.id,
                  storyId,
                }).unwrap();
                dispatch(
                  showSnackbar({
                    message: 'Chapter deleted',
                    type: 'success',
                  })
                );
              } catch (error: any) {
                console.error('Error deleting chapter:', error);
                dispatch(
                  showSnackbar({
                    message: error?.data?.error || 'Failed to delete chapter. Please try again.',
                    type: 'error',
                  })
                );
              }
            },
          },
        ]
      );
    },
    [deleteChapterMutation, storyId, dispatch]
  );

  // Handle move chapter up
  const handleMoveUp = useCallback(
    async (chapter: Chapter) => {
      if (!user) return;

      const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
      if (currentIndex <= 0) return; // Already first

      const previousChapter = chapters[currentIndex - 1];
      const newOrders = [
        { id: chapter.id, order: previousChapter.order },
        { id: previousChapter.id, order: chapter.order },
      ];

      try {
        await reorderChaptersMutation({
          storyId,
          chapterOrders: newOrders,
        }).unwrap();
        dispatch(
          showSnackbar({
            message: 'Chapter order updated',
            type: 'success',
          })
        );
      } catch (error: any) {
        dispatch(
          showSnackbar({
            message: error?.data?.error || 'Failed to reorder chapters',
            type: 'error',
          })
        );
      }
    },
    [chapters, reorderChaptersMutation, storyId, dispatch, user]
  );

  // Handle move chapter down
  const handleMoveDown = useCallback(
    async (chapter: Chapter) => {
      if (!user) return;

      const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
      if (currentIndex < 0 || currentIndex >= chapters.length - 1) return; // Already last

      const nextChapter = chapters[currentIndex + 1];
      const newOrders = [
        { id: chapter.id, order: nextChapter.order },
        { id: nextChapter.id, order: chapter.order },
      ];

      try {
        await reorderChaptersMutation({
          storyId,
          chapterOrders: newOrders,
        }).unwrap();
        dispatch(
          showSnackbar({
            message: 'Chapter order updated',
            type: 'success',
          })
        );
      } catch (error: any) {
        dispatch(
          showSnackbar({
            message: error?.data?.error || 'Failed to reorder chapters',
            type: 'error',
          })
        );
      }
    },
    [chapters, reorderChaptersMutation, storyId, dispatch, user]
  );

  // FAB options
  const fabOptions: FABOption[] = [
    {
      id: 'create-chapter',
      label: 'Create Chapter',
      icon: <Ionicons name="add" size={24} color={colors.textInverse} />,
      onPress: handleCreateChapter,
      color: colors.primary,
    },
  ];

  // Render chapter card with animation
  const renderItem = useCallback(
    ({ item, index }: { item: Chapter; index: number }) => {
      const isFirst = index === 0;
      const isLast = index === chapters.length - 1;

      return (
        <Animated.View
          entering={FadeInDown.delay(index * 50).duration(400)}
          style={styles.itemWrapper}
        >
          <ChapterCard
            chapter={item}
            onPress={handleChapterPress}
            onDelete={handleDeleteChapter}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            isFirst={isFirst}
            isLast={isLast}
          />
        </Animated.View>
      );
    },
    [chapters.length, handleChapterPress, handleDeleteChapter, handleMoveUp, handleMoveDown]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) {
      return null; // Don't show empty state while loading
    }
    return (
      <EmptyState
        title="No Chapters Yet"
        message="Add your first chapter to get started!"
        icon={<FontAwesome6 name="book" size={64} color={colors.textTertiary} />}
      />
    );
  }, [isLoading, isFetching]);

  // Get item layout for BigList optimization
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: 180,
      offset: 180 * index,
      index,
    }),
    []
  );

  // Show loading state
  if (isLoading) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
        <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={styles.loadingText}>
          Loading chapters...
        </Animated.Text>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <BigList
        data={chapters}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        itemHeight={180}
        getItemLayout={getItemLayout}
        renderHeader={() => null}
        renderFooter={() => null}
      />
      <FloatingActionButton
        options={fabOptions}
        onMainPress={handleCreateChapter}
        position="bottom-right"
      />
      <ChapterModal
        visible={isModalVisible}
        chapter={selectedChapter}
        storyId={storyId}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  itemWrapper: {
    marginBottom: spacing.md,
  },
});
