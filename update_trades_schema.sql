-- Add stop loss and target price columns to trades table
-- Run this in Supabase SQL Editor

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS stop_loss NUMERIC,
ADD COLUMN IF NOT EXISTS target_price NUMERIC;

SELECT 'Trades table updated with stop_loss and target_price columns!' as status;
