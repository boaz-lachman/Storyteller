/**
 * Auto-save Redux slice
 * Manages auto-save state and activity context
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ActivityContext } from '../../services/autosave/autosaveService';

/**
 * Form types that can be auto-saved
 */
export type FormType = 'story' | 'character' | 'blurb' | 'scene' | 'chapter';

/**
 * Active form state
 */
export interface ActiveFormState {
  formType: FormType;
  entityId?: string;
  formData: Record<string, any>;
  storyId?: string; // For entity forms (character, blurb, scene, chapter)
}

interface AutosaveState {
  activityContext: ActivityContext;
  activeForm: ActiveFormState | null;
  isRestoring: boolean;
  lastSavedAt: number | null;
}

const initialState: AutosaveState = {
  activityContext: {},
  activeForm: null,
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

    /**
     * Set active form state
     */
    setActiveForm: (state, action: PayloadAction<ActiveFormState | null>) => {
      state.activeForm = action.payload;
      state.activityContext.lastActiveTimestamp = Date.now();
    },

    /**
     * Update form data for active form
     */
    updateFormData: (state, action: PayloadAction<Record<string, any>>) => {
      if (state.activeForm) {
        state.activeForm.formData = {
          ...state.activeForm.formData,
          ...action.payload,
        };
        state.activityContext.lastActiveTimestamp = Date.now();
      }
    },

    /**
     * Clear active form state
     */
    clearFormState: (state) => {
      state.activeForm = null;
      state.activityContext.lastActiveTimestamp = Date.now();
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
  setActiveForm,
  updateFormData,
  clearFormState,
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
export const selectActiveForm = (state: RootState) => state.autosave.activeForm;