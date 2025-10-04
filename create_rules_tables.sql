-- Create Rules System Tables and Populate with Default Rules
-- Run this in Supabase SQL Editor

-- 1. Create trading_rules table (simplified version)
CREATE TABLE IF NOT EXISTS trading_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rule TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    severity INTEGER NOT NULL DEFAULT 1,
    times_followed INTEGER DEFAULT 0,
    times_violated INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own rules" ON trading_rules;
DROP POLICY IF EXISTS "Users can insert own rules" ON trading_rules;
DROP POLICY IF EXISTS "Users can update own rules" ON trading_rules;
DROP POLICY IF EXISTS "Users can delete own rules" ON trading_rules;

-- Recreate policies
CREATE POLICY "Users can view own rules"
    ON trading_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
    ON trading_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
    ON trading_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
    ON trading_rules FOR DELETE
    USING (auth.uid() = user_id);

-- 2. Create rule_violations table for tracking
CREATE TABLE IF NOT EXISTS rule_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rule_id UUID REFERENCES trading_rules(id) ON DELETE CASCADE,
    trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
    violated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT
);

-- Enable RLS
ALTER TABLE rule_violations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own violations" ON rule_violations;
DROP POLICY IF EXISTS "Users can insert own violations" ON rule_violations;

-- Recreate policies
CREATE POLICY "Users can view own violations"
    ON rule_violations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own violations"
    ON rule_violations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

SELECT 'Rules tables created successfully!' as status;
