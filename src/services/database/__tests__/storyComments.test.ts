/**
 * Unit tests for StoryComment entity CRUD operations
 */
import {
  createStoryComment,
  getStoryComment,
  getCommentsForStory,
  getAllCommentsForStory,
  getUnsyncedComments,
  updateStoryComment,
  deleteStoryComment,
  markStoryCommentSynced,
} from '../storyComments';
import type { StoryCommentCreateInput, StoryCommentUpdateInput } from '../../../types';

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
  generateId: jest.fn(() => 'comment-generated-id'),
}));

const baseCreateInput: StoryCommentCreateInput & {
  id?: string;
  synced?: boolean;
  deleted?: boolean;
  createdAt?: number;
  updatedAt?: number;
} = {
  storyId: 'story-1',
  authorId: 'user-1',
  authorEmail: 'author@example.com',
  content: 'Great scene!',
};

const baseCommentRow = {
  id: 'comment-1',
  storyId: 'story-1',
  authorId: 'user-1',
  authorEmail: 'author@example.com',
  content: 'Great scene!',
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
  deleted: 0,
};

describe('StoryComment CRUD operations', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createStoryComment', () => {
    it('should create a comment and return it', async () => {
      const result = await createStoryComment(baseCreateInput);
      expect(result).toMatchObject({
        id: 'comment-generated-id',
        storyId: 'story-1',
        authorId: 'user-1',
        authorEmail: 'author@example.com',
        content: 'Great scene!',
        synced: false,
        deleted: false,
      });
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO StoryComments'),
        expect.any(Array)
      );
    });

    it('should use provided id when given', async () => {
      const result = await createStoryComment({ ...baseCreateInput, id: 'custom-comment-id' });
      expect(result.id).toBe('custom-comment-id');
    });

    it('should use provided createdAt/updatedAt when given', async () => {
      const result = await createStoryComment({
        ...baseCreateInput,
        createdAt: 2000,
        updatedAt: 2000,
      });
      expect(result.createdAt).toBe(2000);
      expect(result.updatedAt).toBe(2000);
    });
  });

  describe('getStoryComment', () => {
    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getStoryComment('missing');
      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryComments WHERE id = ? AND deleted = 0',
        ['missing']
      );
    });

    it('should return comment with boolean synced/deleted', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ ...baseCommentRow, synced: 1, deleted: 0 });
      const result = await getStoryComment('comment-1');
      expect(result).not.toBeNull();
      expect(result!.synced).toBe(true);
      expect(result!.deleted).toBe(false);
    });
  });

  describe('getCommentsForStory', () => {
    it('should return non-deleted comments for story, newest first', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseCommentRow]);
      const result = await getCommentsForStory('story-1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Great scene!');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryComments WHERE storyId = ? AND deleted = 0 ORDER BY createdAt DESC',
        ['story-1']
      );
    });
  });

  describe('getAllCommentsForStory', () => {
    it('should return all comments including deleted', async () => {
      mockGetAllAsync.mockResolvedValueOnce([
        baseCommentRow,
        { ...baseCommentRow, id: 'comment-2', deleted: 1 },
      ]);
      const result = await getAllCommentsForStory('story-1');
      expect(result).toHaveLength(2);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryComments WHERE storyId = ? ORDER BY createdAt DESC',
        ['story-1']
      );
    });
  });

  describe('getUnsyncedComments', () => {
    it('should return comments where synced = 0', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseCommentRow]);
      const result = await getUnsyncedComments();
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM StoryComments WHERE synced = 0 ORDER BY createdAt ASC'
      );
    });
  });

  describe('updateStoryComment', () => {
    it('should update and return comment', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseCommentRow, content: 'Updated content' });
      const result = await updateStoryComment('comment-1', { content: 'Updated content' });
      expect(result).not.toBeNull();
      expect(result!.content).toBe('Updated content');
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('should mark unsynced by default', async () => {
      mockGetFirstAsync.mockResolvedValue(baseCommentRow);
      await updateStoryComment('comment-1', { content: 'New' });
      expect(mockRunAsync.mock.calls[0][0]).toContain('synced = ?');
    });

    it('should return current comment when no updates and no useRemoteUpdatedAt', async () => {
      mockGetFirstAsync.mockResolvedValue(baseCommentRow);
      const result = await updateStoryComment('comment-1', {});
      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });
  });

  describe('deleteStoryComment', () => {
    it('should soft-delete comment', async () => {
      await deleteStoryComment('comment-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE StoryComments SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
        expect.arrayContaining([expect.any(Number), 'comment-1'])
      );
    });
  });

  describe('markStoryCommentSynced', () => {
    it('should hard-delete when comment is deleted', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ deleted: 1 });
      await markStoryCommentSynced('comment-1');
      expect(mockRunAsync).toHaveBeenCalledWith('DELETE FROM StoryComments WHERE id = ?', [
        'comment-1',
      ]);
    });

    it('should set synced = 1 when comment not deleted', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ deleted: 0 });
      await markStoryCommentSynced('comment-1');
      expect(mockRunAsync).toHaveBeenCalledWith('UPDATE StoryComments SET synced = 1 WHERE id = ?', [
        'comment-1',
      ]);
    });
  });
});
