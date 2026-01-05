import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type ExportFormat = 'pdf' | 'txt';
export type ExportType = 'full-story' | 'elements-only' | 'generated-only';

interface ExportState {
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;
  lastExportPath: string | null;
  exportFormat: ExportFormat;
  exportType: ExportType;
}

const initialState: ExportState = {
  isExporting: false,
  exportProgress: 0,
  exportError: null,
  lastExportPath: null,
  exportFormat: 'pdf',
  exportType: 'full-story',
};

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {
    setExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
      if (!action.payload) {
        state.exportProgress = 0;
      }
    },
    setExportProgress: (state, action: PayloadAction<number>) => {
      state.exportProgress = action.payload;
    },
    setExportError: (state, action: PayloadAction<string | null>) => {
      state.exportError = action.payload;
    },
    setLastExportPath: (state, action: PayloadAction<string | null>) => {
      state.lastExportPath = action.payload;
    },
    setExportFormat: (state, action: PayloadAction<ExportFormat>) => {
      state.exportFormat = action.payload;
    },
    setExportType: (state, action: PayloadAction<ExportType>) => {
      state.exportType = action.payload;
    },
    resetExport: (state) => {
      state.isExporting = false;
      state.exportProgress = 0;
      state.exportError = null;
    },
  },
});

export const {
  setExporting,
  setExportProgress,
  setExportError,
  setLastExportPath,
  setExportFormat,
  setExportType,
  resetExport,
} = exportSlice.actions;

export default exportSlice.reducer;

// Selectors
export const selectIsExporting = (state: RootState) => state.export.isExporting;
export const selectExportProgress = (state: RootState) =>
  state.export.exportProgress;
export const selectExportError = (state: RootState) => state.export.exportError;
export const selectLastExportPath = (state: RootState) =>
  state.export.lastExportPath;
export const selectExportFormat = (state: RootState) =>
  state.export.exportFormat;
export const selectExportType = (state: RootState) => state.export.exportType;
