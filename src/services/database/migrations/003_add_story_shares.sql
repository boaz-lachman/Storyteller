-- Migration 003: Add StoryShares table for story sharing functionality
-- Description: Enable users to share stories with other users with read or read-write permissions

PRAGMA foreign_keys = ON;

-- StoryShares Table
CREATE TABLE IF NOT EXISTS StoryShares (
  id TEXT PRIMARY KEY,
  storyId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  sharedWithUserId TEXT NOT NULL,
  sharedWithEmail TEXT NOT NULL,
  permission TEXT NOT NULL CHECK(permission IN ('read', 'read-write')),
  sharedByUserId TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
);

-- Indexes for StoryShares
CREATE INDEX IF NOT EXISTS idx_storyShares_storyId ON StoryShares(storyId);
CREATE INDEX IF NOT EXISTS idx_storyShares_sharedWithUserId ON StoryShares(sharedWithUserId);
CREATE INDEX IF NOT EXISTS idx_storyShares_sharedWithEmail ON StoryShares(sharedWithEmail);
CREATE INDEX IF NOT EXISTS idx_storyShares_synced ON StoryShares(synced);
CREATE INDEX IF NOT EXISTS idx_storyShares_ownerId ON StoryShares(ownerId);
-- Composite index for efficient permission lookups
CREATE INDEX IF NOT EXISTS idx_storyShares_story_user ON StoryShares(storyId, sharedWithUserId);
