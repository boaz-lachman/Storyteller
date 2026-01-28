/**
 * RTK Query API for Story Comments (SQLite)
 * Enforces permissions:
 * - Only shared users (read/read-write) can create comments (owner cannot)
 * - Only owner can delete comments
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { getStory } from '../../services/database/stories';
import {
  createStoryComment,
  deleteStoryComment,
  getCommentsForStory,
} from '../../services/database/storyComments';
import type { StoryComment, StoryCommentCreateInput } from '../../types';
import { getStoryUserPermission } from '../../utils/permissions';
import { networkService } from '../../services/network/networkService';
import { syncQueueManager } from '../../services/sync/queueManager';
import { syncManager } from '../../services/sync/syncManager';
import { firestoreApi } from './firestoreApi';

type CommentsQueryArg =
  | { storyId: string }
  | { storyId: string; data: StoryCommentCreateInput; userId: string }
  | { storyId: string; commentId: string; userId: string; operation: 'delete' };

const commentsBaseQuery = (): BaseQueryFn<
  CommentsQueryArg,
  unknown,
  { error: string; status?: number }
> => {
  return async (args, api) => {
    try {
      if ('storyId' in args && !('data' in args) && !('operation' in args)) {
        const comments = await getCommentsForStory(args.storyId);
        return { data: comments };
      }

      if ('data' in args) {
        const story = await getStory(args.storyId);
        if (!story) {
          return { error: { error: 'Story not found', status: 404 } };
        }

        const permission = await getStoryUserPermission(args.userId, story);
        if (permission !== 'read' && permission !== 'read-write') {
          return { error: { error: 'No permission to comment', status: 403 } };
        }

        const comment = await createStoryComment({
          ...args.data,
          storyId: args.storyId,
        });

        // trigger sync
        syncManager.triggerSyncOnEntityChange(args.userId);
        return { data: comment };
      }

      if ('operation' in args && args.operation === 'delete') {
        const story = await getStory(args.storyId);
        if (!story) {
          return { error: { error: 'Story not found', status: 404 } };
        }
        if (story.userId !== args.userId) {
          return { error: { error: 'Only owner can delete comments', status: 403 } };
        }

        // soft delete locally
        await deleteStoryComment(args.commentId);

        // Best-effort immediate remote delete; queue if offline/fails
        const online = await networkService.isOnline();
        if (online) {
          const result = await api.dispatch(
            firestoreApi.endpoints.deleteStoryComment.initiate(args.commentId)
          );
          if (result.error) {
            syncQueueManager.add('storyComment', args.commentId, 'delete');
          }
        } else {
          syncQueueManager.add('storyComment', args.commentId, 'delete');
        }

        syncManager.triggerSyncOnEntityChange(args.userId);
        return { data: { id: args.commentId } };
      }

      return { error: { error: 'Invalid request', status: 400 } };
    } catch (e: any) {
      return { error: { error: e?.message ?? 'Unknown error', status: 500 } };
    }
  };
};

export const commentsApi = createApi({
  reducerPath: 'commentsApi',
  baseQuery: commentsBaseQuery(),
  tagTypes: ['Comment'],
  endpoints: (builder) => ({
    getComments: builder.query<StoryComment[], string>({
      query: (storyId) => ({ storyId }),
      providesTags: (result, error, storyId) =>
        result
          ? [
              { type: 'Comment', id: `story-${storyId}` },
              ...result.map((c) => ({ type: 'Comment' as const, id: c.id })),
            ]
          : [{ type: 'Comment', id: `story-${storyId}` }],
    }),
    createComment: builder.mutation<
      StoryComment,
      { storyId: string; data: StoryCommentCreateInput; userId: string }
    >({
      query: (args) => args,
      invalidatesTags: (result, error, args) =>
        error ? [] : [{ type: 'Comment', id: `story-${args.storyId}` }],
    }),
    deleteComment: builder.mutation<
      { id: string },
      { storyId: string; commentId: string; userId: string }
    >({
      query: (args) => ({ ...args, operation: 'delete' as const }),
      invalidatesTags: (result, error, args) =>
        error
          ? []
          : [
              { type: 'Comment', id: args.commentId },
              { type: 'Comment', id: `story-${args.storyId}` },
            ],
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} = commentsApi;

