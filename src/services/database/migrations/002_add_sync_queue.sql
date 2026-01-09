-- Migration 002: Add SyncQueue Table
-- Description: Add SyncQueue table for offline-first sync operations
-- Date: 2024

PRAGMA foreign_keys = ON;

-- SyncQueue Table
-- Stores pending sync operations that need to be synced to Firestore
CREATE TABLE IF NOT EXISTS SyncQueue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('story', 'character', 'blurb', 'scene', 'chapter')),
  entityId TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  timestamp INTEGER NOT NULL,
  retryCount INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

-- Indexes for SyncQueue
CREATE INDEX IF NOT EXISTS idx_syncQueue_type ON SyncQueue(type);
CREATE INDEX IF NOT EXISTS idx_syncQueue_entityId ON SyncQueue(entityId);
CREATE INDEX IF NOT EXISTS idx_syncQueue_timestamp ON SyncQueue(timestamp);
CREATE INDEX IF NOT EXISTS idx_syncQueue_priority_timestamp ON SyncQueue(priority DESC, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_syncQueue_retryCount ON SyncQueue(retryCount);
