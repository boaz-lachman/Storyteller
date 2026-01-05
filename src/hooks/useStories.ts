/**
 * Stories state hook
 */
import { useAppSelector, useAppDispatch } from './redux';
import {
  setSelectedStory,
  setFilters,
  clearFilters,
  setSortBy,
  setSortOrder,
  selectSelectedStoryId,
  selectFilters,
  selectSortBy,
  selectSortOrder,
} from '../store/slices/storiesSlice';
import { Story } from '../types';

/**
 * Hook to access and manage stories state
 */
export const useStories = () => {
  const dispatch = useAppDispatch();
  const selectedStoryId = useAppSelector(selectSelectedStoryId);
  const filters = useAppSelector(selectFilters);
  const sortBy = useAppSelector(selectSortBy);
  const sortOrder = useAppSelector(selectSortOrder);

  return {
    // State
    selectedStoryId,
    filters,
    sortBy,
    sortOrder,
    // Actions
    setSelectedStory: (storyId: string | null) => {
      dispatch(setSelectedStory(storyId));
    },
    setFilters: (newFilters: Partial<typeof filters>) => {
      dispatch(setFilters(newFilters));
    },
    clearFilters: () => {
      dispatch(clearFilters());
    },
    setSortBy: (newSortBy: 'createdAt' | 'updatedAt' | 'title') => {
      dispatch(setSortBy(newSortBy));
    },
    setSortOrder: (newSortOrder: 'asc' | 'desc') => {
      dispatch(setSortOrder(newSortOrder));
    },
  };
};
