/**
 * Characters CRUD operations
 */
import { getDb } from './sqlite';
import { Character, CharacterCreateInput, CharacterUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId, safeJsonStringify, safeJsonParse } from '../../utils/helpers';
import { canEditEntity } from '../../utils/permissions';

/**
 * Create a new character
 */
export const createCharacter = async (
  character: CharacterCreateInput & { userId: string; storyId: string }
): Promise<Character> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = character.id ?? generateId();

  const newCharacter: Character = {
    id,
    userId: character.userId,
    storyId: character.storyId,
    name: character.name,
    description: character.description,
    role: character.role,
    traits: character.traits || [],
    backstory: character.backstory,
    importance: character.importance,
    createdAt: now,
    updatedAt: now,
    synced: character.synced ?? false,
    deleted: false,
  };

  await db.runAsync(
    `INSERT INTO Characters (
      id, userId, storyId, name, description, role, traits, backstory,
      importance, createdAt, updatedAt, synced, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newCharacter.id,
      newCharacter.userId,
      newCharacter.storyId,
      newCharacter.name,
      newCharacter.description,
      newCharacter.role,
      safeJsonStringify(newCharacter.traits),
      newCharacter.backstory || null,
      newCharacter.importance,
      newCharacter.createdAt,
      newCharacter.updatedAt,
      newCharacter.synced ? 1 : 0,
      newCharacter.deleted ? 1 : 0,
    ]
  );

  return newCharacter;
};

/**
 * Get a character by ID
 */
export const getCharacter = async (id: string): Promise<Character | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM Characters WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    traits: safeJsonParse(result.traits, []),
    synced: result.synced === 1,
    deleted: result.deleted === 1,
  } as Character;
};

/**
 * Get all characters for a story
 */
export const getCharactersByStory = async (
  storyId: string,
  sortBy: 'importance' | 'createdAt' | 'name' = 'importance',
  order: 'ASC' | 'DESC' = 'DESC',
  roleFilter?: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
): Promise<Character[]> => {
  const db = await getDb();
  let query = `SELECT * FROM Characters 
     WHERE storyId = ? AND deleted = 0`;
  const params: any[] = [storyId];

  if (roleFilter) {
    query += ` AND role = ?`;
    params.push(roleFilter);
  }

  query += ` ORDER BY ${sortBy} ${order}`;

  const results = await db.getAllAsync<any>(query, params);

  return results.map((char) => ({
    ...char,
    traits: safeJsonParse(char.traits, []),
    synced: char.synced === 1,
    deleted: char.deleted === 1,
  })) as Character[];
};

/**
 * Update a character
 */
export const updateCharacter = async (
  id: string,
  updates: CharacterUpdateInput,
  options?: {
    userId?: string; // Optional: if provided, will check permissions
    preserveSync?: boolean; // If true, don't mark as unsynced
    useRemoteUpdatedAt?: number; // If provided, use this timestamp instead of current time
  }
): Promise<Character | null> => {
  // Check permissions if userId is provided
  if (options?.userId) {
    const character = await getCharacter(id);
    if (!character) {
      throw new Error('Character not found');
    }
    const canEdit = await canEditEntity(options.userId, character);
    if (!canEdit) {
      throw new Error('You do not have permission to edit this character');
    }
  }

  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'storyId' && key !== 'updatedAt') {
      if (key === 'traits' && Array.isArray(value)) {
        fields.push(`${key} = ?`);
        values.push(safeJsonStringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    return getCharacter(id);
  }

  // Mark as unsynced when updated (unless preserveSync is true)
  if (!options?.preserveSync) {
    fields.push('synced = ?');
    values.push(0);
  }

  // Use remote updatedAt if provided, otherwise use current time
  fields.push('updatedAt = ?');
  values.push(options?.useRemoteUpdatedAt ?? updates.updatedAt ?? now);
  values.push(id);

  await db.runAsync(
    `UPDATE Characters SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getCharacter(id);
};

/**
 * Delete a character (soft delete)
 */
export const deleteCharacter = async (
  id: string,
  userId?: string // Optional: if provided, will check permissions
): Promise<void> => {
  // Check permissions if userId is provided
  if (userId) {
    const character = await getCharacter(id);
    if (!character) {
      throw new Error('Character not found');
    }
    const canDelete = await canEditEntity(userId, character);
    if (!canDelete) {
      throw new Error('You do not have permission to delete this character');
    }
  }

  const db = await getDb();
  const now = getCurrentTimestamp();
  await db.runAsync(
    'UPDATE Characters SET deleted = 1, updatedAt = ? WHERE id = ?',
    [now, id]
  );
};

/**
 * Get unsynced characters
 */
export const getUnsyncedCharacters = async (userId: string): Promise<Character[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM Characters WHERE userId = ? AND synced = 0 AND deleted = 0',
    [userId]
  );

  return results.map((char) => ({
    ...char,
    traits: safeJsonParse(char.traits, []),
    synced: char.synced === 1,
    deleted: char.deleted === 1,
  })) as Character[];
};

/**
 * Mark character as synced
 */
export const markCharacterSynced = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('UPDATE Characters SET synced = 1 WHERE id = ?', [id]);
};

/**
 * Get multiple characters by IDs (batch query for sync performance)
 * Returns a Map for O(1) lookup
 */
export const getCharactersByIds = async (ids: string[]): Promise<Map<string, Character>> => {
  if (ids.length === 0) {
    return new Map();
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  const results = await db.getAllAsync<any>(
    `SELECT * FROM Characters WHERE id IN (${placeholders}) AND deleted = 0`,
    ids
  );

  const charactersMap = new Map<string, Character>();
  results.forEach((char) => {
    charactersMap.set(char.id, {
      ...char,
      traits: safeJsonParse(char.traits, []),
      synced: char.synced === 1,
      deleted: char.deleted === 1,
    } as Character);
  });

  return charactersMap;
};
