/**
 * Permission utilities
 * Checks user permissions for stories and entities
 */
import { Story, BaseEntity, StoryPermission } from '../types';
import { getStory } from '../services/database/stories';
import { getStoryPermission } from '../services/database/storyShares';

/**
 * Check if user can edit a story
 * Returns true if user is owner or has read-write permission
 */
export const canEditStory = async (
  userId: string,
  story: Story | string
): Promise<boolean> => {
  const storyObj = typeof story === 'string' ? await getStory(story) : story;
  if (!storyObj) return false;

  // Owner can always edit
  if (storyObj.userId === userId) return true;

  // Check permission
  const permission = await getStoryPermission(userId, storyObj.id);
  return permission === 'read-write';
};

/**
 * Check if user can delete a story
 * Returns true only if user is the owner
 */
export const canDeleteStory = async (
  userId: string,
  story: Story | string
): Promise<boolean> => {
  const storyObj = typeof story === 'string' ? await getStory(story) : story;
  if (!storyObj) return false;

  // Only owner can delete
  return storyObj.userId === userId;
};

/**
 * Check if user can share a story
 * Returns true if user is owner or has read-write permission
 */
export const canShareStory = async (
  userId: string,
  story: Story | string
): Promise<boolean> => {
  const storyObj = typeof story === 'string' ? await getStory(story) : story;
  if (!storyObj) return false;

  // Owner can always share
  if (storyObj.userId === userId) return true;

  // Check if user has read-write permission
  const permission = await getStoryPermission(userId, storyObj.id);
  return permission === 'read-write';
};

/**
 * Check if user can edit an entity (character, scene, chapter, blurb)
 * Returns true if user can edit the parent story
 */
export const canEditEntity = async (
  userId: string,
  entity: BaseEntity,
  story?: Story
): Promise<boolean> => {
  // If story is provided, use it; otherwise fetch it
  const storyObj = story || (await getStory(entity.storyId));
  if (!storyObj) return false;

  // User can edit entity if they can edit the story
  return canEditStory(userId, storyObj);
};

/**
 * Check if user can delete an entity
 * Returns true if user can edit the parent story
 */
export const canDeleteEntity = async (
  userId: string,
  entity: BaseEntity,
  story?: Story
): Promise<boolean> => {
  return canEditEntity(userId, entity, story);
};

/**
 * Get user's permission level for a story
 */
export const getStoryUserPermission = async (
  userId: string,
  story: Story | string
): Promise<StoryPermission> => {
  const storyObj = typeof story === 'string' ? await getStory(story) : story;
  if (!storyObj) return null;

  // Check if owner
  if (storyObj.userId === userId) return 'owner';

  // Check share permission
  return getStoryPermission(userId, storyObj.id);
};
