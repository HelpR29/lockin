-- Complete fix for user_profiles table
-- Run this in your Supabase SQL Editor

-- Drop and recreate the table with all columns
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

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
