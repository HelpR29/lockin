-- Check what avatar you picked during onboarding
-- Run this in Supabase SQL Editor

SELECT 
    username,
    avatar,
    gender,
    experience,
    trading_style,
    created_at
FROM user_onboarding
WHERE user_id = auth.uid();

-- This will show you exactly what avatar emoji is stored in your profile
