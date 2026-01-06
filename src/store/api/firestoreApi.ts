/**
 * RTK Query API for Firestore sync operations
 * Placeholder - will be implemented later
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import axiosInstance from '../../services/api/axiosInstance';
import { fromFirestoreDocument, toFirestoreFields, toFirestoreValue } from '../../utils/helpers';
import { isOnline } from '../../utils/networkHelpers';
import { auth } from '../../config/firebase';
import { Chapter, Character, GeneratedStory, IdeaBlurb, Scene, Story } from '../../types';

const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
};

const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents`;

interface FirestoreQueryArgs {
  collection: string;
  userId: string;
  storyId?: string;
  id?: string;
  method: 'get' | 'list' | 'create' | 'update' | 'delete' | 'query';
  data?: any;
  where?: Array<{
    field: string;
    op: '==' | '!=' | '<' | '<=' | '>' | '>=';
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction: 'ASCENDING' | 'DESCENDING';
  }>;
  limit?: number;
}


const firestoreBaseQuery = (): BaseQueryFn<
  FirestoreQueryArgs,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Check connectivity
      const online = await isOnline();
      if (!online) {
        return { 
          error: { 
            error: 'No network connection', 
            status: 0 
          } 
        };
      }

      const { collection: collectionName, userId, storyId, id, method, data, where, orderBy, limit } = args;

      // Build collection path
      let collectionPath: string;
      if (collectionName === 'stories') {
        collectionPath = `users/${userId}/stories`;
      } else {
        if (!storyId) throw new Error('storyId required for subcollections');
        collectionPath = `users/${userId}/stories/${storyId}/${collectionName}`;
      }

      // Get auth token
      const token = auth.currentUser?.getIdToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      switch (method) {
        case 'get': {
          if (!id) throw new Error('Document ID required for get operation');
          
          const url = `${FIRESTORE_BASE_URL}/${collectionPath}/${id}`;
          const response = await axiosInstance.get(url, { headers });
          
          return { data: fromFirestoreDocument(response.data) };
        }

        case 'list': {
          const url = `${FIRESTORE_BASE_URL}/${collectionPath}`;
          const response = await axiosInstance.get(url, { 
            headers,
            params: {
              pageSize: limit || 1000,
            }
          });
          
          const documents = response.data.documents?.map(fromFirestoreDocument) || [];
          return { data: documents };
        }

        case 'query': {
          // Build structured query
          const structuredQuery: any = {
            from: [{ collectionId: collectionName }],
          };

          // Add where clauses
          if (where && where.length > 0) {
            structuredQuery.where = {
              compositeFilter: {
                op: 'AND',
                filters: where.map(w => ({
                  fieldFilter: {
                    field: { fieldPath: w.field },
                    op: w.op === '==' ? 'EQUAL' : 
                        w.op === '!=' ? 'NOT_EQUAL' :
                        w.op === '<' ? 'LESS_THAN' :
                        w.op === '<=' ? 'LESS_THAN_OR_EQUAL' :
                        w.op === '>' ? 'GREATER_THAN' :
                        'GREATER_THAN_OR_EQUAL',
                    value: toFirestoreValue(w.value)
                  }
                }))
              }
            };
          }

          // Add orderBy
          if (orderBy && orderBy.length > 0) {
            structuredQuery.orderBy = orderBy.map(o => ({
              field: { fieldPath: o.field },
              direction: o.direction
            }));
          }

          // Add limit
          if (limit) {
            structuredQuery.limit = limit;
          }

          const parentPath = collectionPath.split('/').slice(0, -1).join('/');
          const url = `${FIRESTORE_BASE_URL}/${parentPath}:runQuery`;
          
          const response = await axiosInstance.post(
            url,
            { structuredQuery },
            { headers }
          );

          const documents = response.data
            .filter((item: any) => item.document)
            .map((item: any) => fromFirestoreDocument(item.document));
          
          return { data: documents };
        }

        case 'create': {
          if (!id || !data) throw new Error('ID and data required for create');
          
          const url = `${FIRESTORE_BASE_URL}/${collectionPath}?documentId=${id}`;
          const timestamp = Date.now();
          
          const docData = {
            ...data,
            id,
            createdAt: timestamp,
            updatedAt: timestamp,
            synced: true
          };

          const firestoreDoc = {
            fields: toFirestoreFields(docData)
          };

          await axiosInstance.post(url, firestoreDoc, { headers });
          return { data: docData };
        }

        case 'update': {
          if (!id || !data) throw new Error('ID and data required for update');
          
          const url = `${FIRESTORE_BASE_URL}/${collectionPath}/${id}`;
          
          const updateData = {
            ...data,
            updatedAt: Date.now(),
            synced: true
          };

          const firestoreDoc = {
            fields: toFirestoreFields(updateData)
          };

          // Build update mask for only the fields being updated
          const updateMask = Object.keys(data)
            .filter(key => key !== 'id')
            .map(key => `fields.${key}`)
            .join(',');

          await axiosInstance.patch(
            url,
            firestoreDoc,
            { 
              headers,
              params: {
                updateMask: `${updateMask},fields.updatedAt,fields.synced`
              }
            }
          );

          return { data: { id, ...updateData } };
        }

        case 'delete': {
          if (!id) throw new Error('Document ID required for delete');
          
          const url = `${FIRESTORE_BASE_URL}/${collectionPath}/${id}`;
          
          // Soft delete by updating the deleted flag
          const firestoreDoc = {
            fields: {
              deleted: { booleanValue: true },
              updatedAt: { integerValue: Date.now().toString() }
            }
          };

          await axiosInstance.patch(
            url,
            firestoreDoc,
            { 
              headers,
              params: {
                updateMask: 'fields.deleted,fields.updatedAt'
              }
            }
          );

          return { data: { id, deleted: true } };
        }

        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error: any) {
      console.error('Firestore API error:', error.response?.data || error.message);
      return { 
        error: { 
          error: error.response?.data?.error?.message || error.message || 'Unknown error occurred',
          status: error.response?.status
        } 
      };
    }
  };
};


export const firestoreApi = createApi({
  reducerPath: 'firestoreApi',
  baseQuery: firestoreBaseQuery(),
  tagTypes: ['Story', 'Character', 'Blurb', 'Scene', 'Chapter', 'GeneratedStory'],
  endpoints: (builder) => ({
    // ========== STORIES ==========
    getStory: builder.query<Story, { userId: string; id: string }>({
      query: ({ userId, id }) => ({
        collection: 'stories',
        userId,
        id,
        method: 'get'
      }),
      providesTags: (result, error, { id }) => [{ type: 'Story', id }],
    }),

    listStories: builder.query<Story[], { userId: string; status?: string }>({
      query: ({ userId, status }) => ({
        collection: 'stories',
        userId,
        method: status ? 'query' : 'list',
        ...(status && {
          where: [{ field: 'status', op: '==', value: status }]
        })
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Story' as const, id })),
              { type: 'Story', id: 'LIST' },
            ]
          : [{ type: 'Story', id: 'LIST' }],
    }),

    createStory: builder.mutation<Story, Omit<Story, 'createdAt' | 'updatedAt' | 'synced'>>({
      query: (story) => ({
        collection: 'stories',
        userId: story.userId,
        id: story.id,
        method: 'create',
        data: story
      }),
      invalidatesTags: [{ type: 'Story', id: 'LIST' }],
    }),

    updateStory: builder.mutation<Story, { userId: string; id: string; data: Partial<Story> }>({
      query: ({ userId, id, data }) => ({
        collection: 'stories',
        userId,
        id,
        method: 'update',
        data
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Story', id }],
    }),

    // ========== CHARACTERS ==========
    listCharacters: builder.query<Character[], { userId: string; storyId: string }>({
      query: ({ userId, storyId }) => ({
        collection: 'characters',
        userId,
        storyId,
        method: 'query',
        where: [{ field: 'deleted', op: '==', value: false }],
        orderBy: [{ field: 'importance', direction: 'DESCENDING' }]
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Character' as const, id })),
              { type: 'Character', id: 'LIST' },
            ]
          : [{ type: 'Character', id: 'LIST' }],
    }),

    createCharacter: builder.mutation<Character, Omit<Character, 'createdAt' | 'updatedAt' | 'synced'>>({
      query: (character) => ({
        collection: 'characters',
        userId: character.userId,
        storyId: character.storyId,
        id: character.id,
        method: 'create',
        data: character
      }),
      invalidatesTags: [{ type: 'Character', id: 'LIST' }],
    }),

    updateCharacter: builder.mutation<Character, { userId: string; storyId: string; id: string; data: Partial<Character> }>({
      query: ({ userId, storyId, id, data }) => ({
        collection: 'characters',
        userId,
        storyId,
        id,
        method: 'update',
        data
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Character', id }],
    }),

    deleteCharacter: builder.mutation<{ id: string; deleted: boolean }, { userId: string; storyId: string; id: string }>({
      query: ({ userId, storyId, id }) => ({
        collection: 'characters',
        userId,
        storyId,
        id,
        method: 'delete'
      }),
      invalidatesTags: [{ type: 'Character', id: 'LIST' }],
    }),

    // ========== BLURBS ==========
    listBlurbs: builder.query<IdeaBlurb[], { userId: string; storyId: string }>({
      query: ({ userId, storyId }) => ({
        collection: 'blurbs',
        userId,
        storyId,
        method: 'query',
        where: [{ field: 'deleted', op: '==', value: false }]
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Blurb' as const, id })),
              { type: 'Blurb', id: 'LIST' },
            ]
          : [{ type: 'Blurb', id: 'LIST' }],
    }),

    createBlurb: builder.mutation<IdeaBlurb, Omit<IdeaBlurb, 'createdAt' | 'updatedAt' | 'synced'>>({
      query: (blurb) => ({
        collection: 'blurbs',
        userId: blurb.userId,
        storyId: blurb.storyId,
        id: blurb.id,
        method: 'create',
        data: blurb
      }),
      invalidatesTags: [{ type: 'Blurb', id: 'LIST' }],
    }),

    // ========== SCENES ==========
    listScenes: builder.query<Scene[], { userId: string; storyId: string }>({
      query: ({ userId, storyId }) => ({
        collection: 'scenes',
        userId,
        storyId,
        method: 'query',
        where: [{ field: 'deleted', op: '==', value: false }]
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Scene' as const, id })),
              { type: 'Scene', id: 'LIST' },
            ]
          : [{ type: 'Scene', id: 'LIST' }],
    }),

    createScene: builder.mutation<Scene, Omit<Scene, 'createdAt' | 'updatedAt' | 'synced'>>({
      query: (scene) => ({
        collection: 'scenes',
        userId: scene.userId,
        storyId: scene.storyId,
        id: scene.id,
        method: 'create',
        data: scene
      }),
      invalidatesTags: [{ type: 'Scene', id: 'LIST' }],
    }),

    // ========== CHAPTERS ==========
    listChapters: builder.query<Chapter[], { userId: string; storyId: string }>({
      query: ({ userId, storyId }) => ({
        collection: 'chapters',
        userId,
        storyId,
        method: 'query',
        where: [{ field: 'deleted', op: '==', value: false }],
        orderBy: [{ field: 'order', direction: 'ASCENDING' }]
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Chapter' as const, id })),
              { type: 'Chapter', id: 'LIST' },
            ]
          : [{ type: 'Chapter', id: 'LIST' }],
    }),

    createChapter: builder.mutation<Chapter, Omit<Chapter, 'createdAt' | 'updatedAt' | 'synced'>>({
      query: (chapter) => ({
        collection: 'chapters',
        userId: chapter.userId,
        storyId: chapter.storyId,
        id: chapter.id,
        method: 'create',
        data: chapter
      }),
      invalidatesTags: [{ type: 'Chapter', id: 'LIST' }],
    }),

    // ========== GENERATED STORIES ==========
    listGeneratedStories: builder.query<GeneratedStory[], { userId: string; storyId: string }>({
      query: ({ userId, storyId }) => ({
        collection: 'generatedStories',
        userId,
        storyId,
        method: 'query',
        orderBy: [{ field: 'createdAt', direction: 'DESCENDING' }]
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'GeneratedStory' as const, id })),
              { type: 'GeneratedStory', id: 'LIST' },
            ]
          : [{ type: 'GeneratedStory', id: 'LIST' }],
    }),

    createGeneratedStory: builder.mutation<GeneratedStory, Omit<GeneratedStory, 'createdAt' | 'updatedAt' | 'synced'>>({
      query: (generatedStory) => ({
        collection: 'generatedStories',
        userId: generatedStory.userId,
        storyId: generatedStory.storyId,
        id: generatedStory.id,
        method: 'create',
        data: generatedStory
      }),
      invalidatesTags: [{ type: 'GeneratedStory', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetStoryQuery,
  useListStoriesQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
  useListCharactersQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
  useListBlurbsQuery,
  useCreateBlurbMutation,
  useListScenesQuery,
  useCreateSceneMutation,
  useListChaptersQuery,
  useCreateChapterMutation,
  useListGeneratedStoriesQuery,
  useCreateGeneratedStoryMutation,
} = firestoreApi;