-- LockIn Database Schema
-- Run this SQL in your Supabase SQL Editor

-- 1. User Profiles Table
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
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

-- 2. User Goals Table (Beer System)
CREATE TABLE user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    starting_capital NUMERIC NOT NULL,
    current_capital NUMERIC NOT NULL,
    target_percent_per_beer NUMERIC DEFAULT 8.0 NOT NULL,
    total_bottles INTEGER DEFAULT 50 NOT NULL,
    bottles_remaining INTEGER DEFAULT 50 NOT NULL,
    bottles_cracked INTEGER DEFAULT 0,
    max_loss_percent NUMERIC DEFAULT 2.0 NOT NULL,
    beers_spilled INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
    ON user_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
    ON user_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
    ON user_goals FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. Trading Rules Table
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

CREATE POLICY "Users can view own rules"
    ON trading_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
    ON trading_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
    ON trading_rules FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Trades Table
CREATE TABLE trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    entry_price NUMERIC NOT NULL,
    exit_price NUMERIC,
    position_size NUMERIC NOT NULL,
    risk_amount NUMERIC,
    profit_loss NUMERIC,
    profit_loss_percent NUMERIC,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    entry_time TIMESTAMP WITH TIME ZONE,
    exit_time TIMESTAMP WITH TIME ZONE,
    setup_type TEXT,
    notes TEXT,
    emotions TEXT,
    mistakes TEXT,
    lessons TEXT,
    images TEXT[],
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
    ON trades FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
    ON trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
    ON trades FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
    ON trades FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Beer Completions Table (Bottles Cracked)
CREATE TABLE beer_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    beer_number INTEGER NOT NULL,
    completion_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    starting_balance NUMERIC NOT NULL,
    ending_balance NUMERIC NOT NULL,
    gain_amount NUMERIC NOT NULL,
    gain_percent NUMERIC NOT NULL,
    target_percent NUMERIC NOT NULL,
    trades_count INTEGER DEFAULT 0,
    rules_followed BOOLEAN DEFAULT true,
    rule_violations TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE beer_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own beer completions"
    ON beer_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own beer completions"
    ON beer_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own beer completions"
    ON beer_completions FOR UPDATE
    USING (auth.uid() = user_id);

-- 5b. Beer Spills Table (Rule Violations / Losses)
CREATE TABLE beer_spills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    spill_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    starting_balance NUMERIC NOT NULL,
    ending_balance NUMERIC NOT NULL,
    loss_amount NUMERIC NOT NULL,
    loss_percent NUMERIC NOT NULL,
    max_loss_percent NUMERIC NOT NULL,
    rule_violations TEXT[] NOT NULL,
    trades_involved INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE beer_spills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own beer spills"
    ON beer_spills FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own beer spills"
    ON beer_spills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 6. Daily Stats Table
CREATE TABLE daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    stat_date DATE NOT NULL,
    trades_count INTEGER DEFAULT 0,
    wins_count INTEGER DEFAULT 0,
    losses_count INTEGER DEFAULT 0,
    win_rate NUMERIC DEFAULT 0,
    profit_loss NUMERIC DEFAULT 0,
    profit_loss_percent NUMERIC DEFAULT 0,
    largest_win NUMERIC DEFAULT 0,
    largest_loss NUMERIC DEFAULT 0,
    average_win NUMERIC DEFAULT 0,
    average_loss NUMERIC DEFAULT 0,
    risk_reward_ratio NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, stat_date)
);

ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily stats"
    ON daily_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily stats"
    ON daily_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily stats"
    ON daily_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- 7. Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_trading_rules_user_id ON trading_rules(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
CREATE INDEX idx_completions_user_id ON completions(user_id);
CREATE INDEX idx_completions_date ON completions(completion_date DESC);
CREATE INDEX idx_daily_stats_user_id ON daily_stats(user_id);
CREATE INDEX idx_daily_stats_date ON daily_stats(stat_date DESC);

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Add updated_at triggers to tables
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_rules_updated_at BEFORE UPDATE ON trading_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at BEFORE UPDATE ON daily_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. User Progress Table (Growth & Compounding System)
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
    last_check_in_date DATE,
    streak_multiplier NUMERIC DEFAULT 1.0,
    level_bonus NUMERIC DEFAULT 1.0,
    achievement_bonus NUMERIC DEFAULT 1.0,
    total_growth_multiplier NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- 11. Achievements Table
CREATE TABLE achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    xp_reward INTEGER DEFAULT 0,
    bonus_multiplier NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default achievements
INSERT INTO achievements (name, description, category, icon, requirement_type, requirement_value, xp_reward, bonus_multiplier) VALUES
('First Step', 'Complete your first check-in', 'milestone', '🎯', 'check_ins', 1, 50, 1.05),
('Week Warrior', 'Maintain a 7-day streak', 'streak', '🔥', 'streak', 7, 100, 1.1),
('Month Master', 'Maintain a 30-day streak', 'streak', '💪', 'streak', 30, 500, 1.25),
('Century Club', 'Complete 100 check-ins', 'milestone', '💯', 'check_ins', 100, 1000, 1.5),
('First Beer', 'Crack your first beer', 'beer', '🍺', 'beers_cracked', 1, 50, 1.05),
('5 Pack', 'Crack 5 beers', 'beer', '🍻', 'beers_cracked', 5, 100, 1.1),
('Case Complete', 'Crack 10 beers', 'beer', '📦', 'beers_cracked', 10, 250, 1.15),
('Quarter Way', 'Crack 25 beers', 'beer', '🎯', 'beers_cracked', 25, 500, 1.25),
('Halfway Hero', 'Crack 50 beers', 'beer', '🏆', 'beers_cracked', 50, 1000, 1.5),
('Final Stretch', 'Crack 75 beers', 'beer', '💎', 'beers_cracked', 75, 2000, 2.0),
('Almost There', 'Crack 90 beers', 'beer', '⭐', 'beers_cracked', 90, 3000, 2.5),
('Perfect Run', 'Crack all beers', 'beer', '👑', 'beers_cracked', 99, 5000, 4.0),
('Level 5', 'Reach level 5', 'level', '🚀', 'level', 5, 200, 1.1),
('Level 10', 'Reach level 10', 'level', '🌟', 'level', 10, 500, 1.2),
('Level 25', 'Reach level 25', 'level', '👑', 'level', 25, 2000, 1.5),
('Discipline Master', 'Achieve 95+ discipline score', 'discipline', '🎖️', 'discipline_score', 95, 1500, 1.4);

-- 12. User Achievements Table (junction table)
CREATE TABLE user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    achievement_id UUID REFERENCES achievements NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 13. Daily Check-ins Table
CREATE TABLE daily_check_ins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    check_in_date DATE NOT NULL,
    discipline_rating INTEGER CHECK (discipline_rating >= 1 AND discipline_rating <= 10),
    followed_rules BOOLEAN DEFAULT true,
    traded_today BOOLEAN DEFAULT false,
    trades_count INTEGER DEFAULT 0,
    win_rate NUMERIC,
    profit_loss NUMERIC,
    notes TEXT,
    emotions TEXT[],
    xp_earned INTEGER DEFAULT 10,
    streak_at_time INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, check_in_date)
);

ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins"
    ON daily_check_ins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins"
    ON daily_check_ins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins"
    ON daily_check_ins FOR UPDATE
    USING (auth.uid() = user_id);

-- 14. Progress Token Options (Reference table)
CREATE TABLE progress_tokens (
    id SERIAL PRIMARY KEY,
    token_type TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

INSERT INTO progress_tokens (token_type, display_name, emoji, display_order) VALUES
('beer', 'Beer', '🍺', 1),
('wine', 'Wine', '🍷', 2),
('donut', 'Donut', '🍩', 3),
('diamond', 'Diamond', '💎', 4);

-- 15. Add indexes for progress system
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_daily_check_ins_user_id ON daily_check_ins(user_id);
CREATE INDEX idx_daily_check_ins_date ON daily_check_ins(check_in_date DESC);
CREATE INDEX idx_beer_completions_user_id ON beer_completions(user_id);
CREATE INDEX idx_beer_completions_date ON beer_completions(completion_date DESC);
CREATE INDEX idx_beer_spills_user_id ON beer_spills(user_id);
CREATE INDEX idx_beer_spills_date ON beer_spills(spill_date DESC);

-- 16. Add trigger for user_progress
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database schema with Growth & Compounding System created successfully!' as message;
