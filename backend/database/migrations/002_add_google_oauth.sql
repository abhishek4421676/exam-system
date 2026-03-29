-- Add Google OAuth support to Users table
-- Migration: Add google_id column

ALTER TABLE Users ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL AFTER password_hash;

-- Create index for faster lookup
CREATE INDEX idx_google_id ON Users(google_id);
