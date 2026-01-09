/**
 * RTK Query API for Firestore sync operations
 * Provides upload mutations, download queries, and sync mutations
 * Uses the Firestore service functions for actual operations
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  uploadStory,
  uploadCharacter,
  uploadBlurb,
  uploadScene,
  uploadChapter,
  downloadStories,
  downloadEntitiesForStory,
  getStory,
  getCharacter,
  getBlurb,
  getScene,
  getChapter,
  listStories,
  listCharacters,
  listBlurbs,
  listScenes,
  listChapters,
  deleteCharacter,
  deleteBlurb,
  deleteScene,
  deleteChapter,
  deleteStory,
  isFirebaseConfigured,
} from '../../services/firestore/firestoreService';
import type {
  Story,
  Character,
  IdeaBlurb,
  Scene,
  Chapter,
} from '../../types';

// ============================================================================
// Base Query
// ============================================================================

interface FirestoreQueryArgs {
  type: 'upload' | 'download' | 'get' | 'list' | 'delete';
  entityType?: 'story' | 'character' | 'blurb' | 'scene' | 'chapter';
  operation?: string;
  data?: any;
  userId?: string;
  storyId?: string;
  localEntities?: {
    characters?: Character[];
    blurbs?: IdeaBlurb[];
    scenes?: Scene[];
    chapters?: Chapter[];
  };
}

const firestoreBaseQuery = (): BaseQueryFn<
  FirestoreQueryArgs,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Check Firebase configuration
      if (!isFirebaseConfigured()) {
        return {
          error: {
            error: 'Firebase is not configured',
            status: 500,
          },
        };
      }

      const { type, entityType, operation, data, userId, storyId, localEntities } = args;

      // Handle upload operations
      if (type === 'upload') {
        switch (entityType) {
          case 'story':
            if (!data) {
              return {
                error: {
                  error: 'Story data is required',
                  status: 400,
                },
              };
            }
            const uploadedStory = await uploadStory(data as Story);
            return { data: uploadedStory };

          case 'character':
            if (!data) {
              return {
                error: {
                  error: 'Character data is required',
                  status: 400,
                },
              };
            }
            const uploadedCharacter = await uploadCharacter(data as Character);
            return { data: uploadedCharacter };

          case 'blurb':
            if (!data) {
              return {
                error: {
                  error: 'Blurb data is required',
                  status: 400,
                },
              };
            }
            const uploadedBlurb = await uploadBlurb(data as IdeaBlurb);
            return { data: uploadedBlurb };

          case 'scene':
            if (!data) {
              return {
                error: {
                  error: 'Scene data is required',
                  status: 400,
                },
              };
            }
            const uploadedScene = await uploadScene(data as Scene);
            return { data: uploadedScene };

          case 'chapter':
            if (!data) {
              return {
                error: {
                  error: 'Chapter data is required',
                  status: 400,
                },
              };
            }
            const uploadedChapter = await uploadChapter(data as Chapter);
            return { data: uploadedChapter };

          default:
            return {
              error: {
                error: `Unknown entity type: ${entityType}`,
                status: 400,
              },
            };
        }
      }

      // Handle get operations
      if (type === 'get') {
        switch (entityType) {
          case 'story':
            if (!data?.id) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            const story = await getStory(data.id);
            return { data: story };

          case 'character':
            if (!data?.id) {
              return {
                error: {
                  error: 'Character ID is required',
                  status: 400,
                },
              };
            }
            const character = await getCharacter(data.id);
            return { data: character };

          case 'blurb':
            if (!data?.id) {
              return {
                error: {
                  error: 'Blurb ID is required',
                  status: 400,
                },
              };
            }
            const blurb = await getBlurb(data.id);
            return { data: blurb };

          case 'scene':
            if (!data?.id) {
              return {
                error: {
                  error: 'Scene ID is required',
                  status: 400,
                },
              };
            }
            const scene = await getScene(data.id);
            return { data: scene };

          case 'chapter':
            if (!data?.id) {
              return {
                error: {
                  error: 'Chapter ID is required',
                  status: 400,
                },
              };
            }
            const chapter = await getChapter(data.id);
            return { data: chapter };

          default:
            return {
              error: {
                error: `Unknown entity type for get: ${entityType}`,
                status: 400,
              },
            };
        }
      }

      // Handle list operations
      if (type === 'list') {
        switch (entityType) {
          case 'story':
            if (!userId) {
              return {
                error: {
                  error: 'User ID is required',
                  status: 400,
                },
              };
            }
            const stories = await listStories(userId);
            return { data: stories };

          case 'character':
            if (!storyId) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            const characters = await listCharacters(storyId);
            return { data: characters };

          case 'blurb':
            if (!storyId) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            const blurbs = await listBlurbs(storyId);
            return { data: blurbs };

          case 'scene':
            if (!storyId) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            const scenes = await listScenes(storyId);
            return { data: scenes };

          case 'chapter':
            if (!storyId) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            const chapters = await listChapters(storyId);
            return { data: chapters };

          default:
            return {
              error: {
                error: `Unknown entity type for list: ${entityType}`,
                status: 400,
              },
            };
        }
      }

      // Handle delete operations
      if (type === 'delete') {
        switch (entityType) {
          case 'story':
            if (!data?.id) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            await deleteStory(data.id);
            return { data: { id: data.id, deleted: true } };

          case 'character':
            if (!data?.id) {
              return {
                error: {
                  error: 'Character ID is required',
                  status: 400,
                },
              };
            }
            await deleteCharacter(data.id);
            return { data: { id: data.id, deleted: true } };

          case 'blurb':
            if (!data?.id) {
              return {
                error: {
                  error: 'Blurb ID is required',
                  status: 400,
                },
              };
            }
            await deleteBlurb(data.id);
            return { data: { id: data.id, deleted: true } };

          case 'scene':
            if (!data?.id) {
              return {
                error: {
                  error: 'Scene ID is required',
                  status: 400,
                },
              };
            }
            await deleteScene(data.id);
            return { data: { id: data.id, deleted: true } };

          case 'chapter':
            if (!data?.id) {
              return {
                error: {
                  error: 'Chapter ID is required',
                  status: 400,
                },
              };
            }
            await deleteChapter(data.id);
            return { data: { id: data.id, deleted: true } };

          default:
            return {
              error: {
                error: `Unknown entity type for delete: ${entityType}`,
                status: 400,
              },
            };
        }
      }

      // Handle download operations
      if (type === 'download') {
        switch (operation) {
          case 'downloadStories':
            if (!userId) {
              return {
                error: {
                  error: 'User ID is required',
                  status: 400,
                },
              };
            }
            const downloadedStories = await downloadStories(userId);
            return { data: downloadedStories };

          case 'downloadEntitiesForStory':
            if (!storyId) {
              return {
                error: {
                  error: 'Story ID is required',
                  status: 400,
                },
              };
            }
            const entities = await downloadEntitiesForStory(storyId, localEntities);
            return { data: entities };

          default:
            return {
              error: {
                error: `Unknown download operation: ${operation}`,
                status: 400,
              },
            };
        }
      }

      return {
        error: {
          error: 'Invalid query type',
          status: 400,
        },
      };
    } catch (error: any) {
      console.error('Firestore API error:', error);
      return {
        error: {
          error: error.message || 'Unknown error occurred',
          status: error.status || 500,
        },
      };
    }
  };
};

// ============================================================================
// RTK Query API
// ============================================================================

export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',
  baseQuery: firestoreBaseQuery(),
  tagTypes: ['Story', 'Character', 'Blurb', 'Scene', 'Chapter', 'Sync'],
  endpoints: (builder) => ({
    // ============================================================================
    // Get Queries
    // ============================================================================

    /**
     * Get a single story from Firestore
     */
    getStory: builder.query<Story | null, { userId: string; id: string }>({
      query: ({ id }) => ({
        type: 'get',
        entityType: 'story',
        data: { id },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Story', id }],
    }),

    /**
     * Get a single character from Firestore
     */
    getCharacter: builder.query<Character | null, { id: string }>({
      query: ({ id }) => ({
        type: 'get',
        entityType: 'character',
        data: { id },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Character', id }],
    }),

    /**
     * Get a single blurb from Firestore
     */
    getBlurb: builder.query<IdeaBlurb | null, { id: string }>({
      query: ({ id }) => ({
        type: 'get',
        entityType: 'blurb',
        data: { id },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Blurb', id }],
    }),

    /**
     * Get a single scene from Firestore
     */
    getScene: builder.query<Scene | null, { id: string }>({
      query: ({ id }) => ({
        type: 'get',
        entityType: 'scene',
        data: { id },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Scene', id }],
    }),

    /**
     * Get a single chapter from Firestore
     */
    getChapter: builder.query<Chapter | null, { id: string }>({
      query: ({ id }) => ({
        type: 'get',
        entityType: 'chapter',
        data: { id },
      }),
      providesTags: (result, error, { id }) => [{ type: 'Chapter', id }],
    }),

    // ============================================================================
    // List Queries
    // ============================================================================

    /**
     * List all stories for a user
     */
    listStories: builder.query<Story[], { userId: string }>({
      query: ({ userId }) => ({
        type: 'list',
        entityType: 'story',
        userId,
      }),
      providesTags: [{ type: 'Story', id: 'LIST' }],
    }),

    /**
     * List all characters for a story
     */
    listCharacters: builder.query<Character[], { userId: string; storyId: string }>({
      query: ({ storyId }) => ({
        type: 'list',
        entityType: 'character',
        storyId,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Character' as const, id })),
              { type: 'Character', id: 'LIST' },
            ]
          : [{ type: 'Character', id: 'LIST' }],
    }),

    /**
     * List all blurbs for a story
     */
    listBlurbs: builder.query<IdeaBlurb[], { userId: string; storyId: string }>({
      query: ({ storyId }) => ({
        type: 'list',
        entityType: 'blurb',
        storyId,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Blurb' as const, id })),
              { type: 'Blurb', id: 'LIST' },
            ]
          : [{ type: 'Blurb', id: 'LIST' }],
    }),

    /**
     * List all scenes for a story
     */
    listScenes: builder.query<Scene[], { userId: string; storyId: string }>({
      query: ({ storyId }) => ({
        type: 'list',
        entityType: 'scene',
        storyId,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Scene' as const, id })),
              { type: 'Scene', id: 'LIST' },
            ]
          : [{ type: 'Scene', id: 'LIST' }],
    }),

    /**
     * List all chapters for a story
     */
    listChapters: builder.query<Chapter[], { userId: string; storyId: string }>({
      query: ({ storyId }) => ({
        type: 'list',
        entityType: 'chapter',
        storyId,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chapter' as const, id })),
              { type: 'Chapter', id: 'LIST' },
            ]
          : [{ type: 'Chapter', id: 'LIST' }],
    }),

    // ============================================================================
    // Upload Mutations
    // ============================================================================

    /**
     * Upload a story to Firestore (create or update)
     */
    uploadStory: builder.mutation<Story, Story>({
      query: (story) => ({
        type: 'upload',
        entityType: 'story',
        data: story,
      }),
      invalidatesTags: (result, error, story) => [
        { type: 'Story', id: story.id },
        { type: 'Story', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Create a story in Firestore
     */
    createStory: builder.mutation<Story, Story>({
      query: (story) => ({
        type: 'upload',
        entityType: 'story',
        data: story,
      }),
      invalidatesTags: [{ type: 'Story', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Update a story in Firestore
     */
    updateStory: builder.mutation<Story, { userId: string; id: string; data: Partial<Story> }>({
      query: ({ id, data }) => ({
        type: 'upload',
        entityType: 'story',
        data: { id, ...data } as Story,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Story', id },
        { type: 'Story', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Upload a character to Firestore (create or update)
     */
    uploadCharacter: builder.mutation<Character, Character>({
      query: (character) => ({
        type: 'upload',
        entityType: 'character',
        data: character,
      }),
      invalidatesTags: (result, error, character) => [
        { type: 'Character', id: character.id },
        { type: 'Character', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Create a character in Firestore
     */
    createCharacter: builder.mutation<Character, Character>({
      query: (character) => ({
        type: 'upload',
        entityType: 'character',
        data: character,
      }),
      invalidatesTags: [{ type: 'Character', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Update a character in Firestore
     */
    updateCharacter: builder.mutation<Character, { userId: string; storyId: string; id: string; data: Partial<Character> }>({
      query: ({ id, data }) => ({
        type: 'upload',
        entityType: 'character',
        data: { id, ...data } as Character,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Character', id },
        { type: 'Character', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Delete a character from Firestore
     */
    deleteCharacter: builder.mutation<{ id: string; deleted: boolean }, { userId: string; storyId: string; id: string }>({
      query: ({ id }) => ({
        type: 'delete',
        entityType: 'character',
        data: { id },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Character', id },
        { type: 'Character', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Upload a blurb to Firestore (create or update)
     */
    uploadBlurb: builder.mutation<IdeaBlurb, IdeaBlurb>({
      query: (blurb) => ({
        type: 'upload',
        entityType: 'blurb',
        data: blurb,
      }),
      invalidatesTags: (result, error, blurb) => [
        { type: 'Blurb', id: blurb.id },
        { type: 'Blurb', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Create a blurb in Firestore
     */
    createBlurb: builder.mutation<IdeaBlurb, IdeaBlurb>({
      query: (blurb) => ({
        type: 'upload',
        entityType: 'blurb',
        data: blurb,
      }),
      invalidatesTags: [{ type: 'Blurb', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Update a blurb in Firestore
     */
    updateBlurb: builder.mutation<IdeaBlurb, { userId: string; storyId: string; id: string; data: Partial<IdeaBlurb> }>({
      query: ({ id, data }) => ({
        type: 'upload',
        entityType: 'blurb',
        data: { id, ...data } as IdeaBlurb,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Blurb', id },
        { type: 'Blurb', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Upload a scene to Firestore (create or update)
     */
    uploadScene: builder.mutation<Scene, Scene>({
      query: (scene) => ({
        type: 'upload',
        entityType: 'scene',
        data: scene,
      }),
      invalidatesTags: (result, error, scene) => [
        { type: 'Scene', id: scene.id },
        { type: 'Scene', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Create a scene in Firestore
     */
    createScene: builder.mutation<Scene, Scene>({
      query: (scene) => ({
        type: 'upload',
        entityType: 'scene',
        data: scene,
      }),
      invalidatesTags: [{ type: 'Scene', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Update a scene in Firestore
     */
    updateScene: builder.mutation<Scene, { userId: string; storyId: string; id: string; data: Partial<Scene> }>({
      query: ({ id, data }) => ({
        type: 'upload',
        entityType: 'scene',
        data: { id, ...data } as Scene,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Scene', id },
        { type: 'Scene', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Upload a chapter to Firestore (create or update)
     */
    uploadChapter: builder.mutation<Chapter, Chapter>({
      query: (chapter) => ({
        type: 'upload',
        entityType: 'chapter',
        data: chapter,
      }),
      invalidatesTags: (result, error, chapter) => [
        { type: 'Chapter', id: chapter.id },
        { type: 'Chapter', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Create a chapter in Firestore
     */
    createChapter: builder.mutation<Chapter, Chapter>({
      query: (chapter) => ({
        type: 'upload',
        entityType: 'chapter',
        data: chapter,
      }),
      invalidatesTags: [{ type: 'Chapter', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Update a chapter in Firestore
     */
    updateChapter: builder.mutation<Chapter, { userId: string; storyId: string; id: string; data: Partial<Chapter> }>({
      query: ({ id, data }) => ({
        type: 'upload',
        entityType: 'chapter',
        data: { id, ...data } as Chapter,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Chapter', id },
        { type: 'Chapter', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    // ============================================================================
    // Download Queries
    // ============================================================================

    /**
     * Download all stories for a user from Firestore
     */
    downloadStories: builder.query<Story[], string>({
      query: (userId) => ({
        type: 'download',
        operation: 'downloadStories',
        userId,
      }),
      providesTags: [{ type: 'Story', id: 'LIST' }],
    }),

    /**
     * Download all entities (characters, blurbs, scenes, chapters) for a story
     */
    downloadEntitiesForStory: builder.query<
      {
        characters: Character[];
        blurbs: IdeaBlurb[];
        scenes: Scene[];
        chapters: Chapter[];
      },
      {
        storyId: string;
        localEntities?: {
          characters?: Character[];
          blurbs?: IdeaBlurb[];
          scenes?: Scene[];
          chapters?: Chapter[];
        };
      }
    >({
      query: ({ storyId, localEntities }) => ({
        type: 'download',
        operation: 'downloadEntitiesForStory',
        storyId,
        localEntities,
      }),
      providesTags: [
        { type: 'Character', id: 'LIST' },
        { type: 'Blurb', id: 'LIST' },
        { type: 'Scene', id: 'LIST' },
        { type: 'Chapter', id: 'LIST' },
      ],
    }),

    // ============================================================================
    // Sync Mutations
    // ============================================================================

    /**
     * Sync a story and all its entities
     * Uploads the story and all entities, then downloads any remote changes
     */
    syncStory: builder.mutation<
      {
        story: Story;
        entities: {
          characters: Character[];
          blurbs: IdeaBlurb[];
          scenes: Scene[];
          chapters: Chapter[];
        };
      },
      {
        story: Story;
        characters?: Character[];
        blurbs?: IdeaBlurb[];
        scenes?: Scene[];
        chapters?: Chapter[];
        localEntities?: {
          characters?: Character[];
          blurbs?: IdeaBlurb[];
          scenes?: Scene[];
          chapters?: Chapter[];
        };
      }
    >({
      async queryFn({ story, characters, blurbs, scenes, chapters, localEntities }) {
        try {
          // Upload story
          const uploadedStory = await uploadStory(story);

          // Upload all entities
          const uploadPromises: Promise<any>[] = [];

          if (characters) {
            uploadPromises.push(...characters.map((c) => uploadCharacter(c)));
          }
          if (blurbs) {
            uploadPromises.push(...blurbs.map((b) => uploadBlurb(b)));
          }
          if (scenes) {
            uploadPromises.push(...scenes.map((s) => uploadScene(s)));
          }
          if (chapters) {
            uploadPromises.push(...chapters.map((c) => uploadChapter(c)));
          }

          await Promise.all(uploadPromises);

          // Download remote entities (with conflict resolution)
          const entities = await downloadEntitiesForStory(story.id, localEntities);

          return {
            data: {
              story: uploadedStory,
              entities,
            },
          };
        } catch (error: any) {
          return {
            error: {
              error: error.message || 'Sync failed',
              status: 500,
            },
          };
        }
      },
      invalidatesTags: [
        { type: 'Story', id: 'LIST' },
        { type: 'Character', id: 'LIST' },
        { type: 'Blurb', id: 'LIST' },
        { type: 'Scene', id: 'LIST' },
        { type: 'Chapter', id: 'LIST' },
        { type: 'Sync' },
      ],
    }),

    /**
     * Sync all stories for a user
     * Downloads all stories from Firestore
     */
    syncAllStories: builder.mutation<Story[], string>({
      async queryFn(userId) {
        try {
          const stories = await downloadStories(userId);
          return { data: stories };
        } catch (error: any) {
          return {
            error: {
              error: error.message || 'Sync failed',
              status: 500,
            },
          };
        }
      },
      invalidatesTags: [{ type: 'Story', id: 'LIST' }, { type: 'Sync' }],
    }),
  }),
});

// Export hooks
export const {
  // Get queries
  useGetStoryQuery,
  useLazyGetStoryQuery,
  useGetCharacterQuery,
  useLazyGetCharacterQuery,
  useGetBlurbQuery,
  useLazyGetBlurbQuery,
  useGetSceneQuery,
  useLazyGetSceneQuery,
  useGetChapterQuery,
  useLazyGetChapterQuery,
  // List queries
  useListStoriesQuery,
  useLazyListStoriesQuery,
  useListCharactersQuery,
  useLazyListCharactersQuery,
  useListBlurbsQuery,
  useLazyListBlurbsQuery,
  useListScenesQuery,
  useLazyListScenesQuery,
  useListChaptersQuery,
  useLazyListChaptersQuery,
  // Upload mutations
  useUploadStoryMutation,
  useUploadCharacterMutation,
  useUploadBlurbMutation,
  useUploadSceneMutation,
  useUploadChapterMutation,
  // Create mutations
  useCreateStoryMutation,
  useCreateCharacterMutation,
  useCreateBlurbMutation,
  useCreateSceneMutation,
  useCreateChapterMutation,
  // Update mutations
  useUpdateStoryMutation,
  useUpdateCharacterMutation,
  useUpdateBlurbMutation,
  useUpdateSceneMutation,
  useUpdateChapterMutation,
  // Delete mutations
  useDeleteCharacterMutation,
  // Download queries
  useDownloadStoriesQuery,
  useLazyDownloadStoriesQuery,
  useDownloadEntitiesForStoryQuery,
  useLazyDownloadEntitiesForStoryQuery,
  // Sync mutations
  useSyncStoryMutation,
  useSyncAllStoriesMutation,
} = firestoreApi;
