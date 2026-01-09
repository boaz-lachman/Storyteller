-- Migration 003: Add firestoreId column to Stories table
PRAGMA foreign_keys = ON;

-- Add firestoreId column to Stories table
ALTER TABLE Stories ADD COLUMN firestoreId TEXT;

-- Create unique index on firestoreId
CREATE UNIQUE INDEX IF NOT EXISTS idx_stories_firestoreId ON Stories(firestoreId) WHERE firestoreId IS NOT NULL;
