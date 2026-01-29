/**
 * Unit tests for StoryShare entity CRUD operations
 */
import {
  createStoryShare,
  getStoryShare,
  getSharesForStory,
  getSharesForUser,
  getSharesByOwner,
  getStoryPermission,
  getShareByStoryAndUser,
  updateStoryShare,
  deleteStoryShare,
  deleteSharesForStory,
  deleteShareByStoryAndUser,
  getUnsyncedShares,
  markStoryShareSynced,
} from '../storyShares';
import type { StoryShareCreateInput, StoryShareUpdateInput } from '../../../types';

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
  generateId: jest.fn(() => 'share-generated-id'),
}));

const baseCreateInput: StoryShareCreateInput & { id?: string; synced?: boolean } = {
  storyId: 'story-1',
  ownerId: 'user-1',
  sharedWithUserId: 'user-2',
  sharedWithEmail: 'user2@example.com',
  permission: 'read-write',
  sharedByUserId: 'user-1',
};

const baseShareRow = {
  id: 'share-1',
  storyId: 'story-1',
  ownerId: 'user-1',
  sharedWithUserId: 'user-2',
  sharedWithEmail: 'user2@example.com',
  permission: 'read-write',
  sharedByUserId: 'user-1',
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
};

describe('StoryShare CRUD operations', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createStoryShare', () => {
    it('should create a share and return it', async () => {
      const result = await createStoryShare(baseCreateInput);
      expect(result).toMatchObject({
        id: 'share-generated-id',
        storyId: 'story-1',
        ownerId: 'user-1',
        sharedWithUserId: 'user-2',
        sharedWithEmail: 'user2@example.com',
        permission: 'read-write',
        sharedByUserId: 'user-1',
        synced: false,
      });
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO StoryShares'),
        expect.any(Array)
      );
    });

    it('should use provided id when given', async () => {
      const result = await createStoryShare({ ...baseCreateInput, id: 'custom-share-id' });
      expect(result.id).toBe('custom-share-id');
    });
  });

  describe('getStoryShare', () => {
    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getStoryShare('missing');
      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryShares WHERE id = ?',
        ['missing']
      );
    });

    it('should return share with boolean synced', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ ...baseShareRow, synced: 1 });
      const result = await getStoryShare('share-1');
      expect(result).not.toBeNull();
      expect(result!.synced).toBe(true);
    });
  });

  describe('getSharesForStory', () => {
    it('should return shares for story', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseShareRow]);
      const result = await getSharesForStory('story-1');
      expect(result).toHaveLength(1);
      expect(result[0].permission).toBe('read-write');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryShares WHERE storyId = ? ORDER BY createdAt DESC',
        ['story-1']
      );
    });
  });

  describe('getSharesForUser', () => {
    it('should return shares where user is sharedWithUserId', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseShareRow]);
      const result = await getSharesForUser('user-2');
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryShares WHERE sharedWithUserId = ? ORDER BY createdAt DESC',
        ['user-2']
      );
    });
  });

  describe('getSharesByOwner', () => {
    it('should return shares where user is owner', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseShareRow]);
      const result = await getSharesByOwner('user-1');
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryShares WHERE ownerId = ? ORDER BY createdAt DESC',
        ['user-1']
      );
    });
  });

  describe('getStoryPermission', () => {
    it('should return owner when user owns story', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce({ userId: 'user-1' });
      const result = await getStoryPermission('user-1', 'story-1');
      expect(result).toBe('owner');
      expect(mockGetFirstAsync).toHaveBeenNthCalledWith(
        1,
        'SELECT userId FROM Stories WHERE id = ?',
        ['story-1']
      );
    });

    it('should return read-write when share has read-write', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ permission: 'read-write' });
      const result = await getStoryPermission('user-2', 'story-1');
      expect(result).toBe('read-write');
    });

    it('should return read when share has read', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ permission: 'read' });
      const result = await getStoryPermission('user-2', 'story-1');
      expect(result).toBe('read');
    });

    it('should return null when no ownership and no share', async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      const result = await getStoryPermission('user-3', 'story-1');
      expect(result).toBeNull();
    });
  });

  describe('getShareByStoryAndUser', () => {
    it('should return share for story and user', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(baseShareRow);
      const result = await getShareByStoryAndUser('story-1', 'user-2');
      expect(result).not.toBeNull();
      expect(result!.sharedWithUserId).toBe('user-2');
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryShares WHERE storyId = ? AND sharedWithUserId = ?',
        ['story-1', 'user-2']
      );
    });

    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getShareByStoryAndUser('story-1', 'user-3');
      expect(result).toBeNull();
    });
  });

  describe('updateStoryShare', () => {
    it('should update and return share', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseShareRow, permission: 'read' });
      const result = await updateStoryShare('share-1', { permission: 'read' });
      expect(result).not.toBeNull();
      expect(result!.permission).toBe('read');
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('should mark unsynced by default', async () => {
      mockGetFirstAsync.mockResolvedValue(baseShareRow);
      await updateStoryShare('share-1', { permission: 'read' });
      expect(mockRunAsync.mock.calls[0][0]).toContain('synced = ?');
    });

    it('should mark synced when markSynced option true', async () => {
      mockGetFirstAsync.mockResolvedValue(baseShareRow);
      await updateStoryShare('share-1', { permission: 'read' }, { markSynced: true });
      const [, params] = mockRunAsync.mock.calls[0];
      expect(params).toContain(1);
    });

    it('should return current share when no updates and no useRemoteUpdatedAt', async () => {
      mockGetFirstAsync.mockResolvedValue(baseShareRow);
      const result = await updateStoryShare('share-1', {});
      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });
  });

  describe('deleteStoryShare', () => {
    it('should hard-delete share', async () => {
      await deleteStoryShare('share-1');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM StoryShares WHERE id = ?', [
        'share-1',
      ]);
    });
  });

  describe('deleteSharesForStory', () => {
    it('should delete all shares for story', async () => {
      await deleteSharesForStory('story-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM StoryShares WHERE storyId = ?',
        ['story-1']
      );
    });
  });

  describe('deleteShareByStoryAndUser', () => {
    it('should delete share by story and user', async () => {
      await deleteShareByStoryAndUser('story-1', 'user-2');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'DELETE FROM StoryShares WHERE storyId = ? AND sharedWithUserId = ?',
        ['story-1', 'user-2']
      );
    });
  });

  describe('getUnsyncedShares', () => {
    it('should return shares where synced = 0', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseShareRow]);
      const result = await getUnsyncedShares();
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryShares WHERE synced = 0 ORDER BY createdAt ASC'
      );
    });
  });

  describe('markStoryShareSynced', () => {
    it('should set synced = 1', async () => {
      await markStoryShareSynced('share-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE StoryShares SET synced = 1 WHERE id = ?',
        ['share-1']
      );
    });
  });
});
