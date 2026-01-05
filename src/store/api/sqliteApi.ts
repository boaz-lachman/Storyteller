/**
 * RTK Query API for SQLite database operations
 * Placeholder - will be implemented later
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

const sqliteBaseQuery: BaseQueryFn = async () => {
  return { data: null };
};

export const sqliteApi = createApi({
  reducerPath: 'sqliteApi',
  baseQuery: sqliteBaseQuery,
  tagTypes: ['Story', 'Character', 'Blurb', 'Scene', 'Chapter', 'GeneratedStory'],
  endpoints: () => ({}),
});
