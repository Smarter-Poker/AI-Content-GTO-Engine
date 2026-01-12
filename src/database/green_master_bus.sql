-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛰️ GREEN_MASTER_BUS: PROMPTS 10-12
-- ═══════════════════════════════════════════════════════════════════════════════
-- @silo AI_CONTENT_GTO_ENGINE (GREEN)
-- @target ORB_4 (Training) | ORB_7 (Diamond Arcade) | YELLOW Silo
-- 
-- TASK_10: GTO_TRUTH_DATA_MIGRATION
-- TASK_11: 85_PERCENT_REWARD_ORACLE
-- TASK_12: LEVEL_UP_BROADCAST_SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_10: GTO_TRUTH_DATA_MIGRATION
-- Force-write drill_solutions schema with EV > 0 requirement
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop and recreate for clean migration
DROP TABLE IF EXISTS gto_truth_solutions CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: gto_truth_solutions
-- Master truth table for GTO solutions - PRIMARY PATH MUST HAVE EV > 0
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE gto_truth_solutions (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drill_id UUID NOT NULL,
    scenario_id TEXT NOT NULL,
    
    -- Solution Classification
    solution_type TEXT NOT NULL CHECK (solution_type IN (
        'GTO_PRIMARY',    -- Primary optimal path (EV > 0 REQUIRED)
        'GTO_SECONDARY',  -- Secondary optimal path
        'ALT_SIMPLE',     -- Simplified human-executable
        'ALT_EXPLOIT'     -- Population exploitative
    )),
    is_primary BOOLEAN GENERATED ALWAYS AS (solution_type = 'GTO_PRIMARY') STORED,
    
    -- Action Details
    action TEXT NOT NULL,
    action_category TEXT NOT NULL CHECK (action_category IN (
        'FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN'
    )),
    sizing TEXT,  -- '33', '50', '75', '100', 'ALL_IN'
    
    -- Expected Value (EV)
    ev FLOAT NOT NULL,
    ev_bb FLOAT GENERATED ALWAYS AS (ROUND(ev * 100, 2)) STORED,
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 🔐 HARD LAW: PRIMARY GTO PATH MUST HAVE EV > 0
    -- ═══════════════════════════════════════════════════════════════════════
    CONSTRAINT gto_primary_positive_ev CHECK (
        solution_type != 'GTO_PRIMARY' OR ev > 0
    ),
    
    -- Frequency (for mixed strategies)
    frequency FLOAT DEFAULT 1.0 CHECK (frequency >= 0 AND frequency <= 1),
    
    -- XP & Scoring
    xp_if_chosen INTEGER NOT NULL DEFAULT 0,
    mistake_tier TEXT CHECK (mistake_tier IN (
        'OPTIMAL', 'ACCEPTABLE', 'MINOR', 'MODERATE', 'MAJOR', 'BLUNDER'
    )),
    
    -- Educational
    reasoning TEXT,
    solver_source TEXT DEFAULT 'PioSolver',
    
    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMPTZ,
    validated_by TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per drill/action
    UNIQUE(drill_id, action)
);

CREATE INDEX idx_gto_truth_drill ON gto_truth_solutions(drill_id);
CREATE INDEX idx_gto_truth_primary ON gto_truth_solutions(drill_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX idx_gto_truth_type ON gto_truth_solutions(solution_type);
CREATE INDEX idx_gto_truth_ev ON gto_truth_solutions(ev DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔐 TRIGGER: enforce_primary_gto_path
-- Ensures every scenario has at least one GTO_PRIMARY path with EV > 0
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_primary_gto_path()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check on drill becoming READY
    IF TG_TABLE_NAME = 'drills' AND NEW.status = 'READY' THEN
        IF NOT EXISTS (
            SELECT 1 FROM gto_truth_solutions 
            WHERE drill_id = NEW.id 
            AND solution_type = 'GTO_PRIMARY' 
            AND ev > 0
        ) THEN
            RAISE EXCEPTION '🔐 HARD LAW: Drill % must have a GTO_PRIMARY path with EV > 0', NEW.drill_code;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_migrate_gto_truth
-- Migration function to populate GTO truth data
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_migrate_gto_truth(
    p_drill_id UUID,
    p_scenario_id TEXT,
    p_solutions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_solution JSONB;
    v_count INTEGER := 0;
    v_primary_found BOOLEAN := FALSE;
BEGIN
    -- Iterate through solutions
    FOR v_solution IN SELECT * FROM jsonb_array_elements(p_solutions)
    LOOP
        -- Validate primary GTO has EV > 0
        IF (v_solution->>'solution_type') = 'GTO_PRIMARY' THEN
            IF (v_solution->>'ev')::FLOAT <= 0 THEN
                RAISE EXCEPTION '🔐 HARD LAW VIOLATION: GTO_PRIMARY must have EV > 0, got %', 
                    v_solution->>'ev';
            END IF;
            v_primary_found := TRUE;
        END IF;
        
        -- Insert solution
        INSERT INTO gto_truth_solutions (
            drill_id, scenario_id, solution_type, action, action_category, 
            sizing, ev, frequency, xp_if_chosen, mistake_tier, reasoning
        )
        VALUES (
            p_drill_id,
            p_scenario_id,
            v_solution->>'solution_type',
            v_solution->>'action',
            v_solution->>'action_category',
            v_solution->>'sizing',
            (v_solution->>'ev')::FLOAT,
            COALESCE((v_solution->>'frequency')::FLOAT, 1.0),
            COALESCE((v_solution->>'xp_if_chosen')::INTEGER, 0),
            v_solution->>'mistake_tier',
            v_solution->>'reasoning'
        )
        ON CONFLICT (drill_id, action) DO UPDATE SET
            ev = (v_solution->>'ev')::FLOAT,
            reasoning = v_solution->>'reasoning',
            updated_at = NOW();
        
        v_count := v_count + 1;
    END LOOP;
    
    -- Validate primary path exists
    IF NOT v_primary_found THEN
        RAISE EXCEPTION '🔐 HARD LAW VIOLATION: Migration must include GTO_PRIMARY path';
    END IF;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'drill_id', p_drill_id,
        'solutions_migrated', v_count,
        'primary_path_verified', TRUE
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_11: 85_PERCENT_REWARD_ORACLE
-- MINT_SIGNAL RPC - Broadcasts SUCCESS to YELLOW Silo on 85%+ accuracy
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: mint_signals
-- Tracks SUCCESS packets sent to YELLOW Silo
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mint_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID NOT NULL,
    
    -- Session Metrics
    accuracy FLOAT NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    
    -- Signal Type
    signal_type TEXT NOT NULL CHECK (signal_type IN ('SUCCESS', 'FAILURE', 'PERFECT')),
    
    -- Rewards (sent to YELLOW Silo)
    xp_reward INTEGER NOT NULL,
    diamond_reward INTEGER NOT NULL,
    streak_bonus INTEGER DEFAULT 0,
    perfect_bonus INTEGER DEFAULT 0,
    
    -- YELLOW Silo Delivery
    yellow_silo_delivered BOOLEAN DEFAULT FALSE,
    yellow_silo_delivered_at TIMESTAMPTZ,
    yellow_silo_transaction_id UUID,
    
    -- Broadcast
    broadcasted_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX idx_mint_signals_user ON mint_signals(user_id);
CREATE INDEX idx_mint_signals_type ON mint_signals(signal_type);
CREATE INDEX idx_mint_signals_pending ON mint_signals(yellow_silo_delivered) WHERE yellow_silo_delivered = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_mint_signal (THE 85% REWARD ORACLE)
-- HARD LAW: If session accuracy >= 0.85, broadcast SUCCESS packet to YELLOW Silo
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_mint_signal(
    p_user_id UUID,
    p_session_id UUID,
    p_level_id INTEGER,
    p_correct_answers INTEGER,
    p_total_questions INTEGER,
    p_current_streak INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_accuracy FLOAT;
    v_signal_type TEXT;
    v_xp_reward INTEGER;
    v_diamond_reward INTEGER;
    v_streak_bonus INTEGER := 0;
    v_perfect_bonus INTEGER := 0;
    v_signal_id UUID;
    v_scaling RECORD;
BEGIN
    -- Calculate accuracy
    v_accuracy := CASE 
        WHEN p_total_questions > 0 
        THEN p_correct_answers::FLOAT / p_total_questions 
        ELSE 0 
    END;
    
    -- Get reward scaling for level
    SELECT * INTO v_scaling FROM xp_reward_scaling WHERE level_id = p_level_id;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 🔐 85% REWARD ORACLE: Determine signal type
    -- ═══════════════════════════════════════════════════════════════════════
    
    IF v_accuracy >= 1.0 THEN
        v_signal_type := 'PERFECT';
        v_perfect_bonus := COALESCE(v_scaling.perfect_session_bonus, 500);
    ELSIF v_accuracy >= 0.85 THEN
        v_signal_type := 'SUCCESS';
    ELSE
        v_signal_type := 'FAILURE';
    END IF;
    
    -- Calculate base rewards
    v_xp_reward := FLOOR(COALESCE(v_scaling.base_xp, 100) * p_correct_answers * COALESCE(v_scaling.xp_multiplier, 1.0));
    v_diamond_reward := FLOOR(COALESCE(v_scaling.base_diamond_reward, 5) * (p_correct_answers::FLOAT / 10));
    
    -- Apply Elite bonus (+25%)
    IF COALESCE(v_scaling.diamond_bonus_percentage, 0) > 0 THEN
        v_diamond_reward := FLOOR(v_diamond_reward * 1.25);
    END IF;
    
    -- Apply streak bonus
    IF p_current_streak >= 10 THEN
        v_streak_bonus := FLOOR(v_xp_reward * 0.5);
    ELSIF p_current_streak >= 5 THEN
        v_streak_bonus := FLOOR(v_xp_reward * 0.25);
    ELSIF p_current_streak >= 3 THEN
        v_streak_bonus := FLOOR(v_xp_reward * 0.1);
    END IF;
    
    v_xp_reward := v_xp_reward + v_streak_bonus + v_perfect_bonus;
    
    -- Log the mint signal
    INSERT INTO mint_signals (
        user_id, session_id, accuracy, correct_answers, total_questions,
        level_id, signal_type, xp_reward, diamond_reward, streak_bonus, perfect_bonus
    )
    VALUES (
        p_user_id, p_session_id, v_accuracy, p_correct_answers, p_total_questions,
        p_level_id, v_signal_type, v_xp_reward, v_diamond_reward, v_streak_bonus, v_perfect_bonus
    )
    RETURNING id INTO v_signal_id;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 📡 BROADCAST TO YELLOW SILO (if SUCCESS or PERFECT)
    -- ═══════════════════════════════════════════════════════════════════════
    
    IF v_signal_type IN ('SUCCESS', 'PERFECT') THEN
        -- The actual YELLOW Silo call would happen here via pg_notify or external webhook
        -- For now, we mark it as pending delivery
        PERFORM pg_notify('yellow_silo_mint', jsonb_build_object(
            'signal_id', v_signal_id,
            'user_id', p_user_id,
            'xp', v_xp_reward,
            'diamonds', v_diamond_reward,
            'type', v_signal_type
        )::TEXT);
    END IF;
    
    -- Return the signal packet
    RETURN jsonb_build_object(
        'success', TRUE,
        'signal_id', v_signal_id,
        'signal_type', v_signal_type,
        
        -- Performance
        'accuracy', ROUND(v_accuracy * 100, 2),
        'correct', p_correct_answers,
        'total', p_total_questions,
        'streak', p_current_streak,
        
        -- Rewards
        'rewards', jsonb_build_object(
            'xp', v_xp_reward,
            'diamonds', v_diamond_reward,
            'streak_bonus', v_streak_bonus,
            'perfect_bonus', v_perfect_bonus,
            'total_xp', v_xp_reward
        ),
        
        -- Silo Broadcast
        'yellow_silo_broadcast', v_signal_type IN ('SUCCESS', 'PERFECT'),
        'broadcast_channel', 'yellow_silo_mint',
        
        -- Message
        'message', CASE v_signal_type
            WHEN 'PERFECT' THEN '🏆 PERFECT SESSION! Maximum rewards applied!'
            WHEN 'SUCCESS' THEN '✅ 85%+ Mastery achieved! Rewards minted!'
            ELSE '❌ Below 85% threshold. Keep practicing!'
        END
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_12: LEVEL_UP_BROADCAST_SYSTEM
-- Realtime Mastery Stream with "Level Unlocked" global events
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: mastery_events
-- Realtime event stream for level unlocks and achievements
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mastery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Event Details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'LEVEL_UNLOCKED',
        'LEVEL_MASTERED', 
        'PERFECT_SESSION',
        'STREAK_MILESTONE',
        'BOSS_MODE_COMPLETE',
        'LEADERBOARD_CLIMB'
    )),
    
    -- Event Data
    event_data JSONB NOT NULL,
    
    -- Level Info
    level_id INTEGER,
    level_name TEXT,
    from_level INTEGER,
    to_level INTEGER,
    
    -- Trigger Source
    trigger_source TEXT,  -- 'MINT_SIGNAL', 'MANUAL', 'SYSTEM'
    trigger_id UUID,      -- Reference to mint_signal or session
    
    -- Broadcast Status
    is_global BOOLEAN DEFAULT FALSE,  -- Visible on global feed
    is_broadcasted BOOLEAN DEFAULT FALSE,
    broadcasted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mastery_events_user ON mastery_events(user_id);
CREATE INDEX idx_mastery_events_type ON mastery_events(event_type);
CREATE INDEX idx_mastery_events_global ON mastery_events(is_global, created_at DESC) WHERE is_global = TRUE;
CREATE INDEX idx_mastery_events_pending ON mastery_events(is_broadcasted) WHERE is_broadcasted = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_broadcast_level_unlock
-- Triggers "Level Unlocked" global event
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_broadcast_level_unlock(
    p_user_id UUID,
    p_level_id INTEGER,
    p_trigger_source TEXT DEFAULT 'MINT_SIGNAL',
    p_trigger_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level RECORD;
    v_prev_level RECORD;
    v_event_id UUID;
    v_event_data JSONB;
BEGIN
    -- Get level info
    SELECT * INTO v_level FROM progression_levels WHERE level_id = p_level_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_LEVEL');
    END IF;
    
    -- Get previous level for comparison
    SELECT * INTO v_prev_level FROM progression_levels WHERE level_id = p_level_id - 1;
    
    -- Build event data
    v_event_data := jsonb_build_object(
        'level_id', p_level_id,
        'level_name', v_level.level_name,
        'difficulty_tier', v_level.difficulty_tier,
        'is_boss_mode', v_level.is_boss_mode,
        'xp_multiplier', v_level.xp_multiplier,
        'unlocked_at', NOW()
    );
    
    -- Insert mastery event
    INSERT INTO mastery_events (
        user_id, event_type, event_data, level_id, level_name,
        from_level, to_level, trigger_source, trigger_id, is_global
    )
    VALUES (
        p_user_id,
        CASE WHEN v_level.is_boss_mode THEN 'BOSS_MODE_COMPLETE' ELSE 'LEVEL_UNLOCKED' END,
        v_event_data,
        p_level_id,
        v_level.level_name,
        p_level_id - 1,
        p_level_id,
        p_trigger_source,
        p_trigger_id,
        p_level_id >= 5  -- Levels 5+ are global broadcasts
    )
    RETURNING id INTO v_event_id;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 📡 REALTIME BROADCAST via pg_notify
    -- ═══════════════════════════════════════════════════════════════════════
    
    PERFORM pg_notify('realtime_mastery_stream', jsonb_build_object(
        'event_id', v_event_id,
        'event_type', CASE WHEN v_level.is_boss_mode THEN 'BOSS_MODE_COMPLETE' ELSE 'LEVEL_UNLOCKED' END,
        'user_id', p_user_id,
        'level_id', p_level_id,
        'level_name', v_level.level_name,
        'is_global', p_level_id >= 5,
        'timestamp', NOW()
    )::TEXT);
    
    -- Mark as broadcasted
    UPDATE mastery_events
    SET is_broadcasted = TRUE, broadcasted_at = NOW()
    WHERE id = v_event_id;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'event_id', v_event_id,
        'event_type', CASE WHEN v_level.is_boss_mode THEN 'BOSS_MODE_COMPLETE' ELSE 'LEVEL_UNLOCKED' END,
        'user_id', p_user_id,
        'level', jsonb_build_object(
            'id', p_level_id,
            'name', v_level.level_name,
            'difficulty', v_level.difficulty_tier,
            'is_boss_mode', v_level.is_boss_mode
        ),
        'broadcast_channel', 'realtime_mastery_stream',
        'is_global_broadcast', p_level_id >= 5,
        'message', format('🎉 %s unlocked %s!', 
            'Player', 
            CASE WHEN v_level.is_boss_mode THEN '🔥 BOSS MODE' ELSE v_level.level_name END
        )
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: fn_process_session_complete
-- Orchestrates MINT_SIGNAL + Level Unlock in one transaction
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_process_session_complete(
    p_user_id UUID,
    p_level_id INTEGER,
    p_correct_answers INTEGER,
    p_total_questions INTEGER,
    p_current_streak INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID := gen_random_uuid();
    v_mint_result JSONB;
    v_unlock_result JSONB;
    v_accuracy FLOAT;
    v_can_unlock_next BOOLEAN := FALSE;
    v_mastery RECORD;
BEGIN
    -- Calculate accuracy
    v_accuracy := CASE 
        WHEN p_total_questions > 0 
        THEN p_correct_answers::FLOAT / p_total_questions 
        ELSE 0 
    END;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 📡 TASK 11: Trigger MINT_SIGNAL
    -- ═══════════════════════════════════════════════════════════════════════
    
    v_mint_result := fn_mint_signal(
        p_user_id, v_session_id, p_level_id,
        p_correct_answers, p_total_questions, p_current_streak
    );
    
    -- Update user mastery progress
    INSERT INTO user_mastery_progress (user_id, level_id, status, questions_answered, questions_correct)
    VALUES (p_user_id, p_level_id, 'ACTIVE', p_total_questions, p_correct_answers)
    ON CONFLICT (user_id, level_id) DO UPDATE SET
        questions_answered = user_mastery_progress.questions_answered + p_total_questions,
        questions_correct = user_mastery_progress.questions_correct + p_correct_answers,
        updated_at = NOW()
    RETURNING * INTO v_mastery;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- 📡 TASK 12: Check for Level Unlock Trigger
    -- ═══════════════════════════════════════════════════════════════════════
    
    -- Check if user can unlock next level (85% + 20q)
    IF v_mastery.accuracy_percentage >= 85 AND v_mastery.questions_answered >= 20 THEN
        -- Try to unlock next level
        v_unlock_result := fn_validate_level_unlock(p_user_id, p_level_id + 1);
        
        IF (v_unlock_result->>'valid')::BOOLEAN THEN
            -- Broadcast level unlock
            v_unlock_result := fn_broadcast_level_unlock(
                p_user_id, 
                p_level_id + 1,
                'MINT_SIGNAL',
                (v_mint_result->>'signal_id')::UUID
            );
            v_can_unlock_next := TRUE;
            
            -- Mark current level as completed
            UPDATE user_mastery_progress
            SET status = 'COMPLETED', completed_at = NOW()
            WHERE user_id = p_user_id AND level_id = p_level_id;
        END IF;
    END IF;
    
    -- Return combined result
    RETURN jsonb_build_object(
        'success', TRUE,
        'session_id', v_session_id,
        'mint_signal', v_mint_result,
        'progress', jsonb_build_object(
            'level_id', p_level_id,
            'accuracy', v_mastery.accuracy_percentage,
            'questions_answered', v_mastery.questions_answered,
            'status', v_mastery.status
        ),
        'level_unlock', CASE WHEN v_can_unlock_next THEN v_unlock_result ELSE NULL END,
        'next_level_unlocked', v_can_unlock_next
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 VIEW: realtime_global_feed
-- Global activity feed for competitive engagement
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW realtime_global_feed AS
SELECT 
    id,
    user_id,
    event_type,
    level_name,
    to_level,
    event_data,
    created_at,
    CASE event_type
        WHEN 'LEVEL_UNLOCKED' THEN format('🎉 unlocked %s', level_name)
        WHEN 'LEVEL_MASTERED' THEN format('🏆 mastered %s', level_name)
        WHEN 'PERFECT_SESSION' THEN '💯 achieved a perfect session'
        WHEN 'BOSS_MODE_COMPLETE' THEN '🔥 completed BOSS MODE'
        WHEN 'STREAK_MILESTONE' THEN format('🔥 reached a %s streak', event_data->>'streak')
        ELSE event_type
    END AS event_description
FROM mastery_events
WHERE is_global = TRUE
ORDER BY created_at DESC
LIMIT 100;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT, INSERT ON gto_truth_solutions TO authenticated;
GRANT SELECT, INSERT ON mint_signals TO authenticated;
GRANT SELECT, INSERT ON mastery_events TO authenticated;
GRANT SELECT ON realtime_global_feed TO authenticated;

GRANT EXECUTE ON FUNCTION fn_migrate_gto_truth TO authenticated;
GRANT EXECUTE ON FUNCTION fn_mint_signal TO authenticated;
GRANT EXECUTE ON FUNCTION fn_broadcast_level_unlock TO authenticated;
GRANT EXECUTE ON FUNCTION fn_process_session_complete TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE gto_truth_solutions IS '📊 TASK_10: GTO Truth Table - PRIMARY path MUST have EV > 0';
COMMENT ON FUNCTION fn_mint_signal IS '📡 TASK_11: 85% Reward Oracle - Broadcasts SUCCESS to YELLOW Silo';
COMMENT ON FUNCTION fn_broadcast_level_unlock IS '📡 TASK_12: Level Unlock Broadcast via realtime_mastery_stream';
COMMENT ON VIEW realtime_global_feed IS '📡 TASK_12: Global activity feed for competitive engagement';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ GREEN_MASTER_BUS COMPLETE — PROMPTS 10-12 MAPPED
-- ═══════════════════════════════════════════════════════════════════════════════
