/**
 * Onboarding Redux Slice
 * Manages onboarding state and completion status
 * Persisted to AsyncStorage via redux-persist
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasSkippedOnboarding: boolean;
}

const initialState: OnboardingState = {
  hasCompletedOnboarding: false,
  hasSkippedOnboarding: false,
};

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    /**
     * Mark onboarding as completed
     * User finished all onboarding cards
     */
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
      state.hasSkippedOnboarding = false;
    },
    /**
     * Mark onboarding as skipped
     * User pressed skip button
     */
    skipOnboarding: (state) => {
      state.hasCompletedOnboarding = true; // Treat skip as completion
      state.hasSkippedOnboarding = true;
    },
    /**
     * Reset onboarding state (for testing or logout)
     */
    resetOnboarding: (state) => {
      state.hasCompletedOnboarding = false;
      state.hasSkippedOnboarding = false;
    },
  },
});

export const { completeOnboarding, skipOnboarding, resetOnboarding } = onboardingSlice.actions;

export default onboardingSlice.reducer;

// Selectors
export const selectHasCompletedOnboarding = (state: RootState) =>
  state.onboarding.hasCompletedOnboarding;

export const selectHasSkippedOnboarding = (state: RootState) =>
  state.onboarding.hasSkippedOnboarding;

export const selectShouldShowOnboarding = (state: RootState) =>
  !state.onboarding.hasCompletedOnboarding;
