/**
 * Unit tests for Scene entity CRUD operations
 */
import {
  createScene,
  getScene,
  getScenesByStory,
  updateScene,
  deleteScene,
  getUnsyncedScenes,
  markSceneSynced,
  getScenesByIds,
} from '../scenes';
import type { SceneCreateInput, SceneUpdateInput } from '../../../types';

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
  generateId: jest.fn(() => 'scene-generated-id'),
  safeJsonStringify: jest.fn((v: unknown) => JSON.stringify(v)),
  safeJsonParse: jest.fn((v: string, fallback: unknown) => (v ? JSON.parse(v) : fallback)),
}));

jest.mock('../../../utils/permissions', () => ({
  canEditEntity: jest.fn(() => Promise.resolve(true)),
}));

const baseCreateInput: SceneCreateInput & { userId: string; storyId: string } = {
  userId: 'user-1',
  storyId: 'story-1',
  title: 'Opening scene',
  description: 'The beginning',
  setting: 'Forest',
  characters: ['char-1'],
  importance: 10,
};

const baseSceneRow = {
  id: 'scene-1',
  userId: 'user-1',
  storyId: 'story-1',
  title: 'Opening scene',
  description: 'The beginning',
  setting: 'Forest',
  characters: '["char-1"]',
  mood: null,
  conflictLevel: null,
  importance: 10,
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
  deleted: 0,
};

describe('Scene CRUD operations', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createScene', () => {
    it('should create a scene and return it', async () => {
      const result = await createScene(baseCreateInput);
      expect(result).toMatchObject({
        id: 'scene-generated-id',
        userId: 'user-1',
        storyId: 'story-1',
        title: 'Opening scene',
        setting: 'Forest',
        characters: ['char-1'],
        importance: 10,
        deleted: false,
      });
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Scenes'),
        expect.any(Array)
      );
    });

    it('should use provided id when given', async () => {
      const result = await createScene({ ...baseCreateInput, id: 'custom-scene-id' });
      expect(result.id).toBe('custom-scene-id');
    });

    it('should default characters to empty array', async () => {
      const { characters, ...rest } = baseCreateInput;
      const result = await createScene(rest as typeof baseCreateInput);
      expect(result.characters).toEqual([]);
    });
  });

  describe('getScene', () => {
    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getScene('missing');
      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Scenes WHERE id = ? AND deleted = 0',
        ['missing']
      );
    });

    it('should return scene with parsed characters', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseSceneRow,
        characters: '["char-1","char-2"]',
        synced: 1,
        deleted: 0,
      });
      const result = await getScene('scene-1');
      expect(result).not.toBeNull();
      expect(result!.characters).toEqual(['char-1', 'char-2']);
      expect(result!.synced).toBe(true);
    });
  });

  describe('getScenesByStory', () => {
    it('should return scenes for story', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseSceneRow]);
      const result = await getScenesByStory('story-1');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Opening scene');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE storyId = ? AND deleted = 0'),
        ['story-1']
      );
    });
  });

  describe('updateScene', () => {
    it('should update and return scene', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseSceneRow, title: 'Updated scene' });
      const result = await updateScene('scene-1', { title: 'Updated scene' });
      expect(result).not.toBeNull();
      expect(result!.title).toBe('Updated scene');
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('should serialize characters as JSON on update', async () => {
      mockGetFirstAsync.mockResolvedValue({
        ...baseSceneRow,
        characters: '["char-1","char-2"]',
      });
      await updateScene('scene-1', { characters: ['char-1', 'char-2'] });
      const { safeJsonStringify } = require('../../../utils/helpers');
      expect(safeJsonStringify).toHaveBeenCalledWith(['char-1', 'char-2']);
    });

    it('should mark unsynced by default', async () => {
      mockGetFirstAsync.mockResolvedValue(baseSceneRow);
      await updateScene('scene-1', { title: 'New' });
      expect(mockRunAsync.mock.calls[0][0]).toContain('synced = ?');
    });

    it('should return current scene when updates empty', async () => {
      mockGetFirstAsync.mockResolvedValue(baseSceneRow);
      const result = await updateScene('scene-1', {});
      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should check permissions when userId provided', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseSceneRow);
      await expect(
        updateScene('scene-1', { title: 'New' }, { userId: 'other-user' })
      ).rejects.toThrow('You do not have permission to edit this scene');
    });
  });

  describe('deleteScene', () => {
    it('should soft-delete scene', async () => {
      await deleteScene('scene-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE Scenes SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
        expect.arrayContaining([expect.any(Number), 'scene-1'])
      );
    });

    it('should throw when userId provided and no permission', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseSceneRow);
      await expect(deleteScene('scene-1', 'other-user')).rejects.toThrow(
        'You do not have permission to delete this scene'
      );
    });
  });

  describe('getUnsyncedScenes', () => {
    it('should return scenes where synced = 0', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseSceneRow]);
      const result = await getUnsyncedScenes('user-1');
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM Scenes WHERE userId = ? AND synced = 0',
        ['user-1']
      );
    });
  });

  describe('markSceneSynced', () => {
    it('should set synced = 1', async () => {
      await markSceneSynced('scene-1');
      expect(mockRunAsync).toHaveBeenCalledWith('UPDATE Scenes SET synced = 1 WHERE id = ?', [
        'scene-1',
      ]);
    });
  });

  describe('getScenesByIds', () => {
    it('should return empty map for empty ids', async () => {
      const result = await getScenesByIds([]);
      expect(result.size).toBe(0);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });

    it('should return map of scenes by id', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseSceneRow]);
      const result = await getScenesByIds(['scene-1']);
      expect(result.size).toBe(1);
      expect(result.get('scene-1')?.title).toBe('Opening scene');
    });
  });
});
