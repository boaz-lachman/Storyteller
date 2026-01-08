import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface ModalState {
  isOpen: boolean;
  modalType: string | null;
  data: any;
}

interface UndoAction {
  type: 'undo-story-delete' | 'undo-character-delete' | 'undo-blurb-delete' | 'undo-scene-delete';
  data?: any; // Serializable data for undo action
}

interface UIState {
  modals: Record<string, ModalState>;
  globalLoading: boolean;
  globalError: string | null;
  snackbar: {
    message: string | null;
    type: 'success' | 'error' | 'info' | 'warning' | null;
    undoAction?: UndoAction;
  };
}

const initialState: UIState = {
  modals: {},
  globalLoading: false,
  globalError: null,
  snackbar: {
    message: null,
    type: null,
    undoAction: undefined,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openModal: (
      state,
      action: PayloadAction<{ modalType: string; data?: any }>
    ) => {
      state.modals[action.payload.modalType] = {
        isOpen: true,
        modalType: action.payload.modalType,
        data: action.payload.data || null,
      };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
      }
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },
    showSnackbar: (
      state,
      action: PayloadAction<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        undoAction?: UndoAction;
      }>
    ) => {
      state.snackbar = {
        message: action.payload.message,
        type: action.payload.type,
        undoAction: action.payload.undoAction,
      };
    },
    hideSnackbar: (state) => {
      state.snackbar = {
        message: null,
        type: null,
        undoAction: undefined,
      };
    },
    executeUndo: (state) => {
      // Clear undo action after execution
      if (state.snackbar.undoAction) {
        state.snackbar.undoAction = undefined;
      }
    },
  },
});

export const {
  openModal,
  closeModal,
  setGlobalLoading,
  setGlobalError,
  showSnackbar,
  hideSnackbar,
  executeUndo,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectModal = (modalType: string) => (state: RootState) =>
  state.ui.modals[modalType] || { isOpen: false, modalType: null, data: null };
export const selectGlobalLoading = (state: RootState) =>
  state.ui.globalLoading;
export const selectGlobalError = (state: RootState) => state.ui.globalError;
export const selectSnackbar = (state: RootState) => state.ui.snackbar;
