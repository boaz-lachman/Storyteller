-- Migration 005: Add keyEvents column to Characters table
-- Description: Add keyEvents field to store core events that are central to characters' lives

-- Add keyEvents column to Characters table
ALTER TABLE Characters ADD COLUMN keyEvents TEXT;
