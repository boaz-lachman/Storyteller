/**
 * RTK Query API for Characters (SQLite)
 * Handles local database operations for characters
 */
import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  getCharactersByStory,
  createCharacter,
  deleteCharacter,
  getCharacter,
  updateCharacter,
} from '../../services/database/characters';
import type { Character, CharacterCreateInput, CharacterUpdateInput } from '../../types';

interface CharactersQueryArgs {
  storyId: string;
  sortBy?: 'importance' | 'createdAt' | 'name';
  order?: 'ASC' | 'DESC';
  roleFilter?: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
}

interface CharacterCreateArgs {
  userId: string;
  storyId: string;
  data: CharacterCreateInput;
}

interface CharacterUpdateArgs {
  id: string;
  data: CharacterUpdateInput;
}

interface CharacterDeleteArgs {
  id: string;
  storyId?: string;
}

type CharactersQueryArg =
  | CharactersQueryArgs
  | CharacterCreateArgs
  | CharacterUpdateArgs
  | CharacterDeleteArgs;

const charactersBaseQuery = (): BaseQueryFn<
  CharactersQueryArg,
  unknown,
  { error: string; status?: number }
> => {
  return async (args) => {
    try {
      // Type guard to determine which operation
      if ('storyId' in args && !('data' in args) && !('id' in args)) {
        // Fetch characters by story
        const { storyId, sortBy = 'importance', order = 'DESC', roleFilter } = args as CharactersQueryArgs;
        const characters = await getCharactersByStory(storyId, sortBy, order, roleFilter);
        return { data: characters };
      }

      if ('userId' in args && 'storyId' in args && 'data' in args) {
        // Create character
        const { userId, storyId, data } = args as CharacterCreateArgs;
        const character = await createCharacter({ ...data, userId, storyId });
        return { data: character };
      }

      if ('id' in args && 'data' in args) {
        // Update character
        const { id, data } = args as CharacterUpdateArgs;
        const character = await updateCharacter(id, data);
        if (!character) {
          return {
            error: {
              error: 'Character not found',
              status: 404,
            },
          };
        }
        return { data: character };
      }

      if ('id' in args && !('data' in args)) {
        // Delete character
        const { id } = args as CharacterDeleteArgs;
        await deleteCharacter(id);
        return { data: { id, deleted: true } };
      }

      throw new Error('Invalid query arguments');
    } catch (error: any) {
      console.error('Characters API error:', error);
      return {
        error: {
          error: error.message || 'Unknown error occurred',
          status: error.status || 500,
        },
      };
    }
  };
};

export const charactersApi = createApi({
  reducerPath: 'charactersApi',
  baseQuery: charactersBaseQuery(),
  tagTypes: ['Character'],
  endpoints: (builder) => ({
    // Fetch characters for a story
    getCharacters: builder.query<Character[], CharactersQueryArgs>({
      query: (args) => args,
      providesTags: (result, error, { storyId }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Character' as const, id })),
              { type: 'Character', id: `LIST-${storyId}` },
            ]
          : [{ type: 'Character', id: `LIST-${storyId}` }],
    }),

    // Get a single character by ID
    getCharacter: builder.query<Character, string>({
      queryFn: async (id) => {
        try {
          const character = await getCharacter(id);
          if (!character) {
            return {
              error: {
                error: 'Character not found',
                status: 404,
              },
            };
          }
          return { data: character };
        } catch (error: any) {
          return {
            error: {
              error: error.message || 'Unknown error occurred',
              status: 500,
            },
          };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Character', id }],
    }),

    // Create a new character
    createCharacter: builder.mutation<Character, CharacterCreateArgs>({
      query: (args) => args,
      invalidatesTags: (result, error, { storyId }) => [
        { type: 'Character', id: `LIST-${storyId}` },
      ],
    }),

    // Update a character
    updateCharacter: builder.mutation<Character, CharacterUpdateArgs>({
      query: (args) => args,
      async onQueryStarted({ id, data }, { dispatch, queryFulfilled, getState }) {
        // Optimistic update for single character
        const patchResult = dispatch(
          charactersApi.util.updateQueryData('getCharacter', id, (draft) => {
            if (draft) {
              Object.assign(draft, data, { updatedAt: Date.now() });
            }
          })
        );

        // Optimistic update for characters list
        // We need to update all character list queries that might contain this character
        let listPatchResults: any[] = [];
        try {
          const state = getState() as any;
          const queries = state?.charactersApi?.queries || {};
          
          // Find all getCharacters queries and update them
          Object.keys(queries).forEach((queryKey) => {
            if (queryKey.startsWith('getCharacters(')) {
              try {
                const queryData = queries[queryKey]?.data;
                if (Array.isArray(queryData)) {
                  const characterIndex = queryData.findIndex((c: Character) => c.id === id);
                  if (characterIndex !== -1) {
                    // Extract query args from the query key
                    const queryArgs = JSON.parse(queryKey.replace('getCharacters(', '').slice(0, -1));
                    const patchResult = dispatch(
                      charactersApi.util.updateQueryData('getCharacters', queryArgs, (draft) => {
                        const charIndex = draft.findIndex((c) => c.id === id);
                        if (charIndex !== -1) {
                          Object.assign(draft[charIndex], data, { updatedAt: Date.now() });
                        }
                      })
                    );
                    listPatchResults.push(patchResult);
                  }
                }
              } catch (err) {
                // Skip invalid queries
              }
            }
          });
        } catch (err) {
          console.warn('Could not optimistically update character in list:', err);
        }

        try {
          await queryFulfilled;
        } catch (err) {
          // Rollback optimistic updates on error
          patchResult.undo();
          listPatchResults.forEach((result) => result?.undo());
          throw err;
        }
      },
      invalidatesTags: (result, error, { id }) => {
        const tags: Array<{ type: 'Character'; id: string }> = [{ type: 'Character', id }];
        // Get storyId from the updated character
        if (result?.storyId) {
          tags.push({ type: 'Character', id: `LIST-${result.storyId}` });
        }
        return tags;
      },
    }),

    // Delete a character
    deleteCharacter: builder.mutation<
      { id: string; deleted: boolean; storyId?: string },
      { id: string; storyId?: string }
    >({
      queryFn: async ({ id }) => {
        try {
          await deleteCharacter(id);
          return { data: { id, deleted: true } };
        } catch (error: any) {
          return {
            error: {
              error: error.message || 'Unknown error occurred',
              status: 500,
            },
          };
        }
      },
      invalidatesTags: (result, error, { id, storyId }) => {
        const tags: Array<{ type: 'Character'; id: string }> = [{ type: 'Character', id }];
        if (storyId) {
          tags.push({ type: 'Character', id: `LIST-${storyId}` });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetCharactersQuery,
  useGetCharacterQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
} = charactersApi;
