/**
 * Unit tests for Blurb (IdeaBlurb) entity CRUD operations
 */
import {
  createBlurb,
  getBlurb,
  getBlurbsByStory,
  updateBlurb,
  deleteBlurb,
  getUnsyncedBlurbs,
  markBlurbSynced,
  getBlurbsByIds,
} from '../blurbs';
import type { BlurbCreateInput, BlurbUpdateInput } from '../../../types';

const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();

jest.mock('../sqlite', () => ({
  getDb: jest.fn(() =>
    Promise.resolve({
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
    })
  ),
}));

jest.mock('../../../utils/helpers', () => ({
  getCurrentTimestamp: jest.fn(() => 1000),
  generateId: jest.fn(() => 'blurb-generated-id'),
}));

jest.mock('../../../utils/permissions', () => ({
  canEditEntity: jest.fn(() => Promise.resolve(true)),
}));

const baseCreateInput: BlurbCreateInput & { userId: string; storyId: string } = {
  userId: 'user-1',
  storyId: 'story-1',
  title: 'Plot idea',
  description: 'A key plot point',
  category: 'plot-point',
  importance: 8,
};

const baseBlurbRow = {
  id: 'blurb-1',
  userId: 'user-1',
  storyId: 'story-1',
  title: 'Plot idea',
  description: 'A key plot point',
  category: 'plot-point',
  importance: 8,
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
  deleted: 0,
};

describe('Blurb CRUD operations', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createBlurb', () => {
    it('should create a blurb and return it', async () => {
      const result = await createBlurb(baseCreateInput);
      expect(result).toMatchObject({
        id: 'blurb-generated-id',
        userId: 'user-1',
        storyId: 'story-1',
        title: 'Plot idea',
        description: 'A key plot point',
        category: 'plot-point',
        importance: 8,
        deleted: false,
      });
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Blurbs'),
        expect.any(Array)
      );
    });

    it('should use provided id when given', async () => {
      const result = await createBlurb({ ...baseCreateInput, id: 'custom-blurb-id' });
      expect(result.id).toBe('custom-blurb-id');
    });
  });

  describe('getBlurb', () => {
    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getBlurb('missing');
      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Blurbs WHERE id = ? AND deleted = 0',
        ['missing']
      );
    });

    it('should return blurb with boolean synced/deleted', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ ...baseBlurbRow, synced: 1 });
      const result = await getBlurb('blurb-1');
      expect(result).not.toBeNull();
      expect(result!.synced).toBe(true);
    });
  });

  describe('getBlurbsByStory', () => {
    it('should return blurbs for story', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseBlurbRow]);
      const result = await getBlurbsByStory('story-1');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Plot idea');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE storyId = ? AND deleted = 0'),
        ['story-1']
      );
    });
  });

  describe('updateBlurb', () => {
    it('should update and return blurb', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseBlurbRow, title: 'Updated idea' });
      const result = await updateBlurb('blurb-1', { title: 'Updated idea' });
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated idea');
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('should mark unsynced by default', async () => {
      mockGetFirstAsync.mockResolvedValue(baseBlurbRow);
      await updateBlurb('blurb-1', { title: 'New' });
      expect(mockRunAsync.mock.calls[0][0]).toContain('synced = ?');
    });

    it('should return current blurb when updates empty', async () => {
      mockGetFirstAsync.mockResolvedValue(baseBlurbRow);
      const result = await updateBlurb('blurb-1', {});
      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should check permissions when userId provided', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseBlurbRow);
      await expect(
        updateBlurb('blurb-1', { title: 'New' }, { userId: 'other-user' })
      ).rejects.toThrow('You do not have permission to edit this blurb');
    });
  });

  describe('deleteBlurb', () => {
    it('should soft-delete blurb', async () => {
      await deleteBlurb('blurb-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE Blurbs SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
        expect.arrayContaining([expect.any(Number), 'blurb-1'])
      );
    });

    it('should throw when userId provided and no permission', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseBlurbRow);
      await expect(deleteBlurb('blurb-1', 'other-user')).rejects.toThrow(
        'You do not have permission to delete this blurb'
      );
    });
  });

  describe('getUnsyncedBlurbs', () => {
    it('should return blurbs where synced = 0', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseBlurbRow]);
      const result = await getUnsyncedBlurbs('user-1');
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM Blurbs WHERE userId = ? AND synced = 0',
        ['user-1']
      );
    });
  });

  describe('markBlurbSynced', () => {
    it('should set synced = 1', async () => {
      await markBlurbSynced('blurb-1');
      expect(mockRunAsync).toHaveBeenCalledWith('UPDATE Blurbs SET synced = 1 WHERE id = ?', [
        'blurb-1',
      ]);
    });
  });

  describe('getBlurbsByIds', () => {
    it('should return empty map for empty ids', async () => {
      const result = await getBlurbsByIds([]);
      expect(result.size).toBe(0);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });

    it('should return map of blurbs by id', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseBlurbRow]);
      const result = await getBlurbsByIds(['blurb-1']);
      expect(result.size).toBe(1);
      expect(result.get('blurb-1')?.title).toBe('Plot idea');
    });
  });
});
