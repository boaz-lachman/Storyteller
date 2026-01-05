/**
 * RTK Query API for Firestore sync operations
 * Placeholder - will be implemented later
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

const firestoreBaseQuery: BaseQueryFn = async () => {
  return { data: null };
};

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',
  baseQuery: firestoreBaseQuery,
  tagTypes: ['Sync'],
  endpoints: () => ({}),
});
