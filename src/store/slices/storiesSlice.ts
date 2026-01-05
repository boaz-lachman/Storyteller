import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { Story } from '../../types';

interface StoriesState {
  selectedStoryId: string | null;
  filters: {
    theme?: Story['theme'];
    length?: Story['length'];
    status?: Story['status'];
    searchQuery?: string;
  };
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'asc' | 'desc';
}

const initialState: StoriesState = {
  selectedStoryId: null,
  filters: {},
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

const storiesSlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    setSelectedStory: (state, action: PayloadAction<string | null>) => {
      state.selectedStoryId = action.payload;
    },
    setFilters: (
      state,
      action: PayloadAction<Partial<StoriesState['filters']>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSortBy: (state, action: PayloadAction<StoriesState['sortBy']>) => {
      state.sortBy = action.payload;
    },
    setSortOrder: (state, action: PayloadAction<StoriesState['sortOrder']>) => {
      state.sortOrder = action.payload;
    },
  },
});

export const {
  setSelectedStory,
  setFilters,
  clearFilters,
  setSortBy,
  setSortOrder,
} = storiesSlice.actions;

export default storiesSlice.reducer;

// Selectors
export const selectSelectedStoryId = (state: RootState) =>
  state.stories.selectedStoryId;
export const selectFilters = (state: RootState) => state.stories.filters;
export const selectSortBy = (state: RootState) => state.stories.sortBy;
export const selectSortOrder = (state: RootState) => state.stories.sortOrder;
