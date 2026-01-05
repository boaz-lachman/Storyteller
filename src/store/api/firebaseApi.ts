/**
 * RTK Query API for Firebase Auth operations
 * Placeholder - will be implemented later
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

const firebaseBaseQuery: BaseQueryFn = async () => {
  return { data: null };
};

export const firebaseApi = createApi({
  reducerPath: 'firebaseApi',
  baseQuery: firebaseBaseQuery,
  tagTypes: ['Auth'],
  endpoints: () => ({}),
});
