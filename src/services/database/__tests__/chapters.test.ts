/**
 * Unit tests for Chapter entity CRUD operations
 */
import {
  createChapter,
  getChapter,
  getChaptersByStory,
  updateChapter,
  deleteChapter,
  reorderChapters,
  softDeleteChapter,
  getUnsyncedChapters,
  markChapterSynced,
  getChaptersByIds,
} from '../chapters';
import type { ChapterCreateInput, ChapterUpdateInput } from '../../../types';

const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockWithTransactionAsync = jest.fn();

jest.mock('../sqlite', () => ({
  getDb: jest.fn(() =>
    Promise.resolve({
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
      withTransactionAsync: mockWithTransactionAsync,
    })
  ),
}));

jest.mock('../../../utils/helpers', () => ({
  getCurrentTimestamp: jest.fn(() => 1000),
  generateId: jest.fn(() => 'chapter-generated-id'),
}));

jest.mock('../../../utils/permissions', () => ({
  canEditEntity: jest.fn(() => Promise.resolve(true)),
}));

const baseCreateInput: ChapterCreateInput & { userId: string; storyId: string } = {
  userId: 'user-1',
  storyId: 'story-1',
  title: 'Chapter One',
  description: 'The beginning',
  order: 1,
  importance: 10,
};

const baseChapterRow = {
  id: 'chapter-1',
  userId: 'user-1',
  storyId: 'story-1',
  title: 'Chapter One',
  description: 'The beginning',
  order: 1,
  importance: 10,
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
  deleted: 0,
};

describe('Chapter CRUD operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWithTransactionAsync.mockImplementation(async (fn: (db: unknown) => Promise<void>) => {
      const mockDb = {
        runAsync: mockRunAsync,
        getFirstAsync: mockGetFirstAsync,
        getAllAsync: mockGetAllAsync,
        withTransactionAsync: mockWithTransactionAsync,
      };
      await fn(mockDb);
    });
  });

  describe('createChapter', () => {
    it('should create a chapter with explicit order and return it', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // no conflicting chapter
        .mockResolvedValueOnce({ ...baseChapterRow, id: 'chapter-generated-id' }); // getChapter
      const result = await createChapter(baseCreateInput);
      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Chapter One');
      expect(result!.order).toBe(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Chapters'),
        expect.any(Array)
      );
    });

    it('should auto-assign order when order undefined', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseChapterRow,
        id: 'chapter-generated-id',
        order: 1,
      });
      const { order, ...inputWithoutOrder } = baseCreateInput;
      const result = await createChapter(inputWithoutOrder as typeof baseCreateInput);
      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result!.order).toBe(1);
    });

    it('should use provided id when given', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null) // no conflicting chapter
        .mockResolvedValueOnce({ ...baseChapterRow, id: 'custom-chapter-id' }); // getChapter
      const result = await createChapter({ ...baseCreateInput, id: 'custom-chapter-id' });
      expect(result).not.toBeNull();
      expect(result!.id).toBe('custom-chapter-id');
    });
  });

  describe('getChapter', () => {
    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getChapter('missing');
      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Chapters WHERE id = ? AND deleted = 0',
        ['missing']
      );
    });

    it('should return chapter with boolean synced/deleted', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ ...baseChapterRow, synced: 1, deleted: 0 });
      const result = await getChapter('chapter-1');
      expect(result).not.toBeNull();
      expect(result!.synced).toBe(true);
      expect(result!.deleted).toBe(false);
    });
  });

  describe('getChaptersByStory', () => {
    it('should return chapters for story', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseChapterRow]);
      const result = await getChaptersByStory('story-1');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Chapter One');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE storyId = ? AND deleted = 0'),
        ['story-1']
      );
    });
  });

  describe('updateChapter', () => {
    it('should update and return chapter', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseChapterRow, title: 'Updated Chapter' });
      const result = await updateChapter('chapter-1', { title: 'Updated Chapter' });
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated Chapter');
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('should quote order in UPDATE when updating order', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseChapterRow, order: 2 });
      await updateChapter('chapter-1', { order: 2 });
      expect(mockRunAsync.mock.calls[0][0]).toContain('"order"');
    });

    it('should mark unsynced by default', async () => {
      mockGetFirstAsync.mockResolvedValue(baseChapterRow);
      await updateChapter('chapter-1', { title: 'New' });
      expect(mockRunAsync.mock.calls[0][0]).toContain('synced = ?');
    });

    it('should return current chapter when updates empty', async () => {
      mockGetFirstAsync.mockResolvedValue(baseChapterRow);
      const result = await updateChapter('chapter-1', {});
      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should check permissions when userId provided', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseChapterRow);
      await expect(
        updateChapter('chapter-1', { title: 'New' }, { userId: 'other-user' })
      ).rejects.toThrow('You do not have permission to edit this chapter');
    });
  });

  describe('reorderChapters', () => {
    it('should run reorder in transaction with temp then final order', async () => {
      await reorderChapters('story-1', [
        { id: 'ch-1', order: 2 },
        { id: 'ch-2', order: 1 },
      ]);
      expect(mockWithTransactionAsync).toHaveBeenCalled();
      expect(mockRunAsync).toHaveBeenCalled();
      const updateCalls = mockRunAsync.mock.calls.filter(
        (c: [string, unknown]) => c[0].includes('UPDATE Chapters')
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deleteChapter', () => {
    it('should soft-delete chapter', async () => {
      await deleteChapter('chapter-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE Chapters SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
        expect.arrayContaining([expect.any(Number), 'chapter-1'])
      );
    });

    it('should throw when userId provided and no permission', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseChapterRow);
      await expect(deleteChapter('chapter-1', 'other-user')).rejects.toThrow(
        'You do not have permission to delete this chapter'
      );
    });
  });

  describe('softDeleteChapter', () => {
    it('should set deleted = 1 and unique negative order', async () => {
      await softDeleteChapter('chapter-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Chapters SET deleted = 1'),
        expect.any(Array)
      );
      expect(mockRunAsync.mock.calls[0][0]).toContain('"order"');
    });
  });

  describe('getUnsyncedChapters', () => {
    it('should return chapters where synced = 0', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseChapterRow]);
      const result = await getUnsyncedChapters('user-1');
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM Chapters WHERE userId = ? AND synced = 0',
        ['user-1']
      );
    });
  });

  describe('markChapterSynced', () => {
    it('should set synced = 1', async () => {
      await markChapterSynced('chapter-1');
      expect(mockRunAsync).toHaveBeenCalledWith('UPDATE Chapters SET synced = 1 WHERE id = ?', [
        'chapter-1',
      ]);
    });
  });

  describe('getChaptersByIds', () => {
    it('should return empty map for empty ids', async () => {
      const result = await getChaptersByIds([]);
      expect(result.size).toBe(0);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });

    it('should return map of chapters by id', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseChapterRow]);
      const result = await getChaptersByIds(['chapter-1']);
      expect(result.size).toBe(1);
      expect(result.get('chapter-1')?.title).toBe('Chapter One');
    });
  });
});
