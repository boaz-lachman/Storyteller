/**
 * RTK Query API for Scenes (SQLite)
 * Handles local database operations for scenes
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  getScenesByStory,
  createScene,
  deleteScene,
  getScene,
  updateScene,
} from '../../services/database/scenes';
import { firestoreApi } from './firestoreApi';
import { networkService } from '../../services/network/networkService';
import { syncQueueManager } from '../../services/sync/queueManager';
import { syncManager } from '../../services/sync/syncManager';
import type { Scene, SceneCreateInput, SceneUpdateInput } from '../../types';

interface ScenesQueryArgs {
  storyId: string;
  sortBy?: 'importance' | 'createdAt' | 'title';
  order?: 'ASC' | 'DESC';
}

interface SceneCreateArgs {
  userId: string;
  storyId: string;
  data: SceneCreateInput;
}

interface SceneUpdateArgs {
  id: string;
  data: SceneUpdateInput;
}

interface SceneDeleteArgs {
  id: string;
  storyId?: string;
}

type ScenesQueryArg =
  | ScenesQueryArgs
  | SceneCreateArgs
  | SceneUpdateArgs
  | SceneDeleteArgs;

const scenesBaseQuery = (): BaseQueryFn<
  ScenesQueryArg,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Type guard to determine which operation
      if ('storyId' in args && !('data' in args) && !('id' in args)) {
        // Fetch scenes by story
        const { storyId, sortBy = 'importance', order = 'DESC' } = args as ScenesQueryArgs;
        // Note: getScenesByStory doesn't support title sorting yet, we'll sort in memory
        const scenes = await getScenesByStory(storyId, sortBy === 'title' ? 'createdAt' : sortBy, order);
        // Sort by title if needed (since DB doesn't support it)
        const sortedScenes = sortBy === 'title'
          ? [...scenes].sort((a, b) => {
              const comparison = a.title.localeCompare(b.title);
              return order === 'ASC' ? comparison : -comparison;
            })
          : scenes;
        return { data: sortedScenes };
      }

      if ('userId' in args && 'storyId' in args && 'data' in args) {
        // Create scene
        const { userId, storyId, data } = args as SceneCreateArgs;
        const scene = await createScene({ ...data, userId, storyId });
        return { data: scene };
      }

      if ('id' in args && 'data' in args) {
        // Update scene
        const { id, data } = args as SceneUpdateArgs;
        const scene = await updateScene(id, data);
        if (!scene) {
          return {
            error: {
              error: 'Scene not found',
              status: 404,
            },
          };
        }
        return { data: scene };
      }

      // Delete scene (check before get single to avoid matching)
      if ('id' in args && 'storyId' in args && !('data' in args)) {
        const { id } = args as SceneDeleteArgs;
        // Delete locally first
        await deleteScene(id);
        
        // Try to delete from Firestore if online
        const isOnline = await networkService.isOnline();
        if (isOnline) {
          try {
            await firestoreApi.endpoints.deleteScene.initiate(id);
          } catch (firestoreError) {
            // If Firestore delete fails, add to sync queue
            console.error('Failed to delete scene from Firestore:', firestoreError);
            syncQueueManager.add('scene', id, 'delete');
          }
        } else {
          // If offline, add to sync queue
          syncQueueManager.add('scene', id, 'delete');
        }
        
        return { data: { id } };
      }

      if ('id' in args && !('data' in args) && !('storyId' in args)) {
        // Get single scene
        const { id } = args as SceneDeleteArgs;
        const scene = await getScene(id);
        if (!scene) {
          return {
            error: {
              error: 'Scene not found',
              status: 404,
            },
          };
        }
        return { data: scene };
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

export const scenesApi = createApi({
  reducerPath: 'scenesApi',
  baseQuery: scenesBaseQuery(),
  tagTypes: ['Scene'],
  endpoints: (builder) => ({
    getScenes: builder.query<Scene[], ScenesQueryArgs>({
      query: (args) => args,
      providesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [
          { type: 'Scene', id: `LIST-${args.storyId}` },
          ...result.map((scene) => ({ type: 'Scene' as const, id: scene.id })),
        ];
      },
    }),
    getScene: builder.query<Scene, string>({
      query: (id) => ({ id }),
      providesTags: (result, error, id) => {
        if (error || !result) {
          return [];
        }
        return [{ type: 'Scene', id }];
      },
    }),
    createScene: builder.mutation<Scene, SceneCreateArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        return [{ type: 'Scene', id: `LIST-${args.storyId}` }];
      },
      async onQueryStarted({ userId }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          // Trigger sync after successful creation
          syncManager.triggerSyncOnEntityChange(userId);
        } catch (error) {
          // Sync will happen on next sync cycle
          console.error('Error triggering sync after scene creation:', error);
        }
      },
    }),
    updateScene: builder.mutation<Scene, SceneUpdateArgs>({
      query: (args) => args,
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        const state = getState() as any;
        
        // Get the existing scene to find its storyId
        const existingScene = state.scenesApi.queries[`getScene("${id}")`]?.data as Scene | undefined;
        const storyId = existingScene?.storyId;

        const patchResult = dispatch(
          scenesApi.util.updateQueryData('getScene', id, (draft) => {
            if (draft) {
              Object.assign(draft, data, { updatedAt: Date.now() });
            }
          })
        );

        let listPatchResult: any = null;
        if (storyId) {
          const currentScenesQueryArgs = state.scenesApi.queries[`getScenes({"storyId":"${storyId}"})`]?.originalArgs;
          if (currentScenesQueryArgs) {
            listPatchResult = dispatch(
              scenesApi.util.updateQueryData('getScenes', currentScenesQueryArgs, (draft) => {
                const sceneIndex = draft.findIndex((s) => s.id === id);
                if (sceneIndex !== -1) {
                  Object.assign(draft[sceneIndex], data, { updatedAt: Date.now() });
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
        const tags: Array<{ type: 'Scene'; id: string }> = [{ type: 'Scene', id }];
        if (result?.storyId) {
          tags.push({ type: 'Scene', id: `LIST-${result.storyId}` });
        }
        return tags;
      },
    }),
    deleteScene: builder.mutation<{ id: string }, SceneDeleteArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, args) => {
        if (error || !result) {
          return [];
        }
        const tags: Array<{ type: 'Scene'; id: string }> = [{ type: 'Scene', id: args.id }];
        if (args.storyId) {
          tags.push({ type: 'Scene', id: `LIST-${args.storyId}` });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetScenesQuery,
  useGetSceneQuery,
  useCreateSceneMutation,
  useUpdateSceneMutation,
  useDeleteSceneMutation,
} = scenesApi;
