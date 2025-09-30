-- Social Sharing & Community System Schema

-- 1. User Profile Customization (token styles, themes)
CREATE TABLE IF NOT EXISTS user_customization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    avatar_url TEXT, -- Profile picture URL (from Supabase Storage or external)
    active_token TEXT DEFAULT '🍺', -- Current token style (beer, wine, donut, diamond, pizza, dragon, rocket)
    name_color TEXT DEFAULT 'white', -- Name color from rewards
    name_color_hex TEXT DEFAULT '#FFFFFF',
    badge TEXT, -- Leaderboard badge (gold, silver, bronze)
    theme TEXT DEFAULT 'default', -- UI theme
    is_public BOOLEAN DEFAULT true, -- Show on leaderboard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Share History (tracking what users shared)
CREATE TABLE IF NOT EXISTS share_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    share_type TEXT NOT NULL, -- 'completion', 'achievement', 'report', 'milestone'
    share_data JSONB NOT NULL, -- Content of the share (stats, achievements, etc.)
    image_url TEXT, -- Generated share card image URL
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Community Challenges (time-limited goals)
CREATE TABLE IF NOT EXISTS community_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL, -- 'completions', 'discipline', 'streak'
    goal_value INTEGER NOT NULL, -- Target to achieve
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reward_stars INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Challenge Participants
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID REFERENCES community_challenges(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(challenge_id, user_id)
);

-- 5. Social Reactions (likes/cheers on shares)
CREATE TABLE IF NOT EXISTS share_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_id UUID REFERENCES share_history(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reaction_type TEXT NOT NULL, -- 'fire', 'clap', 'rocket', 'diamond'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(share_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE user_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Customization
CREATE POLICY "Users can view own customization"
    ON user_customization FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customization"
    ON user_customization FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customization"
    ON user_customization FOR UPDATE
    USING (auth.uid() = user_id);

-- Share History
CREATE POLICY "Users can view public shares"
    ON share_history FOR SELECT
    USING (true); -- Public shares visible to all

CREATE POLICY "Users can insert own shares"
    ON share_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shares"
    ON share_history FOR UPDATE
    USING (auth.uid() = user_id);

-- Community Challenges
CREATE POLICY "Anyone can view active challenges"
    ON community_challenges FOR SELECT
    USING (is_active = true);

-- Challenge Participants
CREATE POLICY "Users can view all participants"
    ON challenge_participants FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own participation"
    ON challenge_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
    ON challenge_participants FOR UPDATE
    USING (auth.uid() = user_id);

-- Share Reactions
CREATE POLICY "Anyone can view reactions"
    ON share_reactions FOR SELECT
    USING (true);

CREATE POLICY "Users can add reactions"
    ON share_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
    ON share_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- Insert Sample Community Challenges
INSERT INTO community_challenges (title, description, challenge_type, goal_value, start_date, end_date, reward_stars, reward_xp, is_premium) VALUES
('November Challenge', 'Complete 30 goals in November - one per day!', 'completions', 30, '2025-11-01', '2025-11-30', 10, 1000, false),
('Perfect Week', 'Maintain 100% discipline score for 7 days', 'discipline', 100, NOW(), NOW() + INTERVAL '7 days', 5, 500, false),
('Iron Streak', 'Build a 15-day completion streak', 'streak', 15, NOW(), NOW() + INTERVAL '30 days', 7, 750, false),
('Diamond Month', '50 completions in 30 days (Premium)', 'completions', 50, NOW(), NOW() + INTERVAL '30 days', 15, 2000, true);

-- Create function to initialize user customization
CREATE OR REPLACE FUNCTION init_user_customization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_customization (user_id, active_token, name_color, name_color_hex)
    VALUES (NEW.user_id, '🍺', 'white', '#FFFFFF')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_user_customization
    AFTER INSERT ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION init_user_customization();

SELECT 'Social sharing system created successfully!' as status;
