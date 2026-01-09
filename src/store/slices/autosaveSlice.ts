/**
 * Auto-save Redux slice
 * Manages auto-save state and activity context
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ActivityContext } from '../../services/autosave/autosaveService';

interface AutosaveState {
  activityContext: ActivityContext;
  isRestoring: boolean;
  lastSavedAt: number | null;
}

const initialState: AutosaveState = {
  activityContext: {},
  isRestoring: false,
  lastSavedAt: null,
};

const autosaveSlice = createSlice({
  name: 'autosave',
  initialState,
  reducers: {
    /**
     * Set activity context
     */
    setActivityContext: (state, action: PayloadAction<ActivityContext>) => {
      state.activityContext = {
        ...state.activityContext,
        ...action.payload,
        lastActiveTimestamp: Date.now(),
      };
    },

    /**
     * Update specific activity context field
     */
    updateActivityContext: (
      state,
      action: PayloadAction<Partial<ActivityContext>>
    ) => {
      state.activityContext = {
        ...state.activityContext,
        ...action.payload,
        lastActiveTimestamp: Date.now(),
      };
    },

    /**
     * Set selected story ID
     */
    setSelectedStoryId: (state, action: PayloadAction<string | undefined>) => {
      state.activityContext.selectedStoryId = action.payload;
      state.activityContext.lastActiveTimestamp = Date.now();
    },

    /**
     * Set current tab
     */
    setCurrentTab: (state, action: PayloadAction<string | undefined>) => {
      state.activityContext.currentTab = action.payload;
      state.activityContext.lastActiveTimestamp = Date.now();
    },

    /**
     * Set form state
     */
    setFormState: (state, action: PayloadAction<Record<string, any> | undefined>) => {
      state.activityContext.formState = action.payload;
      state.activityContext.lastActiveTimestamp = Date.now();
    },

    /**
     * Clear activity context
     */
    clearActivityContext: (state) => {
      state.activityContext = {};
      state.lastSavedAt = null;
    },

    /**
     * Set restoring state
     */
    setRestoring: (state, action: PayloadAction<boolean>) => {
      state.isRestoring = action.payload;
    },

    /**
     * Set last saved timestamp
     */
    setLastSavedAt: (state, action: PayloadAction<number | null>) => {
      state.lastSavedAt = action.payload;
    },

    /**
     * Restore activity context from saved state
     */
    restoreActivityContext: (state, action: PayloadAction<ActivityContext>) => {
      state.activityContext = action.payload;
      state.isRestoring = false;
    },
  },
});

export const {
  setActivityContext,
  updateActivityContext,
  setSelectedStoryId,
  setCurrentTab,
  setFormState,
  clearActivityContext,
  setRestoring,
  setLastSavedAt,
  restoreActivityContext,
} = autosaveSlice.actions;

export default autosaveSlice.reducer;

// Selectors
export const selectActivityContext = (state: RootState) => state.autosave.activityContext;
export const selectSelectedStoryId = (state: RootState) =>
  state.autosave.activityContext.selectedStoryId;
export const selectCurrentTab = (state: RootState) => state.autosave.activityContext.currentTab;
export const selectFormState = (state: RootState) => state.autosave.activityContext.formState;
export const selectIsRestoring = (state: RootState) => state.autosave.isRestoring;
export const selectLastSavedAt = (state: RootState) => state.autosave.lastSavedAt;
