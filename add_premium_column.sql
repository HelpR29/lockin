-- Add premium status columns to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add is_premium column (defaults to false for free users)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;

-- Add premium expiration timestamp
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone;

-- Add premium started timestamp
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS premium_started_at timestamp with time zone;

-- Update RLS policies to allow users to read their own premium status
-- (This should already be covered by existing user_profiles policies)

-- Optional: Create an index for faster premium status checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium 
ON user_profiles(user_id, is_premium);

-- Optional: Set yourself as premium for testing (replace YOUR_USER_ID)
-- UPDATE user_profiles 
-- SET is_premium = true, 
--     premium_started_at = NOW(),
--     premium_expires_at = NOW() + INTERVAL '1 year'
-- WHERE user_id = 'YOUR_USER_ID';

-- Verify the changes
SELECT 
    user_id,
    username,
    is_premium,
    premium_started_at,
    premium_expires_at
FROM user_profiles
LIMIT 5;
