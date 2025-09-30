-- Complete Schema Fix - Run this in Supabase SQL Editor
-- This ensures all tables have the correct columns

-- 1. Fix user_profiles table
DROP TABLE IF EXISTS user_profiles CASCADE;
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
    username TEXT,
    avatar TEXT DEFAULT '👤',
    gender TEXT DEFAULT 'prefer-not-to-say',
    experience TEXT NOT NULL,
    trading_style TEXT NOT NULL,
    markets TEXT NOT NULL,
    progress_token TEXT DEFAULT 'beer',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- 2. Fix user_goals table (Beer System)
DROP TABLE IF EXISTS user_goals CASCADE;
CREATE TABLE user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    starting_capital NUMERIC NOT NULL,
    current_capital NUMERIC NOT NULL,
    target_percent_per_beer NUMERIC DEFAULT 8.0 NOT NULL,
    total_bottles INTEGER DEFAULT 50 NOT NULL,
    bottles_remaining INTEGER DEFAULT 50 NOT NULL,
    bottles_cracked INTEGER DEFAULT 0,
    beers_spilled INTEGER DEFAULT 0,
    max_loss_percent NUMERIC DEFAULT 2.0 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own goals" ON user_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON user_goals FOR UPDATE USING (auth.uid() = user_id);

-- 3. Fix trading_rules table
DROP TABLE IF EXISTS trading_rules CASCADE;
CREATE TABLE trading_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    max_risk_per_trade NUMERIC NOT NULL,
    max_daily_loss NUMERIC NOT NULL,
    max_trades_per_day INTEGER NOT NULL,
    min_win_rate NUMERIC NOT NULL,
    require_journal BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rules" ON trading_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rules" ON trading_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rules" ON trading_rules FOR UPDATE USING (auth.uid() = user_id);

-- 4. Fix user_progress table
DROP TABLE IF EXISTS user_progress CASCADE;
CREATE TABLE user_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
    beers_cracked INTEGER DEFAULT 0,
    beers_spilled INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    discipline_score NUMERIC DEFAULT 0,
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    next_level_xp INTEGER DEFAULT 100,
    progress_token TEXT DEFAULT 'beer',
    total_check_ins INTEGER DEFAULT 0,
    streak_multiplier NUMERIC DEFAULT 1.0,
    level_bonus NUMERIC DEFAULT 1.0,
    achievement_bonus NUMERIC DEFAULT 1.0,
    total_growth_multiplier NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_progress FOR UPDATE USING (auth.uid() = user_id);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Schema fixed successfully! All tables recreated with correct columns.' as status;
