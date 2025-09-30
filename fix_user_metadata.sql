-- Fix: Update your user metadata to show "Dianne" instead of "Trader"
-- Run this in Supabase SQL Editor

-- This updates the auth.users metadata directly
-- Replace 'Dianne' with your actual name if different

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{full_name}',
    '"Dianne"'::jsonb
)
WHERE id = auth.uid();

SELECT 'User metadata updated! Refresh your dashboard.' as status;
