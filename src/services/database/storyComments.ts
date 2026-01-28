/**
 * StoryComments CRUD operations
 * Comments are soft-deleted (deleted=1) and removed locally after successful sync.
 */
import { getDb } from './sqlite';
import type { StoryComment, StoryCommentCreateInput, StoryCommentUpdateInput } from '../../types';
import { generateId, getCurrentTimestamp } from '../../utils/helpers';

function recordToStoryComment(row: any): StoryComment {
  return {
    id: row.id,
    storyId: row.storyId,
    authorId: row.authorId,
    authorEmail: row.authorEmail,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    synced: row.synced === 1,
    deleted: row.deleted === 1,
  };
}

/**
 * Create a new story comment
 */
export const createStoryComment = async (
  comment: StoryCommentCreateInput & { id?: string; synced?: boolean; deleted?: boolean; createdAt?: number; updatedAt?: number }
): Promise<StoryComment> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = comment.id ?? generateId();

  const createdAt = comment.createdAt ?? now;
  const updatedAt = comment.updatedAt ?? now;

  const newComment: StoryComment = {
    id,
    storyId: comment.storyId,
    authorId: comment.authorId,
    authorEmail: comment.authorEmail,
    content: comment.content,
    createdAt,
    updatedAt,
    synced: comment.synced ?? false,
    deleted: comment.deleted ?? false,
  };

  await db.runAsync(
    `INSERT INTO StoryComments (
      id, storyId, authorId, authorEmail, content, createdAt, updatedAt, synced, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newComment.id,
      newComment.storyId,
      newComment.authorId,
      newComment.authorEmail,
      newComment.content,
      newComment.createdAt,
      newComment.updatedAt,
      newComment.synced ? 1 : 0,
      newComment.deleted ? 1 : 0,
    ]
  );

  return newComment;
};

/**
 * Get a story comment by ID (non-deleted only)
 */
export const getStoryComment = async (id: string): Promise<StoryComment | null> => {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM StoryComments WHERE id = ? AND deleted = 0',
    [id]
  );
  return row ? recordToStoryComment(row) : null;
};

/**
 * Get all comments for a story (non-deleted only), newest first
 */
export const getCommentsForStory = async (storyId: string): Promise<StoryComment[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM StoryComments WHERE storyId = ? AND deleted = 0 ORDER BY createdAt DESC',
    [storyId]
  );
  return rows.map(recordToStoryComment);
};

/**
 * Get all comments for a story (including deleted), newest first.
 * Used for sync reconciliation.
 */
export const getAllCommentsForStory = async (storyId: string): Promise<StoryComment[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM StoryComments WHERE storyId = ? ORDER BY createdAt DESC',
    [storyId]
  );
  return rows.map(recordToStoryComment);
};

/**
 * Get unsynced comments (includes deleted=1 so deletions get synced)
 */
export const getUnsyncedComments = async (): Promise<StoryComment[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM StoryComments WHERE synced = 0 ORDER BY createdAt ASC'
  );
  return rows.map(recordToStoryComment);
};

/**
 * Update a story comment
 */
export const updateStoryComment = async (
  id: string,
  updates: StoryCommentUpdateInput,
  options?: { preserveSync?: boolean; useRemoteUpdatedAt?: number }
): Promise<StoryComment | null> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'id' || key === 'storyId' || key === 'authorId' || key === 'authorEmail' || key === 'createdAt') return;

    fields.push(`${key} = ?`);
    if (key === 'synced' || key === 'deleted') {
      values.push(value ? 1 : 0);
    } else {
      values.push(value);
    }
  });

  if (fields.length === 0 && !options?.useRemoteUpdatedAt) {
    return getStoryComment(id);
  }

  if (!options?.preserveSync) {
    fields.push('synced = ?');
    values.push(0);
  }

  fields.push('updatedAt = ?');
  values.push(options?.useRemoteUpdatedAt ?? now);
  values.push(id);

  await db.runAsync(`UPDATE StoryComments SET ${fields.join(', ')} WHERE id = ?`, values);
  return getStoryComment(id);
};

/**
 * Soft delete a comment (mark deleted + unsynced)
 */
export const deleteStoryComment = async (id: string): Promise<void> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  await db.runAsync(
    'UPDATE StoryComments SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
    [now, id]
  );
};

/**
 * Mark comment as synced. If it is deleted, hard-delete it locally.
 */
export const markStoryCommentSynced = async (id: string): Promise<void> => {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT deleted FROM StoryComments WHERE id = ?', [id]);
  if (row?.deleted === 1) {
    await db.runAsync('DELETE FROM StoryComments WHERE id = ?', [id]);
    return;
  }
  await db.runAsync('UPDATE StoryComments SET synced = 1 WHERE id = ?', [id]);
};

