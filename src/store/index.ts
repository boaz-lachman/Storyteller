/**
 * Redux store configuration
 */
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setupListeners } from '@reduxjs/toolkit/query';

// RTK Query APIs
import { firestoreApi } from './api/firestoreApi';
import { claudeApi } from './api/claudeApi';
import { storiesApi } from './api/storiesApi';
import { charactersApi } from './api/charactersApi';
import { blurbsApi } from './api/blurbsApi';

// Redux slices
import authReducer from './slices/authSlice';
import storiesReducer from './slices/storiesSlice';
import charactersReducer from './slices/charactersSlice';
import blurbsReducer from './slices/blurbsSlice';
import syncReducer from './slices/syncSlice';
import uiReducer from './slices/uiSlice';
import exportReducer from './slices/exportSlice';

/**
 * Root reducer combining all reducers
 */
const rootReducer = combineReducers({
  // RTK Query APIs (not persisted)
  [firestoreApi.reducerPath]: firestoreApi.reducer,
  [claudeApi.reducerPath]: claudeApi.reducer,
  [storiesApi.reducerPath]: storiesApi.reducer,
  [charactersApi.reducerPath]: charactersApi.reducer,
  [blurbsApi.reducerPath]: blurbsApi.reducer,
  // Redux slices
  auth: authReducer,
  stories: storiesReducer,
  characters: charactersReducer,
  blurbs: blurbsReducer,
  sync: syncReducer,
  ui: uiReducer,
  export: exportReducer,
});

/**
 * Persist configuration
 * Only persist auth and ui slices
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: [
    firestoreApi.reducerPath,
    claudeApi.reducerPath,
    storiesApi.reducerPath,
    charactersApi.reducerPath,
    blurbsApi.reducerPath,
    'stories',
    'characters',
    'blurbs',
    'sync',
    'export',
  ],
};

/**
 * Persisted root reducer
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Configure Redux store
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
      },
    }).concat(
      firestoreApi.middleware,
      claudeApi.middleware,
      storiesApi.middleware,
      charactersApi.middleware,
      blurbsApi.middleware
    ),
});

// Setup RTK Query listeners for refetching on focus/reconnect
setupListeners(store.dispatch);

// Create persistor for redux-persist
export const persistor = persistStore(store);

// TypeScript types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;