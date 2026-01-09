import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Scene } from '../../types';

interface ScenesState {
  deletedScene: Scene | null; // Store deleted scene for undo
}

const initialState: ScenesState = {
  deletedScene: null,
};

const scenesSlice = createSlice({
  name: 'scenes',
  initialState,
  reducers: {
    setDeletedScene: (state, action: PayloadAction<Scene | null>) => {
      state.deletedScene = action.payload;
    },
    clearDeletedScene: (state) => {
      state.deletedScene = null;
    },
  },
});

export const { setDeletedScene, clearDeletedScene } = scenesSlice.actions;

export default scenesSlice.reducer;

// Selectors
export const selectDeletedScene = (state: RootState) => state.scenes.deletedScene;
