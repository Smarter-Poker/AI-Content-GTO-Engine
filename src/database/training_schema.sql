-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎯 TRAINING QUESTIONS SCHEMA — GTO DRILL CONTENT
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tables: training_questions, user_question_history
-- Functions: fn_get_unseen_questions, check_level_advancement
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 TRAINING QUESTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Level & Categorization
    level_id INTEGER NOT NULL CHECK (level_id >= 1 AND level_id <= 12),
    concept_category TEXT NOT NULL,
    game_type TEXT NOT NULL DEFAULT 'cash' CHECK (game_type IN ('cash', 'tournament', 'both')),
    difficulty_rating INTEGER DEFAULT 5 CHECK (difficulty_rating >= 1 AND difficulty_rating <= 10),
    
    -- Question Content
    title TEXT NOT NULL,
    description TEXT,
    scenario_context JSONB NOT NULL DEFAULT '{}',
    
    -- Hand & Board State
    hero_cards JSONB NOT NULL,        -- e.g., ["Ah", "Kd"]
    board_cards JSONB DEFAULT '[]',   -- e.g., ["Qs", "Jh", "Tc", "2d"]
    villain_range TEXT,               -- Range notation
    pot_size DECIMAL(10,2),
    effective_stack DECIMAL(10,2),
    position TEXT,                    -- e.g., "BTN", "SB", "UTG"
    street TEXT DEFAULT 'preflop' CHECK (street IN ('preflop', 'flop', 'turn', 'river')),
    
    -- GTO Solution
    gto_line JSONB NOT NULL,          -- { action: "raise", size: "3x", ev: 2.5 }
    alternate_lines JSONB[] NOT NULL DEFAULT '{}', -- Array of alternate plays
    
    -- Action Options
    available_actions JSONB NOT NULL DEFAULT '["fold", "check", "call", "raise"]',
    correct_action TEXT NOT NULL,
    
    -- EV Analysis
    ev_correct DECIMAL(10,4),
    ev_suboptimal DECIMAL(10,4),
    ev_loss_threshold DECIMAL(10,4) DEFAULT 0.5,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    source TEXT,                      -- "pio_solver", "gto_wizard", "custom"
    is_active BOOLEAN DEFAULT true,
    times_shown INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES FOR TRAINING QUESTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_training_questions_level ON training_questions(level_id);
CREATE INDEX IF NOT EXISTS idx_training_questions_category ON training_questions(concept_category);
CREATE INDEX IF NOT EXISTS idx_training_questions_game_type ON training_questions(game_type);
CREATE INDEX IF NOT EXISTS idx_training_questions_active ON training_questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_training_questions_street ON training_questions(street);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📝 USER QUESTION HISTORY TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_question_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES training_questions(id) ON DELETE CASCADE,
    session_id UUID,
    
    -- Response Data
    user_action TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER,
    
    -- EV Analysis
    ev_earned DECIMAL(10,4),
    ev_lost DECIMAL(10,4),
    
    -- Context
    level_at_time INTEGER NOT NULL,
    streak_at_time INTEGER DEFAULT 0,
    multiplier_at_time DECIMAL(3,2) DEFAULT 1.0,
    
    -- Leak Detection
    concept_category TEXT NOT NULL,
    was_leak_signal BOOLEAN DEFAULT false,
    
    -- Rewards
    xp_earned INTEGER DEFAULT 0,
    diamonds_earned INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate answers to same question in same session
    UNIQUE(user_id, question_id, session_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES FOR USER QUESTION HISTORY
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_user_question_history_user ON user_question_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_question ON user_question_history(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_session ON user_question_history(session_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_category ON user_question_history(concept_category);
CREATE INDEX IF NOT EXISTS idx_user_question_history_correct ON user_question_history(is_correct);
CREATE INDEX IF NOT EXISTS idx_user_question_history_created ON user_question_history(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 TRAINING SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Session Configuration
    level_id INTEGER NOT NULL CHECK (level_id >= 1 AND level_id <= 12),
    game_type TEXT NOT NULL DEFAULT 'cash',
    question_count INTEGER DEFAULT 20,
    
    -- Progress
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    
    -- Performance
    accuracy DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN questions_answered > 0 
             THEN correct_answers::DECIMAL / questions_answered 
             ELSE 0 
        END
    ) STORED,
    total_ev_earned DECIMAL(10,4) DEFAULT 0,
    total_ev_lost DECIMAL(10,4) DEFAULT 0,
    
    -- Leak Detection
    leak_signals JSONB DEFAULT '[]',
    concepts_missed JSONB DEFAULT '{}',
    
    -- Rewards
    xp_earned INTEGER DEFAULT 0,
    diamonds_earned INTEGER DEFAULT 0,
    bonus_diamonds INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    mastery_achieved BOOLEAN DEFAULT false,
    level_unlocked INTEGER,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Session Duration
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE WHEN completed_at IS NOT NULL 
             THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER 
             ELSE NULL 
        END
    ) STORED
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES FOR TRAINING SESSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_level ON training_sessions(level_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_mastery ON training_sessions(mastery_achieved) WHERE mastery_achieved = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: GET UNSEEN QUESTIONS (ANTI-REPEAT ALGORITHM)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_get_unseen_questions(
    p_user_id UUID,
    p_target_level INTEGER,
    p_game_type TEXT DEFAULT 'cash',
    p_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    question_id UUID,
    level_id INTEGER,
    concept_category TEXT,
    title TEXT,
    description TEXT,
    scenario_context JSONB,
    hero_cards JSONB,
    board_cards JSONB,
    pot_size DECIMAL,
    effective_stack DECIMAL,
    position TEXT,
    street TEXT,
    gto_line JSONB,
    alternate_lines JSONB[],
    available_actions JSONB,
    correct_action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tq.id AS question_id,
        tq.level_id,
        tq.concept_category,
        tq.title,
        tq.description,
        tq.scenario_context,
        tq.hero_cards,
        tq.board_cards,
        tq.pot_size,
        tq.effective_stack,
        tq.position,
        tq.street,
        tq.gto_line,
        tq.alternate_lines,
        tq.available_actions,
        tq.correct_action
    FROM training_questions tq
    WHERE tq.level_id = p_target_level
      AND tq.is_active = true
      AND (tq.game_type = p_game_type OR tq.game_type = 'both')
      AND tq.id NOT IN (
          SELECT uqh.question_id 
          FROM user_question_history uqh 
          WHERE uqh.user_id = p_user_id
            AND uqh.created_at > NOW() - INTERVAL '7 days'  -- Reset after 7 days
      )
    ORDER BY RANDOM()
    LIMIT p_count;
    
    -- If not enough unseen questions, include seen ones (oldest first)
    IF NOT FOUND OR (SELECT COUNT(*) FROM (
        SELECT 1 FROM training_questions tq2
        WHERE tq2.level_id = p_target_level
          AND tq2.is_active = true
          AND (tq2.game_type = p_game_type OR tq2.game_type = 'both')
          AND tq2.id NOT IN (SELECT uqh.question_id FROM user_question_history uqh WHERE uqh.user_id = p_user_id AND uqh.created_at > NOW() - INTERVAL '7 days')
        LIMIT p_count
    ) AS unseen) < p_count THEN
        RETURN QUERY
        SELECT 
            tq.id AS question_id,
            tq.level_id,
            tq.concept_category,
            tq.title,
            tq.description,
            tq.scenario_context,
            tq.hero_cards,
            tq.board_cards,
            tq.pot_size,
            tq.effective_stack,
            tq.position,
            tq.street,
            tq.gto_line,
            tq.alternate_lines,
            tq.available_actions,
            tq.correct_action
        FROM training_questions tq
        WHERE tq.level_id = p_target_level
          AND tq.is_active = true
          AND (tq.game_type = p_game_type OR tq.game_type = 'both')
        ORDER BY (
            SELECT MAX(uqh.created_at) 
            FROM user_question_history uqh 
            WHERE uqh.question_id = tq.id AND uqh.user_id = p_user_id
        ) NULLS FIRST, RANDOM()
        LIMIT p_count;
    END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: RECORD QUESTION ANSWER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_record_answer(
    p_user_id UUID,
    p_question_id UUID,
    p_session_id UUID,
    p_user_action TEXT,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question RECORD;
    v_is_correct BOOLEAN;
    v_ev_earned DECIMAL(10,4);
    v_ev_lost DECIMAL(10,4);
    v_xp_earned INTEGER;
    v_diamonds_earned INTEGER;
    v_user_level INTEGER;
    v_user_streak INTEGER;
    v_user_multiplier DECIMAL(3,2);
    v_session RECORD;
    v_leak_count INTEGER;
    v_is_leak_signal BOOLEAN := false;
BEGIN
    -- Get question details
    SELECT * INTO v_question FROM training_questions WHERE id = p_question_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Question not found');
    END IF;
    
    -- Get user progress
    SELECT level, streak, streak_multiplier 
    INTO v_user_level, v_user_streak, v_user_multiplier
    FROM user_progress WHERE user_id = p_user_id;
    
    -- Check if answer is correct
    v_is_correct := LOWER(p_user_action) = LOWER(v_question.correct_action);
    
    -- Calculate EV
    IF v_is_correct THEN
        v_ev_earned := COALESCE(v_question.ev_correct, 1.0);
        v_ev_lost := 0;
        v_xp_earned := FLOOR(50 * v_user_multiplier);
        v_diamonds_earned := CASE WHEN RANDOM() < 0.1 THEN 5 ELSE 0 END;
    ELSE
        v_ev_earned := 0;
        v_ev_lost := ABS(COALESCE(v_question.ev_suboptimal, 0) - COALESCE(v_question.ev_correct, 0));
        v_xp_earned := 10;  -- Participation XP
        v_diamonds_earned := 0;
        
        -- Check for leak signal (same concept missed twice in session)
        SELECT COUNT(*) INTO v_leak_count
        FROM user_question_history
        WHERE user_id = p_user_id
          AND session_id = p_session_id
          AND concept_category = v_question.concept_category
          AND is_correct = false;
        
        v_is_leak_signal := v_leak_count >= 1;  -- This is the second miss
    END IF;
    
    -- Insert history record
    INSERT INTO user_question_history (
        user_id, question_id, session_id, user_action, is_correct,
        response_time_ms, ev_earned, ev_lost, level_at_time,
        streak_at_time, multiplier_at_time, concept_category,
        was_leak_signal, xp_earned, diamonds_earned
    ) VALUES (
        p_user_id, p_question_id, p_session_id, p_user_action, v_is_correct,
        p_response_time_ms, v_ev_earned, v_ev_lost, v_user_level,
        v_user_streak, v_user_multiplier, v_question.concept_category,
        v_is_leak_signal, v_xp_earned, v_diamonds_earned
    );
    
    -- Update question statistics
    UPDATE training_questions 
    SET times_shown = times_shown + 1,
        times_correct = times_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_question_id;
    
    -- Update session
    UPDATE training_sessions
    SET questions_answered = questions_answered + 1,
        correct_answers = correct_answers + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        current_streak = CASE WHEN v_is_correct THEN current_streak + 1 ELSE 0 END,
        max_streak = GREATEST(max_streak, CASE WHEN v_is_correct THEN current_streak + 1 ELSE 0 END),
        total_ev_earned = total_ev_earned + v_ev_earned,
        total_ev_lost = total_ev_lost + v_ev_lost,
        xp_earned = xp_earned + v_xp_earned,
        diamonds_earned = diamonds_earned + v_diamonds_earned,
        leak_signals = CASE 
            WHEN v_is_leak_signal 
            THEN leak_signals || jsonb_build_object('category', v_question.concept_category, 'at', NOW())
            ELSE leak_signals 
        END,
        concepts_missed = CASE 
            WHEN NOT v_is_correct 
            THEN jsonb_set(
                COALESCE(concepts_missed, '{}'::jsonb),
                ARRAY[v_question.concept_category],
                to_jsonb(COALESCE((concepts_missed->>v_question.concept_category)::int, 0) + 1)
            )
            ELSE concepts_missed 
        END
    WHERE id = p_session_id;
    
    -- Update user progress (XP only - never decreases per HARD LAW)
    UPDATE user_progress
    SET xp = xp + v_xp_earned,
        diamonds = diamonds + v_diamonds_earned,
        last_active_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Return result
    RETURN jsonb_build_object(
        'is_correct', v_is_correct,
        'correct_action', v_question.correct_action,
        'gto_line', v_question.gto_line,
        'alternate_lines', v_question.alternate_lines,
        'ev_earned', v_ev_earned,
        'ev_lost', v_ev_lost,
        'xp_earned', v_xp_earned,
        'diamonds_earned', v_diamonds_earned,
        'is_leak_signal', v_is_leak_signal,
        'concept_category', v_question.concept_category
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: CHECK LEVEL ADVANCEMENT (85% HARD LAW)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_check_level_advancement(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_accuracy DECIMAL(5,4);
    v_mastery_threshold DECIMAL(5,4);
    v_min_questions INTEGER := 20;
    v_advancement_result JSONB;
    v_bonus_diamonds INTEGER := 50;
    v_next_level INTEGER;
BEGIN
    -- Get session data
    SELECT * INTO v_session FROM training_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Session not found');
    END IF;
    
    -- Calculate accuracy
    v_accuracy := CASE 
        WHEN v_session.questions_answered > 0 
        THEN v_session.correct_answers::DECIMAL / v_session.questions_answered 
        ELSE 0 
    END;
    
    -- Get mastery threshold (85% standard, 90% for level 12)
    v_mastery_threshold := CASE 
        WHEN v_session.level_id = 12 THEN 0.90 
        ELSE 0.85 
    END;
    
    -- Check advancement criteria
    IF v_session.questions_answered >= v_min_questions AND v_accuracy >= v_mastery_threshold THEN
        v_next_level := v_session.level_id + 1;
        
        -- Mark session as mastery achieved
        UPDATE training_sessions
        SET status = 'completed',
            mastery_achieved = true,
            level_unlocked = v_next_level,
            bonus_diamonds = v_bonus_diamonds,
            completed_at = NOW()
        WHERE id = p_session_id;
        
        -- Update user progress - unlock next level
        UPDATE user_progress
        SET level = GREATEST(level, v_next_level),
            diamonds = diamonds + v_bonus_diamonds,
            streak = streak + 1,  -- Increment streak on mastery
            last_active_at = NOW()
        WHERE user_id = v_session.user_id;
        
        v_advancement_result := jsonb_build_object(
            'mastery_achieved', true,
            'accuracy', v_accuracy,
            'threshold', v_mastery_threshold,
            'next_level_unlocked', v_next_level,
            'bonus_diamonds', v_bonus_diamonds,
            'message', '🏆 MASTERY ACHIEVED! Level ' || v_next_level || ' unlocked!'
        );
    ELSE
        -- Complete session without advancement
        UPDATE training_sessions
        SET status = 'completed',
            mastery_achieved = false,
            completed_at = NOW()
        WHERE id = p_session_id;
        
        v_advancement_result := jsonb_build_object(
            'mastery_achieved', false,
            'accuracy', v_accuracy,
            'threshold', v_mastery_threshold,
            'questions_answered', v_session.questions_answered,
            'required_questions', v_min_questions,
            'message', CASE 
                WHEN v_session.questions_answered < v_min_questions 
                THEN 'Need ' || (v_min_questions - v_session.questions_answered) || ' more questions'
                ELSE 'Need ' || ROUND((v_mastery_threshold - v_accuracy) * 100, 1) || '% more accuracy'
            END
        );
    END IF;
    
    RETURN v_advancement_result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: CREATE TRAINING SESSION
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_create_training_session(
    p_user_id UUID,
    p_level_id INTEGER,
    p_game_type TEXT DEFAULT 'cash',
    p_question_count INTEGER DEFAULT 20
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_user_level INTEGER;
BEGIN
    -- Verify user has access to this level
    SELECT level INTO v_user_level FROM user_progress WHERE user_id = p_user_id;
    
    IF v_user_level IS NULL THEN
        -- Create user progress if not exists
        INSERT INTO user_progress (user_id, level) VALUES (p_user_id, 1)
        ON CONFLICT (user_id) DO NOTHING;
        v_user_level := 1;
    END IF;
    
    -- Check level access (can only train current level or below)
    IF p_level_id > v_user_level THEN
        RAISE EXCEPTION 'Level % is locked. Current max level: %', p_level_id, v_user_level;
    END IF;
    
    -- Create session
    INSERT INTO training_sessions (user_id, level_id, game_type, question_count)
    VALUES (p_user_id, p_level_id, p_game_type, p_question_count)
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Training questions are readable by all authenticated users
CREATE POLICY "Questions readable by authenticated" ON training_questions
    FOR SELECT TO authenticated USING (true);

-- Users can only see their own history
CREATE POLICY "Users see own history" ON user_question_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own history" ON user_question_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only manage their own sessions
CREATE POLICY "Users see own sessions" ON training_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own sessions" ON training_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions" ON training_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON training_questions TO authenticated;
GRANT SELECT, INSERT ON user_question_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON training_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_unseen_questions TO authenticated;
GRANT EXECUTE ON FUNCTION fn_record_answer TO authenticated;
GRANT EXECUTE ON FUNCTION fn_check_level_advancement TO authenticated;
GRANT EXECUTE ON FUNCTION fn_create_training_session TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
