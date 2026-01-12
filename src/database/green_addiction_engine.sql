-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛰️ GREEN_ADDICTION_ENGINE: PROMPTS 7-9
-- ═══════════════════════════════════════════════════════════════════════════════
-- @silo AI_CONTENT_GTO_ENGINE (GREEN)
-- @target ORB_4 (Training) | ORB_7 (Diamond Arcade)
-- 
-- TASK_07: MULTI_LEVEL_XP_SCALING_ENGINE
-- TASK_08: LEADERBOARD_RANKING_HOOK
-- TASK_09: FOCUS_SESSION_AUTO_GENERATOR
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_07: MULTI_LEVEL_XP_SCALING_ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: xp_reward_scaling
-- Difficulty vs Reward curve for Levels 1-10
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_reward_scaling (
    level_id INTEGER PRIMARY KEY CHECK (level_id >= 1 AND level_id <= 10),
    tier TEXT NOT NULL CHECK (tier IN ('STANDARD', 'ELITE')),
    
    -- XP Configuration
    base_xp INTEGER NOT NULL,
    xp_multiplier FLOAT NOT NULL,
    
    -- Diamond Configuration
    base_diamond_reward INTEGER NOT NULL,
    diamond_bonus_percentage INTEGER DEFAULT 0,  -- Elite levels get +25%
    
    -- Streak Bonuses
    streak_3_bonus FLOAT DEFAULT 1.0,
    streak_5_bonus FLOAT DEFAULT 1.0,
    streak_10_bonus FLOAT DEFAULT 1.0,
    
    -- Perfect Score Bonus
    perfect_session_bonus INTEGER DEFAULT 0
);

-- Seed the XP scaling curve (Standard: 1-5, Elite: 6-10)
INSERT INTO xp_reward_scaling VALUES
    -- STANDARD TIER (Levels 1-5)
    (1,  'STANDARD', 100, 1.0,  5,  0, 1.1, 1.2, 1.5, 50),
    (2,  'STANDARD', 120, 1.1,  6,  0, 1.1, 1.25, 1.6, 75),
    (3,  'STANDARD', 140, 1.2,  7,  0, 1.15, 1.3, 1.7, 100),
    (4,  'STANDARD', 160, 1.3,  8,  0, 1.15, 1.35, 1.8, 125),
    (5,  'STANDARD', 180, 1.4,  10, 0, 1.2, 1.4, 2.0, 150),
    
    -- ELITE TIER (Levels 6-10) - +25% Diamond Bonus
    (6,  'ELITE', 200, 1.5, 12, 25, 1.25, 1.5, 2.2, 200),
    (7,  'ELITE', 240, 1.6, 15, 25, 1.3,  1.6, 2.5, 250),
    (8,  'ELITE', 280, 1.8, 18, 25, 1.35, 1.75, 2.8, 300),
    (9,  'ELITE', 320, 2.0, 22, 25, 1.4,  1.9, 3.0, 400),
    (10, 'ELITE', 400, 2.5, 30, 25, 1.5,  2.0, 3.5, 500)
ON CONFLICT (level_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    base_xp = EXCLUDED.base_xp,
    xp_multiplier = EXCLUDED.xp_multiplier,
    base_diamond_reward = EXCLUDED.base_diamond_reward,
    diamond_bonus_percentage = EXCLUDED.diamond_bonus_percentage;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_calculate_session_rewards
-- Calculates XP and Diamond rewards based on level and performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_calculate_session_rewards(
    p_level_id INTEGER,
    p_correct_answers INTEGER,
    p_total_questions INTEGER,
    p_current_streak INTEGER DEFAULT 0,
    p_is_perfect_session BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_scaling RECORD;
    v_accuracy FLOAT;
    v_base_xp INTEGER;
    v_xp_earned INTEGER;
    v_diamond_base INTEGER;
    v_diamond_bonus INTEGER;
    v_diamonds_earned INTEGER;
    v_streak_multiplier FLOAT := 1.0;
    v_perfect_bonus INTEGER := 0;
BEGIN
    -- Get scaling configuration
    SELECT * INTO v_scaling
    FROM xp_reward_scaling
    WHERE level_id = p_level_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'INVALID_LEVEL');
    END IF;
    
    -- Calculate accuracy
    v_accuracy := CASE 
        WHEN p_total_questions > 0 
        THEN p_correct_answers::FLOAT / p_total_questions 
        ELSE 0 
    END;
    
    -- Base XP per correct answer
    v_base_xp := v_scaling.base_xp;
    
    -- Apply accuracy scaling
    v_xp_earned := FLOOR(v_base_xp * p_correct_answers * v_scaling.xp_multiplier);
    
    -- Apply streak multiplier
    IF p_current_streak >= 10 THEN
        v_streak_multiplier := v_scaling.streak_10_bonus;
    ELSIF p_current_streak >= 5 THEN
        v_streak_multiplier := v_scaling.streak_5_bonus;
    ELSIF p_current_streak >= 3 THEN
        v_streak_multiplier := v_scaling.streak_3_bonus;
    END IF;
    
    v_xp_earned := FLOOR(v_xp_earned * v_streak_multiplier);
    
    -- Perfect session bonus
    IF p_is_perfect_session THEN
        v_perfect_bonus := v_scaling.perfect_session_bonus;
        v_xp_earned := v_xp_earned + v_perfect_bonus;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 💎 DIAMOND CALCULATION (+25% for Elite Levels 6-10)
    -- ═══════════════════════════════════════════════════════════════════════
    
    v_diamond_base := FLOOR(v_scaling.base_diamond_reward * (p_correct_answers::FLOAT / 10));
    v_diamond_bonus := FLOOR(v_diamond_base * (v_scaling.diamond_bonus_percentage::FLOAT / 100));
    v_diamonds_earned := v_diamond_base + v_diamond_bonus;
    
    -- Streak bonus on diamonds too
    IF p_current_streak >= 5 THEN
        v_diamonds_earned := FLOOR(v_diamonds_earned * 1.5);
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'level_id', p_level_id,
        'tier', v_scaling.tier,
        
        -- Performance Metrics
        'accuracy', ROUND(v_accuracy * 100, 2),
        'correct', p_correct_answers,
        'total', p_total_questions,
        'streak', p_current_streak,
        'is_perfect', p_is_perfect_session,
        
        -- XP Rewards
        'xp', jsonb_build_object(
            'base', v_base_xp,
            'multiplier', v_scaling.xp_multiplier,
            'streak_multiplier', v_streak_multiplier,
            'perfect_bonus', v_perfect_bonus,
            'total', v_xp_earned
        ),
        
        -- Diamond Rewards
        'diamonds', jsonb_build_object(
            'base', v_diamond_base,
            'bonus_percentage', v_scaling.diamond_bonus_percentage,
            'bonus_amount', v_diamond_bonus,
            'streak_applied', p_current_streak >= 5,
            'total', v_diamonds_earned
        ),
        
        -- Elite tier indicator
        'is_elite', v_scaling.tier = 'ELITE',
        'elite_bonus_active', v_scaling.diamond_bonus_percentage > 0
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_08: LEADERBOARD_RANKING_HOOK
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: training_sessions
-- Tracks completed training sessions for leaderboard
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    level_id INTEGER NOT NULL,
    
    -- Session Metrics
    questions_answered INTEGER NOT NULL,
    questions_correct INTEGER NOT NULL,
    accuracy FLOAT GENERATED ALWAYS AS (
        CASE WHEN questions_answered > 0 
        THEN ROUND((questions_correct::FLOAT / questions_answered), 4)
        ELSE 0 END
    ) STORED,
    
    -- Is 85%+ session (counts toward leaderboard)
    is_mastery_session BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN questions_answered >= 10 
             AND (questions_correct::FLOAT / NULLIF(questions_answered, 0)) >= 0.85
        THEN TRUE ELSE FALSE END
    ) STORED,
    
    -- Rewards Earned
    xp_earned INTEGER DEFAULT 0,
    diamonds_earned INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mastery ON training_sessions(user_id, is_mastery_session) WHERE is_mastery_session = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_completed ON training_sessions(completed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 VIEW: training_mastery_leaderboard
-- Competitive ranking by Total 85%+ Sessions (Video-Game feel)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW training_mastery_leaderboard AS
SELECT 
    user_id,
    
    -- Core Stats
    COUNT(*) FILTER (WHERE is_mastery_session = TRUE) AS total_85_plus_sessions,
    COUNT(*) AS total_sessions,
    
    -- Accuracy
    ROUND(AVG(accuracy) * 100, 2) AS avg_accuracy,
    MAX(accuracy) AS best_accuracy,
    
    -- Perfect Sessions (100%)
    COUNT(*) FILTER (WHERE accuracy = 1.0) AS perfect_sessions,
    
    -- Level Progression
    MAX(level_id) AS highest_level_reached,
    COUNT(DISTINCT level_id) AS levels_played,
    
    -- Rewards
    SUM(xp_earned) AS total_xp_earned,
    SUM(diamonds_earned) AS total_diamonds_earned,
    
    -- Activity
    MAX(completed_at) AS last_active,
    COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '7 days') AS sessions_this_week,
    COUNT(*) FILTER (WHERE completed_at > NOW() - INTERVAL '24 hours') AS sessions_today,
    
    -- Competitive Rank (computed)
    RANK() OVER (
        ORDER BY 
            COUNT(*) FILTER (WHERE is_mastery_session = TRUE) DESC,
            ROUND(AVG(accuracy), 4) DESC,
            MAX(level_id) DESC
    ) AS global_rank
    
FROM training_sessions
GROUP BY user_id
ORDER BY total_85_plus_sessions DESC, avg_accuracy DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_leaderboard
-- Returns paginated leaderboard with rank info
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_leaderboard(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_timeframe TEXT DEFAULT 'ALL_TIME'  -- ALL_TIME, THIS_WEEK, TODAY
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total_players INTEGER;
BEGIN
    -- Get total player count
    SELECT COUNT(DISTINCT user_id) INTO v_total_players FROM training_sessions;
    
    IF p_timeframe = 'ALL_TIME' THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'rank', global_rank,
                'user_id', user_id,
                'mastery_sessions', total_85_plus_sessions,
                'avg_accuracy', avg_accuracy,
                'perfect_sessions', perfect_sessions,
                'highest_level', highest_level_reached,
                'total_xp', total_xp_earned,
                'total_diamonds', total_diamonds_earned,
                'last_active', last_active
            )
        ) INTO v_result
        FROM training_mastery_leaderboard
        LIMIT p_limit OFFSET p_offset;
        
    ELSIF p_timeframe = 'THIS_WEEK' THEN
        SELECT jsonb_agg(row_to_json(t)::JSONB) INTO v_result
        FROM (
            SELECT 
                user_id,
                COUNT(*) FILTER (WHERE is_mastery_session = TRUE) AS mastery_sessions,
                ROUND(AVG(accuracy) * 100, 2) AS avg_accuracy,
                SUM(xp_earned) AS total_xp,
                RANK() OVER (ORDER BY COUNT(*) FILTER (WHERE is_mastery_session = TRUE) DESC) AS rank
            FROM training_sessions
            WHERE completed_at > NOW() - INTERVAL '7 days'
            GROUP BY user_id
            ORDER BY mastery_sessions DESC
            LIMIT p_limit OFFSET p_offset
        ) t;
        
    ELSIF p_timeframe = 'TODAY' THEN
        SELECT jsonb_agg(row_to_json(t)::JSONB) INTO v_result
        FROM (
            SELECT 
                user_id,
                COUNT(*) FILTER (WHERE is_mastery_session = TRUE) AS mastery_sessions,
                ROUND(AVG(accuracy) * 100, 2) AS avg_accuracy,
                SUM(xp_earned) AS total_xp,
                RANK() OVER (ORDER BY COUNT(*) FILTER (WHERE is_mastery_session = TRUE) DESC) AS rank
            FROM training_sessions
            WHERE completed_at > NOW() - INTERVAL '24 hours'
            GROUP BY user_id
            ORDER BY mastery_sessions DESC
            LIMIT p_limit OFFSET p_offset
        ) t;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'timeframe', p_timeframe,
        'total_players', v_total_players,
        'page_size', p_limit,
        'offset', p_offset,
        'leaderboard', COALESCE(v_result, '[]'::JSONB)
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_user_rank
-- Returns a specific user's rank and stats
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_user_rank(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'success', TRUE,
        'user_id', user_id,
        'global_rank', global_rank,
        'total_85_plus_sessions', total_85_plus_sessions,
        'total_sessions', total_sessions,
        'avg_accuracy', avg_accuracy,
        'perfect_sessions', perfect_sessions,
        'highest_level', highest_level_reached,
        'total_xp', total_xp_earned,
        'total_diamonds', total_diamonds_earned,
        'sessions_this_week', sessions_this_week,
        'sessions_today', sessions_today,
        'last_active', last_active
    )
    FROM training_mastery_leaderboard
    WHERE user_id = p_user_id;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_09: FOCUS_SESSION_AUTO_GENERATOR
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: user_leak_patterns
-- Tracks leak signals by category/texture for weakness detection
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_leak_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Leak Category
    leak_category TEXT NOT NULL,    -- board_texture, position, street, action_type
    leak_value TEXT NOT NULL,       -- e.g., 'WET_HIGH', 'BTN', 'RIVER', 'CBET'
    
    -- Leak Count
    leak_count INTEGER DEFAULT 1,
    total_ev_loss FLOAT DEFAULT 0,
    
    -- Timing
    first_detected TIMESTAMPTZ DEFAULT NOW(),
    last_detected TIMESTAMPTZ DEFAULT NOW(),
    
    -- Focus Session Generated?
    focus_session_generated BOOLEAN DEFAULT FALSE,
    focus_session_generated_at TIMESTAMPTZ,
    
    UNIQUE(user_id, leak_category, leak_value)
);

CREATE INDEX IF NOT EXISTS idx_leak_patterns_user ON user_leak_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_leak_patterns_count ON user_leak_patterns(user_id, leak_count DESC);
CREATE INDEX IF NOT EXISTS idx_leak_patterns_needs_focus ON user_leak_patterns(user_id, leak_count) 
    WHERE leak_count >= 5 AND focus_session_generated = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: focus_sessions
-- Auto-generated weakness drills
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Weakness Target
    leak_category TEXT NOT NULL,
    leak_value TEXT NOT NULL,
    
    -- Session Configuration
    question_count INTEGER DEFAULT 10,
    scenario_ids UUID[] DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED')),
    
    -- Performance
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    accuracy FLOAT GENERATED ALWAYS AS (
        CASE WHEN questions_answered > 0 
        THEN ROUND((questions_correct::FLOAT / questions_answered), 4)
        ELSE 0 END
    ) STORED,
    
    -- XP Bonus for completing weakness drill
    bonus_xp INTEGER DEFAULT 200,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_pending ON focus_sessions(user_id, status) WHERE status = 'PENDING';

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_record_leak_pattern
-- Records a leak signal and checks for focus session trigger
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_record_leak_pattern(
    p_user_id UUID,
    p_leak_category TEXT,
    p_leak_value TEXT,
    p_ev_loss FLOAT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pattern RECORD;
    v_focus_triggered BOOLEAN := FALSE;
    v_focus_session_id UUID;
BEGIN
    -- Upsert leak pattern
    INSERT INTO user_leak_patterns (user_id, leak_category, leak_value, leak_count, total_ev_loss)
    VALUES (p_user_id, p_leak_category, p_leak_value, 1, p_ev_loss)
    ON CONFLICT (user_id, leak_category, leak_value) 
    DO UPDATE SET 
        leak_count = user_leak_patterns.leak_count + 1,
        total_ev_loss = user_leak_patterns.total_ev_loss + p_ev_loss,
        last_detected = NOW()
    RETURNING * INTO v_pattern;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 🎯 FOCUS SESSION TRIGGER: Leak Count > 5
    -- ═══════════════════════════════════════════════════════════════════════
    
    IF v_pattern.leak_count >= 5 AND v_pattern.focus_session_generated = FALSE THEN
        -- Generate 10-question Weakness Drill
        INSERT INTO focus_sessions (user_id, leak_category, leak_value, question_count, bonus_xp)
        VALUES (p_user_id, p_leak_category, p_leak_value, 10, 
                CASE 
                    WHEN v_pattern.leak_count >= 10 THEN 400
                    WHEN v_pattern.leak_count >= 7 THEN 300
                    ELSE 200
                END)
        RETURNING id INTO v_focus_session_id;
        
        -- Mark pattern as having focus session generated
        UPDATE user_leak_patterns
        SET focus_session_generated = TRUE,
            focus_session_generated_at = NOW()
        WHERE id = v_pattern.id;
        
        v_focus_triggered := TRUE;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'leak_category', p_leak_category,
        'leak_value', p_leak_value,
        'new_count', v_pattern.leak_count,
        'total_ev_loss', ROUND(v_pattern.total_ev_loss, 4),
        'focus_session_triggered', v_focus_triggered,
        'focus_session_id', v_focus_session_id,
        'threshold', 5,
        'message', CASE 
            WHEN v_focus_triggered THEN 
                format('🎯 Weakness detected! A 10-question Focus Drill has been generated for %s: %s', 
                    p_leak_category, p_leak_value)
            WHEN v_pattern.leak_count >= 4 THEN
                format('⚠️ %s more leak on %s: %s will trigger a Focus Drill', 
                    5 - v_pattern.leak_count, p_leak_category, p_leak_value)
            ELSE NULL
        END
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_user_weaknesses
-- Returns user's leak patterns sorted by severity
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_user_weaknesses(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'weaknesses', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'category', leak_category,
                    'value', leak_value,
                    'leak_count', leak_count,
                    'total_ev_loss_bb', ROUND(total_ev_loss * 100, 2),
                    'first_detected', first_detected,
                    'last_detected', last_detected,
                    'focus_session_pending', focus_session_generated AND EXISTS (
                        SELECT 1 FROM focus_sessions fs 
                        WHERE fs.user_id = ulp.user_id 
                        AND fs.leak_value = ulp.leak_value 
                        AND fs.status = 'PENDING'
                    )
                )
            )
            FROM user_leak_patterns ulp
            WHERE user_id = p_user_id
            ORDER BY leak_count DESC, total_ev_loss DESC
            LIMIT 20),
            '[]'::JSONB
        ),
        'pending_focus_sessions', (
            SELECT COUNT(*) FROM focus_sessions 
            WHERE user_id = p_user_id AND status = 'PENDING'
        )
    );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_pending_focus_sessions
-- Returns focus sessions waiting to be completed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_pending_focus_sessions(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'focus_sessions', COALESCE(
            (SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'target', jsonb_build_object(
                        'category', leak_category,
                        'value', leak_value
                    ),
                    'question_count', question_count,
                    'bonus_xp', bonus_xp,
                    'status', status,
                    'created_at', created_at,
                    'expires_at', expires_at
                )
            )
            FROM focus_sessions
            WHERE user_id = p_user_id AND status = 'PENDING'
            ORDER BY created_at DESC),
            '[]'::JSONB
        )
    );
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON xp_reward_scaling TO authenticated;
GRANT SELECT ON training_mastery_leaderboard TO authenticated;
GRANT SELECT, INSERT ON training_sessions TO authenticated;
GRANT SELECT ON user_leak_patterns TO authenticated;
GRANT SELECT ON focus_sessions TO authenticated;

GRANT EXECUTE ON FUNCTION fn_calculate_session_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_user_rank TO authenticated;
GRANT EXECUTE ON FUNCTION fn_record_leak_pattern TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_user_weaknesses TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_pending_focus_sessions TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE xp_reward_scaling IS '📊 TASK_07: XP/Diamond scaling curve (Standard 1-5, Elite 6-10 +25%)';
COMMENT ON VIEW training_mastery_leaderboard IS '🏆 TASK_08: Competitive leaderboard ranked by 85%+ Sessions';
COMMENT ON FUNCTION fn_record_leak_pattern IS '🎯 TASK_09: Records leaks and auto-generates Focus Sessions at 5+ leaks';
COMMENT ON TABLE focus_sessions IS '🎯 TASK_09: Auto-generated 10-question Weakness Drills';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ GREEN_ADDICTION_ENGINE COMPLETE — PROMPTS 7-9 MAPPED
-- ═══════════════════════════════════════════════════════════════════════════════
