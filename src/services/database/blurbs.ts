/**
 * Blurbs CRUD operations
 */
import { getDb } from './sqlite';
import { IdeaBlurb, BlurbCreateInput, BlurbUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId } from '../../utils/helpers';

/**
 * Create a new blurb
 */
export const createBlurb = async (
  blurb: BlurbCreateInput & { userId: string; storyId: string }
): Promise<IdeaBlurb> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = blurb.id ?? generateId();

  const newBlurb: IdeaBlurb = {
    id,
    userId: blurb.userId,
    storyId: blurb.storyId,
    title: blurb.title,
    description: blurb.description,
    category: blurb.category,
    importance: blurb.importance,
    createdAt: now,
    updatedAt: now,
    synced: blurb.synced ?? false,
    deleted: false,
  };

  await db.runAsync(
    `INSERT INTO Blurbs (
      id, userId, storyId, title, description, category,
      importance, createdAt, updatedAt, synced, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newBlurb.id,
      newBlurb.userId,
      newBlurb.storyId,
      newBlurb.title,
      newBlurb.description,
      newBlurb.category || null,
      newBlurb.importance,
      newBlurb.createdAt,
      newBlurb.updatedAt,
      newBlurb.synced ? 1 : 0,
      newBlurb.deleted ? 1 : 0,
    ]
  );

  return newBlurb;
};

/**
 * Get a blurb by ID
 */
export const getBlurb = async (id: string): Promise<IdeaBlurb | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<IdeaBlurb>(
    'SELECT * FROM Blurbs WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    synced: !!result.synced,
    deleted: !!result.deleted,
  } as IdeaBlurb;
};

/**
 * Get all blurbs for a story
 */
export const getBlurbsByStory = async (
  storyId: string,
  sortBy: 'importance' | 'createdAt' | 'category' = 'importance',
  order: 'ASC' | 'DESC' = 'DESC'
): Promise<IdeaBlurb[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<IdeaBlurb>(
    `SELECT * FROM Blurbs 
     WHERE storyId = ? AND deleted = 0 
     ORDER BY ${sortBy} ${order}`,
    [storyId]
  );

  return results.map((blurb) => ({
    ...blurb,
    synced: !!blurb.synced,
    deleted: !!blurb.deleted,
  })) as IdeaBlurb[];
};

/**
 * Update a blurb
 */
export const updateBlurb = async (
  id: string,
  updates: BlurbUpdateInput
): Promise<IdeaBlurb | null> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'storyId') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return getBlurb(id);
  }

  // Mark as unsynced when updated
  fields.push('synced = ?');
  values.push(0);
  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE Blurbs SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getBlurb(id);
};

/**
 * Delete a blurb (soft delete)
 */
export const deleteBlurb = async (id: string): Promise<void> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  await db.runAsync(
    'UPDATE Blurbs SET deleted = 1, updatedAt = ? WHERE id = ?',
    [now, id]
  );
};

/**
 * Get unsynced blurbs
 */
export const getUnsyncedBlurbs = async (userId: string): Promise<IdeaBlurb[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<IdeaBlurb>(
    'SELECT * FROM Blurbs WHERE userId = ? AND synced = 0 AND deleted = 0',
    [userId]
  );

  return results.map((blurb) => ({
    ...blurb,
    synced: !!blurb.synced,
    deleted: !!blurb.deleted,
  })) as IdeaBlurb[];
};

/**
 * Mark blurb as synced
 */
export const markBlurbSynced = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('UPDATE Blurbs SET synced = 1 WHERE id = ?', [id]);
};
