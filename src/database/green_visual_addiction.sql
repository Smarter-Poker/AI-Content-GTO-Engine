-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛰️ GREEN_VISUAL_ADDICTION: PROMPTS 19-21
-- ═══════════════════════════════════════════════════════════════════════════════
-- @silo AI_CONTENT_GTO_ENGINE (GREEN)
-- @target UI_SHELL | ARENA_VISUAL | LEADERBOARD_FEED
-- 
-- TASK_19: DYNAMIC_PROGRESS_BAR_MAPPING
-- TASK_20: LEVEL_UP_ANIMATION_DISPATCH
-- TASK_21: GTO_ACCURACY_LEADERBOARD
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_19: DYNAMIC_PROGRESS_BAR_MAPPING
-- Session Momentum Tracker - Glows Green at 85%, Pulses Gold at 95%
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: session_momentum
-- Real-time session progress tracking for UI rendering
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_momentum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID NOT NULL UNIQUE,
    level_id INTEGER NOT NULL,
    
    -- Progress Metrics
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    questions_total INTEGER DEFAULT 20,
    
    -- Real-time Accuracy
    current_accuracy FLOAT GENERATED ALWAYS AS (
        CASE WHEN questions_answered > 0 
        THEN ROUND((questions_correct::FLOAT / questions_answered), 4)
        ELSE 0 END
    ) STORED,
    
    -- Progress Percentage
    progress_percentage FLOAT GENERATED ALWAYS AS (
        CASE WHEN questions_total > 0 
        THEN ROUND((questions_answered::FLOAT / questions_total * 100), 2)
        ELSE 0 END
    ) STORED,
    
    -- Visual State
    visual_state TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN questions_answered = 0 THEN 'NEUTRAL'
            WHEN (questions_correct::FLOAT / NULLIF(questions_answered, 0)) >= 0.95 THEN 'GOLD_PULSE'
            WHEN (questions_correct::FLOAT / NULLIF(questions_answered, 0)) >= 0.85 THEN 'GREEN_GLOW'
            WHEN (questions_correct::FLOAT / NULLIF(questions_answered, 0)) >= 0.70 THEN 'YELLOW'
            ELSE 'RED_WARNING'
        END
    ) STORED,
    
    -- Streak Tracking
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    
    -- Session State
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED')),
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_action_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_momentum_user ON session_momentum(user_id);
CREATE INDEX idx_momentum_active ON session_momentum(user_id, status) WHERE status = 'ACTIVE';

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_momentum_bar
-- Returns progress bar render data with visual effects
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_momentum_bar(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_momentum RECORD;
    v_color TEXT;
    v_animation TEXT;
    v_glow_intensity FLOAT;
BEGIN
    SELECT * INTO v_momentum FROM session_momentum WHERE session_id = p_session_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'SESSION_NOT_FOUND');
    END IF;
    
    -- Determine visual effects based on accuracy
    v_color := CASE v_momentum.visual_state
        WHEN 'GOLD_PULSE' THEN '#FFD700'      -- Gold
        WHEN 'GREEN_GLOW' THEN '#00FF88'      -- Green
        WHEN 'YELLOW' THEN '#FFAA00'          -- Yellow
        WHEN 'RED_WARNING' THEN '#FF4444'     -- Red
        ELSE '#888888'                        -- Neutral
    END;
    
    v_animation := CASE v_momentum.visual_state
        WHEN 'GOLD_PULSE' THEN 'pulse_gold'   -- Pulsing gold effect
        WHEN 'GREEN_GLOW' THEN 'glow_green'   -- Glowing green effect
        WHEN 'RED_WARNING' THEN 'shake'       -- Shake effect
        ELSE 'none'
    END;
    
    v_glow_intensity := CASE v_momentum.visual_state
        WHEN 'GOLD_PULSE' THEN 1.0
        WHEN 'GREEN_GLOW' THEN 0.8
        WHEN 'YELLOW' THEN 0.4
        ELSE 0.0
    END;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'session_id', p_session_id,
        
        -- Progress Data
        'progress', jsonb_build_object(
            'answered', v_momentum.questions_answered,
            'correct', v_momentum.questions_correct,
            'total', v_momentum.questions_total,
            'percentage', v_momentum.progress_percentage,
            'accuracy', ROUND(v_momentum.current_accuracy * 100, 1)
        ),
        
        -- Visual Effects
        'visual', jsonb_build_object(
            'state', v_momentum.visual_state,
            'color', v_color,
            'animation', v_animation,
            'glow_intensity', v_glow_intensity,
            'show_sparkles', v_momentum.visual_state = 'GOLD_PULSE',
            'show_glow', v_momentum.visual_state IN ('GOLD_PULSE', 'GREEN_GLOW')
        ),
        
        -- Streak
        'streak', jsonb_build_object(
            'current', v_momentum.current_streak,
            'best', v_momentum.best_streak,
            'on_fire', v_momentum.current_streak >= 5
        ),
        
        -- Status
        'status', v_momentum.status,
        'is_mastery', v_momentum.current_accuracy >= 0.85,
        'is_perfect', v_momentum.current_accuracy >= 1.0
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_update_momentum
-- Updates session progress and returns new visual state
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_momentum(
    p_session_id UUID,
    p_is_correct BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_momentum RECORD;
    v_new_streak INTEGER;
BEGIN
    -- Get current state
    SELECT * INTO v_momentum FROM session_momentum WHERE session_id = p_session_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'SESSION_NOT_FOUND');
    END IF;
    
    -- Calculate new streak
    v_new_streak := CASE WHEN p_is_correct THEN v_momentum.current_streak + 1 ELSE 0 END;
    
    -- Update momentum
    UPDATE session_momentum
    SET questions_answered = questions_answered + 1,
        questions_correct = questions_correct + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
        current_streak = v_new_streak,
        best_streak = GREATEST(best_streak, v_new_streak),
        last_action_at = NOW()
    WHERE session_id = p_session_id;
    
    -- Return updated state
    RETURN fn_get_momentum_bar(p_session_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_20: LEVEL_UP_ANIMATION_DISPATCH
-- "Boss Defeated" visual for Level 10 completion
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: animation_dispatch_queue
-- Queue for visual animations to be rendered by UI
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS animation_dispatch_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Animation Details
    animation_type TEXT NOT NULL CHECK (animation_type IN (
        'LEVEL_UNLOCKED',
        'BOSS_DEFEATED',
        'PERFECT_SESSION',
        'MASTERY_UNLOCKED',
        'STREAK_FIRE',
        'XP_BURST',
        'DIAMOND_SHOWER',
        'RANK_UP'
    )),
    
    -- Animation Data
    animation_data JSONB NOT NULL,
    duration_ms INTEGER DEFAULT 3000,
    priority INTEGER DEFAULT 1,  -- Higher = more important
    
    -- Render Settings
    render_target TEXT DEFAULT 'OVERLAY',  -- OVERLAY, BACKGROUND, INLINE
    sound_effect TEXT,
    haptic_pattern TEXT,
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PLAYING', 'COMPLETED', 'DISMISSED')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    played_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ
);

CREATE INDEX idx_animation_user ON animation_dispatch_queue(user_id);
CREATE INDEX idx_animation_pending ON animation_dispatch_queue(user_id, status, priority DESC) 
    WHERE status = 'PENDING';

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_dispatch_level_animation
-- Triggers level-up animations including Boss Defeated
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_dispatch_level_animation(
    p_user_id UUID,
    p_level_id INTEGER,
    p_accuracy FLOAT DEFAULT 0.85
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_animation_type TEXT;
    v_animation_id UUID;
    v_is_boss_mode BOOLEAN := p_level_id = 10;
    v_is_perfect BOOLEAN := p_accuracy >= 1.0;
    v_animation_data JSONB;
    v_sound_effect TEXT;
    v_duration_ms INTEGER;
    v_priority INTEGER;
BEGIN
    -- Determine animation type
    IF v_is_boss_mode THEN
        v_animation_type := 'BOSS_DEFEATED';
        v_sound_effect := 'boss_defeated_fanfare';
        v_duration_ms := 5000;
        v_priority := 10;
    ELSIF v_is_perfect THEN
        v_animation_type := 'PERFECT_SESSION';
        v_sound_effect := 'perfect_chime';
        v_duration_ms := 4000;
        v_priority := 8;
    ELSE
        v_animation_type := 'MASTERY_UNLOCKED';
        v_sound_effect := 'level_up_fanfare';
        v_duration_ms := 3000;
        v_priority := 5;
    END IF;
    
    -- Build animation data
    v_animation_data := jsonb_build_object(
        'level_id', p_level_id,
        'level_name', CASE p_level_id
            WHEN 1 THEN 'Foundations' WHEN 2 THEN 'Opening Ranges'
            WHEN 3 THEN 'C-Bet Mastery' WHEN 4 THEN 'Defense Basics'
            WHEN 5 THEN 'Multi-Street' WHEN 6 THEN 'Board Texture'
            WHEN 7 THEN 'Mixed Strategy' WHEN 8 THEN 'Exploitation'
            WHEN 9 THEN 'ICM Mastery' WHEN 10 THEN '🔥 BOSS MODE 🔥'
            ELSE 'Unknown'
        END,
        'accuracy', ROUND(p_accuracy * 100, 1),
        'is_boss_mode', v_is_boss_mode,
        'is_perfect', v_is_perfect,
        
        -- Visual Effects
        'effects', jsonb_build_object(
            'particles', CASE 
                WHEN v_is_boss_mode THEN 'fireworks_gold'
                WHEN v_is_perfect THEN 'confetti_rainbow'
                ELSE 'sparkles_green'
            END,
            'background_flash', CASE
                WHEN v_is_boss_mode THEN '#FFD700'
                WHEN v_is_perfect THEN '#00FF88'
                ELSE '#88FF00'
            END,
            'text_effect', CASE
                WHEN v_is_boss_mode THEN 'shake_zoom'
                ELSE 'scale_bounce'
            END,
            'screen_shake', v_is_boss_mode
        ),
        
        -- Text Content
        'title', CASE
            WHEN v_is_boss_mode THEN '🏆 BOSS DEFEATED! 🏆'
            WHEN v_is_perfect THEN '💯 PERFECT MASTERY!'
            ELSE '🎉 LEVEL UNLOCKED!'
        END,
        'subtitle', CASE
            WHEN v_is_boss_mode THEN 'You have conquered the ultimate challenge!'
            WHEN v_is_perfect THEN 'Flawless GTO execution achieved!'
            ELSE format('Level %s mastered with %s%% accuracy', p_level_id, ROUND(p_accuracy * 100))
        END
    );
    
    -- Insert into queue
    INSERT INTO animation_dispatch_queue (
        user_id, animation_type, animation_data, duration_ms, 
        priority, sound_effect, haptic_pattern
    )
    VALUES (
        p_user_id, v_animation_type, v_animation_data, v_duration_ms,
        v_priority, v_sound_effect, 
        CASE WHEN v_is_boss_mode THEN 'victory_rumble' ELSE 'success_tap' END
    )
    RETURNING id INTO v_animation_id;
    
    -- Broadcast via pg_notify
    PERFORM pg_notify('animation_dispatch', jsonb_build_object(
        'animation_id', v_animation_id,
        'user_id', p_user_id,
        'type', v_animation_type,
        'priority', v_priority
    )::TEXT);
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'animation_id', v_animation_id,
        'animation_type', v_animation_type,
        'animation_data', v_animation_data,
        'sound_effect', v_sound_effect,
        'duration_ms', v_duration_ms,
        'broadcast_channel', 'animation_dispatch'
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_21: GTO_ACCURACY_LEADERBOARD
-- Global ranking based on Perfect Sessions (100% GTO)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 VIEW: global_mastery_ranking
-- Competitive leaderboard ranked by perfect GTO sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW global_mastery_ranking AS
SELECT 
    user_id,
    
    -- Perfect Session Ranking (Primary)
    COUNT(*) FILTER (WHERE current_accuracy = 1.0 AND status = 'COMPLETED') AS perfect_sessions,
    
    -- Mastery Sessions (85%+)
    COUNT(*) FILTER (WHERE current_accuracy >= 0.85 AND status = 'COMPLETED') AS mastery_sessions,
    
    -- Total Stats
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS total_sessions,
    
    -- Accuracy
    ROUND(AVG(current_accuracy) FILTER (WHERE status = 'COMPLETED') * 100, 2) AS avg_accuracy,
    MAX(current_accuracy) AS best_accuracy,
    
    -- Streaks
    MAX(best_streak) AS longest_streak,
    
    -- Levels
    MAX(level_id) AS highest_level,
    COUNT(DISTINCT level_id) AS levels_played,
    
    -- Boss Mode
    COUNT(*) FILTER (WHERE level_id = 10 AND current_accuracy >= 0.90 AND status = 'COMPLETED') AS boss_mode_clears,
    
    -- Global Rank (Perfect Sessions Primary, Avg Accuracy Secondary)
    RANK() OVER (
        ORDER BY 
            COUNT(*) FILTER (WHERE current_accuracy = 1.0 AND status = 'COMPLETED') DESC,
            ROUND(AVG(current_accuracy) FILTER (WHERE status = 'COMPLETED'), 4) DESC,
            MAX(level_id) DESC
    ) AS global_rank,
    
    -- Tier Classification
    CASE 
        WHEN COUNT(*) FILTER (WHERE current_accuracy = 1.0 AND status = 'COMPLETED') >= 50 THEN 'LEGENDARY'
        WHEN COUNT(*) FILTER (WHERE current_accuracy = 1.0 AND status = 'COMPLETED') >= 25 THEN 'GRANDMASTER'
        WHEN COUNT(*) FILTER (WHERE current_accuracy = 1.0 AND status = 'COMPLETED') >= 10 THEN 'MASTER'
        WHEN COUNT(*) FILTER (WHERE current_accuracy = 1.0 AND status = 'COMPLETED') >= 5 THEN 'EXPERT'
        WHEN COUNT(*) FILTER (WHERE current_accuracy >= 0.85 AND status = 'COMPLETED') >= 10 THEN 'ADVANCED'
        ELSE 'STUDENT'
    END AS rank_tier,
    
    -- Last Active
    MAX(completed_at) AS last_session
    
FROM session_momentum
GROUP BY user_id
ORDER BY perfect_sessions DESC, avg_accuracy DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_gto_leaderboard
-- Returns paginated GTO accuracy leaderboard
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_gto_leaderboard(
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0,
    p_filter_tier TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_total INTEGER;
BEGIN
    -- Get total count
    SELECT COUNT(DISTINCT user_id) INTO v_total FROM session_momentum;
    
    SELECT jsonb_agg(
        jsonb_build_object(
            'rank', global_rank,
            'user_id', user_id,
            'tier', rank_tier,
            'perfect_sessions', perfect_sessions,
            'mastery_sessions', mastery_sessions,
            'avg_accuracy', avg_accuracy,
            'highest_level', highest_level,
            'boss_mode_clears', boss_mode_clears,
            'longest_streak', longest_streak,
            'last_session', last_session
        )
    ) INTO v_result
    FROM global_mastery_ranking
    WHERE (p_filter_tier IS NULL OR rank_tier = p_filter_tier)
    LIMIT p_limit OFFSET p_offset;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'total_players', v_total,
        'page_size', p_limit,
        'offset', p_offset,
        'filter_tier', p_filter_tier,
        'leaderboard', COALESCE(v_result, '[]'::JSONB),
        'tiers', jsonb_build_array(
            jsonb_build_object('tier', 'LEGENDARY', 'min_perfect', 50, 'icon', '👑'),
            jsonb_build_object('tier', 'GRANDMASTER', 'min_perfect', 25, 'icon', '🏆'),
            jsonb_build_object('tier', 'MASTER', 'min_perfect', 10, 'icon', '⭐'),
            jsonb_build_object('tier', 'EXPERT', 'min_perfect', 5, 'icon', '💎'),
            jsonb_build_object('tier', 'ADVANCED', 'min_mastery', 10, 'icon', '🔥'),
            jsonb_build_object('tier', 'STUDENT', 'min_mastery', 0, 'icon', '📚')
        )
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_user_gto_rank
-- Returns specific user's GTO ranking and stats
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_user_gto_rank(p_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'success', TRUE,
        'user_id', user_id,
        'global_rank', global_rank,
        'rank_tier', rank_tier,
        'perfect_sessions', perfect_sessions,
        'mastery_sessions', mastery_sessions,
        'total_sessions', total_sessions,
        'avg_accuracy', avg_accuracy,
        'highest_level', highest_level,
        'boss_mode_clears', boss_mode_clears,
        'longest_streak', longest_streak,
        'next_tier', CASE rank_tier
            WHEN 'STUDENT' THEN jsonb_build_object('tier', 'ADVANCED', 'need', 10 - mastery_sessions)
            WHEN 'ADVANCED' THEN jsonb_build_object('tier', 'EXPERT', 'need', 5 - perfect_sessions)
            WHEN 'EXPERT' THEN jsonb_build_object('tier', 'MASTER', 'need', 10 - perfect_sessions)
            WHEN 'MASTER' THEN jsonb_build_object('tier', 'GRANDMASTER', 'need', 25 - perfect_sessions)
            WHEN 'GRANDMASTER' THEN jsonb_build_object('tier', 'LEGENDARY', 'need', 50 - perfect_sessions)
            ELSE NULL
        END
    )
    FROM global_mastery_ranking
    WHERE user_id = p_user_id;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON session_momentum TO authenticated;
GRANT SELECT, INSERT ON animation_dispatch_queue TO authenticated;
GRANT SELECT ON global_mastery_ranking TO authenticated;

GRANT EXECUTE ON FUNCTION fn_get_momentum_bar TO authenticated;
GRANT EXECUTE ON FUNCTION fn_update_momentum TO authenticated;
GRANT EXECUTE ON FUNCTION fn_dispatch_level_animation TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_gto_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_user_gto_rank TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE session_momentum IS '📊 TASK_19: Real-time progress bar with Green glow (85%) and Gold pulse (95%)';
COMMENT ON FUNCTION fn_dispatch_level_animation IS '🎬 TASK_20: Level-up animation dispatch including Boss Defeated';
COMMENT ON VIEW global_mastery_ranking IS '🏆 TASK_21: GTO accuracy leaderboard ranked by Perfect Sessions';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ GREEN_VISUAL_ADDICTION COMPLETE — PROMPTS 19-21 MAPPED
-- ═══════════════════════════════════════════════════════════════════════════════
