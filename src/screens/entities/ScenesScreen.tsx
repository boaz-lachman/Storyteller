/**
 * Scenes Screen
 * Displays scenes for a specific story using BigList
 * Includes empty state, pull-to-refresh, sorting, filtering, and CRUD operations
 */
import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Menu } from 'react-native-paper';
import BigList from 'react-native-big-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import { loadFormData } from '../../services/autosave/autosaveService';
import {
  useGetScenesQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
} from '../../store/api/scenesApi';
import { SceneCard } from '../../components/cards/SceneCard';
import { EmptyState } from '../../components/common/EmptyState';
import { SceneModal } from '../../components/modals/SceneModal';
import { FloatingActionButton, type FABOption } from '../../components/common/FloatingActionButton';
import { GradientBackground } from '../../components/common/GradientBackground';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import { setDeletedScene, clearDeletedScene } from '../../store/slices/scenesSlice';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Scene } from '../../types';
import type { SceneFormData } from '../../hooks/useSceneForm';
import { useTranslation } from '../../hooks/useTranslation';

type ScenesScreenRouteProp = RouteProp<StoryTabParamList, 'Scenes'>;

interface ScenesScreenProps {
  route: ScenesScreenRouteProp;
}

type SortBy = 'importance' | 'title' | 'createdAt';
type SortOrder = 'ASC' | 'DESC';

// Module-level map to track which story/user combinations have had their autosave checked
// This persists across component remounts caused by navigation re-renders
const checkedUsersForSceneForm = new Set<string>();

/**
 * Scenes Screen Component
 */
export default function ScenesScreen({ route }: ScenesScreenProps) {
  const { t } = useTranslation();
  const { storyId } = route.params;
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  // Clear checked users when user logs out or story changes
  useEffect(() => {
    if (!user?.uid || !storyId) {
      // User logged out or no story - clear the checked users set
      checkedUsersForSceneForm.clear();
    }
  }, [user?.uid, storyId]);

  // Check for autosaved scene form data when screen is focused
  // Only check once per story/user combination - persists across remounts
  useFocusEffect(
    useCallback(() => {
      // Only check if user is logged in, storyId exists, and we haven't checked for this combination yet
      const userId = user?.uid;
      
      // Early return if no user or storyId
      if (!userId || !storyId) {
        return;
      }
      
      // Create a unique key for this story/user combination
      const checkKey = `${userId}:${storyId}`;
      
      // Check if we've already checked for this combination
      // This prevents multiple checks even if navigation causes remounts
      if (checkedUsersForSceneForm.has(checkKey)) {
        return;
      }

      // Mark as checked immediately to prevent multiple checks
      // This must happen synchronously before any async operations
      checkedUsersForSceneForm.add(checkKey);

      const checkAutosavedContent = async () => {
        try {
          // Check for autosaved scene form data (create mode - no entityId)
          // Only check for forms that belong to this story
          const savedFormData = await loadFormData('scene', undefined);
          
          if (savedFormData && savedFormData.formData && savedFormData.storyId === storyId) {
            // Check if there's any meaningful content (not just empty/default values)
            const hasContent = 
              savedFormData.formData.title?.trim() ||
              savedFormData.formData.description?.trim() ||
              savedFormData.formData.setting?.trim() ||
              (savedFormData.formData.characters && Array.isArray(savedFormData.formData.characters) && savedFormData.formData.characters.length > 0) ||
              savedFormData.formData.mood?.trim();
            
            if (hasContent) {
              // Open modal with autosaved content - only set once
              setSelectedScene(null); // Create mode
              setIsModalVisible(true);
            }
          }
        } catch (error) {
          console.error('Error checking autosaved scene form data:', error);
        }
      };

      checkAutosavedContent();
    }, [user?.uid, storyId])
  );

  // Sort state
  const [sortBy, setSortBy] = useState<SortBy>('importance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // RTK Query hooks
  const {
    data: scenes = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetScenesQuery(
    {
      storyId,
      sortBy,
      order: sortOrder,
    },
    { skip: !storyId }
  );

  const [createSceneMutation, { isLoading: isCreating }] = useCreateSceneMutation();
  const [updateSceneMutation, { isLoading: isUpdating }] = useUpdateSceneMutation();
  const [deleteSceneMutation, { isLoading: isDeleting }] = useDeleteSceneMutation();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle scene press - open edit modal
  const handleScenePress = useCallback((scene: Scene) => {
    setSelectedScene(scene);
    setIsModalVisible(true);
  }, []);

  // Handle delete scene
  const handleDeleteScene = useCallback(
    (scene: Scene) => {
      Alert.alert(
        t('entities:scenes.delete.confirmTitle'),
        t('entities:scenes.delete.confirmMessage', { title: scene.title }),
        [
          { text: t('common:buttons.cancel'), style: 'cancel' },
          {
            text: t('entities:scenes.buttons.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                dispatch(setDeletedScene(scene));
                await deleteSceneMutation({
                  id: scene.id,
                  storyId: scene.storyId,
                }).unwrap();
                dispatch(
                  showSnackbar({
                    message: t('entities:scenes.delete.deleted'),
                    type: 'success',
                    undoAction: {
                      type: 'undo-scene-delete',
                      data: { sceneId: scene.id },
                    },
                  })
                );
              } catch (err: any) {
                console.error('Error deleting scene:', err);
                dispatch(clearDeletedScene());
                dispatch(
                  showSnackbar({
                    message: err?.error || err?.data?.error || t('entities:scenes.delete.deleteFailed'),
                    type: 'error',
                  })
                );
              }
            },
          },
        ]
      );
    },
    [deleteSceneMutation, dispatch]
  );

  // Handle create scene
  const handleCreateScene = useCallback(() => {
    setSelectedScene(null);
    setIsModalVisible(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedScene(null);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(
    async (data: SceneFormData) => {
      if (!user?.uid || !storyId) return;

      try {
        if (selectedScene) {
          // Update existing scene
          await updateSceneMutation({
            id: selectedScene.id,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: t('entities:scenes.messages.updated'),
              type: 'success',
            })
          );
        } else {
          // Create new scene
          await createSceneMutation({
            userId: user.uid,
            storyId,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: t('entities:scenes.messages.created'),
              type: 'success',
            })
          );
        }
        handleCloseModal();
      } catch (err: any) {
        console.error('Error saving scene:', err);
        dispatch(
          showSnackbar({
            message: err?.error || err?.data?.error || t('entities:scenes.messages.saveFailed'),
            type: 'error',
          })
        );
      }
    },
    [user, storyId, selectedScene, createSceneMutation, updateSceneMutation, dispatch, handleCloseModal]
  );

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortBy) => {
    setSortBy(newSortBy);
    // Toggle order if clicking the same sort option
    if (newSortBy === sortBy) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      // Default order based on sort type
      setSortOrder(newSortBy === 'title' ? 'ASC' : 'DESC');
    }
    setSortMenuVisible(false);
  }, [sortBy]);

  // FAB options
  const fabOptions: FABOption[] = [
    {
      id: 'create-scene',
      label: t('entities:scenes.addScene'),
      icon: <Ionicons name="add" size={24} color={colors.textInverse} />,
      onPress: handleCreateScene,
      color: colors.primary,
    },
  ];

  // Render scene card with animation
  const renderItem = useCallback(
    ({ item, index }: { item: Scene; index: number }) => {
      return (
        <Animated.View
          entering={FadeInDown.delay(index * 50).duration(400)}
          style={styles.itemWrapper}
        >
          <SceneCard
            scene={item}
            onPress={handleScenePress}
            onDelete={handleDeleteScene}
          />
        </Animated.View>
      );
    },
    [handleScenePress, handleDeleteScene]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) {
      return null; // Don't show empty state while loading
    }
    return (
      <EmptyState
        title={t('entities:scenes.emptyTitle')}
        message={t('entities:scenes.emptyMessage')}
        icon={<FontAwesome6 name="paragraph" size={64} color={colors.textTertiary} />}
      />
    );
  }, [isLoading, isFetching]);

  // Get item layout for BigList optimization
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: 190,
      offset: 190 * index,
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
          {t('entities:scenes.loading')}
        </Animated.Text>
      </Animated.View>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      {/* Sort Header - Only show if there are scenes */}
      {scenes.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
          {/* Sort Menu */}
          <Menu
            key={String(sortMenuVisible) + '1'}
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setSortMenuVisible(true)}
              >
                <Ionicons name="swap-vertical" size={18} color={colors.text} />
                <Text style={styles.headerButtonText}>
                  {t('entities:scenes.sort.sort')}: {sortBy === 'importance' ? t('entities:scenes.sort.byImportance') : sortBy === 'title' ? t('entities:scenes.sort.byTitle') : t('entities:scenes.sort.byDate')}{' '}
                  {sortOrder === 'ASC' ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleSortChange('importance')}
              title={t('entities:scenes.sort.byImportance')}
              leadingIcon={sortBy === 'importance' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleSortChange('title')}
              title={t('entities:scenes.sort.byTitle')}
              leadingIcon={sortBy === 'title' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleSortChange('createdAt')}
              title={t('entities:scenes.sort.byDate')}
              leadingIcon={sortBy === 'createdAt' ? 'check' : undefined}
            />
          </Menu>
        </Animated.View>
      )}

      <BigList
        data={scenes}
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
        itemHeight={190}
        getItemLayout={getItemLayout}
        renderHeader={() => null}
        renderFooter={() => null}
      />
      <FloatingActionButton
        options={fabOptions}
        onMainPress={handleCreateScene}
        position="bottom-right"
      />
      <SceneModal
        visible={isModalVisible}
        scene={selectedScene}
        storyId={storyId}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />
    </GradientBackground>
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
  header: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
  },
  headerButtonText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  itemWrapper: {
    marginBottom: spacing.md,
  },
});
