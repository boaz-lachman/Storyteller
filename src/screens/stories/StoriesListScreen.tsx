/**
 * Stories List Screen
 * Displays a list of all user's stories using BigList
 * Connected to RTK Query for data fetching
 */
import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Menu, Divider, TextInput } from 'react-native-paper';
import BigList from 'react-native-big-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useGetStoriesQuery, useCreateStoryMutation, useDeleteStoryMutation } from '../../store/api/storiesApi';
import { StoryCard } from '../../components/cards/StoryCard';
import { EmptyState } from '../../components/common/EmptyState';
import { CreateStoryModal } from '../../components/modals/CreateStoryModal';
import { FloatingActionButton, type FABOption } from '../../components/common/FloatingActionButton';
import { Input } from '../../components/forms/Input';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import type { Story } from '../../types';
import type { AppStackParamList } from '../../navigation/types';
import type { CreateStoryFormData } from '../../hooks/useCreateStoryForm';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'StoriesList'>;

/**
 * Stories List Screen Component
 */
type ThemeFilter = Story['theme'] | 'all';
type LengthFilter = Story['length'] | 'all';
type StatusFilter = Story['status'] | 'all';

export default function StoriesListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>('all');
  const [lengthFilter, setLengthFilter] = useState<LengthFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // RTK Query hooks
  const {
    data: allStories = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetStoriesQuery(user?.uid || '', {
    skip: !user?.uid,
  });

  // Filter and search stories
  const stories = useMemo(() => {
    let filtered = [...allStories];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (story) =>
          story.title.toLowerCase().includes(query) ||
          (story.description && story.description.toLowerCase().includes(query))
      );
    }

    // Apply theme filter
    if (themeFilter !== 'all') {
      filtered = filtered.filter((story) => story.theme === themeFilter);
    }

    // Apply length filter
    if (lengthFilter !== 'all') {
      filtered = filtered.filter((story) => story.length === lengthFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((story) => story.status === statusFilter);
    }

    return filtered;
  }, [allStories, searchQuery, themeFilter, lengthFilter, statusFilter]);

  const [createStoryMutation, { isLoading: isCreating }] = useCreateStoryMutation();
  const [deleteStoryMutation, { isLoading: isDeleting }] = useDeleteStoryMutation();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle story press - navigate to detail
  const handleStoryPress = useCallback(
    (story: Story) => {
      navigation.navigate('StoryDetail', { storyId: story.id });
    },
    [navigation]
  );


  // Handle story delete
  const handleStoryDelete = useCallback(
    async (storyId: string) => {
      // Find the story to be deleted
      const storyToDelete = stories.find((s) => s.id === storyId);
      if (!storyToDelete) return;

      try {
        // Delete the story
        await deleteStoryMutation(storyId).unwrap();
        
        // Show snackbar with undo option
        dispatch(
          showSnackbar({
            message: 'Story deleted',
            type: 'success',
            undoAction: {
              type: 'undo-story-delete',
              data: { story: storyToDelete },
            },
          })
        );
      } catch (error) {
        console.error('Error deleting story:', error);
        dispatch(
          showSnackbar({
            message: 'Failed to delete story',
            type: 'error',
          })
        );
      }
    },
    [deleteStoryMutation, dispatch, stories]
  );

  // Handle create story
  const handleCreateStory = useCallback(
    async (formData: CreateStoryFormData) => {
      if (!user?.uid) return;

      try {
        await createStoryMutation({
          userId: user.uid,
          data: {
            ...formData,
            status: 'draft',
          },
        }).unwrap();
        
        // Close modal
        setModalVisible(false);
        
        dispatch(
          showSnackbar({
            message: 'Story created successfully',
            type: 'success',
          })
        );
      } catch (error) {
        console.error('Error creating story:', error);
        dispatch(
          showSnackbar({
            message: 'Failed to create story',
            type: 'error',
          })
        );
      }
    },
    [user?.uid, createStoryMutation, dispatch]
  );

  // Handle FAB press - open create story modal
  const handleFABPress = useCallback(() => {
    setModalVisible(true);
  }, []);

  // Handle filter change
  const handleThemeFilterChange = useCallback((theme: ThemeFilter) => {
    setThemeFilter(theme);
    setFilterMenuVisible(false);
  }, []);

  const handleLengthFilterChange = useCallback((length: LengthFilter) => {
    setLengthFilter(length);
    setFilterMenuVisible(false);
  }, []);

  const handleStatusFilterChange = useCallback((status: StatusFilter) => {
    setStatusFilter(status);
    setFilterMenuVisible(false);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setThemeFilter('all');
    setLengthFilter('all');
    setStatusFilter('all');
    setFilterMenuVisible(false);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchQuery.trim() !== '' || themeFilter !== 'all' || lengthFilter !== 'all' || statusFilter !== 'all';
  }, [searchQuery, themeFilter, lengthFilter, statusFilter]);

  // Calculate available filter options from existing stories
  const availableThemes = useMemo(() => {
    const themes = new Set(allStories.map((story) => story.theme));
    return Array.from(themes).sort();
  }, [allStories]);

  const availableLengths = useMemo(() => {
    const lengths = new Set(allStories.map((story) => story.length));
    return Array.from(lengths).sort();
  }, [allStories]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set(allStories.map((story) => story.status));
    return Array.from(statuses).sort();
  }, [allStories]);

  // Format filter option titles
  const formatThemeTitle = (theme: Story['theme']): string => {
    return theme === 'sci-fi' ? 'Sci-Fi' : theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  const formatLengthTitle = (length: Story['length']): string => {
    return length === 'short-story' ? 'Short Story' : length.charAt(0).toUpperCase() + length.slice(1);
  };

  const formatStatusTitle = (status: Story['status']): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // FAB options
  const fabOptions: FABOption[] = [
    {
      id: 'create-story',
      label: 'Create Story',
      icon: <AntDesign name="plus" size={24} color={colors.textInverse} />,
      onPress: handleFABPress,
      color: colors.primary,
    },
  ];

  // Render story card
  const renderItem = useCallback(
    ({ item }: { item: Story; index: number }) => {
      return (
        <View style={styles.itemWrapper}>
          <StoryCard
            story={item}
            onPress={handleStoryPress}
            onDelete={handleStoryDelete}
          />
        </View>
      );
    },
    [handleStoryPress, handleStoryDelete]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) {
      return null; // Don't show empty state while loading
    }
    if (hasActiveFilters && stories.length === 0) {
      return (
      <EmptyState
        title="No Stories Found"
        message="Try adjusting your search or filters"
        icon={<AntDesign name="search" size={64} color={colors.textTertiary} />}
      />
      );
    }
    return (
      <EmptyState
        title="No Stories Yet"
        message="Create your first story to get started!"
        icon={<AntDesign name="file-text" size={64} color={colors.textTertiary} />}
      />
    );
  }, [isLoading, isFetching, hasActiveFilters, stories.length]);

  // Get item layout for BigList optimization
  // Item height (150) + spacing (15) = 165
  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: 165, // StoryCard height (150) + spacing (15)
      offset: 165 * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Stories</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search stories by title or description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          style={styles.searchInput}
          contentStyle={styles.searchInputContent}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          textColor={colors.text}
          placeholderTextColor={colors.textTertiary}
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery ? (
              <TextInput.Icon
                icon="close-circle"
                onPress={() => setSearchQuery('')}
              />
            ) : undefined
          }
          theme={{
            colors: {
              primary: colors.primary,
              text: colors.text,
              placeholder: colors.textTertiary,
              background: colors.surface,
            },
          }}
        />
      </View>

      {/* Filter Header - Only show if there are stories */}
      {allStories.length > 0 && (
        <View style={styles.filterHeader}>
          <Menu
            key={String(filterMenuVisible)}
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setFilterMenuVisible(true)}
              >
                <Ionicons name="filter" size={18} color={colors.text} />
                <Text style={styles.filterButtonText}>Filters</Text>
                {hasActiveFilters && <View style={styles.filterBadge} />}
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleThemeFilterChange('all')}
              title="All Themes"
              leadingIcon={themeFilter === 'all' ? 'check' : undefined}
            />
            {availableThemes.length > 0 && (
              <>
                <Divider />
                {availableThemes.map((theme) => (
                  <Menu.Item
                    key={theme}
                    onPress={() => handleThemeFilterChange(theme)}
                    title={formatThemeTitle(theme)}
                    leadingIcon={themeFilter === theme ? 'check' : undefined}
                  />
                ))}
              </>
            )}
            <Divider />
            <Menu.Item
              onPress={() => handleLengthFilterChange('all')}
              title="All Lengths"
              leadingIcon={lengthFilter === 'all' ? 'check' : undefined}
            />
            {availableLengths.length > 0 && (
              <>
                <Divider />
                {availableLengths.map((length) => (
                  <Menu.Item
                    key={length}
                    onPress={() => handleLengthFilterChange(length)}
                    title={formatLengthTitle(length)}
                    leadingIcon={lengthFilter === length ? 'check' : undefined}
                  />
                ))}
              </>
            )}
            <Divider />
            <Menu.Item
              onPress={() => handleStatusFilterChange('all')}
              title="All Statuses"
              leadingIcon={statusFilter === 'all' ? 'check' : undefined}
            />
            {availableStatuses.length > 0 && (
              <>
                <Divider />
                {availableStatuses.map((status) => (
                  <Menu.Item
                    key={status}
                    onPress={() => handleStatusFilterChange(status)}
                    title={formatStatusTitle(status)}
                    leadingIcon={statusFilter === status ? 'check' : undefined}
                  />
                ))}
              </>
            )}
            <Divider />
            {hasActiveFilters && (
              <>
                <Divider />
                <Menu.Item onPress={handleClearFilters} title="Clear All Filters" />
              </>
            )}
          </Menu>
          {hasActiveFilters && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearFilters}
            >
              <Ionicons name="close-circle" size={18} color={colors.text} />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <BigList
        data={stories}
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
        itemHeight={155}
        getItemLayout={getItemLayout}
        renderHeader={() => null}
        renderFooter={() => null}
      />
      <FloatingActionButton
        options={fabOptions}
        onMainPress={handleFABPress}
        position="bottom-right"
      />
      <CreateStoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateStory}
        isLoading={isCreating}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  searchInputContent: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.md,
  },
  filterHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    position: 'relative',
  },
  filterButtonText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.background,
    marginLeft: spacing.sm,
  },
  clearButtonText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.regular,
    color: colors.text,
  },
  itemWrapper: {
    marginBottom: 25,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
});
