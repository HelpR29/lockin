-- Create user_onboarding table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    username TEXT,
    avatar TEXT DEFAULT '👤',
    gender TEXT,
    experience TEXT,
    trading_style TEXT,
    starting_capital NUMERIC,
    target_percent NUMERIC,
    total_bottles INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own onboarding data"
    ON user_onboarding FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding data"
    ON user_onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding data"
    ON user_onboarding FOR UPDATE
    USING (auth.uid() = user_id);

SELECT 'user_onboarding table created successfully!' as status;
