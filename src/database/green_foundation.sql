-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛰️ GREEN_FOUNDATION: PROMPTS 1-3
-- ═══════════════════════════════════════════════════════════════════════════════
-- @silo AI_CONTENT_GTO_ENGINE (GREEN)
-- @target ORB_4 (Training) | ORB_6 (Assistant)
-- 
-- TASK_01: MULTI_LEVEL_SCHEMA_MAPPING
-- TASK_02: GTO_TRUTH_VAULT
-- TASK_03: 85_PERCENT_GATE_LAW
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_01: MULTI_LEVEL_SCHEMA_MAPPING
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: training_levels
-- The master definition of all difficulty levels
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_levels (
    -- Primary Identity
    id SERIAL PRIMARY KEY,
    level_code TEXT UNIQUE NOT NULL,           -- 'BEGINNER', 'INTERMEDIATE', etc.
    title TEXT NOT NULL,                        -- Display name
    
    -- Difficulty Configuration
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 10),
    difficulty_multiplier FLOAT DEFAULT 1.0,   -- Score multiplier
    
    -- Progression Requirements
    required_xp INTEGER NOT NULL DEFAULT 0,    -- XP needed to unlock
    unlock_order INTEGER NOT NULL,             -- Sequential order (1, 2, 3...)
    
    -- Training Parameters
    time_limit_seconds INTEGER DEFAULT 30,     -- Decision time limit
    ev_tolerance FLOAT DEFAULT 0.05,           -- Allowed EV deviation
    min_questions_for_mastery INTEGER DEFAULT 20,
    accuracy_threshold FLOAT DEFAULT 0.85,     -- 85% required
    
    -- Display
    icon TEXT,
    color TEXT,
    description TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the training levels
INSERT INTO training_levels (level_code, title, difficulty, required_xp, unlock_order, time_limit_seconds, ev_tolerance, description)
VALUES
    ('BEGINNER',     'Beginner',      1, 0,     1, 45, 0.10, 'Foundational GTO concepts'),
    ('INTERMEDIATE', 'Intermediate',  3, 1000,  2, 35, 0.07, 'Standard preflop and postflop'),
    ('ADVANCED',     'Advanced',      5, 5000,  3, 30, 0.05, 'Multi-street decision making'),
    ('EXPERT',       'Expert',        7, 15000, 4, 25, 0.03, 'Complex mixed strategies'),
    ('ELITE',        'Elite',         9, 50000, 5, 20, 0.02, 'Tournament and ICM precision')
ON CONFLICT (level_code) DO UPDATE SET
    title = EXCLUDED.title,
    difficulty = EXCLUDED.difficulty,
    required_xp = EXCLUDED.required_xp,
    unlock_order = EXCLUDED.unlock_order,
    time_limit_seconds = EXCLUDED.time_limit_seconds,
    ev_tolerance = EXCLUDED.ev_tolerance,
    description = EXCLUDED.description;

CREATE INDEX IF NOT EXISTS idx_training_levels_order ON training_levels(unlock_order);
CREATE INDEX IF NOT EXISTS idx_training_levels_active ON training_levels(is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: drills
-- Individual training scenarios with board state
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drills (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drill_code TEXT UNIQUE NOT NULL,           -- 'L1_PREFLOP_001', etc.
    
    -- Level Reference
    level_id INTEGER REFERENCES training_levels(id),
    level_code TEXT NOT NULL,                  -- Denormalized for speed
    
    -- Scenario Data (JSONB for flexibility)
    scenario_data JSONB NOT NULL,
    -- Expected structure:
    -- {
    --   "heroHand": ["As", "Kh"],
    --   "position": "BTN",
    --   "street": "PREFLOP",
    --   "pot": 100,
    --   "toCall": 25,
    --   "effectiveStack": 100,
    --   "context": { ... }
    -- }
    
    -- Board State
    board_state JSONB DEFAULT '{}',
    -- Expected structure:
    -- {
    --   "flop": ["Js", "Td", "2c"],
    --   "turn": "7h",
    --   "river": "3s",
    --   "texture": "DRY_HIGH",
    --   "spr": 4.5
    -- }
    
    -- GTO Solution (embedded reference)
    gto_solution JSONB NOT NULL,
    -- Expected structure:
    -- {
    --   "bestMove": "RAISE",
    --   "ev": 0.15,
    --   "alternates": ["CALL", "FOLD"],
    --   "reasoning": "..."
    -- }
    
    -- Metadata
    scenario_type TEXT NOT NULL,               -- 'PREFLOP_OPEN', 'CBET', etc.
    quality_grade TEXT DEFAULT 'A+' CHECK (quality_grade IN ('A+', 'A', 'B', 'C')),
    difficulty_score FLOAT DEFAULT 1.0,
    
    -- Status
    status TEXT DEFAULT 'READY' CHECK (status IN ('DRAFT', 'READY', 'SERVED', 'RETIRED')),
    times_served INTEGER DEFAULT 0,
    avg_accuracy FLOAT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by TEXT DEFAULT 'SYSTEM'
);

CREATE INDEX IF NOT EXISTS idx_drills_level ON drills(level_code);
CREATE INDEX IF NOT EXISTS idx_drills_status ON drills(status);
CREATE INDEX IF NOT EXISTS idx_drills_type ON drills(scenario_type);
CREATE INDEX IF NOT EXISTS idx_drills_ready ON drills(status, level_code) WHERE status = 'READY';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_02: GTO_TRUTH_VAULT
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: drill_solutions
-- Every drill MUST have 1 GTO Line + 2 Alternate Lines
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drill_solutions (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drill_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    
    -- Action Details
    action TEXT NOT NULL,                      -- 'RAISE', 'CALL', 'FOLD', 'BET_75', etc.
    action_category TEXT NOT NULL CHECK (action_category IN (
        'FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN'
    )),
    
    -- EV & Optimality
    ev FLOAT NOT NULL,                         -- Expected Value
    ev_loss FLOAT GENERATED ALWAYS AS (
        CASE WHEN is_optimal THEN 0 
        ELSE (SELECT MAX(s2.ev) FROM drill_solutions s2 WHERE s2.drill_id = drill_id) - ev 
        END
    ) STORED,
    is_optimal BOOLEAN DEFAULT FALSE,          -- TRUE = GTO Line
    
    -- Solution Type
    solution_type TEXT NOT NULL CHECK (solution_type IN (
        'GTO_BASELINE',   -- The mathematically optimal play
        'ALT_SIMPLE',     -- Simplified human-executable alternative
        'ALT_EXPLOIT'     -- Population-based exploitative adjustment
    )),
    
    -- Frequency (for mixed strategies)
    frequency FLOAT DEFAULT 1.0 CHECK (frequency >= 0 AND frequency <= 1),
    
    -- XP & Scoring
    xp_if_chosen INTEGER NOT NULL DEFAULT 0,
    mistake_category TEXT CHECK (mistake_category IN (
        'OPTIMAL', 'ACCEPTABLE', 'MINOR', 'MODERATE', 'MAJOR', 'BLUNDER'
    )),
    
    -- Educational
    reasoning TEXT,                            -- Why this action
    
    -- Constraints
    UNIQUE(drill_id, action)
);

CREATE INDEX IF NOT EXISTS idx_drill_solutions_drill ON drill_solutions(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_solutions_optimal ON drill_solutions(drill_id, is_optimal) WHERE is_optimal = TRUE;
CREATE INDEX IF NOT EXISTS idx_drill_solutions_type ON drill_solutions(solution_type);

-- ─────────────────────────────────────────────────────────────────────────────
-- 📋 EV LOSS THRESHOLDS (Leak Signal Triggers)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ev_loss_thresholds (
    category TEXT PRIMARY KEY,
    min_ev_loss FLOAT NOT NULL,
    max_ev_loss FLOAT NOT NULL,
    xp_awarded INTEGER NOT NULL,
    leak_signal_triggered BOOLEAN DEFAULT FALSE,
    display_label TEXT NOT NULL,
    display_color TEXT NOT NULL,
    description TEXT
);

INSERT INTO ev_loss_thresholds (category, min_ev_loss, max_ev_loss, xp_awarded, leak_signal_triggered, display_label, display_color, description)
VALUES
    ('OPTIMAL',    0.000, 0.000, 150, FALSE, 'Optimal Play',   '#00FF88', 'Perfect GTO execution'),
    ('ACCEPTABLE', 0.000, 0.005, 100, FALSE, 'Acceptable',     '#88FF00', 'Minor deviation within tolerance'),
    ('MINOR',      0.005, 0.020,  50, TRUE,  'Minor Mistake',  '#FFFF00', 'Small EV loss - learn from this'),
    ('MODERATE',   0.020, 0.100,  25, TRUE,  'Moderate Error', '#FF8800', 'Significant leak detected'),
    ('MAJOR',      0.100, 0.250,  10, TRUE,  'Major Mistake',  '#FF4400', 'Large EV loss - review required'),
    ('BLUNDER',    0.250, 999.0,   5, TRUE,  'Blunder',        '#FF0000', 'Critical error - mandatory study')
ON CONFLICT (category) DO UPDATE SET
    min_ev_loss = EXCLUDED.min_ev_loss,
    max_ev_loss = EXCLUDED.max_ev_loss,
    xp_awarded = EXCLUDED.xp_awarded,
    leak_signal_triggered = EXCLUDED.leak_signal_triggered;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔍 FUNCTION: classify_ev_loss
-- Returns the category for a given EV loss
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION classify_ev_loss(p_ev_loss FLOAT)
RETURNS TABLE (
    category TEXT,
    xp_awarded INTEGER,
    leak_signal_triggered BOOLEAN,
    display_label TEXT,
    display_color TEXT
)
LANGUAGE sql
STABLE
AS $$
    SELECT category, xp_awarded, leak_signal_triggered, display_label, display_color
    FROM ev_loss_thresholds
    WHERE p_ev_loss >= min_ev_loss AND p_ev_loss < max_ev_loss
    LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔍 FUNCTION: evaluate_user_action
-- Compare user action against GTO truth, return ev_loss and classification
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION evaluate_user_action(
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
    v_ev_loss FLOAT;
    v_classification RECORD;
BEGIN
    -- Get GTO optimal line
    SELECT * INTO v_gto_solution
    FROM drill_solutions
    WHERE drill_id = p_drill_id AND is_optimal = TRUE
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'NO_GTO_SOLUTION');
    END IF;
    
    -- Get user's chosen action
    SELECT * INTO v_user_solution
    FROM drill_solutions
    WHERE drill_id = p_drill_id AND UPPER(action) = UPPER(p_user_action)
    LIMIT 1;
    
    -- Calculate EV loss
    IF v_user_solution IS NULL THEN
        v_ev_loss := v_gto_solution.ev + 0.25; -- Unknown action = blunder
    ELSE
        v_ev_loss := v_gto_solution.ev - v_user_solution.ev;
    END IF;
    
    -- Classify the mistake
    SELECT * INTO v_classification FROM classify_ev_loss(v_ev_loss);
    
    -- Build response
    RETURN jsonb_build_object(
        'success', TRUE,
        'drill_id', p_drill_id,
        'user_action', p_user_action,
        'gto_action', v_gto_solution.action,
        'is_optimal', (p_user_action = v_gto_solution.action),
        'user_ev', COALESCE(v_user_solution.ev, 0),
        'gto_ev', v_gto_solution.ev,
        'ev_loss', v_ev_loss,
        'ev_loss_bb', ROUND(v_ev_loss * 100, 2),
        'classification', jsonb_build_object(
            'category', v_classification.category,
            'xp_awarded', v_classification.xp_awarded,
            'leak_signal_triggered', v_classification.leak_signal_triggered,
            'label', v_classification.display_label,
            'color', v_classification.display_color
        ),
        'gto_reasoning', v_gto_solution.reasoning
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🛡️ TRIGGER: enforce_gto_structure
-- Ensures every drill has 1 GTO + 2 Alternates before becoming READY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_drill_solution_structure()
RETURNS TRIGGER AS $$
DECLARE
    v_gto_count INTEGER;
    v_alt_count INTEGER;
BEGIN
    -- Only check when drill becomes READY
    IF NEW.status = 'READY' AND (OLD.status IS NULL OR OLD.status != 'READY') THEN
        -- Count GTO lines
        SELECT COUNT(*) INTO v_gto_count
        FROM drill_solutions
        WHERE drill_id = NEW.id AND is_optimal = TRUE;
        
        -- Count alternate lines
        SELECT COUNT(*) INTO v_alt_count
        FROM drill_solutions
        WHERE drill_id = NEW.id AND is_optimal = FALSE;
        
        -- HARD LAW: Must have exactly 1 GTO + at least 2 alternates
        IF v_gto_count < 1 THEN
            RAISE EXCEPTION '🚫 HARD LAW: Drill % missing GTO solution (is_optimal = TRUE)', NEW.drill_code;
        END IF;
        
        IF v_alt_count < 2 THEN
            RAISE EXCEPTION '🚫 HARD LAW: Drill % has only % alternates (requires 2 minimum)', NEW.drill_code, v_alt_count;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_drill_solutions ON drills;
CREATE TRIGGER trigger_enforce_drill_solutions
    BEFORE INSERT OR UPDATE ON drills
    FOR EACH ROW
    EXECUTE FUNCTION enforce_drill_solution_structure();

-- ═══════════════════════════════════════════════════════════════════════════════
-- TASK_03: 85_PERCENT_GATE_LAW
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 TABLE: user_mastery
-- Tracks user progress through each training level
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_mastery (
    -- Primary Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    level_code TEXT NOT NULL REFERENCES training_levels(level_code),
    
    -- Status (HARD LAW ENFORCED)
    status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'UNLOCKED', 'ACTIVE', 'MASTERED')),
    
    -- Progress Metrics
    drills_attempted INTEGER DEFAULT 0,
    drills_correct INTEGER DEFAULT 0,
    accuracy FLOAT GENERATED ALWAYS AS (
        CASE WHEN drills_attempted > 0 
        THEN ROUND((drills_correct::FLOAT / drills_attempted), 4)
        ELSE 0 END
    ) STORED,
    
    -- Session Tracking
    current_session_attempted INTEGER DEFAULT 0,
    current_session_correct INTEGER DEFAULT 0,
    session_accuracy FLOAT GENERATED ALWAYS AS (
        CASE WHEN current_session_attempted > 0 
        THEN ROUND((current_session_correct::FLOAT / current_session_attempted), 4)
        ELSE 0 END
    ) STORED,
    
    -- XP Earned
    xp_earned INTEGER DEFAULT 0,
    
    -- Timestamps
    unlocked_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    mastered_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, level_code)
);

CREATE INDEX IF NOT EXISTS idx_user_mastery_user ON user_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mastery_level ON user_mastery(level_code);
CREATE INDEX IF NOT EXISTS idx_user_mastery_status ON user_mastery(user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔐 FUNCTION: check_level_unlockable (85% GATE LAW)
-- Returns TRUE if user can unlock the specified level
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_level_unlockable(
    p_user_id UUID,
    p_target_level TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_order INTEGER;
    v_prev_level RECORD;
    v_prev_mastery RECORD;
BEGIN
    -- Get target level order
    SELECT unlock_order INTO v_target_order
    FROM training_levels
    WHERE level_code = p_target_level;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('unlockable', FALSE, 'error', 'INVALID_LEVEL');
    END IF;
    
    -- First level is always unlockable
    IF v_target_order = 1 THEN
        RETURN jsonb_build_object('unlockable', TRUE, 'reason', 'FIRST_LEVEL');
    END IF;
    
    -- Get previous level
    SELECT * INTO v_prev_level
    FROM training_levels
    WHERE unlock_order = v_target_order - 1;
    
    -- Get user's mastery of previous level
    SELECT * INTO v_prev_mastery
    FROM user_mastery
    WHERE user_id = p_user_id AND level_code = v_prev_level.level_code;
    
    -- Check if previous level exists in user_mastery
    IF v_prev_mastery IS NULL THEN
        RETURN jsonb_build_object(
            'unlockable', FALSE,
            'error', 'PREVIOUS_LEVEL_NOT_STARTED',
            'required_level', v_prev_level.level_code
        );
    END IF;
    
    -- 🔐 85% GATE LAW CHECK
    IF v_prev_mastery.status != 'MASTERED' THEN
        RETURN jsonb_build_object(
            'unlockable', FALSE,
            'error', 'PREVIOUS_LEVEL_NOT_MASTERED',
            'required_level', v_prev_level.level_code,
            'current_accuracy', v_prev_mastery.accuracy,
            'required_accuracy', 0.85,
            'current_drills', v_prev_mastery.drills_attempted,
            'required_drills', v_prev_level.min_questions_for_mastery
        );
    END IF;
    
    -- All checks passed
    RETURN jsonb_build_object(
        'unlockable', TRUE,
        'previous_level', v_prev_level.level_code,
        'previous_accuracy', v_prev_mastery.accuracy
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔐 TRIGGER: gatekeeper (HARD LAW ENFORCEMENT)
-- BLOCKS any attempt to unlock Level [N+1] if Level [N] accuracy < 85%
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION gatekeeper_enforce()
RETURNS TRIGGER AS $$
DECLARE
    v_check JSONB;
BEGIN
    -- Only check when status changes to UNLOCKED or ACTIVE
    IF NEW.status IN ('UNLOCKED', 'ACTIVE') AND OLD.status = 'LOCKED' THEN
        -- Check if level can be unlocked
        v_check := check_level_unlockable(NEW.user_id, NEW.level_code);
        
        IF NOT (v_check->>'unlockable')::BOOLEAN THEN
            RAISE EXCEPTION '🔐 85%% GATE LAW VIOLATION: Cannot unlock %. %', 
                NEW.level_code, 
                COALESCE(v_check->>'error', 'Previous level not mastered');
        END IF;
        
        -- Set unlock timestamp
        NEW.unlocked_at := NOW();
    END IF;
    
    -- Update timestamp
    NEW.last_activity_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gatekeeper ON user_mastery;
CREATE TRIGGER trigger_gatekeeper
    BEFORE UPDATE ON user_mastery
    FOR EACH ROW
    EXECUTE FUNCTION gatekeeper_enforce();

-- ─────────────────────────────────────────────────────────────────────────────
-- 🎯 FUNCTION: check_mastery_achieved
-- Automatically promotes to MASTERED when 85% / 20q threshold met
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_mastery_achieved()
RETURNS TRIGGER AS $$
DECLARE
    v_level RECORD;
BEGIN
    -- Only check if status is ACTIVE
    IF NEW.status != 'ACTIVE' THEN
        RETURN NEW;
    END IF;
    
    -- Get level requirements
    SELECT * INTO v_level
    FROM training_levels
    WHERE level_code = NEW.level_code;
    
    -- Check if mastery achieved: 85% accuracy AND minimum drills
    IF NEW.accuracy >= v_level.accuracy_threshold 
       AND NEW.drills_attempted >= v_level.min_questions_for_mastery THEN
        NEW.status := 'MASTERED';
        NEW.mastered_at := NOW();
        
        RAISE NOTICE '🎉 MASTERY ACHIEVED: User % mastered % with %% accuracy',
            NEW.user_id, NEW.level_code, ROUND(NEW.accuracy * 100, 1);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_mastery ON user_mastery;
CREATE TRIGGER trigger_check_mastery
    BEFORE INSERT OR UPDATE ON user_mastery
    FOR EACH ROW
    EXECUTE FUNCTION check_mastery_achieved();

-- ─────────────────────────────────────────────────────────────────────────────
-- 📊 FUNCTION: record_drill_attempt
-- Records a user's drill attempt and updates mastery progress
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_drill_attempt(
    p_user_id UUID,
    p_drill_id UUID,
    p_user_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_drill RECORD;
    v_evaluation JSONB;
    v_is_correct BOOLEAN;
    v_xp_awarded INTEGER;
    v_mastery RECORD;
BEGIN
    -- Get drill info
    SELECT * INTO v_drill FROM drills WHERE id = p_drill_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'DRILL_NOT_FOUND');
    END IF;
    
    -- Evaluate the action
    v_evaluation := evaluate_user_action(p_drill_id, p_user_action);
    v_is_correct := (v_evaluation->>'is_optimal')::BOOLEAN;
    v_xp_awarded := (v_evaluation->'classification'->>'xp_awarded')::INTEGER;
    
    -- Ensure user has mastery record for this level
    INSERT INTO user_mastery (user_id, level_code, status)
    VALUES (p_user_id, v_drill.level_code, 
            CASE WHEN v_drill.level_code = 'BEGINNER' THEN 'ACTIVE' ELSE 'LOCKED' END)
    ON CONFLICT (user_id, level_code) DO NOTHING;
    
    -- Update mastery progress
    UPDATE user_mastery
    SET 
        drills_attempted = drills_attempted + 1,
        drills_correct = drills_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        current_session_attempted = current_session_attempted + 1,
        current_session_correct = current_session_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        xp_earned = xp_earned + v_xp_awarded,
        last_activity_at = NOW()
    WHERE user_id = p_user_id AND level_code = v_drill.level_code
    RETURNING * INTO v_mastery;
    
    -- Update drill stats
    UPDATE drills
    SET times_served = times_served + 1,
        avg_accuracy = (avg_accuracy * (times_served - 1) + CASE WHEN v_is_correct THEN 1 ELSE 0 END) / times_served
    WHERE id = p_drill_id;
    
    -- Build response
    RETURN jsonb_build_object(
        'success', TRUE,
        'evaluation', v_evaluation,
        'progress', jsonb_build_object(
            'level_code', v_drill.level_code,
            'drills_attempted', v_mastery.drills_attempted,
            'accuracy', v_mastery.accuracy,
            'status', v_mastery.status,
            'xp_earned', v_mastery.xp_earned,
            'session_accuracy', v_mastery.session_accuracy
        ),
        'xp_awarded', v_xp_awarded
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE training_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mastery ENABLE ROW LEVEL SECURITY;

-- Training levels: Public read
CREATE POLICY "Training levels are public" ON training_levels FOR SELECT USING (true);

-- Drills: Public read for READY status
CREATE POLICY "Ready drills are public" ON drills FOR SELECT USING (status = 'READY');

-- Drill solutions: Public read
CREATE POLICY "Drill solutions are public" ON drill_solutions FOR SELECT USING (true);

-- User mastery: Users can only access their own
CREATE POLICY "Users can view own mastery" ON user_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own mastery" ON user_mastery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mastery" ON user_mastery FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 💼 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON training_levels TO authenticated;
GRANT SELECT ON drills TO authenticated;
GRANT SELECT ON drill_solutions TO authenticated;
GRANT SELECT ON ev_loss_thresholds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_mastery TO authenticated;

GRANT EXECUTE ON FUNCTION classify_ev_loss TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_user_action TO authenticated;
GRANT EXECUTE ON FUNCTION check_level_unlockable TO authenticated;
GRANT EXECUTE ON FUNCTION record_drill_attempt TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📋 COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE training_levels IS '📊 TASK_01: Training level definitions with XP requirements';
COMMENT ON TABLE drills IS '📊 TASK_01: Individual training scenarios with board state';
COMMENT ON TABLE drill_solutions IS '📊 TASK_02: GTO Truth Vault - 1 GTO + 2 Alternates per drill';
COMMENT ON TABLE ev_loss_thresholds IS '📊 TASK_02: EV loss thresholds for Leak Signal triggers';
COMMENT ON TABLE user_mastery IS '📊 TASK_03: User progress with 85% Gate Law enforcement';
COMMENT ON FUNCTION gatekeeper_enforce IS '🔐 TASK_03: 85% Gate Law - Blocks level unlock without mastery';
COMMENT ON FUNCTION evaluate_user_action IS '🎯 TASK_02: Compares user action against GTO truth';

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ GREEN_FOUNDATION COMPLETE — PROMPTS 1-3 MAPPED
-- ═══════════════════════════════════════════════════════════════════════════════
