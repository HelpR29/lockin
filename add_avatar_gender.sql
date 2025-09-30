-- Migration: Add avatar and gender columns to user_profiles
-- Run this in your Supabase SQL Editor

-- Add avatar column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '👤';

-- Add gender column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'prefer-not-to-say';

-- Update any existing rows to have default values
UPDATE user_profiles 
SET avatar = '👤' 
WHERE avatar IS NULL;

UPDATE user_profiles 
SET gender = 'prefer-not-to-say' 
WHERE gender IS NULL;
