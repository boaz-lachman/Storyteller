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
  type: 'upload' | 'download';
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
            const stories = await downloadStories(userId);
            return { data: stories };

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
    // Upload Mutations
    // ============================================================================

    /**
     * Upload a story to Firestore
     */
    uploadStory: builder.mutation<Story, Story>({
      query: (story) => ({
        type: 'upload',
        entityType: 'story',
        data: story,
      }),
      invalidatesTags: [{ type: 'Story', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Upload a character to Firestore
     */
    uploadCharacter: builder.mutation<Character, Character>({
      query: (character) => ({
        type: 'upload',
        entityType: 'character',
        data: character,
      }),
      invalidatesTags: [{ type: 'Character', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Upload a blurb to Firestore
     */
    uploadBlurb: builder.mutation<IdeaBlurb, IdeaBlurb>({
      query: (blurb) => ({
        type: 'upload',
        entityType: 'blurb',
        data: blurb,
      }),
      invalidatesTags: [{ type: 'Blurb', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Upload a scene to Firestore
     */
    uploadScene: builder.mutation<Scene, Scene>({
      query: (scene) => ({
        type: 'upload',
        entityType: 'scene',
        data: scene,
      }),
      invalidatesTags: [{ type: 'Scene', id: 'LIST' }, { type: 'Sync' }],
    }),

    /**
     * Upload a chapter to Firestore
     */
    uploadChapter: builder.mutation<Chapter, Chapter>({
      query: (chapter) => ({
        type: 'upload',
        entityType: 'chapter',
        data: chapter,
      }),
      invalidatesTags: [{ type: 'Chapter', id: 'LIST' }, { type: 'Sync' }],
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
  // Upload mutations
  useUploadStoryMutation,
  useUploadCharacterMutation,
  useUploadBlurbMutation,
  useUploadSceneMutation,
  useUploadChapterMutation,
  // Download queries
  useDownloadStoriesQuery,
  useLazyDownloadStoriesQuery,
  useDownloadEntitiesForStoryQuery,
  useLazyDownloadEntitiesForStoryQuery,
  // Sync mutations
  useSyncStoryMutation,
  useSyncAllStoriesMutation,
} = firestoreApi;
