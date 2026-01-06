import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface SyncQueueItem {
  id: string;
  type: 'story' | 'character' | 'blurb' | 'scene' | 'chapter';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncQueue: SyncQueueItem[];
  isOnline: boolean;
  syncError: string | null;
}

const initialState: SyncState = {
  isSyncing: false,
  lastSyncTime: null,
  syncQueue: [],
  isOnline: true,
  syncError: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<number | null>) => {
      state.lastSyncTime = action.payload;
    },
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addToSyncQueue: (state, action: PayloadAction<SyncQueueItem>) => {
      state.syncQueue = state.syncQueue.filter(
        (item) =>
          !(
            item.entityId === action.payload.entityId &&
            item.type === action.payload.type
          )
      );
      state.syncQueue.push(action.payload);
    },
    removeFromSyncQueue: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter((item) => item.id !== action.payload);
    },
    clearSyncQueue: (state) => {
      state.syncQueue = [];
    },
    setSyncError: (state, action: PayloadAction<string | null>) => {
      state.syncError = action.payload;
    },
  },
});

export const {
  setSyncing,
  setLastSyncTime,
  setOnline,
  addToSyncQueue,
  removeFromSyncQueue,
  clearSyncQueue,
  setSyncError,
} = syncSlice.actions;

export default syncSlice.reducer;

// Selectors
export const selectIsSyncing = (state: RootState) => state.sync.isSyncing;
export const selectLastSyncTime = (state: RootState) =>
  state.sync.lastSyncTime;
export const selectSyncQueue = (state: RootState) => state.sync.syncQueue;
export const selectIsOnline = (state: RootState) => state.sync.isOnline;
export const selectSyncError = (state: RootState) => state.sync.syncError;
