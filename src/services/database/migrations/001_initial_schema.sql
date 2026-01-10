-- Migration 001: Initial Schema
-- Description: Create initial database schema with all tables and indexes

PRAGMA foreign_keys = ON;

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL,
  description TEXT
);

-- Stories Table
CREATE TABLE IF NOT EXISTS Stories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  length TEXT NOT NULL,
  theme TEXT NOT NULL,
  tone TEXT NOT NULL,
  pov TEXT NOT NULL,
  targetAudience TEXT NOT NULL,
  setting TEXT,
  timePeriod TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  generatedContent TEXT,
  generatedAt INTEGER,
  wordCount INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);

-- Characters Table
CREATE TABLE IF NOT EXISTS Characters (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  storyId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  role TEXT NOT NULL,
  traits TEXT NOT NULL,
  backstory TEXT,
  importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
);

-- Blurbs Table
CREATE TABLE IF NOT EXISTS Blurbs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  storyId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
);

-- Scenes Table
CREATE TABLE IF NOT EXISTS Scenes (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  storyId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  setting TEXT NOT NULL,
  characters TEXT NOT NULL,
  mood TEXT,
  conflictLevel INTEGER CHECK(conflictLevel IS NULL OR (conflictLevel >= 1 AND conflictLevel <= 10)),
  importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
);

-- Chapters Table
CREATE TABLE IF NOT EXISTS Chapters (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  storyId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  importance INTEGER NOT NULL CHECK(importance >= 1 AND importance <= 10),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  deleted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
);

-- GeneratedStories Table
CREATE TABLE IF NOT EXISTS GeneratedStories (
  id TEXT PRIMARY KEY,
  storyId TEXT NOT NULL,
  userId TEXT NOT NULL,
  content TEXT NOT NULL,
  complexity TEXT NOT NULL,
  prompt TEXT NOT NULL,
  wordCount INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (storyId) REFERENCES Stories(id) ON DELETE CASCADE
);

-- Indexes for frequently queried fields
-- Stories indexes
CREATE INDEX IF NOT EXISTS idx_stories_userId ON Stories(userId);
CREATE INDEX IF NOT EXISTS idx_stories_userId_status ON Stories(userId, status);
CREATE INDEX IF NOT EXISTS idx_stories_createdAt ON Stories(createdAt);
CREATE INDEX IF NOT EXISTS idx_stories_updatedAt ON Stories(updatedAt);
CREATE INDEX IF NOT EXISTS idx_stories_synced ON Stories(synced);

-- Characters indexes
CREATE INDEX IF NOT EXISTS idx_characters_storyId ON Characters(storyId);
CREATE INDEX IF NOT EXISTS idx_characters_importance ON Characters(importance);
CREATE INDEX IF NOT EXISTS idx_characters_role ON Characters(role);
CREATE INDEX IF NOT EXISTS idx_characters_createdAt ON Characters(createdAt);
CREATE INDEX IF NOT EXISTS idx_characters_updatedAt ON Characters(updatedAt);
CREATE INDEX IF NOT EXISTS idx_characters_synced ON Characters(synced);
CREATE INDEX IF NOT EXISTS idx_characters_storyId_importance ON Characters(storyId, importance);

-- Blurbs indexes
CREATE INDEX IF NOT EXISTS idx_blurbs_storyId ON Blurbs(storyId);
CREATE INDEX IF NOT EXISTS idx_blurbs_importance ON Blurbs(importance);
CREATE INDEX IF NOT EXISTS idx_blurbs_category ON Blurbs(category);
CREATE INDEX IF NOT EXISTS idx_blurbs_createdAt ON Blurbs(createdAt);
CREATE INDEX IF NOT EXISTS idx_blurbs_updatedAt ON Blurbs(updatedAt);
CREATE INDEX IF NOT EXISTS idx_blurbs_synced ON Blurbs(synced);
CREATE INDEX IF NOT EXISTS idx_blurbs_storyId_category ON Blurbs(storyId, category);
CREATE INDEX IF NOT EXISTS idx_blurbs_storyId_importance ON Blurbs(storyId, importance);

-- Scenes indexes
CREATE INDEX IF NOT EXISTS idx_scenes_storyId ON Scenes(storyId);
CREATE INDEX IF NOT EXISTS idx_scenes_importance ON Scenes(importance);
CREATE INDEX IF NOT EXISTS idx_scenes_createdAt ON Scenes(createdAt);
CREATE INDEX IF NOT EXISTS idx_scenes_updatedAt ON Scenes(updatedAt);
CREATE INDEX IF NOT EXISTS idx_scenes_synced ON Scenes(synced);
CREATE INDEX IF NOT EXISTS idx_scenes_storyId_importance ON Scenes(storyId, importance);

-- Chapters indexes
CREATE INDEX IF NOT EXISTS idx_chapters_storyId ON Chapters(storyId);
CREATE INDEX IF NOT EXISTS idx_chapters_importance ON Chapters(importance);
CREATE INDEX IF NOT EXISTS idx_chapters_createdAt ON Chapters(createdAt);
CREATE INDEX IF NOT EXISTS idx_chapters_updatedAt ON Chapters(updatedAt);
CREATE INDEX IF NOT EXISTS idx_chapters_synced ON Chapters(synced);
CREATE INDEX IF NOT EXISTS idx_chapters_storyId_order ON Chapters(storyId, "order");
CREATE INDEX IF NOT EXISTS idx_chapters_storyId_importance ON Chapters(storyId, importance);
-- Partial unique index: only applies to non-deleted chapters
-- This allows multiple deleted chapters to have order = -1
CREATE UNIQUE INDEX IF NOT EXISTS idx_chapters_storyId_order_unique ON Chapters(storyId, "order") WHERE deleted = 0;

-- GeneratedStories indexes
CREATE INDEX IF NOT EXISTS idx_generatedStories_storyId ON GeneratedStories(storyId);
CREATE INDEX IF NOT EXISTS idx_generatedStories_createdAt ON GeneratedStories(createdAt);
CREATE INDEX IF NOT EXISTS idx_generatedStories_updatedAt ON GeneratedStories(updatedAt);
CREATE INDEX IF NOT EXISTS idx_generatedStories_synced ON GeneratedStories(synced);

-- Sync Queue Table
-- Stores operations that need to be synced to Firestore
CREATE TABLE IF NOT EXISTS SyncQueue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('story', 'character', 'blurb', 'scene', 'chapter', 'generatedStory')),
  entityId TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  timestamp INTEGER NOT NULL,
  retryCount INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  data TEXT, -- JSON string for optional operation data
  createdAt INTEGER NOT NULL
);

-- Sync Queue indexes
CREATE INDEX IF NOT EXISTS idx_syncQueue_type ON SyncQueue(type);
CREATE INDEX IF NOT EXISTS idx_syncQueue_entityId ON SyncQueue(entityId);
CREATE INDEX IF NOT EXISTS idx_syncQueue_timestamp ON SyncQueue(timestamp);
CREATE INDEX IF NOT EXISTS idx_syncQueue_retryCount ON SyncQueue(retryCount);
-- Index for efficient querying of pending items
CREATE INDEX IF NOT EXISTS idx_syncQueue_pending ON SyncQueue(type, entityId, timestamp) WHERE retryCount < 3;