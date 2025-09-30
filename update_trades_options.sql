-- Add options trading fields to trades table
-- Run this in Supabase SQL Editor

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS trade_type TEXT DEFAULT 'stock',
ADD COLUMN IF NOT EXISTS strike_price NUMERIC,
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add check constraint for trade_type
ALTER TABLE trades
DROP CONSTRAINT IF EXISTS trades_trade_type_check;

ALTER TABLE trades
ADD CONSTRAINT trades_trade_type_check 
CHECK (trade_type IN ('stock', 'call', 'put'));

SELECT 'Trades table updated with options support!' as status;
