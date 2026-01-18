/**
 * StoryShares CRUD operations
 * Handles story sharing permissions between users
 */
import { getDb } from './sqlite';
import { StoryShare, StoryShareCreateInput, StoryShareUpdateInput, StoryPermission } from '../../types';
import { getCurrentTimestamp, generateId } from '../../utils/helpers';

/**
 * Create a new story share
 */
export const createStoryShare = async (
  share: StoryShareCreateInput
): Promise<StoryShare> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = share.id ?? generateId();

  const newShare: StoryShare = {
    id,
    storyId: share.storyId,
    ownerId: share.ownerId,
    sharedWithUserId: share.sharedWithUserId,
    sharedWithEmail: share.sharedWithEmail,
    permission: share.permission,
    sharedByUserId: share.sharedByUserId,
    createdAt: now,
    updatedAt: now,
    synced: share.synced ?? false,
  };

  await db.runAsync(
    `INSERT INTO StoryShares (
      id, storyId, ownerId, sharedWithUserId, sharedWithEmail, permission,
      sharedByUserId, createdAt, updatedAt, synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newShare.id,
      newShare.storyId,
      newShare.ownerId,
      newShare.sharedWithUserId,
      newShare.sharedWithEmail,
      newShare.permission,
      newShare.sharedByUserId,
      newShare.createdAt,
      newShare.updatedAt,
      newShare.synced ? 1 : 0,
    ]
  );

  return newShare;
};

/**
 * Get a story share by ID
 */
export const getStoryShare = async (id: string): Promise<StoryShare | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM StoryShares WHERE id = ?',
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    synced: result.synced === 1,
  } as StoryShare;
};

/**
 * Get all shares for a story
 */
export const getSharesForStory = async (storyId: string): Promise<StoryShare[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM StoryShares WHERE storyId = ? ORDER BY createdAt DESC',
    [storyId]
  );

  return results.map((result) => ({
    ...result,
    synced: result.synced === 1,
  })) as StoryShare[];
};

/**
 * Get all shares for a user (stories shared WITH the user)
 */
export const getSharesForUser = async (userId: string): Promise<StoryShare[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM StoryShares WHERE sharedWithUserId = ? ORDER BY createdAt DESC',
    [userId]
  );

  return results.map((result) => ({
    ...result,
    synced: result.synced === 1,
  })) as StoryShare[];
};

/**
 * Get story permission for a user
 * Returns 'owner', 'read-write', 'read', or null
 */
export const getStoryPermission = async (
  userId: string,
  storyId: string
): Promise<StoryPermission> => {
  const db = await getDb();

  // First check if user owns the story
  const story = await db.getFirstAsync<any>(
    'SELECT userId FROM Stories WHERE id = ?',
    [storyId]
  );

  if (story && story.userId === userId) {
    return 'owner';
  }

  // Check if story is shared with user
  const share = await db.getFirstAsync<any>(
    'SELECT permission FROM StoryShares WHERE storyId = ? AND sharedWithUserId = ?',
    [storyId, userId]
  );

  if (!share) {
    return null;
  }

  return share.permission === 'read-write' ? 'read-write' : 'read';
};

/**
 * Get share by story and user
 */
export const getShareByStoryAndUser = async (
  storyId: string,
  userId: string
): Promise<StoryShare | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM StoryShares WHERE storyId = ? AND sharedWithUserId = ?',
    [storyId, userId]
  );

  if (!result) return null;

  return {
    ...result,
    synced: result.synced === 1,
  } as StoryShare;
};

/**
 * Update a story share
 */
export const updateStoryShare = async (
  id: string,
  updates: StoryShareUpdateInput
): Promise<StoryShare | null> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  // Build dynamic update query
  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'storyId' && key !== 'ownerId' && 
        key !== 'sharedWithUserId' && key !== 'sharedWithEmail' && key !== 'createdAt') {
      fields.push(`${key} = ?`);
      if (key === 'synced') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
  });

  if (fields.length === 0) {
    return getStoryShare(id);
  }

  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE StoryShares SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getStoryShare(id);
};

/**
 * Delete a story share
 */
export const deleteStoryShare = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM StoryShares WHERE id = ?', [id]);
};

/**
 * Delete all shares for a story
 * Used when a story is deleted
 */
export const deleteSharesForStory = async (storyId: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('DELETE FROM StoryShares WHERE storyId = ?', [storyId]);
};

/**
 * Delete share by story and user
 */
export const deleteShareByStoryAndUser = async (
  storyId: string,
  userId: string
): Promise<void> => {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM StoryShares WHERE storyId = ? AND sharedWithUserId = ?',
    [storyId, userId]
  );
};

/**
 * Get all unsynced shares
 */
export const getUnsyncedShares = async (): Promise<StoryShare[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM StoryShares WHERE synced = 0 ORDER BY createdAt ASC'
  );

  return results.map((result) => ({
    ...result,
    synced: result.synced === 1,
  })) as StoryShare[];
};

/**
 * Mark story share as synced
 */
export const markStoryShareSynced = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('UPDATE StoryShares SET synced = 1 WHERE id = ?', [id]);
};
