import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { StoryShare, StoryPermission } from '../../types';

interface StorySharesState {
  shares: Record<string, StoryShare[]>; // Keyed by storyId
  permissions: Record<string, StoryPermission>; // Keyed by storyId, permission level for current user
  loading: boolean;
  error: string | null;
}

const initialState: StorySharesState = {
  shares: {},
  permissions: {},
  loading: false,
  error: null,
};

const storySharesSlice = createSlice({
  name: 'storyShares',
  initialState,
  reducers: {
    setShares: (state, action: PayloadAction<{ storyId: string; shares: StoryShare[] }>) => {
      state.shares[action.payload.storyId] = action.payload.shares;
    },
    addShare: (state, action: PayloadAction<StoryShare>) => {
      const storyId = action.payload.storyId;
      if (!state.shares[storyId]) {
        state.shares[storyId] = [];
      }
      // Check if share already exists
      const existingIndex = state.shares[storyId].findIndex(s => s.id === action.payload.id);
      if (existingIndex >= 0) {
        state.shares[storyId][existingIndex] = action.payload;
      } else {
        state.shares[storyId].push(action.payload);
      }
    },
    updateShare: (state, action: PayloadAction<StoryShare>) => {
      const storyId = action.payload.storyId;
      if (state.shares[storyId]) {
        const index = state.shares[storyId].findIndex(s => s.id === action.payload.id);
        if (index >= 0) {
          state.shares[storyId][index] = action.payload;
        }
      }
    },
    removeShare: (state, action: PayloadAction<{ storyId: string; shareId: string }>) => {
      const { storyId, shareId } = action.payload;
      if (state.shares[storyId]) {
        state.shares[storyId] = state.shares[storyId].filter(s => s.id !== shareId);
      }
    },
    setPermission: (state, action: PayloadAction<{ storyId: string; permission: StoryPermission }>) => {
      state.permissions[action.payload.storyId] = action.payload.permission;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearShares: (state) => {
      state.shares = {};
      state.permissions = {};
      state.error = null;
    },
  },
});

export const {
  setShares,
  addShare,
  updateShare,
  removeShare,
  setPermission,
  setLoading,
  setError,
  clearShares,
} = storySharesSlice.actions;

export default storySharesSlice.reducer;

// Selectors
export const selectSharesForStory = (state: RootState, storyId: string): StoryShare[] => {
  return state.storyShares.shares[storyId] || [];
};

export const selectStoryPermission = (state: RootState, storyId: string): StoryPermission => {
  return state.storyShares.permissions[storyId] || null;
};

export const selectStorySharesLoading = (state: RootState): boolean => {
  return state.storyShares.loading;
};

export const selectStorySharesError = (state: RootState): string | null => {
  return state.storyShares.error;
};
