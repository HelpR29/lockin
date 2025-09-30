-- Debug your trades to see what data is stored
-- Run this in Supabase SQL Editor

SELECT 
    symbol,
    trade_type,
    direction,
    entry_price,
    exit_price,
    position_size,
    status,
    created_at,
    -- Calculate P&L
    CASE 
        WHEN trade_type IN ('call', 'put') THEN 
            (exit_price - entry_price) * position_size * 100 * CASE WHEN direction = 'short' THEN -1 ELSE 1 END
        ELSE 
            (exit_price - entry_price) * position_size * CASE WHEN direction = 'short' THEN -1 ELSE 1 END
    END as calculated_pnl
FROM trades
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- This will show you exactly what's in your database
