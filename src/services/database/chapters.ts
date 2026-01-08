/**
 * Chapters CRUD operations
 */
import { getDb } from './sqlite';
import { Chapter, ChapterCreateInput, ChapterUpdateInput } from '../../types';
import { getCurrentTimestamp, generateId } from '../../utils/helpers';

/**
 * Create a new chapter
 */
export const createChapter = async (
  chapter: ChapterCreateInput & { userId: string; storyId: string }
): Promise<Chapter> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  const id = generateId();

  // If order not provided, get the next order number
  let order = chapter.order;
  if (order === undefined) {
    const maxOrder = await db.getFirstAsync<{ maxOrder: number }>(
      'SELECT MAX("order") as maxOrder FROM Chapters WHERE storyId = ?',
      [chapter.storyId]
    );
    order = (maxOrder?.maxOrder || 0) + 1;
  }

  const newChapter: Chapter = {
    id,
    userId: chapter.userId,
    storyId: chapter.storyId,
    title: chapter.title,
    description: chapter.description,
    order,
    importance: chapter.importance,
    createdAt: now,
    updatedAt: now,
    synced: false,
    deleted: false,
  };

  await db.runAsync(
    `INSERT INTO Chapters (
      id, userId, storyId, title, description, "order",
      importance, createdAt, updatedAt, synced, deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      newChapter.id,
      newChapter.userId,
      newChapter.storyId,
      newChapter.title,
      newChapter.description,
      newChapter.order,
      newChapter.importance,
      newChapter.createdAt,
      newChapter.updatedAt,
      newChapter.synced ? 1 : 0,
      newChapter.deleted ? 1 : 0,
    ]
  );

  return newChapter;
};

/**
 * Get a chapter by ID
 */
export const getChapter = async (id: string): Promise<Chapter | null> => {
  const db = await getDb();
  const result = await db.getFirstAsync<Chapter>(
    'SELECT * FROM Chapters WHERE id = ? AND deleted = 0',
    [id]
  );

  if (!result) return null;

  return {
    ...result,
    synced: !!result.synced,
    deleted: !!result.deleted,
  } as Chapter;
}

/**
 * Get all chapters for a story (ordered by order field)
 */
export const getChaptersByStory = async (
  storyId: string,
  sortBy: 'importance' | 'createdAt' = 'createdAt',
  order: 'ASC' | 'DESC' = 'ASC'
): Promise<Chapter[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<Chapter>(
    `SELECT * FROM Chapters 
     WHERE storyId = ? AND deleted = 0 
     ORDER BY ${sortBy} ${order}`,
    [storyId]
  );

  return results.map((chapter) => ({
    ...chapter,
    synced: !!chapter.synced,
    deleted: !!chapter.deleted ,
  })) as Chapter[];
};

/**
 * Update a chapter
 */
export const updateChapter = async (
  id: string,
  updates: ChapterUpdateInput
): Promise<Chapter | null> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  const fields: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && key !== 'userId' && key !== 'storyId') {
      // Handle "order" as a reserved keyword
      const fieldName = key === 'order' ? '"order"' : key;
      fields.push(`${fieldName} = ?`);
      values.push(value);
    }
  });

  if (fields.length === 0) {
    return getChapter(id);
  }

  fields.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  await db.runAsync(
    `UPDATE Chapters SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getChapter(id);
};

/**
 * Reorder chapters for a story
 */
export const reorderChapters = async (
  storyId: string,
  chapterOrders: Array<{ id: string; order: number }>
): Promise<void> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  await db.withTransactionAsync(async () => {
    for (const { id, order } of chapterOrders) {
      await db.runAsync(
        'UPDATE Chapters SET "order" = ?, updatedAt = ? WHERE id = ?',
        [order, now, id]
      );
    }
  });
};

/**
 * Delete a chapter (soft delete)
 */
export const deleteChapter = async (id: string): Promise<void> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  await db.runAsync(
    'UPDATE Chapters SET deleted = 1, updatedAt = ? WHERE id = ?',
    [now, id]
  );
};

/**
 * Get unsynced chapters
 */
export const getUnsyncedChapters = async (userId: string): Promise<Chapter[]> => {
  const db = await getDb();
  const results = await db.getAllAsync<Chapter>(
    'SELECT * FROM Chapters WHERE userId = ? AND synced = 0 AND deleted = 0',
    [userId]
  );

  return results.map((chapter) => ({
    ...chapter,
    synced: !!chapter.synced,
    deleted: !!chapter.deleted,
  })) as Chapter[];
};

/**
 * Mark chapter as synced
 */
export const markChapterSynced = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.runAsync('UPDATE Chapters SET synced = 1 WHERE id = ?', [id]);
};
