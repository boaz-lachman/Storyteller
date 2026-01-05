/**
 * Characters CRUD operations
 */
import { getDb } from './sqlite';
import { Character, CharacterCreateInput, CharacterUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId, safeJsonStringify, safeJsonParse } from '../../utils/helpers';

/**
 * Create a new character
 */
export const createCharacter = async (
  character: CharacterCreateInput & { userId: string; storyId: string }
): Promise<Character> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = generateId();

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
    synced: false,
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
  order: 'ASC' | 'DESC' = 'DESC'
): Promise<Character[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    `SELECT * FROM Characters 
     WHERE storyId = ? AND deleted = 0 
     ORDER BY ${sortBy} ${order}`,
    [storyId]
  );

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
  updates: CharacterUpdateInput
): Promise<Character | null> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'storyId') {
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

  fields.push('updatedAt = ?');
  values.push(now);
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
export const deleteCharacter = async (id: string): Promise<void> => {
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
