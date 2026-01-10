/**
 * RTK Query API for Stories (SQLite)
 * Handles local database operations for stories
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { getAllStories, createStory, deleteStory, getStory, updateStory } from '../../services/database/stories';
import { firestoreApi } from './firestoreApi';
import { networkService } from '../../services/network/networkService';
import { syncQueueManager } from '../../services/sync/queueManager';
import { syncManager } from '../../services/sync/syncManager';
import { useAuth } from '../../hooks/useAuth';
import type { Story, StoryCreateInput, StoryUpdateInput } from '../../types';

interface StoriesQueryArgs {
  userId: string;
}

interface StoryCreateArgs {
  userId: string;
  data: StoryCreateInput;
}

interface StoryUpdateArgs {
  id: string;
  data: StoryUpdateInput;
}

interface StoryDeleteArgs {
  id: string;
}

interface StoryGetArgs {
  id: string;
}

type StoriesQueryArg =
  | StoriesQueryArgs
  | StoryCreateArgs
  | StoryUpdateArgs
  | StoryDeleteArgs
  | StoryGetArgs;

const storiesBaseQuery = (): BaseQueryFn<
  StoriesQueryArg,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Type guard to determine which operation
      if ('userId' in args && !('data' in args) && !('id' in args)) {
        // Fetch all stories
        const { userId } = args as StoriesQueryArgs;
        const stories = await getAllStories(userId);
        return { data: stories };
      }

      if ('userId' in args && 'data' in args) {
        // Create story
        const { userId, data } = args as StoryCreateArgs;
        const story = await createStory({ ...data, userId });
        return { data: story };
      }

      if ('id' in args && 'data' in args) {
        // Update story
        const { id, data } = args as StoryUpdateArgs;
        const story = await updateStory(id, data);
        if (!story) {
          return {
            error: {
              error: 'Story not found',
              status: 404,
            },
          };
        }
        return { data: story };
      }


      throw new Error('Invalid query arguments');
    } catch (error: any) {
      console.error('Stories API error:', error);
      return {
        error: {
          error: error.message || 'Unknown error occurred',
          status: error.status || 500,
        },
      };
    }
  };
};

export const storiesApi = createApi({
  reducerPath: 'storiesApi',
  baseQuery: storiesBaseQuery(),
  tagTypes: ['Story'],
  endpoints: (builder) => ({
    // Fetch all stories for a user
    getStories: builder.query<Story[], string>({
      query: (userId) => ({ userId }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Story' as const, id })),
              { type: 'Story', id: 'LIST' },
            ]
          : [{ type: 'Story', id: 'LIST' }],
    }),

    // Get a single story by ID
    getStory: builder.query<Story, string>({
      queryFn: async (id) => {
        try {
          const story = await getStory(id);
          if (!story) {
            return {
              error: {
                error: 'Story not found',
                status: 404,
              },
            };
          }
          return { data: story };
        } catch (error: any) {
          return {
            error: {
              error: error.message || 'Unknown error occurred',
              status: 500,
            },
          };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Story', id }],
    }),

    // Create a new story
    createStory: builder.mutation<Story, StoryCreateArgs>({
      query: (args) => args,
      invalidatesTags: [{ type: 'Story', id: 'LIST' }],
      async onQueryStarted({ userId }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          // Trigger sync after successful creation
          syncManager.triggerSyncOnEntityChange(userId);
        } catch (error) {
          // Sync will happen on next sync cycle
          console.error('Error triggering sync after story creation:', error);
        }
      },
    }),

    // Update a story with optimistic updates
    updateStory: builder.mutation<Story, StoryUpdateArgs>({
      query: (args) => args,
      // Optimistic update: update cache immediately before server responds
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        // Get current story from cache
        const patchResult = dispatch(
          storiesApi.util.updateQueryData('getStory', id, (draft) => {
            if (draft) {
              Object.assign(draft, data, {
                updatedAt: Date.now(),
              });
            }
          })
        );

        // Also update in the list
        let listPatchResult: any = null;
        try {
          // Try to get userId from state or from the story
          const state = getState() as any;
          const authUser = state?.auth?.user;
          if (authUser?.uid) {
            listPatchResult = dispatch(
              storiesApi.util.updateQueryData('getStories', authUser.uid, (draft) => {
                const storyIndex = draft.findIndex((s) => s.id === id);
                if (storyIndex !== -1) {
                  Object.assign(draft[storyIndex], data, {
                    updatedAt: Date.now(),
                  });
                }
              })
            );
          }
        } catch (err) {
          // If list update fails, continue - it will be invalidated anyway
          console.warn('Could not optimistically update story in list:', err);
        }

        try {
          // Wait for query to complete
          await queryFulfilled;
          
          // Trigger sync after successful update
          const state = getState() as any;
          const authUser = state?.auth?.user;
          if (authUser?.uid) {
            syncManager.triggerSyncOnEntityChange(authUser.uid);
          }
        } catch (err) {
          // If query fails, revert both optimistic updates
          patchResult.undo();
          if (listPatchResult) {
            listPatchResult.undo();
          }
          throw err;
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Story', id },
        { type: 'Story', id: 'LIST' },
      ],
    }),

    // Delete a story (using delayed deletion - actual deletion handled by deletionManager)
    deleteStory: builder.mutation<{ id: string; deleted: boolean }, string>({
      queryFn: async (id) => {
        // This is a placeholder - actual deletion is handled by deletionManager
        // The mutation will be called after the delay if undo wasn't pressed
        return { data: { id, deleted: true } };
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Story', id },
        { type: 'Story', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetStoriesQuery,
  useGetStoryQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
  useDeleteStoryMutation,
} = storiesApi;
