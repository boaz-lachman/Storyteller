/**
 * RTK Query API for Blurbs (SQLite)
 * Handles local database operations for blurbs
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  getBlurbsByStory,
  createBlurb,
  deleteBlurb,
  getBlurb,
  updateBlurb,
} from '../../services/database/blurbs';
import { firestoreApi } from './firestoreApi';
import { networkService } from '../../services/network/networkService';
import { syncQueueManager } from '../../services/sync/queueManager';
import { syncManager } from '../../services/sync/syncManager';
import type { IdeaBlurb, BlurbCreateInput, BlurbUpdateInput } from '../../types';

interface BlurbsQueryArgs {
  storyId: string;
  sortBy?: 'importance' | 'createdAt' | 'title';
  order?: 'ASC' | 'DESC';
  categoryFilter?: 'plot-point' | 'conflict' | 'theme' | 'setting' | 'other';
}

interface BlurbCreateArgs {
  userId: string;
  storyId: string;
  data: BlurbCreateInput;
}

interface BlurbUpdateArgs {
  id: string;
  data: BlurbUpdateInput;
}

interface BlurbDeleteArgs {
  id: string;
  storyId?: string;
}

type BlurbsQueryArg =
  | BlurbsQueryArgs
  | BlurbCreateArgs
  | BlurbUpdateArgs
  | BlurbDeleteArgs;

const blurbsBaseQuery = (): BaseQueryFn<
  BlurbsQueryArg,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Type guard to determine which operation
      if ('storyId' in args && !('data' in args) && !('id' in args)) {
        // Fetch blurbs by story
        const { storyId, sortBy = 'importance', order = 'DESC', categoryFilter } = args as BlurbsQueryArgs;
        // Note: getBlurbsByStory doesn't support categoryFilter yet, we'll filter in memory for now
        const blurbs = await getBlurbsByStory(storyId, sortBy === 'title' ? 'createdAt' : sortBy, order);
        // Filter by category if specified
        const filteredBlurbs = categoryFilter
          ? blurbs.filter((blurb) => blurb.category === categoryFilter)
          : blurbs;
        // Sort by title if needed (since DB doesn't support it)
        const sortedBlurbs = sortBy === 'title'
          ? [...filteredBlurbs].sort((a, b) => {
              const comparison = a.title.localeCompare(b.title);
              return order === 'ASC' ? comparison : -comparison;
            })
          : filteredBlurbs;
        return { data: sortedBlurbs };
      }

      if ('userId' in args && 'storyId' in args && 'data' in args) {
        // Create blurb
        const { userId, storyId, data } = args as BlurbCreateArgs;
        const blurb = await createBlurb({ ...data, userId, storyId });
        return { data: blurb };
      }

      if ('id' in args && 'data' in args) {
        // Update blurb
        const { id, data } = args as BlurbUpdateArgs;
        const blurb = await updateBlurb(id, data);
        if (!blurb) {
          return {
            error: {
              error: 'Blurb not found',
              status: 404,
            },
          };
        }
        return { data: blurb };
      }

      // Delete blurb (check before get single to avoid matching)
      if ('id' in args && 'storyId' in args && !('data' in args)) {
        const { id } = args as BlurbDeleteArgs;
        // Delete locally first
        await deleteBlurb(id);
        
        // Try to delete from Firestore if online
        const isOnline = await networkService.isOnline();
        if (isOnline) {
          try {
            await firestoreApi.endpoints.deleteBlurb.initiate(id);
          } catch (firestoreError) {
            // If Firestore delete fails, add to sync queue
            console.error('Failed to delete blurb from Firestore:', firestoreError);
            syncQueueManager.add('blurb', id, 'delete');
          }
        } else {
          // If offline, add to sync queue
          syncQueueManager.add('blurb', id, 'delete');
        }
        
        return { data: { id } };
      }

      if ('id' in args && !('data' in args) && !('storyId' in args)) {
        // Get single blurb
        const { id } = args as BlurbDeleteArgs;
        const blurb = await getBlurb(id);
        if (!blurb) {
          return {
            error: {
              error: 'Blurb not found',
              status: 404,
            },
          };
        }
        return { data: blurb };
      }

      return {
        error: {
          error: 'Invalid query arguments',
          status: 400,
        },
      };
    } catch (error: any) {
      return {
        error: {
          error: error?.message || 'An error occurred',
          status: 500,
        },
      };
    }
  };
};

export const blurbsApi = createApi({
  reducerPath: 'blurbsApi',
  baseQuery: blurbsBaseQuery(),
  tagTypes: ['Blurb'],
  endpoints: (builder) => ({
    getBlurbs: builder.query<IdeaBlurb[], BlurbsQueryArgs>({
      query: (args) => args,
      providesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [
          { type: 'Blurb', id: `LIST-${args.storyId}` },
          ...result.map((blurb) => ({ type: 'Blurb' as const, id: blurb.id })),
        ];
      },
    }),
    getBlurb: builder.query<IdeaBlurb, string>({
      query: (id) => ({ id }),
      providesTags: (result, error, id) => {
        if (error || !result) {
          return [];
        }
        return [{ type: 'Blurb', id }];
      },
    }),
    createBlurb: builder.mutation<IdeaBlurb, BlurbCreateArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [{ type: 'Blurb', id: `LIST-${args.storyId}` }];
      },
      async onQueryStarted({ userId }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          // Trigger sync after successful creation
          syncManager.triggerSyncOnEntityChange(userId);
        } catch (error) {
          // Sync will happen on next sync cycle
          console.error('Error triggering sync after blurb creation:', error);
        }
      },
    }),
    updateBlurb: builder.mutation<IdeaBlurb, BlurbUpdateArgs>({
      query: (args) => args,
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        const state = getState() as any;
        
        // Get the existing blurb to find its storyId
        const existingBlurb = state.blurbsApi.queries[`getBlurb("${id}")`]?.data as IdeaBlurb | undefined;
        const storyId = existingBlurb?.storyId;

        const patchResult = dispatch(
          blurbsApi.util.updateQueryData('getBlurb', id, (draft) => {
            if (draft) {
              Object.assign(draft, data, { updatedAt: Date.now() });
            }
          })
        );

        let listPatchResult: any = null;
        if (storyId) {
          const currentBlurbsQueryArgs = state.blurbsApi.queries[`getBlurbs({"storyId":"${storyId}"})`]?.originalArgs;
          if (currentBlurbsQueryArgs) {
            listPatchResult = dispatch(
              blurbsApi.util.updateQueryData('getBlurbs', currentBlurbsQueryArgs, (draft) => {
                const blurbIndex = draft.findIndex((b) => b.id === id);
                if (blurbIndex !== -1) {
                  Object.assign(draft[blurbIndex], data, { updatedAt: Date.now() });
                }
              })
            );
          }
        }

        try {
          await queryFulfilled;
          
          // Trigger sync after successful update
          const state = getState() as any;
          const authUser = state?.auth?.user;
          if (authUser?.uid) {
            syncManager.triggerSyncOnEntityChange(authUser.uid);
          }
        } catch (err) {
          patchResult.undo();
          listPatchResult?.undo();
          throw err;
        }
      },
      invalidatesTags: (result, error, { id }) => {
        const tags: Array<{ type: 'Blurb'; id: string }> = [{ type: 'Blurb', id }];
        if (result?.storyId) {
          tags.push({ type: 'Blurb', id: `LIST-${result.storyId}` });
        }
        return tags;
      },
    }),
    deleteBlurb: builder.mutation<{ id: string }, BlurbDeleteArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        const tags: Array<{ type: 'Blurb'; id: string }> = [{ type: 'Blurb', id: args.id }];
        if (args.storyId) {
          tags.push({ type: 'Blurb', id: `LIST-${args.storyId}` });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetBlurbsQuery,
  useGetBlurbQuery,
  useCreateBlurbMutation,
  useUpdateBlurbMutation,
  useDeleteBlurbMutation,
} = blurbsApi;
