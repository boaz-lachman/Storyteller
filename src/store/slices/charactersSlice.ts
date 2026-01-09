import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Character } from '../../types';

interface CharactersState {
  deletedCharacter: Character | null; // Store deleted character for undo
}

const initialState: CharactersState = {
  deletedCharacter: null,
};

const charactersSlice = createSlice({
  name: 'characters',
  initialState,
  reducers: {
    setDeletedCharacter: (state, action: PayloadAction<Character | null>) => {
      state.deletedCharacter = action.payload;
    },
    clearDeletedCharacter: (state) => {
      state.deletedCharacter = null;
    },
  },
});

export const { setDeletedCharacter, clearDeletedCharacter } = charactersSlice.actions;

export default charactersSlice.reducer;

// Selectors
export const selectDeletedCharacter = (state: RootState) => state.characters.deletedCharacter;
