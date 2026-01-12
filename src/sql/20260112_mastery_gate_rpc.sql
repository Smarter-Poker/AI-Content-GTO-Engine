-- 🔐 MASTERY GATE RPC
-- The 85% Hard Law enforcement at the database level.
-- This is the AUTHORITATIVE source of truth for level advancement.

-- 1. Level Progression Config
CREATE TABLE IF NOT EXISTS level_progression_config (
    level_id INTEGER PRIMARY KEY,
    tier TEXT NOT NULL CHECK (tier IN ('BEGINNER', 'STANDARD', 'INTERMEDIATE', 'ADVANCED', 'ELITE', 'BOSS')),
    min_accuracy INTEGER NOT NULL DEFAULT 85 CHECK (min_accuracy >= 0 AND min_accuracy <= 100),
    min_questions INTEGER NOT NULL DEFAULT 20,
    xp_reward INTEGER NOT NULL DEFAULT 100,
    diamond_reward INTEGER NOT NULL DEFAULT 0,
    is_boss_mode BOOLEAN DEFAULT FALSE
);

-- Populate default config
INSERT INTO level_progression_config (level_id, tier, min_accuracy, min_questions, xp_reward, diamond_reward, is_boss_mode) VALUES
(1, 'BEGINNER', 85, 20, 100, 0, FALSE),
(2, 'BEGINNER', 85, 20, 150, 0, FALSE),
(3, 'STANDARD', 85, 20, 200, 5, FALSE),
(4, 'STANDARD', 85, 20, 250, 5, FALSE),
(5, 'INTERMEDIATE', 85, 25, 300, 10, FALSE),
(6, 'INTERMEDIATE', 85, 25, 350, 10, FALSE),
(7, 'ADVANCED', 85, 25, 400, 15, FALSE),
(8, 'ADVANCED', 85, 30, 450, 15, FALSE),
(9, 'ELITE', 85, 30, 500, 25, FALSE),
(10, 'ELITE', 85, 30, 600, 30, FALSE),
(11, 'BOSS', 90, 30, 800, 50, TRUE),
(12, 'BOSS', 90, 30, 1000, 100, TRUE)
ON CONFLICT (level_id) DO UPDATE SET 
    tier = EXCLUDED.tier,
    min_accuracy = EXCLUDED.min_accuracy,
    min_questions = EXCLUDED.min_questions;

-- 2. User Level Progress Table
CREATE TABLE IF NOT EXISTS user_level_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL REFERENCES games(id),
    current_level INTEGER NOT NULL DEFAULT 1,
    highest_level_unlocked INTEGER NOT NULL DEFAULT 1,
    mastery_achieved BOOLEAN DEFAULT FALSE,
    last_session_accuracy INTEGER,
    total_sessions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

-- 3. Enable RLS
ALTER TABLE user_level_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON user_level_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_level_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_level_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- 4. THE 85% MASTERY GATE RPC
-- This is the HARD LAW. It cannot be bypassed.
CREATE OR REPLACE FUNCTION fn_check_level_advancement(
    p_user_id UUID,
    p_game_id TEXT,
    p_session_accuracy INTEGER,
    p_questions_answered INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_level INTEGER;
    v_config RECORD;
    v_can_advance BOOLEAN := FALSE;
    v_new_level INTEGER;
    v_xp_reward INTEGER := 0;
    v_diamond_reward INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Get current progress
    SELECT current_level INTO v_current_level
    FROM user_level_progress
    WHERE user_id = p_user_id AND game_id = p_game_id;

    -- If no progress exists, start at level 1
    IF v_current_level IS NULL THEN
        v_current_level := 1;
        INSERT INTO user_level_progress (user_id, game_id, current_level, highest_level_unlocked)
        VALUES (p_user_id, p_game_id, 1, 1);
    END IF;

    -- Get level config
    SELECT * INTO v_config
    FROM level_progression_config
    WHERE level_id = v_current_level;

    -- THE 85% GATE CHECK (HARD LAW)
    IF p_session_accuracy >= v_config.min_accuracy 
       AND p_questions_answered >= v_config.min_questions THEN
        
        v_can_advance := TRUE;
        v_new_level := LEAST(v_current_level + 1, 12); -- Max level is 12
        v_xp_reward := v_config.xp_reward;
        v_diamond_reward := v_config.diamond_reward;

        -- Update progress
        UPDATE user_level_progress
        SET 
            current_level = v_new_level,
            highest_level_unlocked = GREATEST(highest_level_unlocked, v_new_level),
            mastery_achieved = TRUE,
            last_session_accuracy = p_session_accuracy,
            total_sessions = total_sessions + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id AND game_id = p_game_id;

        -- Award XP (immutable ledger)
        INSERT INTO xp_ledger (user_id, amount, source, metadata)
        VALUES (
            p_user_id, 
            v_xp_reward, 
            'LEVEL_COMPLETE',
            jsonb_build_object(
                'game_id', p_game_id,
                'level', v_current_level,
                'accuracy', p_session_accuracy
            )
        );

    ELSE
        -- Did not meet threshold
        UPDATE user_level_progress
        SET 
            last_session_accuracy = p_session_accuracy,
            total_sessions = total_sessions + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id AND game_id = p_game_id;
    END IF;

    -- Build result
    v_result := jsonb_build_object(
        'success', TRUE,
        'can_advance', v_can_advance,
        'current_level', v_current_level,
        'new_level', COALESCE(v_new_level, v_current_level),
        'session_accuracy', p_session_accuracy,
        'required_accuracy', v_config.min_accuracy,
        'required_questions', v_config.min_questions,
        'questions_answered', p_questions_answered,
        'xp_reward', v_xp_reward,
        'diamond_reward', v_diamond_reward,
        'is_boss_mode', v_config.is_boss_mode,
        'message', CASE 
            WHEN v_can_advance THEN 'Level ' || v_current_level || ' MASTERED! Advancing to Level ' || v_new_level
            ELSE 'Keep practicing! Need ' || v_config.min_accuracy || '% accuracy on ' || v_config.min_questions || ' questions.'
        END
    );

    RETURN v_result;
END;
$$;

-- 5. Get User Progress RPC
CREATE OR REPLACE FUNCTION fn_get_user_progress(p_user_id UUID, p_game_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
    v_config RECORD;
BEGIN
    SELECT * INTO v_progress
    FROM user_level_progress
    WHERE user_id = p_user_id AND game_id = p_game_id;

    IF v_progress IS NULL THEN
        RETURN jsonb_build_object(
            'current_level', 1,
            'highest_level_unlocked', 1,
            'total_sessions', 0,
            'mastery_achieved', FALSE
        );
    END IF;

    SELECT * INTO v_config
    FROM level_progression_config
    WHERE level_id = v_progress.current_level;

    RETURN jsonb_build_object(
        'current_level', v_progress.current_level,
        'highest_level_unlocked', v_progress.highest_level_unlocked,
        'total_sessions', v_progress.total_sessions,
        'last_session_accuracy', v_progress.last_session_accuracy,
        'mastery_achieved', v_progress.mastery_achieved,
        'required_accuracy', v_config.min_accuracy,
        'required_questions', v_config.min_questions,
        'tier', v_config.tier,
        'is_boss_mode', v_config.is_boss_mode
    );
END;
$$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_user_level_progress_user_game 
    ON user_level_progress(user_id, game_id);
