-- LockIn Database Schema
-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Run this SQL in your Supabase SQL Editor

-- 1. User Profiles Table
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
    username TEXT,
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
    emotions TEXT[],
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
CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX idx_trading_rules_user_id ON trading_rules(user_id);
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);
-- removed legacy completions indexes (replaced by beer_completions)
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

-- 11. Achievements Table (Revamped)
CREATE TABLE achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'milestone', 'streak', 'beer', 'level', 'discipline'
    icon TEXT NOT NULL,
    rarity TEXT DEFAULT 'common' NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default achievements
INSERT INTO achievements (name, description, category, icon, rarity, requirement_type, requirement_value) VALUES
('First Step', 'Complete your first check-in', 'milestone', '🎯', 'common', 'check_ins', 1),
('Week Warrior', 'Maintain a 7-day streak', 'streak', '🔥', 'common', 'streak', 7),
('Month Master', 'Maintain a 30-day streak', 'streak', 'rare', 'streak', 30),
('Century Club', 'Complete 100 check-ins', 'milestone', 'rare', 'check_ins', 100),
('First Beer', 'Crack your first beer', 'beer', 'common', 'beers_cracked', 1),
('5 Pack', 'Crack 5 beers', 'beer', 'common', 'beers_cracked', 5),
('Case Complete', 'Crack 10 beers', 'beer', 'common', 'beers_cracked', 10),
('Quarter Way', 'Crack 25 beers', 'beer', 'rare', 'beers_cracked', 25),
('Halfway Hero', 'Crack 50 beers', 'beer', 'epic', 'beers_cracked', 50),
('Final Stretch', 'Crack 75 beers', 'beer', 'epic', 'beers_cracked', 75),
('Almost There', 'Crack 90 beers', 'beer', 'legendary', 'beers_cracked', 90),
('Perfect Run', 'Crack all beers', 'beer', 'legendary', 'beers_cracked', 99),
('Level 5', 'Reach level 5', 'level', 'common', 'level', 5),
('Level 10', 'Reach level 10', 'level', 'rare', 'level', 10),
('Level 25', 'Reach level 25', 'level', 'epic', 'level', 25),
('Discipline Master', 'Achieve 95+ discipline score', 'discipline', 'legendary', 'discipline_score', 95);

-- 12. Rewards Table
CREATE TABLE rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- 'experience', 'title', 'badge', 'cosmetic'
    value TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT
);

INSERT INTO rewards (type, name, value, description) VALUES
('experience', '50 XP', '50', 'Grants 50 experience points.'),
('experience', '100 XP', '100', 'Grants 100 experience points.'),
('experience', '500 XP', '500', 'Grants 500 experience points.'),
('experience', '1000 XP', '1000', 'Grants 1000 experience points.'),
('title', 'Novice Trader', 'Novice Trader', 'A title for new traders.'),
('title', 'Streak Keeper', 'Streak Keeper', 'A title for maintaining streaks.'),
('badge', '7-Day Streak Badge', 'streak_7_day.png', 'A cosmetic badge for your profile.');

-- 13. Achievement Rewards Junction Table
CREATE TABLE achievement_rewards (
    achievement_id UUID REFERENCES achievements NOT NULL,
    reward_id UUID REFERENCES rewards NOT NULL,
    PRIMARY KEY (achievement_id, reward_id)
);

-- Link rewards to achievements
INSERT INTO achievement_rewards (achievement_id, reward_id)
SELECT a.id, r.id FROM achievements a, rewards r WHERE a.name = 'First Step' AND r.name = '50 XP';

INSERT INTO achievement_rewards (achievement_id, reward_id)
SELECT a.id, r.id FROM achievements a, rewards r WHERE a.name = 'Week Warrior' AND r.name = '100 XP';

INSERT INTO achievement_rewards (achievement_id, reward_id)
SELECT a.id, r.id FROM achievements a, rewards r WHERE a.name = 'Week Warrior' AND r.name = 'Streak Keeper';

-- 14. User Achievements Table (junction table)
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

-- 15. Daily Check-ins Table
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

-- 16. Progress Token Options (Reference table)
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
('diamond', 'Diamond', '💎', 4),
('trophy', 'Trophy', '🏆', 5);

-- 17. Rule Categories Table (for organizing rules)
CREATE TABLE rule_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default rule categories
INSERT INTO rule_categories (name, description, icon, display_order) VALUES
('Risk Management', 'Rules for managing risk and protecting capital', '🛡️', 1),
('Trade Limits', 'Rules for limiting trading activity', '📊', 2),
('Setup Quality', 'Rules for ensuring high-quality trade setups', '✨', 3),
('Emotional Discipline', 'Rules for maintaining emotional control', '🧘', 4),
('Journaling & Review', 'Rules for tracking and reviewing performance', '📝', 5);

-- 18. Rule Templates Table (pre-defined rule templates)
CREATE TABLE rule_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES rule_categories NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_enabled BOOLEAN DEFAULT true,
    is_numeric BOOLEAN DEFAULT false,
    numeric_value NUMERIC,
    numeric_unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert comprehensive rule templates

-- Risk Management Rules
INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value, numeric_unit) 
SELECT id, 'Never risk more than 1-2% of account per trade', 'Limit risk per trade to protect capital', true, 2.0, '%'
FROM rule_categories WHERE name = 'Risk Management';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Always set a stop loss before entry', 'Never enter a trade without a predetermined stop loss'
FROM rule_categories WHERE name = 'Risk Management';

INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value) 
SELECT id, 'Minimum Risk-to-Reward ratio = 1:2', 'Only take trades with at least 1:2 R:R', true, 2.0, NULL
FROM rule_categories WHERE name = 'Risk Management';

INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value, numeric_unit) 
SELECT id, 'Stop trading if account drawdown > 8% in a week', 'Pause trading to reassess after significant drawdown', true, 8.0, '%'
FROM rule_categories WHERE name = 'Risk Management';

-- Trade Limits Rules
INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value) 
SELECT id, 'Max 3 trades per day', 'Limit daily trades to avoid overtrading', true, 3, 'trades'
FROM rule_categories WHERE name = 'Trade Limits';

INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value) 
SELECT id, 'Max 10 trades per week', 'Weekly trading limit for quality over quantity', true, 10, 'trades'
FROM rule_categories WHERE name = 'Trade Limits';

INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value) 
SELECT id, 'Stop trading after 2 consecutive losses', 'Take a break after losing streak', true, 2, 'losses'
FROM rule_categories WHERE name = 'Trade Limits';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'No more than 1 open position per asset at a time', 'Avoid over-concentration in single assets'
FROM rule_categories WHERE name = 'Trade Limits';

-- Setup Quality Rules
INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Only take trades with clear confirmation', 'Require multiple indicators: trendline + RSI, volume spike, MA cross, etc.'
FROM rule_categories WHERE name = 'Setup Quality';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'No trading during high-impact news', 'Avoid trading during major economic announcements'
FROM rule_categories WHERE name = 'Setup Quality';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Only trade during optimal market hours', 'Trade only during your defined active hours'
FROM rule_categories WHERE name = 'Setup Quality';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Avoid counter-trend trades unless setup is A+ quality', 'Only take counter-trend trades with exceptional confirmation'
FROM rule_categories WHERE name = 'Setup Quality';

-- Emotional Discipline Rules
INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'No revenge trading after a loss', 'Never trade to make up for a losing trade'
FROM rule_categories WHERE name = 'Emotional Discipline';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'No increasing size after a losing trade', 'Maintain consistent position sizing'
FROM rule_categories WHERE name = 'Emotional Discipline';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Stop for the day once daily goal is hit', 'Lock in profits when target is reached'
FROM rule_categories WHERE name = 'Emotional Discipline';

INSERT INTO rule_templates (category_id, name, description, is_numeric, numeric_value) 
SELECT id, 'Walk away after 3 straight losing trades', 'Take a break to reset mentally', true, 3, 'losses'
FROM rule_categories WHERE name = 'Emotional Discipline';

-- Journaling & Review Rules
INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Log every trade with: entry, exit, result, notes', 'Complete documentation for every trade'
FROM rule_categories WHERE name = 'Journaling & Review';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'Write 1 lesson learned after each session', 'Reflect on what was learned from trading session'
FROM rule_categories WHERE name = 'Journaling & Review';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'End of day: review all trades before logging off', 'Daily review of all executed trades'
FROM rule_categories WHERE name = 'Journaling & Review';

INSERT INTO rule_templates (category_id, name, description) 
SELECT id, 'End of week: review journal & rule adherence %', 'Weekly performance and discipline review'
FROM rule_categories WHERE name = 'Journaling & Review';

-- 19. User Defined Rules Table (user's personal rules)
CREATE TABLE user_defined_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    category_id UUID REFERENCES rule_categories NOT NULL,
    template_id UUID REFERENCES rule_templates,
    rule_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_numeric BOOLEAN DEFAULT false,
    numeric_value NUMERIC,
    numeric_unit TEXT,
    times_violated INTEGER DEFAULT 0,
    times_followed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_defined_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rules"
    ON user_defined_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rules"
    ON user_defined_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rules"
    ON user_defined_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rules"
    ON user_defined_rules FOR DELETE
    USING (auth.uid() = user_id);

-- 20. Rule Violations Log Table (track when rules are broken)
CREATE TABLE rule_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    rule_id UUID REFERENCES user_defined_rules NOT NULL,
    trade_id UUID REFERENCES trades,
    violation_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE rule_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own violations"
    ON rule_violations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own violations"
    ON rule_violations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 21. Add indexes for performance
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_daily_check_ins_user_id ON daily_check_ins(user_id);
CREATE INDEX idx_daily_check_ins_date ON daily_check_ins(check_in_date DESC);
CREATE INDEX idx_beer_completions_user_id ON beer_completions(user_id);
CREATE INDEX idx_beer_completions_date ON beer_completions(completion_date DESC);
CREATE INDEX idx_beer_spills_user_id ON beer_spills(user_id);
CREATE INDEX idx_beer_spills_date ON beer_spills(spill_date DESC);
CREATE INDEX idx_user_defined_rules_user_id ON user_defined_rules(user_id);
CREATE INDEX idx_user_defined_rules_category ON user_defined_rules(category_id);
CREATE INDEX idx_rule_violations_user_id ON rule_violations(user_id);
CREATE INDEX idx_rule_violations_date ON rule_violations(violation_date DESC);

-- 18. Add trigger for user_progress
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. Rule Categories
CREATE TABLE rule_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER
);

INSERT INTO rule_categories (name, description, display_order) VALUES
('Risk Management', 'Rules for managing capital and risk.', 1),
('Entry Criteria', 'Rules defining when to enter a trade.', 2),
('Position Sizing', 'Rules for determining trade size.', 3),
('Trade Management', 'Rules for managing an open position.', 4),
('Psychology', 'Rules for maintaining mental discipline.', 5);

-- 20. Rule Templates
CREATE TABLE rule_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES rule_categories NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_value TEXT,
    value_type TEXT, -- e.g., 'percentage', 'number', 'boolean'
    is_core_rule BOOLEAN DEFAULT false
);

INSERT INTO rule_templates (category_id, name, description, default_value, value_type)
SELECT id, 'Max Risk per Trade', 'Maximum percentage of account to risk on a single trade.', '2.0', 'percentage' FROM rule_categories WHERE name = 'Risk Management';

INSERT INTO rule_templates (category_id, name, description, default_value, value_type)
SELECT id, 'Max Daily Loss', 'Maximum percentage of account to lose in a single day.', '5.0', 'percentage' FROM rule_categories WHERE name = 'Risk Management';

INSERT INTO rule_templates (category_id, name, description, default_value, value_type)
SELECT id, 'Max Trades per Day', 'Maximum number of trades to execute in a single day.', '3', 'number' FROM rule_categories WHERE name = 'Trade Management';

INSERT INTO rule_templates (category_id, name, description, default_value, value_type)
SELECT id, 'No FOMO Entries', 'Do not enter a trade based on fear of missing out.', 'true', 'boolean' FROM rule_categories WHERE name = 'Psychology';

-- 21. User Defined Rules
CREATE TABLE user_defined_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    category_id UUID REFERENCES rule_categories NOT NULL,
    template_id UUID REFERENCES rule_templates,
    rule_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_defined_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own rules" ON user_defined_rules FOR ALL USING (auth.uid() = user_id);

-- 22. Trade Rule Violations
CREATE TABLE trade_rule_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trade_id UUID REFERENCES trades NOT NULL,
    rule_id UUID REFERENCES user_defined_rules NOT NULL,
    violation_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE trade_rule_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own violations" ON trade_rule_violations FOR SELECT USING (auth.uid() = (SELECT user_id FROM trades WHERE id = trade_id));

-- Add indexes
CREATE INDEX idx_user_defined_rules_user_id ON user_defined_rules(user_id);
CREATE INDEX idx_trade_rule_violations_trade_id ON trade_rule_violations(trade_id);

-- 23. Friends Table
CREATE TABLE friends (
    user_id_1 UUID REFERENCES auth.users NOT NULL,
    user_id_2 UUID REFERENCES auth.users NOT NULL,
    status TEXT NOT NULL, -- 'requested', 'accepted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id_1, user_id_2)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own friendships" ON friends FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "Users can manage their own friendships" ON friends FOR ALL USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- 24. Leaderboard Table (can be a materialized view for performance)
-- For simplicity, we'll create a basic table. In production, this would be updated periodically.
CREATE TABLE leaderboards (
    user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    username TEXT,
    beers_cracked INTEGER, 
    longest_streak INTEGER,
    discipline_score NUMERIC,
    last_updated TIMESTAMP WITH TIME ZONE
);

ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read leaderboards" ON leaderboards FOR SELECT USING (true);

-- Add indexes for social features
CREATE INDEX idx_friends_user_id_1 ON friends(user_id_1);
CREATE INDEX idx_friends_user_id_2 ON friends(user_id_2);
CREATE INDEX idx_leaderboards_beers_cracked ON leaderboards(beers_cracked DESC);
CREATE INDEX idx_leaderboards_longest_streak ON leaderboards(longest_streak DESC);


-- Success message
SELECT 'Database schema with Social Features created successfully!' as message;

-- 25. Monetization: Plans
CREATE TABLE plans (
    code TEXT PRIMARY KEY, -- 'free', 'premium_monthly', 'premium_yearly', 'lifetime'
    name TEXT NOT NULL,
    price_cents INTEGER DEFAULT 0,
    interval TEXT, -- 'month', 'year', NULL for lifetime
    is_lifetime BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO plans (code, name, price_cents, interval, is_lifetime) VALUES
('free', 'Free', 0, NULL, false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO plans (code, name, price_cents, interval, is_lifetime) VALUES
('premium_monthly', 'Premium Monthly', 900, 'month', false),
('premium_yearly', 'Premium Yearly', 9999, 'year', false),
('lifetime', 'Lifetime Access', 19999, NULL, true)
ON CONFLICT (code) DO NOTHING;

-- 26. Monetization: User Subscriptions
CREATE TABLE user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    plan_code TEXT REFERENCES plans(code) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'expired'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_lifetime BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON user_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- 27. Monetization: Feature Flags per plan
CREATE TABLE plan_features (
    plan_code TEXT REFERENCES plans(code) NOT NULL,
    feature_key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    PRIMARY KEY (plan_code, feature_key)
);

INSERT INTO plan_features (plan_code, feature_key, enabled) VALUES
('free', 'basic_analytics', true),
('free', 'advanced_analytics', false),
('free', 'lifetime_access', false)
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_code, feature_key, enabled) VALUES
('premium_monthly', 'advanced_analytics', true),
('premium_yearly', 'advanced_analytics', true),
('lifetime', 'advanced_analytics', true),
('lifetime', 'lifetime_access', true)
ON CONFLICT DO NOTHING;

-- 28. Privacy & Security settings
CREATE TABLE privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users,
    share_with_friends BOOLEAN DEFAULT false,
    data_retention_days INTEGER, -- NULL means indefinite
    gdpr_consent BOOLEAN DEFAULT false,
    consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own privacy" ON privacy_settings FOR ALL USING (auth.uid() = user_id);
CREATE TRIGGER update_privacy_settings_updated_at BEFORE UPDATE ON privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 29. Security hardening notes
-- Ensure RLS is enabled (done throughout). Use Supabase policies.
-- For sensitive content encryption, store client-side encrypted blobs in future iterations.

-- Success message
SELECT 'Database schema with Monetization & Privacy created successfully!' as message;
