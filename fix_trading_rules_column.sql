-- Fix for missing max_daily_loss column in trading_rules table
-- Run this in your Supabase SQL Editor

-- First, let's check if the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trading_rules'
ORDER BY ordinal_position;

-- If max_daily_loss column is missing, add it:
ALTER TABLE trading_rules
ADD COLUMN IF NOT EXISTS max_daily_loss NUMERIC NOT NULL DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trading_rules' AND column_name = 'max_daily_loss';

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
