/**
 * Blurbs Screen
 * Displays blurbs for a specific story using BigList
 * Includes empty state, pull-to-refresh, sorting, filtering, and CRUD operations
 */
import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Menu, Divider } from 'react-native-paper';
import BigList from 'react-native-big-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import {
  useGetBlurbsQuery,
  useCreateBlurbMutation,
  useUpdateBlurbMutation,
  useDeleteBlurbMutation,
} from '../../store/api/blurbsApi';
import { BlurbCard } from '../../components/cards/BlurbCard';
import { EmptyState } from '../../components/common/EmptyState';
import { BlurbModal } from '../../components/modals/BlurbModal';
import { FloatingActionButton, type FABOption } from '../../components/common/FloatingActionButton';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import { setDeletedBlurb, clearDeletedBlurb } from '../../store/slices/blurbsSlice';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatBlurbCategory } from '../../utils/formatting';
import type { IdeaBlurb } from '../../types';
import type { BlurbFormData } from '../../hooks/useBlurbForm';

type BlurbsScreenRouteProp = RouteProp<StoryTabParamList, 'Blurbs'>;

interface BlurbsScreenProps {
  route: BlurbsScreenRouteProp;
}

type SortBy = 'importance' | 'title' | 'createdAt';
type SortOrder = 'ASC' | 'DESC';
type CategoryFilter = 'plot-point' | 'conflict' | 'theme' | 'setting' | 'other' | 'all';

/**
 * Blurbs Screen Component
 */
export default function BlurbsScreen({ route }: BlurbsScreenProps) {
  const { storyId } = route.params;
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBlurb, setSelectedBlurb] = useState<IdeaBlurb | null>(null);

  // Sort/Filter state
  const [sortBy, setSortBy] = useState<SortBy>('importance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // RTK Query hooks
  const {
    data: blurbs = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetBlurbsQuery(
    {
      storyId,
      sortBy,
      order: sortOrder,
      categoryFilter: categoryFilter === 'all' ? undefined : categoryFilter,
    },
    { skip: !storyId }
  );

  const [createBlurbMutation, { isLoading: isCreating }] = useCreateBlurbMutation();
  const [updateBlurbMutation, { isLoading: isUpdating }] = useUpdateBlurbMutation();
  const [deleteBlurbMutation, { isLoading: isDeleting }] = useDeleteBlurbMutation();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle blurb press - open edit modal
  const handleBlurbPress = useCallback((blurb: IdeaBlurb) => {
    setSelectedBlurb(blurb);
    setIsModalVisible(true);
  }, []);

  // Handle delete blurb
  const handleDeleteBlurb = useCallback(
    (blurb: IdeaBlurb) => {
      Alert.alert(
        'Delete Blurb',
        `Are you sure you want to delete "${blurb.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                dispatch(setDeletedBlurb(blurb));
                await deleteBlurbMutation({
                  id: blurb.id,
                  storyId: blurb.storyId,
                }).unwrap();
                dispatch(
                  showSnackbar({
                    message: 'Blurb deleted',
                    type: 'success',
                    undoAction: {
                      type: 'undo-blurb-delete',
                      data: { blurbId: blurb.id },
                    },
                  })
                );
              } catch (err: any) {
                console.error('Error deleting blurb:', err);
                dispatch(clearDeletedBlurb());
                dispatch(
                  showSnackbar({
                    message: err?.error || err?.data?.error || 'Failed to delete blurb. Please try again.',
                    type: 'error',
                  })
                );
              }
            },
          },
        ]
      );
    },
    [deleteBlurbMutation, dispatch]
  );

  // Handle create blurb
  const handleCreateBlurb = useCallback(() => {
    setSelectedBlurb(null);
    setIsModalVisible(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedBlurb(null);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(
    async (data: BlurbFormData) => {
      if (!user?.uid || !storyId) return;

      try {
        if (selectedBlurb) {
          // Update existing blurb
          await updateBlurbMutation({
            id: selectedBlurb.id,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: 'Blurb updated',
              type: 'success',
            })
          );
        } else {
          // Create new blurb
          await createBlurbMutation({
            userId: user.uid,
            storyId,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: 'Blurb created',
              type: 'success',
            })
          );
        }
        handleCloseModal();
      } catch (err: any) {
        console.error('Error saving blurb:', err);
        dispatch(
          showSnackbar({
            message: err?.error || err?.data?.error || 'Failed to save blurb. Please try again.',
            type: 'error',
          })
        );
      }
    },
    [user, storyId, selectedBlurb, createBlurbMutation, updateBlurbMutation, dispatch, handleCloseModal]
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

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: CategoryFilter) => {
    setCategoryFilter(newFilter);
    setFilterMenuVisible(false);
  }, []);

  // Calculate available categories from existing blurbs
  const availableCategories = useMemo(() => {
    const categories = new Set(blurbs.map((blurb) => blurb.category).filter((c): c is IdeaBlurb['category'] => c !== undefined));
    return Array.from(categories).sort();
  }, [blurbs]);

  // FAB options
  const fabOptions: FABOption[] = [
    {
      id: 'create-blurb',
      label: 'Create Blurb',
      icon: <Ionicons name="add" size={24} color={colors.textInverse} />,
      onPress: handleCreateBlurb,
      color: colors.primary,
    },
  ];

  // Render blurb card with animation
  const renderItem = useCallback(
    ({ item, index }: { item: IdeaBlurb; index: number }) => {
      return (
        <Animated.View
          entering={FadeInDown.delay(index * 50).duration(400)}
          style={styles.itemWrapper}
        >
          <BlurbCard
            blurb={item}
            onPress={handleBlurbPress}
            onDelete={handleDeleteBlurb}
          />
        </Animated.View>
      );
    },
    [handleBlurbPress, handleDeleteBlurb]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) {
      return null; // Don't show empty state while loading
    }
    return (
      <EmptyState
        title="No Blurbs Yet"
        message="Add your first blurb to get started!"
        icon={<FontAwesome5 name="pen-fancy" size={64} color={colors.textTertiary} />}
      />
    );
  }, [isLoading, isFetching]);

  // Get item layout for BigList optimization
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: 140,
      offset: 140 * index,
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
          Loading blurbs...
        </Animated.Text>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sort/Filter Header - Only show if there are blurbs */}
      {blurbs.length > 0 && (
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
                  Sort: {sortBy === 'importance' ? 'Importance' : sortBy === 'title' ? 'Title' : 'Date'}{' '}
                  {sortOrder === 'ASC' ? '↑' : '↓'}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleSortChange('importance')}
              title="Importance"
              leadingIcon={sortBy === 'importance' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleSortChange('title')}
              title="Title"
              leadingIcon={sortBy === 'title' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleSortChange('createdAt')}
              title="Date Created"
              leadingIcon={sortBy === 'createdAt' ? 'check' : undefined}
            />
          </Menu>

          {/* Filter Menu */}
          <Menu
            key={String(filterMenuVisible)}
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setFilterMenuVisible(true)}
              >
                <Ionicons name="filter" size={18} color={colors.text} />
                <Text style={styles.headerButtonText}>
                  Filter: {categoryFilter === 'all' ? 'All' : formatBlurbCategory(categoryFilter)}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleFilterChange('all')}
              title="All Categories"
              leadingIcon={categoryFilter === 'all' ? 'check' : undefined}
            />
            {availableCategories.length > 0 && (
              <>
                <Divider />
                {availableCategories.map((category) => (
                  <Menu.Item
                    key={category}
                    onPress={() => handleFilterChange(category)}
                    title={formatBlurbCategory(category)}
                    leadingIcon={categoryFilter === category ? 'check' : undefined}
                  />
                ))}
              </>
            )}
          </Menu>
        </Animated.View>
      )}

      <BigList
        data={blurbs}
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
        itemHeight={140}
        getItemLayout={getItemLayout}
        renderHeader={() => null}
        renderFooter={() => null}
      />
      <FloatingActionButton
        options={fabOptions}
        onMainPress={handleCreateBlurb}
        position="bottom-right"
      />
      <BlurbModal
        visible={isModalVisible}
        blurb={selectedBlurb}
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
