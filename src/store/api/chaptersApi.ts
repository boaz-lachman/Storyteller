/**
 * RTK Query API for Chapters (SQLite)
 * Handles local database operations for chapters
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  getChaptersByStory,
  createChapter,
  deleteChapter,
  getChapter,
  updateChapter,
  reorderChapters,
} from '../../services/database/chapters';
import { firestoreApi } from './firestoreApi';
import { networkService } from '../../services/network/networkService';
import { syncQueueManager } from '../../services/sync/queueManager';
import type { Chapter, ChapterCreateInput, ChapterUpdateInput } from '../../types';

interface ChaptersQueryArgs {
  storyId: string;
  sortBy?: 'importance' | 'createdAt' | 'order';
  order?: 'ASC' | 'DESC';
}

interface ChapterCreateArgs {
  userId: string;
  storyId: string;
  data: ChapterCreateInput;
}

interface ChapterUpdateArgs {
  id: string;
  data: ChapterUpdateInput;
}

interface ChapterDeleteArgs {
  id: string;
  storyId?: string;
}

interface ChapterReorderArgs {
  storyId: string;
  chapterOrders: Array<{ id: string; order: number }>;
}

type ChaptersQueryArg =
  | ChaptersQueryArgs
  | ChapterCreateArgs
  | ChapterUpdateArgs
  | ChapterDeleteArgs
  | ChapterReorderArgs;

const chaptersBaseQuery = (): BaseQueryFn<
  ChaptersQueryArg,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Type guard to determine which operation
      if ('storyId' in args && !('data' in args) && !('id' in args) && !('chapterOrders' in args)) {
        // Fetch chapters by story
        const { storyId, sortBy = 'order', order = 'ASC' } = args as ChaptersQueryArgs;
        // Note: getChaptersByStory supports 'importance' and 'createdAt', but we need 'order' sorting
        const chapters = await getChaptersByStory(
          storyId,
          sortBy === 'order' ? 'createdAt' : sortBy,
          order
        );
        // Sort by order if needed (since DB doesn't support it directly)
        const sortedChapters = sortBy === 'order'
          ? [...chapters].sort((a, b) => {
              const comparison = a.order - b.order;
              return order === 'ASC' ? comparison : -comparison;
            })
          : chapters;
        return { data: sortedChapters };
      }

      if ('chapterOrders' in args) {
        // Reorder chapters
        const { storyId, chapterOrders } = args as ChapterReorderArgs;
        
        // Validate input
        if (!storyId || !chapterOrders || chapterOrders.length === 0) {
          return {
            error: {
              error: 'Invalid reorder arguments',
              status: 400,
            },
          };
        }

        // Validate that all orders are positive integers
        for (const { id, order } of chapterOrders) {
          if (!id || !Number.isInteger(order) || order < 1) {
            return {
              error: {
                error: `Invalid order value for chapter ${id}: ${order}`,
                status: 400,
              },
            };
          }
        }

        await reorderChapters(storyId, chapterOrders);
        // Refetch chapters after reordering
        const chapters = await getChaptersByStory(storyId, 'createdAt', 'ASC');
        const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
        return { data: sortedChapters };
      }

      if ('userId' in args && 'storyId' in args && 'data' in args) {
        // Create chapter
        const { userId, storyId, data } = args as ChapterCreateArgs;
        const chapter = await createChapter({ ...data, userId, storyId });
        return { data: chapter };
      }

      if ('id' in args && 'data' in args) {
        // Update chapter
        const { id, data } = args as ChapterUpdateArgs;
        const chapter = await updateChapter(id, data);
        if (!chapter) {
          return {
            error: {
              error: 'Chapter not found',
              status: 404,
            },
          };
        }
        return { data: chapter };
      }

      // Delete chapter (check before get single to avoid matching)
      if ('id' in args && 'storyId' in args && !('data' in args)) {
        const { id } = args as ChapterDeleteArgs;
        // Delete locally first
        await deleteChapter(id);
        
        // Try to delete from Firestore if online
        const isOnline = await networkService.isOnline();
        if (isOnline) {
          try {
            await firestoreApi.endpoints.deleteChapter.initiate(id);
          } catch (firestoreError) {
            // If Firestore delete fails, add to sync queue
            console.error('Failed to delete chapter from Firestore:', firestoreError);
            syncQueueManager.add('chapter', id, 'delete');
          }
        } else {
          // If offline, add to sync queue
          syncQueueManager.add('chapter', id, 'delete');
        }
        
        return { data: { id } };
      }

      if ('id' in args && !('data' in args) && !('storyId' in args)) {
        // Get single chapter
        const { id } = args as ChapterDeleteArgs;
        const chapter = await getChapter(id);
        if (!chapter) {
          return {
            error: {
              error: 'Chapter not found',
              status: 404,
            },
          };
        }
        return { data: chapter };
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

export const chaptersApi = createApi({
  reducerPath: 'chaptersApi',
  baseQuery: chaptersBaseQuery(),
  tagTypes: ['Chapter'],
  endpoints: (builder) => ({
    getChapters: builder.query<Chapter[], ChaptersQueryArgs>({
      query: (args) => args,
      providesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [
          { type: 'Chapter', id: `LIST-${args.storyId}` },
          ...result.map((chapter) => ({ type: 'Chapter' as const, id: chapter.id })),
        ];
      },
    }),
    getChapter: builder.query<Chapter, string>({
      query: (id) => ({ id }),
      providesTags: (result, error, id) => {
        if (error || !result) {
          return [];
        }
        return [{ type: 'Chapter', id }];
      },
    }),
    createChapter: builder.mutation<Chapter, ChapterCreateArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [{ type: 'Chapter', id: `LIST-${args.storyId}` }];
      },
    }),
    updateChapter: builder.mutation<Chapter, ChapterUpdateArgs>({
      query: (args) => args,
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        const state = getState() as any;
        
        // Get the existing chapter to find its storyId
        const existingChapter = state.chaptersApi.queries[`getChapter("${id}")`]?.data as Chapter | undefined;
        const storyId = existingChapter?.storyId;

        const patchResult = dispatch(
          chaptersApi.util.updateQueryData('getChapter', id, (draft) => {
            if (draft) {
              Object.assign(draft, data, { updatedAt: Date.now() });
            }
          })
        );

        let listPatchResult: any = null;
        if (storyId) {
          const currentChaptersQueryArgs = state.chaptersApi.queries[`getChapters({"storyId":"${storyId}"})`]?.originalArgs;
          if (currentChaptersQueryArgs) {
            listPatchResult = dispatch(
              chaptersApi.util.updateQueryData('getChapters', currentChaptersQueryArgs, (draft) => {
                const chapterIndex = draft.findIndex((c) => c.id === id);
                if (chapterIndex !== -1) {
                  Object.assign(draft[chapterIndex], data, { updatedAt: Date.now() });
                }
              })
            );
          }
        }

        try {
          await queryFulfilled;
        } catch (err) {
          patchResult.undo();
          listPatchResult?.undo();
          throw err;
        }
      },
      invalidatesTags: (result, error, { id }) => {
        const tags: Array<{ type: 'Chapter'; id: string }> = [{ type: 'Chapter', id }];
        if (result?.storyId) {
          tags.push({ type: 'Chapter', id: `LIST-${result.storyId}` });
        }
        return tags;
      },
    }),
    deleteChapter: builder.mutation<{ id: string }, ChapterDeleteArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        const tags: Array<{ type: 'Chapter'; id: string }> = [{ type: 'Chapter', id: args.id }];
        if (args.storyId) {
          tags.push({ type: 'Chapter', id: `LIST-${args.storyId}` });
        }
        return tags;
      },
    }),
    reorderChapters: builder.mutation<Chapter[], ChapterReorderArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [
          { type: 'Chapter', id: `LIST-${args.storyId}` },
          ...result.map((chapter) => ({ type: 'Chapter' as const, id: chapter.id })),
        ];
      },
    }),
  }),
});

export const {
  useGetChaptersQuery,
  useGetChapterQuery,
  useCreateChapterMutation,
  useUpdateChapterMutation,
  useDeleteChapterMutation,
  useReorderChaptersMutation,
} = chaptersApi;
