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
  const id = chapter.id ?? generateId();

  // If order not provided, find the lowest available (vacant) order number
  // If order is provided and conflicts, shift existing chapters to make room
  let order = chapter.order;
  
  await db.withTransactionAsync(async () => {
    if (order === undefined) {
      // Auto-assign: find the lowest available order number
      // Get all existing orders for this story where order > 0
      // Note: Deleted chapters have negative order values, so they're excluded and their gaps are available
      const allOrders = await db.getAllAsync<{ order: number }>(
        'SELECT "order" FROM Chapters WHERE storyId = ? AND "order" > 0 ORDER BY "order" ASC',
        [chapter.storyId]
      );
      
      // Get active (non-deleted) orders to find gaps
      const activeOrders = await db.getAllAsync<{ order: number }>(
        'SELECT "order" FROM Chapters WHERE storyId = ? AND deleted = 0 AND "order" > 0 ORDER BY "order" ASC',
        [chapter.storyId]
      );
      
      const allOrderSet = new Set(allOrders.map((row) => row.order));
      const activeOrderNumbers = activeOrders.map((row) => row.order).sort((a, b) => a - b);
      
      // Find the lowest available order number, filling gaps first
      let nextOrder = 1;
      
      // First, try to fill gaps in active chapters
      for (const activeOrder of activeOrderNumbers) {
        if (activeOrder === nextOrder) {
          nextOrder++;
        } else if (activeOrder > nextOrder) {
          // Found a gap - verify it's not taken by a deleted chapter
          // (Deleted chapters have negative order values, so they won't be in allOrderSet)
          if (!allOrderSet.has(nextOrder)) {
            // This gap is available!
            break;
          }
          // Gap is taken (shouldn't happen since deleted chapters have negative order values), continue searching
          nextOrder = activeOrder + 1;
        }
      }
      
      // If no gap found, find the next available number after the highest existing order
      while (allOrderSet.has(nextOrder)) {
        nextOrder++;
      }
      
      order = nextOrder;
    } else {
      // Order is specified - check if it conflicts and shift existing chapters if needed
      const conflictingChapter = await db.getFirstAsync<{ id: string; order: number }>(
        'SELECT id, "order" FROM Chapters WHERE storyId = ? AND deleted = 0 AND "order" = ?',
        [chapter.storyId, order]
      );
      
      if (conflictingChapter) {
        // Shift all chapters with order >= specified order by +1
        // Use temporary negative values to avoid UNIQUE constraint violations
        const chaptersToShift = await db.getAllAsync<{ id: string; order: number }>(
          'SELECT id, "order" FROM Chapters WHERE storyId = ? AND deleted = 0 AND "order" >= ? ORDER BY "order" DESC',
          [chapter.storyId, order]
        );
        
        // Phase 1: Set all affected chapters to temporary negative order values
        for (let i = 0; i < chaptersToShift.length; i++) {
          const { id } = chaptersToShift[i];
          const tempOrder = -(i + 1);
          await db.runAsync(
            'UPDATE Chapters SET "order" = ?, updatedAt = ? WHERE id = ? AND storyId = ?',
            [tempOrder, now, id, chapter.storyId]
          );
        }
        
        // Phase 2: Set all chapters to their final order values (shifted by +1)
        for (const { id, order: currentOrder } of chaptersToShift) {
          await db.runAsync(
            'UPDATE Chapters SET "order" = ?, updatedAt = ? WHERE id = ? AND storyId = ?',
            [currentOrder + 1, now, id, chapter.storyId]
          );
        }
      }
    }

    // Insert the new chapter
    const newChapter: Chapter = {
      id,
      userId: chapter.userId,
      storyId: chapter.storyId,
      title: chapter.title,
      description: chapter.description,
      order: order!,
      importance: chapter.importance,
      createdAt: now,
      updatedAt: now,
      synced: chapter.synced ?? false,
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
  });

  // Return the created chapter (it should exist since we just created it)
  const createdChapter = await getChapter(id);
  if (!createdChapter) {
    throw new Error('Failed to retrieve created chapter');
  }
  return createdChapter;
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

  // Mark as unsynced when updated
  fields.push('synced = ?');
  values.push(0);
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
 * Uses temporary negative order values to avoid UNIQUE constraint violations
 */
export const reorderChapters = async (
  storyId: string,
  chapterOrders: Array<{ id: string; order: number }>
): Promise<void> => {
  const db = await getDb();
  const now = getCurrentTimestamp();

  await db.withTransactionAsync(async () => {
    // Phase 1: Set all affected chapters to temporary negative order values
    // This avoids UNIQUE constraint violations when swapping orders
    for (let i = 0; i < chapterOrders.length; i++) {
      const { id } = chapterOrders[i];
      const tempOrder = -(i + 1); // Use negative values as temporary orders
      await db.runAsync(
        'UPDATE Chapters SET "order" = ?, updatedAt = ? WHERE id = ? AND storyId = ?',
        [tempOrder, now, id, storyId]
      );
    }

    // Phase 2: Set all chapters to their final order values
    for (const { id, order } of chapterOrders) {
      await db.runAsync(
        'UPDATE Chapters SET "order" = ?, updatedAt = ? WHERE id = ? AND storyId = ?',
        [order, now, id, storyId]
      );
    }
  });
};

/**
 * Delete a chapter (soft delete)
 * Sets order to a unique negative value to free up the order number for reuse
 * Uses a hash of the chapter ID to ensure uniqueness even with the old UNIQUE constraint
 */
export const deleteChapter = async (id: string): Promise<void> => {
  const db = await getDb();
  const now = getCurrentTimestamp();
  
  // Generate a unique negative order value based on the chapter ID
  // This ensures no conflicts with the UNIQUE constraint, even for existing databases
  // We use a simple hash of the ID converted to a negative number
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to negative and ensure it's unique by using a large range
  // Use negative of absolute value to ensure it's always negative
  const uniqueNegativeOrder = -(Math.abs(hash) % 1000000 + 1); // Range: -1 to -1000000
  
  await db.runAsync(
    'UPDATE Chapters SET deleted = 1, "order" = ?, updatedAt = ? WHERE id = ?',
    [uniqueNegativeOrder, now, id]
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
