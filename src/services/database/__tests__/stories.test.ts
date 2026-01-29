/**
 * Unit tests for Story entity CRUD operations
 */
import {
  createStory,
  getStory,
  getAllStories,
  updateStory,
  deleteStory,
  getUnsyncedStories,
  markStorySynced,
  getStoryWithPermission,
} from '../stories';
import type { StoryCreateInput, StoryUpdateInput } from '../../../types';

// Mock dependencies before importing the module under test
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
  generateId: jest.fn(() => 'generated-id-123'),
}));

jest.mock('../storyShares', () => ({
  getStoryPermission: jest.fn(() => Promise.resolve('owner')),
}));

jest.mock('../../sync/syncManager', () => ({
  syncManager: { triggerSyncOnEntityChange: jest.fn() },
}));

const baseCreateInput: StoryCreateInput & { userId: string } = {
  userId: 'user-1',
  title: 'Test Story',
  description: 'A test description',
  length: 'short-story',
  theme: 'fantasy',
  tone: 'light',
  pov: 'third-person-limited',
  targetAudience: 'young-adult',
  setting: 'Medieval kingdom',
  timePeriod: 'Middle Ages',
  status: 'draft',
};

const baseStoryRow = {
  id: 'story-1',
  userId: 'user-1',
  title: 'Test Story',
  description: 'A test description',
  length: 'short-story',
  theme: 'fantasy',
  tone: 'light',
  pov: 'third-person-limited',
  targetAudience: 'young-adult',
  setting: 'Medieval kingdom',
  timePeriod: 'Middle Ages',
  status: 'draft',
  generatedContent: null,
  generatedAt: null,
  wordCount: null,
  cutOffChunks: null,
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
  deleted: 0,
};

describe('Story CRUD operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStory', () => {
    it('should create a story with required fields and return the new story', async () => {
      const result = await createStory(baseCreateInput);

      expect(result).toMatchObject({
        id: 'generated-id-123',
        userId: 'user-1',
        title: 'Test Story',
        description: 'A test description',
        length: 'short-story',
        theme: 'fantasy',
        tone: 'light',
        pov: 'third-person-limited',
        targetAudience: 'young-adult',
        setting: 'Medieval kingdom',
        timePeriod: 'Middle Ages',
        status: 'draft',
        createdAt: 1000,
        updatedAt: 1000,
        synced: false,
        deleted: false,
      });

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      const [sql, params] = mockRunAsync.mock.calls[0];
      expect(sql).toContain('INSERT INTO Stories');
      expect(params).toContain('generated-id-123');
      expect(params).toContain('user-1');
      expect(params).toContain('Test Story');
    });

    it('should use provided id when given', async () => {
      const result = await createStory({
        ...baseCreateInput,
        id: 'custom-id-456',
      });

      expect(result.id).toBe('custom-id-456');
      expect(mockRunAsync.mock.calls[0][1][0]).toBe('custom-id-456');
    });

    it('should default status to draft when not provided', async () => {
      const { status, ...inputWithoutStatus } = baseCreateInput;
      const result = await createStory(inputWithoutStatus as typeof baseCreateInput);

      expect(result.status).toBe('draft');
    });

    it('should serialize cutOffChunks as JSON when provided', async () => {
      const result = await createStory({
        ...baseCreateInput,
        cutOffChunks: [1, 2, 3],
      });

      expect(result.cutOffChunks).toEqual([1, 2, 3]);
      const params = mockRunAsync.mock.calls[0][1];
      const cutOffChunksParam = params[15]; // cutOffChunks is 16th value (0-indexed 15)
      expect(cutOffChunksParam).toBe(JSON.stringify([1, 2, 3]));
    });
  });

  describe('getStory', () => {
    it('should return null when story does not exist', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);

      const result = await getStory('non-existent');

      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Stories WHERE id = ?',
        ['non-existent']
      );
    });

    it('should return story with deserialized cutOffChunks and boolean synced/deleted', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseStoryRow,
        cutOffChunks: JSON.stringify([1, 2]),
        synced: 1,
        deleted: 0,
      });

      const result = await getStory('story-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('story-1');
      expect(result!.cutOffChunks).toEqual([1, 2]);
      expect(result!.synced).toBe(true);
      expect(result!.deleted).toBe(false);
    });

    it('should handle invalid cutOffChunks JSON gracefully', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseStoryRow,
        cutOffChunks: 'not-valid-json',
      });

      const result = await getStory('story-1');

      expect(result!.cutOffChunks).toBeUndefined();
    });
  });

  describe('getAllStories', () => {
    it('should return owned stories for user', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ ...baseStoryRow, id: 'owned-1' }])
        .mockResolvedValueOnce([]);

      const result = await getAllStories('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('owned-1');
      expect(result[0].permission).toBe('owner');
      expect(mockGetAllAsync).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM Stories WHERE userId = ? AND deleted = 0 ORDER BY updatedAt DESC',
        ['user-1']
      );
    });

    it('should merge owned and shared stories and deduplicate by id', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([{ ...baseStoryRow, id: 'story-1', userId: 'user-1' }])
        .mockResolvedValueOnce([
          {
            ...baseStoryRow,
            id: 'shared-1',
            sharePermission: 'read-write',
            shareOwnerId: 'owner-1',
          },
        ]);

      const result = await getAllStories('user-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const owned = result.find((s) => s.id === 'story-1');
      const shared = result.find((s) => s.id === 'shared-1');
      if (owned) expect(owned.permission).toBe('owner');
      if (shared) expect(shared.permission).toBe('read-write');
    });

    it('should sort results by updatedAt descending', async () => {
      mockGetAllAsync
        .mockResolvedValueOnce([
          { ...baseStoryRow, id: 'a', updatedAt: 100 },
          { ...baseStoryRow, id: 'b', updatedAt: 200 },
        ])
        .mockResolvedValueOnce([]);

      const result = await getAllStories('user-1');

      expect(result[0].updatedAt).toBeGreaterThanOrEqual(result[1].updatedAt);
    });
  });

  describe('updateStory', () => {
    it('should update story and return updated story', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...baseStoryRow,
        id: 'story-1',
        title: 'Updated Title',
        updatedAt: 2000,
      });

      const updates: StoryUpdateInput = { title: 'Updated Title' };
      const result = await updateStory('story-1', updates);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated Title');
      expect(mockRunAsync).toHaveBeenCalled();
      const [sql] = mockRunAsync.mock.calls[0];
      expect(sql).toContain('UPDATE Stories');
      expect(sql).toContain('title = ?');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Stories WHERE id = ?',
        ['story-1']
      );
    });

    it('should mark story as unsynced by default when updating', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseStoryRow });

      await updateStory('story-1', { title: 'New Title' });

      const [sql, params] = mockRunAsync.mock.calls[0];
      expect(sql).toContain('synced = ?');
      expect(params).toContain(0);
    });

    it('should not add synced when preserveSync is true', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseStoryRow });

      await updateStory('story-1', { title: 'New Title' }, { preserveSync: true });

      const [sql] = mockRunAsync.mock.calls[0];
      expect(sql).not.toContain('synced = ?');
    });

    it('should use useRemoteUpdatedAt when provided', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...baseStoryRow,
        updatedAt: 3000,
      });

      await updateStory('story-1', { title: 'Sync' }, { useRemoteUpdatedAt: 3000 });

      const [, params] = mockRunAsync.mock.calls[0];
      expect(params).toContain(3000);
    });

    it('should return current story when updates are empty (no valid fields)', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseStoryRow });

      const result = await updateStory('story-1', {});

      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Stories WHERE id = ?',
        ['story-1']
      );
    });

    it('should serialize cutOffChunks as JSON on update', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...baseStoryRow,
        cutOffChunks: JSON.stringify([1, 2, 3]),
      });

      await updateStory('story-1', { cutOffChunks: [1, 2, 3] });

      const [, params] = mockRunAsync.mock.calls[0];
      expect(params).toContain(JSON.stringify([1, 2, 3]));
    });
  });

  describe('deleteStory', () => {
    it('should soft-delete story by setting deleted = 1', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseStoryRow, id: 'story-1' });

      await deleteStory('story-1');

      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Stories WHERE id = ?',
        ['story-1']
      );
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE Stories SET deleted = 1, updatedAt = ?, synced = 0 WHERE id = ?',
        expect.arrayContaining([expect.any(Number), 'story-1'])
      );
    });

    it('should throw when story does not exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      await expect(deleteStory('non-existent')).rejects.toThrow(
        'Story with id non-existent not found'
      );
      expect(mockRunAsync).not.toHaveBeenCalled();
    });
  });

  describe('getUnsyncedStories', () => {
    it('should return stories where synced = 0 for user', async () => {
      mockGetAllAsync.mockResolvedValueOnce([
        { ...baseStoryRow, id: 'unsynced-1', synced: 0 },
      ]);

      const result = await getUnsyncedStories('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('unsynced-1');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM Stories WHERE userId = ? AND synced = 0',
        ['user-1']
      );
    });
  });

  describe('markStorySynced', () => {
    it('should set synced = 1 for story', async () => {
      await markStorySynced('story-1');

      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE Stories SET synced = 1 WHERE id = ?',
        ['story-1']
      );
    });
  });

  describe('getStoryWithPermission', () => {
    it('should return null when story does not exist', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      const result = await getStoryWithPermission('user-1', 'non-existent');

      expect(result).toBeNull();
    });

    it('should return story with permission from getStoryPermission', async () => {
      const { getStoryPermission } = require('../storyShares');
      getStoryPermission.mockResolvedValueOnce('read-write');
      mockGetFirstAsync.mockResolvedValue({ ...baseStoryRow });

      const result = await getStoryWithPermission('user-1', 'story-1');

      expect(result).not.toBeNull();
      expect(result!.permission).toBe('read-write');
      expect(getStoryPermission).toHaveBeenCalledWith('user-1', 'story-1');
    });
  });
});
