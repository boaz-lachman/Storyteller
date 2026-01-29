/**
 * Unit tests for Character entity CRUD operations
 */
import {
  createCharacter,
  getCharacter,
  getCharactersByStory,
  updateCharacter,
  deleteCharacter,
  getUnsyncedCharacters,
  markCharacterSynced,
  getCharactersByIds,
} from '../characters';
import type { CharacterCreateInput, CharacterUpdateInput } from '../../../types';

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
  generateId: jest.fn(() => 'char-generated-id'),
  safeJsonStringify: jest.fn((v: unknown) => JSON.stringify(v)),
  safeJsonParse: jest.fn((v: string, fallback: unknown) => (v ? JSON.parse(v) : fallback)),
}));

jest.mock('../../../utils/permissions', () => ({
  canEditEntity: jest.fn(() => Promise.resolve(true)),
}));

const baseCreateInput: CharacterCreateInput & { userId: string; storyId: string } = {
  userId: 'user-1',
  storyId: 'story-1',
  name: 'Hero',
  description: 'Main character',
  role: 'protagonist',
  traits: ['brave', 'kind'],
  importance: 10,
};

const baseCharacterRow = {
  id: 'char-1',
  userId: 'user-1',
  storyId: 'story-1',
  name: 'Hero',
  description: 'Main character',
  role: 'protagonist',
  traits: '["brave","kind"]',
  backstory: null,
  keyEvents: null,
  importance: 10,
  createdAt: 1000,
  updatedAt: 1000,
  synced: 0,
  deleted: 0,
};

describe('Character CRUD operations', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createCharacter', () => {
    it('should create a character and return it', async () => {
      const result = await createCharacter(baseCreateInput);
      expect(result).toMatchObject({
        id: 'char-generated-id',
        userId: 'user-1',
        storyId: 'story-1',
        name: 'Hero',
        description: 'Main character',
        role: 'protagonist',
        traits: ['brave', 'kind'],
        importance: 10,
        deleted: false,
      });
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO Characters'),
        expect.any(Array)
      );
    });

    it('should use provided id when given', async () => {
      const result = await createCharacter({ ...baseCreateInput, id: 'custom-char-id' });
      expect(result.id).toBe('custom-char-id');
    });

    it('should default traits to empty array', async () => {
      const { traits, ...rest } = baseCreateInput;
      const result = await createCharacter(rest as typeof baseCreateInput);
      expect(result.traits).toEqual([]);
    });
  });

  describe('getCharacter', () => {
    it('should return null when not found', async () => {
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const result = await getCharacter('missing');
      expect(result).toBeNull();
      expect(mockGetFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM Characters WHERE id = ? AND deleted = 0',
        ['missing']
      );
    });

    it('should return character with parsed traits and keyEvents', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        ...baseCharacterRow,
        traits: '["brave"]',
        keyEvents: '["event1"]',
        synced: 1,
        deleted: 0,
      });
      const result = await getCharacter('char-1');
      expect(result).not.toBeNull();
      expect(result!.traits).toEqual(['brave']);
      expect(result!.keyEvents).toEqual(['event1']);
      expect(result!.synced).toBe(true);
    });
  });

  describe('getCharactersByStory', () => {
    it('should return characters for story with optional role filter', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseCharacterRow]);
      const result = await getCharactersByStory('story-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Hero');
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE storyId = ? AND deleted = 0'),
        ['story-1']
      );
    });

    it('should apply role filter when provided', async () => {
      mockGetAllAsync.mockResolvedValueOnce([]);
      await getCharactersByStory('story-1', 'importance', 'DESC', 'antagonist');
      expect(mockGetAllAsync.mock.calls[0][0]).toContain('role = ?');
      expect(mockGetAllAsync.mock.calls[0][1]).toEqual(['story-1', 'antagonist']);
    });
  });

  describe('updateCharacter', () => {
    it('should update and return character', async () => {
      mockGetFirstAsync.mockResolvedValue({ ...baseCharacterRow, name: 'Updated Hero' });
      const result = await updateCharacter('char-1', { name: 'Updated Hero' });
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Updated Hero');
      expect(mockRunAsync).toHaveBeenCalled();
    });

    it('should mark unsynced by default', async () => {
      mockGetFirstAsync.mockResolvedValue(baseCharacterRow);
      await updateCharacter('char-1', { name: 'New' });
      expect(mockRunAsync.mock.calls[0][0]).toContain('synced = ?');
    });

    it('should not add synced when preserveSync is true', async () => {
      mockGetFirstAsync.mockResolvedValue(baseCharacterRow);
      await updateCharacter('char-1', { name: 'New' }, { preserveSync: true });
      expect(mockRunAsync.mock.calls[0][0]).not.toContain('synced = ?');
    });

    it('should return current character when updates empty', async () => {
      mockGetFirstAsync.mockResolvedValue(baseCharacterRow);
      const result = await updateCharacter('char-1', {});
      expect(result).not.toBeNull();
      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should check permissions when userId provided', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseCharacterRow);
      await expect(
        updateCharacter('char-1', { name: 'New' }, { userId: 'other-user' })
      ).rejects.toThrow('You do not have permission to edit this character');
    });
  });

  describe('deleteCharacter', () => {
    it('should soft-delete character', async () => {
      await deleteCharacter('char-1');
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE Characters SET deleted = 1, synced = 0, updatedAt = ? WHERE id = ?',
        expect.arrayContaining([expect.any(Number), 'char-1'])
      );
    });

    it('should throw when userId provided and no permission', async () => {
      const { canEditEntity } = require('../../../utils/permissions');
      canEditEntity.mockResolvedValueOnce(false);
      mockGetFirstAsync.mockResolvedValue(baseCharacterRow);
      await expect(deleteCharacter('char-1', 'other-user')).rejects.toThrow(
        'You do not have permission to delete this character'
      );
    });
  });

  describe('getUnsyncedCharacters', () => {
    it('should return characters where synced = 0', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseCharacterRow]);
      const result = await getUnsyncedCharacters('user-1');
      expect(result).toHaveLength(1);
      expect(mockGetAllAsync).toHaveBeenCalledWith(
        'SELECT * FROM Characters WHERE userId = ? AND synced = 0',
        ['user-1']
      );
    });
  });

  describe('markCharacterSynced', () => {
    it('should set synced = 1', async () => {
      await markCharacterSynced('char-1');
      expect(mockRunAsync).toHaveBeenCalledWith('UPDATE Characters SET synced = 1 WHERE id = ?', [
        'char-1',
      ]);
    });
  });

  describe('getCharactersByIds', () => {
    it('should return empty map for empty ids', async () => {
      const result = await getCharactersByIds([]);
      expect(result.size).toBe(0);
      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });

    it('should return map of characters by id', async () => {
      mockGetAllAsync.mockResolvedValueOnce([baseCharacterRow]);
      const result = await getCharactersByIds(['char-1']);
      expect(result.size).toBe(1);
      expect(result.get('char-1')?.name).toBe('Hero');
    });
  });
});
