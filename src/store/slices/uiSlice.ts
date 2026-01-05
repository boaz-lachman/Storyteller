import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface ModalState {
  isOpen: boolean;
  modalType: string | null;
  data: any;
}

interface UIState {
  modals: Record<string, ModalState>;
  globalLoading: boolean;
  globalError: string | null;
  snackbar: {
    message: string | null;
    type: 'success' | 'error' | 'info' | 'warning' | null;
  };
}

const initialState: UIState = {
  modals: {},
  globalLoading: false,
  globalError: null,
  snackbar: {
    message: null,
    type: null,
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
      }>
    ) => {
      state.snackbar = {
        message: action.payload.message,
        type: action.payload.type,
      };
    },
    hideSnackbar: (state) => {
      state.snackbar = {
        message: null,
        type: null,
      };
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
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectModal = (modalType: string) => (state: RootState) =>
  state.ui.modals[modalType] || { isOpen: false, modalType: null, data: null };
export const selectGlobalLoading = (state: RootState) =>
  state.ui.globalLoading;
export const selectGlobalError = (state: RootState) => state.ui.globalError;
export const selectSnackbar = (state: RootState) => state.ui.snackbar;
