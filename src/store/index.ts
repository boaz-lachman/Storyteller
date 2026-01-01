// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupListeners } from '@reduxjs/toolkit/query';

import { sqliteApi } from './api/sqliteApi';
import { firebaseApi } from './api/firebaseApi';
import { firestoreApi } from './api/firestoreApi';
import { claudeApi } from './api/claudeApi';
import authReducer from './slices/authSlice';
import storiesReducer from './slices/storiesSlice';
import syncReducer from './slices/syncSlice';
import uiReducer from './slices/uiSlice';
import exportReducer from './slices/exportSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'ui'],
};

const persistedReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    [sqliteApi.reducerPath]: sqliteApi.reducer,
    [firebaseApi.reducerPath]: firebaseApi.reducer,
    [firestoreApi.reducerPath]: firestoreApi.reducer,
    [claudeApi.reducerPath]: claudeApi.reducer,
    auth: persistedReducer,
    stories: storiesReducer,
    sync: syncReducer,
    ui: uiReducer,
    export: exportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      sqliteApi.middleware,
      firebaseApi.middleware,
      firestoreApi.middleware,
      claudeApi.middleware
    ),
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;