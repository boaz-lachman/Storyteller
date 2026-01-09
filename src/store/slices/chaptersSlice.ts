import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Chapter } from '../../types';

interface ChaptersState {
  deletedChapter: Chapter | null; // Store deleted chapter for undo
}

const initialState: ChaptersState = {
  deletedChapter: null,
};

const chaptersSlice = createSlice({
  name: 'chapters',
  initialState,
  reducers: {
    setDeletedChapter: (state, action: PayloadAction<Chapter | null>) => {
      state.deletedChapter = action.payload;
    },
    clearDeletedChapter: (state) => {
      state.deletedChapter = null;
    },
  },
});

export const { setDeletedChapter, clearDeletedChapter } = chaptersSlice.actions;

export default chaptersSlice.reducer;

// Selectors
export const selectDeletedChapter = (state: RootState) => state.chapters.deletedChapter;
