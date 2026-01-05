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
import { firebaseApi } from './api/firebaseApi';
import { firestoreApi } from './api/firestoreApi';
import { claudeApi } from './api/claudeApi';

// Redux slices
import authReducer from './slices/authSlice';
import storiesReducer from './slices/storiesSlice';
import syncReducer from './slices/syncSlice';
import uiReducer from './slices/uiSlice';
import exportReducer from './slices/exportSlice';

/**
 * Root reducer combining all reducers
 */
const rootReducer = combineReducers({
  // RTK Query APIs (not persisted)
  [firebaseApi.reducerPath]: firebaseApi.reducer,
  [firestoreApi.reducerPath]: firestoreApi.reducer,
  [claudeApi.reducerPath]: claudeApi.reducer,
  // Redux slices
  auth: authReducer,
  stories: storiesReducer,
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
  whitelist: ['auth', 'ui'], // Only persist auth and ui state
  blacklist: [
    firebaseApi.reducerPath,
    firestoreApi.reducerPath,
    claudeApi.reducerPath,
    'stories',
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
      firebaseApi.middleware,
      firestoreApi.middleware,
      claudeApi.middleware
    ),
});

// Setup RTK Query listeners for refetching on focus/reconnect
setupListeners(store.dispatch);

// Create persistor for redux-persist
export const persistor = persistStore(store);

// TypeScript types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;