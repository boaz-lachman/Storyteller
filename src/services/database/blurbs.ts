/**
 * Blurbs CRUD operations
 */
import { getDb } from './sqlite';
import { IdeaBlurb, BlurbCreateInput, BlurbUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId } from '../../utils/helpers';
import { canEditEntity } from '../../utils/permissions';

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
  updates: BlurbUpdateInput,
  options?: {
    userId?: string; // Optional: if provided, will check permissions
    preserveSync?: boolean; // If true, don't mark as unsynced
    useRemoteUpdatedAt?: number; // If provided, use this timestamp instead of current time
  }
): Promise<IdeaBlurb | null> => {
  // Check permissions if userId is provided
  if (options?.userId) {
    const blurb = await getBlurb(id);
    if (!blurb) {
      throw new Error('Blurb not found');
    }
    const canEdit = await canEditEntity(options.userId, blurb);
    if (!canEdit) {
      throw new Error('You do not have permission to edit this blurb');
    }
  }

  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'storyId' && key !== 'updatedAt') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return getBlurb(id);
  }

  // Mark as unsynced when updated (unless preserveSync is true)
  if (!options?.preserveSync) {
    fields.push('synced = ?');
    values.push(0);
  }

  // Use remote updatedAt if provided, otherwise use current time
  fields.push('updatedAt = ?');
  values.push(options?.useRemoteUpdatedAt ?? now);
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
export const deleteBlurb = async (
  id: string,
  userId?: string // Optional: if provided, will check permissions
): Promise<void> => {
  // Check permissions if userId is provided
  if (userId) {
    const blurb = await getBlurb(id);
    if (!blurb) {
      throw new Error('Blurb not found');
    }
    const canDelete = await canEditEntity(userId, blurb);
    if (!canDelete) {
      throw new Error('You do not have permission to delete this blurb');
    }
  }

  const db = await getDb();
  const now = getCurrentTimestamp();
  // Mark as deleted and unsynced so it will be uploaded to Firebase
  await db.runAsync(
    'UPDATE Blurbs SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
    [now, id]
  );
};

/**
 * Get unsynced blurbs
 */
export const getUnsyncedBlurbs = async (userId: string): Promise<IdeaBlurb[]> => {
  const db = await getDb();
  // Include both non-deleted and deleted entities that are unsynced
  // This ensures deleted entities are synced to Firebase
  const results = await db.getAllAsync<IdeaBlurb>(
    'SELECT * FROM Blurbs WHERE userId = ? AND synced = 0',
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

/**
 * Get multiple blurbs by IDs (batch query for sync performance)
 * Returns a Map for O(1) lookup
 */
export const getBlurbsByIds = async (ids: string[]): Promise<Map<string, IdeaBlurb>> => {
  if (ids.length === 0) {
    return new Map();
  }

  const db = await getDb();
  const placeholders = ids.map(() => '?').join(', ');
  const results = await db.getAllAsync<IdeaBlurb>(
    `SELECT * FROM Blurbs WHERE id IN (${placeholders}) AND deleted = 0`,
    ids
  );

  const blurbsMap = new Map<string, IdeaBlurb>();
  results.forEach((blurb) => {
    blurbsMap.set(blurb.id, {
      ...blurb,
      synced: !!blurb.synced,
      deleted: !!blurb.deleted,
    } as IdeaBlurb);
  });

  return blurbsMap;
};
