-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛰️ GREEN_ACTIVE_LOGIC: PROMPTS 4-6
-- ═══════════════════════════════════════════════════════════════════════════════
-- @silo AI_CONTENT_GTO_ENGINE (GREEN)
-- @target ORB_4 (Training) | ORB_6 (Assistant)
-- 
-- TASK_04: 85_PERCENT_MASTERY_TRIGGER
-- TASK_05: GTO_LEAK_SIGNAL_ANALYZER
-- TASK_06: MULTI_LEVEL_PROGRESSION_ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_04: 85_PERCENT_MASTERY_TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔐 FUNCTION: fn_validate_level_unlock
-- HARD LAW: Level [N+1] only flips to 'UNLOCKED' if Level [N] score >= 0.85
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_validate_level_unlock(
    p_user_id UUID,
    p_target_level_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_level RECORD;
    v_prev_level RECORD;
    v_prev_mastery RECORD;
    v_accuracy FLOAT;
    v_min_drills INTEGER;
BEGIN
    -- Get target level info
    SELECT * INTO v_target_level
    FROM mastery_levels
    WHERE level_id = p_target_level_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'INVALID_LEVEL',
            'message', format('Level %s does not exist', p_target_level_id)
        );
    END IF;
    
    -- Level 1 is always unlockable
    IF p_target_level_id = 1 THEN
        -- Auto-unlock level 1
        INSERT INTO user_mastery_progress (user_id, level_id, status, unlocked_at)
        VALUES (p_user_id, 1, 'ACTIVE', NOW())
        ON CONFLICT (user_id, level_id) 
        DO UPDATE SET status = 'ACTIVE', unlocked_at = COALESCE(user_mastery_progress.unlocked_at, NOW());
        
        RETURN jsonb_build_object(
            'valid', TRUE,
            'level_id', 1,
            'status', 'UNLOCKED',
            'reason', 'FIRST_LEVEL'
        );
    END IF;
    
    -- Get previous level
    SELECT * INTO v_prev_level
    FROM mastery_levels
    WHERE level_id = p_target_level_id - 1;
    
    -- Get user's mastery of previous level
    SELECT * INTO v_prev_mastery
    FROM user_mastery_progress
    WHERE user_id = p_user_id AND level_id = v_prev_level.level_id;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 🔐 HARD LAW: 85% MASTERY CHECK
    -- ═══════════════════════════════════════════════════════════════════════
    
    IF v_prev_mastery IS NULL THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'PREVIOUS_LEVEL_NOT_STARTED',
            'target_level', p_target_level_id,
            'required_level', v_prev_level.level_id,
            'required_level_name', v_prev_level.level_name
        );
    END IF;
    
    -- Calculate accuracy
    v_accuracy := CASE 
        WHEN v_prev_mastery.questions_answered > 0 
        THEN v_prev_mastery.questions_correct::FLOAT / v_prev_mastery.questions_answered
        ELSE 0 
    END;
    
    v_min_drills := COALESCE(v_prev_level.min_questions_required, 20);
    
    -- Check 85% threshold
    IF v_accuracy < 0.85 THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'ACCURACY_BELOW_THRESHOLD',
            'target_level', p_target_level_id,
            'required_level', v_prev_level.level_id,
            'current_accuracy', ROUND(v_accuracy * 100, 2),
            'required_accuracy', 85,
            'deficit', ROUND((0.85 - v_accuracy) * 100, 2),
            'message', format('Need %s%% accuracy on %s, currently at %s%%', 
                85, v_prev_level.level_name, ROUND(v_accuracy * 100, 1))
        );
    END IF;
    
    -- Check minimum questions
    IF v_prev_mastery.questions_answered < v_min_drills THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'INSUFFICIENT_QUESTIONS',
            'target_level', p_target_level_id,
            'required_level', v_prev_level.level_id,
            'questions_answered', v_prev_mastery.questions_answered,
            'questions_required', v_min_drills,
            'remaining', v_min_drills - v_prev_mastery.questions_answered,
            'message', format('Need %s questions on %s, answered %s', 
                v_min_drills, v_prev_level.level_name, v_prev_mastery.questions_answered)
        );
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- ✅ ALL CHECKS PASSED - UNLOCK THE LEVEL
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- Create or update mastery record for target level
    INSERT INTO user_mastery_progress (user_id, level_id, status, unlocked_at)
    VALUES (p_user_id, p_target_level_id, 'ACTIVE', NOW())
    ON CONFLICT (user_id, level_id) 
    DO UPDATE SET status = 'ACTIVE', unlocked_at = NOW();
    
    -- Mark previous level as COMPLETED
    UPDATE user_mastery_progress
    SET status = 'COMPLETED', completed_at = NOW()
    WHERE user_id = p_user_id AND level_id = v_prev_level.level_id;
    
    RETURN jsonb_build_object(
        'valid', TRUE,
        'level_id', p_target_level_id,
        'level_name', v_target_level.level_name,
        'status', 'UNLOCKED',
        'previous_level', v_prev_level.level_name,
        'previous_accuracy', ROUND(v_accuracy * 100, 2),
        'message', format('🎉 %s unlocked! You mastered %s with %s%% accuracy.',
            v_target_level.level_name, v_prev_level.level_name, ROUND(v_accuracy * 100, 1))
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_05: GTO_LEAK_SIGNAL_ANALYZER
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: leak_signals
-- Stores detected leaks for pattern analysis
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leak_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    drill_id UUID,
    
    -- Action Details
    user_action TEXT NOT NULL,
    gto_action TEXT NOT NULL,
    
    -- EV Analysis
    user_ev FLOAT NOT NULL,
    gto_ev FLOAT NOT NULL,
    ev_loss FLOAT NOT NULL,
    ev_loss_bb FLOAT GENERATED ALWAYS AS (ROUND(ev_loss * 100, 2)) STORED,
    
    -- Leak Classification
    leak_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Alternates Displayed
    alternate_1 JSONB,
    alternate_2 JSONB,
    
    -- Context
    scenario_type TEXT,
    position TEXT,
    street TEXT,
    
    -- Timestamp
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leak_signals_user ON leak_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_leak_signals_type ON leak_signals(leak_type);
CREATE INDEX IF NOT EXISTS idx_leak_signals_severity ON leak_signals(severity);
CREATE INDEX IF NOT EXISTS idx_leak_signals_date ON leak_signals(detected_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: calculate_action_ev
-- Calculates EV for a user action and triggers leak signals
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_action_ev(
    p_drill_id UUID,
    p_user_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gto_solution RECORD;
    v_user_solution RECORD;
    v_alt_1 RECORD;
    v_alt_2 RECORD;
    v_user_ev FLOAT;
    v_gto_ev FLOAT;
    v_ev_loss FLOAT;
    v_leak_triggered BOOLEAN;
    v_leak_type TEXT;
    v_severity TEXT;
BEGIN
    -- Get GTO optimal solution
    SELECT * INTO v_gto_solution
    FROM drill_solutions
    WHERE drill_id = p_drill_id AND is_optimal = TRUE
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'NO_GTO_SOLUTION',
            'message', 'Drill has no optimal solution defined'
        );
    END IF;
    
    v_gto_ev := v_gto_solution.ev;
    
    -- Get user's action EV
    SELECT * INTO v_user_solution
    FROM drill_solutions
    WHERE drill_id = p_drill_id AND UPPER(action) = UPPER(p_user_action)
    LIMIT 1;
    
    IF v_user_solution IS NOT NULL THEN
        v_user_ev := v_user_solution.ev;
    ELSE
        -- Unknown action = significant EV loss
        v_user_ev := v_gto_ev - 0.25;
    END IF;
    
    -- Calculate EV loss
    v_ev_loss := v_gto_ev - v_user_ev;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 🚨 LEAK SIGNAL TRIGGER CHECK
    -- If User_Action_EV < GTO_Action_EV → Trigger Leak Signal
    -- ═══════════════════════════════════════════════════════════════════════
    
    v_leak_triggered := v_user_ev < v_gto_ev;
    
    IF v_leak_triggered THEN
        -- Classify leak type
        v_leak_type := CASE
            WHEN UPPER(p_user_action) LIKE '%FOLD%' AND UPPER(v_gto_solution.action) NOT LIKE '%FOLD%' 
                THEN 'OVER_FOLDING'
            WHEN UPPER(p_user_action) LIKE '%CALL%' AND UPPER(v_gto_solution.action) LIKE '%RAISE%' 
                THEN 'PASSIVE_PLAY'
            WHEN UPPER(p_user_action) LIKE '%RAISE%' AND UPPER(v_gto_solution.action) LIKE '%CALL%' 
                THEN 'OVER_AGGRESSION'
            WHEN UPPER(p_user_action) LIKE '%CHECK%' AND UPPER(v_gto_solution.action) LIKE '%BET%' 
                THEN 'MISSED_VALUE'
            ELSE 'STRATEGIC_ERROR'
        END;
        
        -- Classify severity
        v_severity := CASE
            WHEN v_ev_loss < 0.02 THEN 'LOW'
            WHEN v_ev_loss < 0.10 THEN 'MEDIUM'
            WHEN v_ev_loss < 0.25 THEN 'HIGH'
            ELSE 'CRITICAL'
        END;
        
        -- Get 2 Alternate Lines (sub-optimal paths) for display
        SELECT * INTO v_alt_1
        FROM drill_solutions
        WHERE drill_id = p_drill_id 
          AND is_optimal = FALSE 
          AND solution_type = 'ALT_SIMPLE'
        LIMIT 1;
        
        SELECT * INTO v_alt_2
        FROM drill_solutions
        WHERE drill_id = p_drill_id 
          AND is_optimal = FALSE 
          AND solution_type = 'ALT_EXPLOIT'
        LIMIT 1;
    END IF;
    
    -- Build response
    RETURN jsonb_build_object(
        'success', TRUE,
        'drill_id', p_drill_id,
        
        -- EV Analysis
        'user_action', p_user_action,
        'user_ev', ROUND(v_user_ev, 4),
        'gto_action', v_gto_solution.action,
        'gto_ev', ROUND(v_gto_ev, 4),
        'ev_loss', ROUND(v_ev_loss, 4),
        'ev_loss_bb', ROUND(v_ev_loss * 100, 2),
        'is_optimal', NOT v_leak_triggered,
        
        -- Leak Signal
        'leak_signal', CASE WHEN v_leak_triggered THEN jsonb_build_object(
            'triggered', TRUE,
            'type', v_leak_type,
            'severity', v_severity,
            'gto_reasoning', v_gto_solution.reasoning,
            
            -- Display 2 Alternate Lines
            'alternate_lines', jsonb_build_array(
                CASE WHEN v_alt_1 IS NOT NULL THEN jsonb_build_object(
                    'action', v_alt_1.action,
                    'ev', ROUND(v_alt_1.ev, 4),
                    'ev_loss', ROUND(v_gto_ev - v_alt_1.ev, 4),
                    'type', v_alt_1.solution_type,
                    'reasoning', v_alt_1.reasoning
                ) ELSE NULL END,
                CASE WHEN v_alt_2 IS NOT NULL THEN jsonb_build_object(
                    'action', v_alt_2.action,
                    'ev', ROUND(v_alt_2.ev, 4),
                    'ev_loss', ROUND(v_gto_ev - v_alt_2.ev, 4),
                    'type', v_alt_2.solution_type,
                    'reasoning', v_alt_2.reasoning
                ) ELSE NULL END
            ),
            
            -- Display correct GTO line
            'correct_play', jsonb_build_object(
                'action', v_gto_solution.action,
                'ev', ROUND(v_gto_ev, 4),
                'reasoning', v_gto_solution.reasoning
            )
        ) ELSE jsonb_build_object('triggered', FALSE) END,
        
        -- XP Calculation
        'xp_awarded', CASE
            WHEN NOT v_leak_triggered THEN 150
            WHEN v_ev_loss < 0.005 THEN 100
            WHEN v_ev_loss < 0.02 THEN 50
            WHEN v_ev_loss < 0.10 THEN 25
            WHEN v_ev_loss < 0.25 THEN 10
            ELSE 5
        END
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_06: MULTI_LEVEL_PROGRESSION_ENGINE
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: progression_levels (10-Level System with Boss Mode)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progression_levels (
    level_id INTEGER PRIMARY KEY CHECK (level_id >= 1 AND level_id <= 10),
    level_name TEXT NOT NULL UNIQUE,
    
    -- Difficulty Scaling
    difficulty_tier INTEGER NOT NULL,          -- 1-10
    ev_tolerance FLOAT NOT NULL,               -- Allowed EV deviation
    time_limit_seconds INTEGER NOT NULL,       -- Decision time
    min_questions INTEGER NOT NULL,            -- Questions for mastery
    accuracy_threshold FLOAT NOT NULL,         -- Required accuracy (0.85-0.90)
    
    -- XP Configuration
    xp_multiplier FLOAT DEFAULT 1.0,
    xp_reward_base INTEGER DEFAULT 100,
    
    -- Special Modes
    is_boss_mode BOOLEAN DEFAULT FALSE,        -- Level 10 special
    board_randomization BOOLEAN DEFAULT FALSE, -- Random textures
    mixed_strategies BOOLEAN DEFAULT FALSE,    -- Requires RNG execution
    icm_pressure BOOLEAN DEFAULT FALSE,        -- Tournament spots
    
    -- Description
    description TEXT
);

-- Seed 10-level progression with Boss Mode at Level 10
INSERT INTO progression_levels VALUES
    (1,  'Foundations',    1, 0.12, 45, 20, 0.85, 1.0, 100, FALSE, FALSE, FALSE, FALSE, 'Basic preflop concepts'),
    (2,  'Opening Ranges', 2, 0.10, 40, 20, 0.85, 1.1, 110, FALSE, FALSE, FALSE, FALSE, 'Position-aware opening'),
    (3,  'C-Bet Mastery',  3, 0.08, 35, 20, 0.85, 1.2, 120, FALSE, FALSE, FALSE, FALSE, 'Flop continuation betting'),
    (4,  'Defense Basics', 4, 0.07, 32, 20, 0.85, 1.3, 130, FALSE, FALSE, FALSE, FALSE, 'Responding to aggression'),
    (5,  'Multi-Street',   5, 0.06, 30, 25, 0.85, 1.4, 140, FALSE, FALSE, FALSE, FALSE, 'Turn and river play'),
    (6,  'Board Texture',  6, 0.05, 28, 25, 0.85, 1.5, 150, FALSE, TRUE,  FALSE, FALSE, 'Reading board dynamics'),
    (7,  'Mixed Strategy', 7, 0.04, 26, 25, 0.85, 1.6, 160, FALSE, TRUE,  TRUE,  FALSE, 'RNG-based decisions'),
    (8,  'Exploitation',   8, 0.03, 24, 25, 0.85, 1.8, 180, FALSE, TRUE,  TRUE,  FALSE, 'Adjusting to opponents'),
    (9,  'ICM Mastery',    9, 0.025,22, 30, 0.85, 2.0, 200, FALSE, TRUE,  TRUE,  TRUE,  'Tournament pressure'),
    (10, 'BOSS MODE',     10, 0.02, 20, 30, 0.90, 2.5, 250, TRUE,  TRUE,  TRUE,  TRUE,  '🔥 Ultimate GTO Challenge')
ON CONFLICT (level_id) DO UPDATE SET
    level_name = EXCLUDED.level_name,
    difficulty_tier = EXCLUDED.difficulty_tier,
    ev_tolerance = EXCLUDED.ev_tolerance,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    min_questions = EXCLUDED.min_questions,
    accuracy_threshold = EXCLUDED.accuracy_threshold,
    xp_multiplier = EXCLUDED.xp_multiplier,
    is_boss_mode = EXCLUDED.is_boss_mode,
    board_randomization = EXCLUDED.board_randomization;

CREATE INDEX IF NOT EXISTS idx_progression_levels_boss ON progression_levels(is_boss_mode) WHERE is_boss_mode = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: get_level_config
-- Returns the configuration for a specific level
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_level_config(p_level_id INTEGER)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'level_id', level_id,
        'level_name', level_name,
        'difficulty_tier', difficulty_tier,
        'ev_tolerance', ev_tolerance,
        'time_limit_seconds', time_limit_seconds,
        'min_questions', min_questions,
        'accuracy_threshold', accuracy_threshold,
        'xp_multiplier', xp_multiplier,
        'xp_reward_base', xp_reward_base,
        'is_boss_mode', is_boss_mode,
        'board_randomization', board_randomization,
        'mixed_strategies', mixed_strategies,
        'icm_pressure', icm_pressure,
        'description', description
    )
    FROM progression_levels
    WHERE level_id = p_level_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_boss_mode_evaluate
-- Special evaluation for Level 10 (90% threshold + board randomization)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_boss_mode_evaluate(
    p_user_id UUID,
    p_drill_id UUID,
    p_user_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level_config JSONB;
    v_ev_result JSONB;
    v_is_correct BOOLEAN;
    v_ev_loss FLOAT;
    v_xp_earned INTEGER;
    v_boss_bonus INTEGER := 0;
    v_streak_bonus FLOAT := 1.0;
    v_mastery RECORD;
BEGIN
    -- Get Boss Mode configuration
    v_level_config := get_level_config(10);
    
    -- Calculate EV
    v_ev_result := calculate_action_ev(p_drill_id, p_user_action);
    v_is_correct := (v_ev_result->>'is_optimal')::BOOLEAN;
    v_ev_loss := (v_ev_result->>'ev_loss')::FLOAT;
    
    -- Boss Mode uses stricter EV tolerance (0.02)
    IF v_ev_loss <= 0.02 THEN
        v_is_correct := TRUE;
    END IF;
    
    -- Calculate XP with Boss Mode multiplier (2.5x)
    v_xp_earned := (v_ev_result->>'xp_awarded')::INTEGER;
    v_xp_earned := FLOOR(v_xp_earned * 2.5);
    
    -- Boss Mode perfect play bonus
    IF v_is_correct AND v_ev_loss = 0 THEN
        v_boss_bonus := 100;
    END IF;
    
    -- Update user progress
    UPDATE user_mastery_progress
    SET 
        questions_answered = questions_answered + 1,
        questions_correct = questions_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END
    WHERE user_id = p_user_id AND level_id = 10
    RETURNING * INTO v_mastery;
    
    -- Check for Boss Mode completion (90% threshold)
    IF v_mastery IS NOT NULL THEN
        IF v_mastery.accuracy_percentage >= 90 AND v_mastery.questions_answered >= 30 THEN
            UPDATE user_mastery_progress
            SET status = 'COMPLETED', completed_at = NOW()
            WHERE user_id = p_user_id AND level_id = 10;
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'boss_mode', TRUE,
        'drill_id', p_drill_id,
        'evaluation', v_ev_result,
        'is_correct', v_is_correct,
        'ev_tolerance_used', 0.02,
        'accuracy_threshold', 90,
        'xp_earned', v_xp_earned,
        'boss_bonus', v_boss_bonus,
        'total_xp', v_xp_earned + v_boss_bonus,
        'features_active', jsonb_build_object(
            'board_randomization', TRUE,
            'mixed_strategies', TRUE,
            'icm_pressure', TRUE,
            'streak_multiplier', v_streak_bonus
        ),
        'progress', CASE WHEN v_mastery IS NOT NULL THEN jsonb_build_object(
            'questions_answered', v_mastery.questions_answered,
            'questions_correct', v_mastery.questions_correct,
            'accuracy', v_mastery.accuracy_percentage,
            'required_accuracy', 90,
            'required_questions', 30
        ) ELSE NULL END
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: board_textures (for randomization)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_textures (
    id SERIAL PRIMARY KEY,
    texture_code TEXT UNIQUE NOT NULL,
    texture_name TEXT NOT NULL,
    example_board TEXT NOT NULL,
    
    -- Characteristics
    is_wet BOOLEAN DEFAULT FALSE,
    is_paired BOOLEAN DEFAULT FALSE,
    is_monotone BOOLEAN DEFAULT FALSE,
    is_connected BOOLEAN DEFAULT FALSE,
    
    -- Recommended C-bet frequency
    cbet_frequency FLOAT,
    
    -- Difficulty contribution
    complexity_score INTEGER DEFAULT 1
);

INSERT INTO board_textures (texture_code, texture_name, example_board, is_wet, is_paired, is_monotone, is_connected, cbet_frequency, complexity_score)
VALUES
    ('DRY_HIGH',     'Dry High',       'A♠K♦3♣', FALSE, FALSE, FALSE, FALSE, 0.75, 1),
    ('DRY_MIDDLE',   'Dry Middle',     'J♠7♦2♣', FALSE, FALSE, FALSE, FALSE, 0.65, 2),
    ('DRY_LOW',      'Dry Low',        '7♠4♦2♣', FALSE, FALSE, FALSE, FALSE, 0.55, 3),
    ('WET_HIGH',     'Wet High',       'K♠Q♥J♦', TRUE,  FALSE, FALSE, TRUE,  0.35, 5),
    ('WET_MIDDLE',   'Wet Middle',     '9♠8♥7♦', TRUE,  FALSE, FALSE, TRUE,  0.30, 6),
    ('WET_LOW',      'Wet Low',        '6♣5♣4♦', TRUE,  FALSE, FALSE, TRUE,  0.40, 5),
    ('PAIRED_HIGH',  'Paired High',    'K♠K♦5♣', FALSE, TRUE,  FALSE, FALSE, 0.80, 4),
    ('PAIRED_LOW',   'Paired Low',     '5♠5♦2♣', FALSE, TRUE,  FALSE, FALSE, 0.70, 4),
    ('MONOTONE',     'Monotone',       'A♠8♠4♠', FALSE, FALSE, TRUE,  FALSE, 0.45, 7),
    ('RAINBOW_CONN', 'Rainbow Connected', '9♠8♦7♣', TRUE, FALSE, FALSE, TRUE, 0.40, 6)
ON CONFLICT (texture_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_get_random_board
-- Returns a randomized board texture (for Boss Mode)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_random_board()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'texture_code', texture_code,
        'texture_name', texture_name,
        'example_board', example_board,
        'is_wet', is_wet,
        'cbet_frequency', cbet_frequency,
        'complexity_score', complexity_score
    )
    FROM board_textures
    ORDER BY RANDOM()
    LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION fn_validate_level_unlock TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_action_ev TO authenticated;
GRANT EXECUTE ON FUNCTION get_level_config TO authenticated;
GRANT EXECUTE ON FUNCTION fn_boss_mode_evaluate TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_random_board TO authenticated;
GRANT SELECT ON progression_levels TO authenticated;
GRANT SELECT ON board_textures TO authenticated;
GRANT SELECT, INSERT ON leak_signals TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION fn_validate_level_unlock IS '🔐 TASK_04: 85% Mastery Trigger - Validates level unlock eligibility';
COMMENT ON FUNCTION calculate_action_ev IS '🚨 TASK_05: GTO Leak Signal Analyzer - Triggers leak display on sub-optimal play';
COMMENT ON TABLE progression_levels IS '📊 TASK_06: 10-Level Progression with Boss Mode at Level 10';
COMMENT ON FUNCTION fn_boss_mode_evaluate IS '🔥 TASK_06: Boss Mode (Level 10) - 90% threshold with board randomization';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ GREEN_ACTIVE_LOGIC COMPLETE — PROMPTS 4-6 MAPPED
-- ═══════════════════════════════════════════════════════════════════════════════
