/**
 * Characters Screen
 * Displays characters for a specific story using BigList
 * Includes empty state, pull-to-refresh, sorting, filtering, and CRUD operations
 */
import React, { useCallback, useState, useMemo } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Menu, Divider } from 'react-native-paper';
import BigList from 'react-native-big-list';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { StoryTabParamList } from '../../navigation/types';
import {
  useGetCharactersQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
} from '../../store/api/charactersApi';
import { CharacterCard } from '../../components/cards/CharacterCard';
import { EmptyState } from '../../components/common/EmptyState';
import { CharacterModal } from '../../components/modals/CharacterModal';
import { FloatingActionButton, type FABOption } from '../../components/common/FloatingActionButton';
import MainBookActivityIndicator from '../../components/common/MainBookActivityIndicator';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/redux';
import { showSnackbar } from '../../store/slices/uiSlice';
import { setDeletedCharacter, clearDeletedCharacter } from '../../store/slices/charactersSlice';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { formatCharacterRole } from '../../utils/formatting';
import type { Character } from '../../types';
import type { CharacterFormData } from '../../hooks/useCharacterForm';

type CharactersScreenRouteProp = RouteProp<StoryTabParamList, 'Characters'>;

interface CharactersScreenProps {
  route: CharactersScreenRouteProp;
}

type SortBy = 'importance' | 'name' | 'createdAt';
type SortOrder = 'ASC' | 'DESC';
type RoleFilter = 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'all';

/**
 * Characters Screen Component
 */
export default function CharactersScreen({ route }: CharactersScreenProps) {
  const { storyId } = route.params;
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  // Sort/Filter state
  const [sortBy, setSortBy] = useState<SortBy>('importance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  // RTK Query hooks
  const {
    data: characters = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetCharactersQuery(
    {
      storyId,
      sortBy,
      order: sortOrder,
      roleFilter: roleFilter === 'all' ? undefined : roleFilter,
    },
    { skip: !storyId }
  );

  const [createCharacterMutation, { isLoading: isCreating }] = useCreateCharacterMutation();
  const [updateCharacterMutation, { isLoading: isUpdating }] = useUpdateCharacterMutation();
  const [deleteCharacterMutation, { isLoading: isDeleting }] = useDeleteCharacterMutation();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Handle character press - open edit modal
  const handleCharacterPress = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setIsModalVisible(true);
  }, []);

  // Handle delete character
  const handleDeleteCharacter = useCallback(
    (character: Character) => {
      Alert.alert(
        'Delete Character',
        `Are you sure you want to delete "${character.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                dispatch(setDeletedCharacter(character));
                await deleteCharacterMutation({
                  id: character.id,
                  storyId: character.storyId,
                }).unwrap();
                dispatch(
                  showSnackbar({
                    message: 'Character deleted',
                    type: 'success',
                    undoAction: {
                      type: 'undo-character-delete',
                      data: { characterId: character.id },
                    },
                  })
                );
              } catch (err: any) {
                console.error('Error deleting character:', err);
                dispatch(clearDeletedCharacter());
                dispatch(
                  showSnackbar({
                    message: err?.error || err?.data?.error || 'Failed to delete character. Please try again.',
                    type: 'error',
                  })
                );
              }
            },
          },
        ]
      );
    },
    [deleteCharacterMutation, dispatch]
  );

  // Handle create character
  const handleCreateCharacter = useCallback(() => {
    setSelectedCharacter(null);
    setIsModalVisible(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setSelectedCharacter(null);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(
    async (data: CharacterFormData) => {
      if (!user?.uid || !storyId) return;

      try {
        if (selectedCharacter) {
          // Update existing character
          await updateCharacterMutation({
            id: selectedCharacter.id,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: 'Character updated',
              type: 'success',
            })
          );
        } else {
          // Create new character
          await createCharacterMutation({
            userId: user.uid,
            storyId,
            data,
          }).unwrap();
          dispatch(
            showSnackbar({
              message: 'Character created',
              type: 'success',
            })
          );
        }
        handleCloseModal();
      } catch (err: any) {
        console.error('Error saving character:', err);
        dispatch(
          showSnackbar({
            message: err?.error || err?.data?.error || 'Failed to save character. Please try again.',
            type: 'error',
          })
        );
      }
    },
    [user, storyId, selectedCharacter, createCharacterMutation, updateCharacterMutation, dispatch, handleCloseModal]
  );

  // Handle sort change
  const handleSortChange = useCallback((newSortBy: SortBy) => {
    setSortBy(newSortBy);
    // Toggle order if clicking the same sort option
    if (newSortBy === sortBy) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      // Default order based on sort type
      setSortOrder(newSortBy === 'name' ? 'ASC' : 'DESC');
    }
    setSortMenuVisible(false);
  }, [sortBy]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: RoleFilter) => {
    setRoleFilter(newFilter);
    setFilterMenuVisible(false);
  }, []);

  // Calculate available roles from existing characters
  const availableRoles = useMemo(() => {
    const roles = new Set(characters.map((character) => character.role));
    return Array.from(roles).sort() as Character['role'][];
  }, [characters]);

  // Render character card with animation
  const renderItem = useCallback(
    ({ item, index }: { item: Character; index: number }) => {
      return (
        <Animated.View
          entering={FadeInDown.delay(index * 50).duration(400)}
          style={styles.itemWrapper}
        >
          <CharacterCard
            character={item}
            onPress={handleCharacterPress}
            onDelete={handleDeleteCharacter}
          />
        </Animated.View>
      );
    },
    [handleCharacterPress, handleDeleteCharacter]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading || isFetching) {
      return null; // Don't show empty state while loading
    }
    return (
      <EmptyState
        title="No Characters Yet"
        message="Add your first character to get started!"
        icon={<Ionicons name="people" size={64} color={colors.textTertiary} />}
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

  // FAB options
  const fabOptions: FABOption[] = [
    {
      id: 'add-character',
      icon: <Ionicons name="person-add" size={24} color={colors.textInverse} />,
      label: 'Add Character',
      onPress: handleCreateCharacter,
      color: colors.primary,
    },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MainBookActivityIndicator size={80} />
        <Text style={styles.loadingText}>Loading characters...</Text>
      </View>
    );
  }

  const isLoadingMutation = isCreating || isUpdating || isDeleting;

  return (
    <View style={styles.container}>
      {/* Sort/Filter Header - Only show if there are characters */}
      {characters.length > 0 && (
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.header}>
          <Menu
            key={String(sortMenuVisible)+"1"}
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setSortMenuVisible(true)}
              >
                <Ionicons name="swap-vertical" size={18} color={colors.text} />
                <Text style={styles.headerButtonText}>
                  Sort: {sortBy === 'importance' ? 'Importance' : sortBy === 'name' ? 'Name' : 'Date'}
                  {' '}
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
              onPress={() => handleSortChange('name')}
              title="Name"
              leadingIcon={sortBy === 'name' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => handleSortChange('createdAt')}
              title="Date Created"
              leadingIcon={sortBy === 'createdAt' ? 'check' : undefined}
            />
          </Menu>

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
                  Filter: {roleFilter === 'all' ? 'All' : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
                </Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              onPress={() => handleFilterChange('all')}
              title="All Roles"
              leadingIcon={roleFilter === 'all' ? 'check' : undefined}
            />
            {availableRoles.length > 0 && (
              <>
                <Divider />
                {availableRoles.map((role) => (
                  <Menu.Item
                    key={role}
                    onPress={() => handleFilterChange(role)}
                    title={formatCharacterRole(role)}
                    leadingIcon={roleFilter === role ? 'check' : undefined}
                  />
                ))}
              </>
            )}
          </Menu>
        </Animated.View>
      )}

      <BigList
        data={characters}
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
        itemHeight={130}
        getItemLayout={getItemLayout}
        renderHeader={() => null}
        renderFooter={() => null}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        options={fabOptions}
        onMainPress={handleCreateCharacter}
        position="bottom-right"
      />

      {/* Character Modal */}
      <CharacterModal
        visible={isModalVisible}
        character={selectedCharacter}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isLoadingMutation}
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
