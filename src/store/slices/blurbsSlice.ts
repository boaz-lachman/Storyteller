import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { IdeaBlurb } from '../../types';

interface BlurbsState {
  deletedBlurb: IdeaBlurb | null; // Store deleted blurb for undo
}

const initialState: BlurbsState = {
  deletedBlurb: null,
};

const blurbsSlice = createSlice({
  name: 'blurbs',
  initialState,
  reducers: {
    setDeletedBlurb: (state, action: PayloadAction<IdeaBlurb | null>) => {
      state.deletedBlurb = action.payload;
    },
    clearDeletedBlurb: (state) => {
      state.deletedBlurb = null;
    },
  },
});

export const { setDeletedBlurb, clearDeletedBlurb } = blurbsSlice.actions;

export default blurbsSlice.reducer;

// Selectors
export const selectDeletedBlurb = (state: RootState) => state.blurbs.deletedBlurb;
