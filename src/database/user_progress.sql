-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎮 USER_PROGRESS TABLE — REAL-TIME STATE SYNC
-- ═══════════════════════════════════════════════════════════════════════════════
-- Stores XP, Diamonds, Streak for PlayerHUD real-time sync
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Currency & Experience
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    diamonds INTEGER NOT NULL DEFAULT 100 CHECK (diamonds >= 0),
    
    -- Streak System
    streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
    streak_multiplier FLOAT NOT NULL DEFAULT 1.0,
    
    -- Level Progression
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    
    -- Timestamps
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON user_progress(level);
CREATE INDEX IF NOT EXISTS idx_user_progress_xp ON user_progress(xp DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only access their own progress
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📡 REAL-TIME PUBLICATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable real-time for user_progress table
ALTER PUBLICATION supabase_realtime ADD TABLE user_progress;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 AUTO-UPDATE TIMESTAMP TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_user_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_progress_updated ON user_progress;
CREATE TRIGGER trigger_user_progress_updated
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_user_progress_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔥 STREAK MULTIPLIER AUTO-CALCULATION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION calculate_streak_multiplier()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate multiplier based on streak
    NEW.streak_multiplier := CASE
        WHEN NEW.streak >= 7 THEN 2.0   -- Legendary
        WHEN NEW.streak >= 5 THEN 1.75  -- Blazing
        WHEN NEW.streak >= 3 THEN 1.5   -- Fire
        WHEN NEW.streak >= 1 THEN 1.25  -- Active
        ELSE 1.0
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_streak_multiplier ON user_progress;
CREATE TRIGGER trigger_streak_multiplier
    BEFORE INSERT OR UPDATE OF streak ON user_progress
    FOR EACH ROW EXECUTE FUNCTION calculate_streak_multiplier();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎮 XP IMMUTABILITY LAW — XP CAN NEVER DECREASE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_xp_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.xp < OLD.xp THEN
        RAISE EXCEPTION '🔒 HARD LAW VIOLATION: XP can NEVER decrease. Attempted: % -> %', OLD.xp, NEW.xp;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_xp_immutability ON user_progress;
CREATE TRIGGER trigger_xp_immutability
    BEFORE UPDATE OF xp ON user_progress
    FOR EACH ROW EXECUTE FUNCTION enforce_xp_immutability();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 LEVEL CALCULATION FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_level_from_xp(p_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level = floor(XP / 1000) + 1, capped at 100
    RETURN LEAST(100, (p_xp / 1000) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-calculate level on XP change
CREATE OR REPLACE FUNCTION auto_level_from_xp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.level := get_level_from_xp(NEW.xp);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_level ON user_progress;
CREATE TRIGGER trigger_auto_level
    BEFORE INSERT OR UPDATE OF xp ON user_progress
    FOR EACH ROW EXECUTE FUNCTION auto_level_from_xp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎁 INITIALIZE USER PROGRESS ON SIGNUP
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_user_progress_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_progress (user_id, diamonds)
    VALUES (NEW.id, 100)  -- 100 diamond welcome bonus
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS trigger_create_progress_on_signup ON auth.users;
CREATE TRIGGER trigger_create_progress_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_progress_on_signup();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON user_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
