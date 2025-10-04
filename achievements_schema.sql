-- Achievements System Schema
-- Creates tables for achievements, user achievements, reward shop, and leaderboard

-- 1. Achievements Table (predefined achievements)
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL, -- 'free' or 'premium'
    requirement_type TEXT NOT NULL, -- 'streak', 'count', 'rules', 'journal'
    requirement_value INTEGER NOT NULL,
    star_reward INTEGER NOT NULL DEFAULT 0,
    xp_reward INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. User Achievements (tracking what users earned)
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

-- 3. User Stars (currency for reward shop)
CREATE TABLE IF NOT EXISTS user_stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_stars INTEGER DEFAULT 0,
    spent_stars INTEGER DEFAULT 0,
    available_stars INTEGER GENERATED ALWAYS AS (total_stars - spent_stars) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Reward Shop Items
CREATE TABLE IF NOT EXISTS reward_shop (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    cost_stars INTEGER NOT NULL,
    reward_type TEXT NOT NULL, -- 'username_change', 'photo_upload', 'token_style', 'name_color', 'badge', 'journal_export'
    reward_data JSONB, -- Additional data like token styles, colors, etc.
    is_premium_only BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. User Rewards (purchased items)
CREATE TABLE IF NOT EXISTS user_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES reward_shop(id) ON DELETE CASCADE NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE -- For time-limited rewards like golden name
);

-- 6. Leaderboard Stats (computed view)
CREATE OR REPLACE VIEW leaderboard_stats AS
WITH t_closed AS (
  SELECT
    user_id,
    COUNT(DISTINCT id) AS closed_trades,
    COUNT(DISTINCT CASE WHEN stop_loss IS NOT NULL AND stop_loss > 0 THEN id END) AS stop_cnt,
    COUNT(DISTINCT CASE WHEN target_price IS NOT NULL AND target_price > 0 THEN id END) AS target_cnt,
    COUNT(DISTINCT CASE WHEN notes IS NOT NULL AND LENGTH(notes) > 10 THEN id END) AS notes_cnt
  FROM trades
  WHERE status = 'closed'
  GROUP BY user_id
),
viol AS (
  SELECT user_id, rule_id, trade_id, DATE(violated_at) AS vdate
  FROM rule_violations
),
v_trade AS (
  SELECT user_id, rule_id, trade_id
  FROM viol
  WHERE trade_id IS NOT NULL
  GROUP BY user_id, rule_id, trade_id
),
v_manual AS (
  SELECT user_id, rule_id, vdate
  FROM viol
  WHERE trade_id IS NULL
  GROUP BY user_id, rule_id, vdate
),
v_weighted_trade AS (
  SELECT vt.user_id, SUM(tr.severity)::NUMERIC AS weighted_trade
  FROM v_trade vt
  JOIN trading_rules tr ON tr.id = vt.rule_id AND tr.user_id = vt.user_id
  GROUP BY vt.user_id
),
v_weighted_manual AS (
  SELECT vm.user_id, SUM(tr.severity)::NUMERIC AS weighted_manual
  FROM v_manual vm
  JOIN trading_rules tr ON tr.id = vm.rule_id AND tr.user_id = vm.user_id
  GROUP BY vm.user_id
),
v_weighted AS (
  SELECT COALESCE(t.user_id, m.user_id) AS user_id,
         COALESCE(t.weighted_trade, 0) + COALESCE(m.weighted_manual, 0) AS weighted_logs
  FROM v_weighted_trade t
  FULL JOIN v_weighted_manual m ON m.user_id = t.user_id
),
counter_weighted AS (
  SELECT user_id,
         SUM((COALESCE(times_violated,0))::NUMERIC * GREATEST(COALESCE(severity,1),1)) AS weighted_counters,
         SUM(GREATEST(COALESCE(severity,1),1)) AS sum_rule_weights
  FROM trading_rules
  WHERE is_active = true
  GROUP BY user_id
)
SELECT 
  u.id AS user_id,
  u.email,
  u.raw_user_meta_data->>'full_name' AS full_name,
  COALESCE(uprof.is_premium, false) AS is_premium,
  COALESCE(up.beers_cracked, 0) AS completions,
  COALESCE(up.level, 1) AS level,
  COALESCE(up.total_check_ins, 0) AS total_xp,
  COALESCE(us.total_stars, 0) AS total_stars,
  COUNT(DISTINCT ua.achievement_id) AS achievements_count,
  CASE 
    WHEN COALESCE(tc.closed_trades,0) > 0 OR COALESCE(vw.weighted_logs,0) > 0 THEN
      ROUND(
        (COALESCE(tc.stop_cnt,0)::NUMERIC / NULLIF(tc.closed_trades,0) * 100) * 0.3 +
        (COALESCE(tc.target_cnt,0)::NUMERIC / NULLIF(tc.closed_trades,0) * 100) * 0.15 +
        (COALESCE(tc.notes_cnt,0)::NUMERIC / NULLIF(tc.closed_trades,0) * 100) * 0.15 +
        (
          100 - LEAST(
            (
              GREATEST(
                COALESCE(vw.weighted_logs,0),
                COALESCE(cw.weighted_counters,0)
              )
              / GREATEST(COALESCE(tc.closed_trades,0) * GREATEST(COALESCE(cw.sum_rule_weights,0),1), 1) * 100
            ),
            100
          )
        ) * 0.4
      , 1)
    ELSE 100
  END AS discipline_score,
  MAX(up.updated_at) AS last_activity
FROM auth.users u
LEFT JOIN user_progress up ON u.id = up.user_id
LEFT JOIN user_profiles uprof ON u.id = uprof.user_id
LEFT JOIN user_stars us ON u.id = us.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
LEFT JOIN t_closed tc ON tc.user_id = u.id
LEFT JOIN v_weighted vw ON vw.user_id = u.id
LEFT JOIN counter_weighted cw ON cw.user_id = u.id
GROUP BY
  u.id, u.email, u.raw_user_meta_data,
  uprof.is_premium,
  up.beers_cracked, up.level, up.total_check_ins, us.total_stars, up.updated_at,
  tc.closed_trades, tc.stop_cnt, tc.target_cnt, tc.notes_cnt,
  vw.weighted_logs, cw.weighted_counters, cw.sum_rule_weights
ORDER BY completions DESC, discipline_score DESC, total_xp DESC;

-- Enable RLS
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_shop ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Achievements: Everyone can view
CREATE POLICY "Anyone can view achievements"
    ON achievements FOR SELECT
    USING (true);

-- User Achievements
CREATE POLICY "Users can view own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
    ON user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User Stars
CREATE POLICY "Users can view own stars"
    ON user_stars FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stars"
    ON user_stars FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stars"
    ON user_stars FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Reward Shop: Everyone can view
CREATE POLICY "Anyone can view reward shop"
    ON reward_shop FOR SELECT
    USING (true);

-- User Rewards
CREATE POLICY "Users can view own rewards"
    ON user_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
    ON user_rewards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
    ON user_rewards FOR UPDATE
    USING (auth.uid() = user_id);

-- Insert Default Achievements (HARDER VERSION)
INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value, star_reward, xp_reward) VALUES
-- Free Achievements
('First Pour', 'Complete 5 goals - prove you can start', '🍺', 'free', 'count', 5, 1, 100),
('Hot Streak', '10 completions in a row - consistency wins', '🔥', 'free', 'streak', 10, 3, 200),
('Iron Hands', '14 days without breaking rules - discipline matters', '🖐️', 'free', 'rules', 14, 3, 250),
('Case Closed', '25 completions total - halfway to your first wall', '📦', 'free', 'count', 25, 4, 350),

-- Premium Achievements
('Diamond Hands', '50 completions without breaking rules - 1 wall clean', '💎', 'premium', 'rules', 50, 7, 750),
('Zen Master', '50-day journaling streak - master self-awareness', '🧘', 'premium', 'journal', 50, 7, 750),
('Wall Crusher', '100 completions done - 2 walls conquered', '🧱', 'premium', 'count', 100, 10, 1500),
('Legendary Trader', '200 completions (4 walls) - elite status', '🏆', 'premium', 'count', 200, 15, 3000);

-- Insert Reward Shop Items
INSERT INTO reward_shop (name, description, icon, cost_stars, reward_type, reward_data, is_premium_only) VALUES
('Username Change', 'Change your display name', '✏️', 2, 'username_change', '{"uses": 1}', false),
('Photo Upload', 'Upload a custom profile picture', '📸', 3, 'photo_upload', '{"uses": 1}', false),
('Pizza Token', 'Unlock pizza token style', '🍕', 4, 'token_style', '{"token": "🍕"}', false),
('Dragon Token', 'Unlock dragon token style', '🐉', 4, 'token_style', '{"token": "🐉"}', false),
('Rocket Token', 'Unlock rocket token style', '🚀', 4, 'token_style', '{"token": "🚀"}', false),
('Silver Name', 'Get a silver username', '⭐', 5, 'name_color', '{"color": "silver", "hex": "#C0C0C0"}', false),
('Golden Badge', 'Golden leaderboard badge', '🥇', 6, 'badge', '{"badge": "gold"}', true),
('Journal Export', 'Export journal with custom cover', '📖', 7, 'journal_export', '{"format": "pdf"}', true),
('Golden Name (30 days)', 'Golden username for 30 days', '👑', 8, 'name_color', '{"color": "gold", "hex": "#FFD700", "duration_days": 30}', true),
('Golden Name (90 days)', 'Golden username for 90 days', '👑', 20, 'name_color', '{"color": "gold", "hex": "#FFD700", "duration_days": 90}', true);

SELECT 'Achievements system created successfully!' as status;
