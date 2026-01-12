-- ═══════════════════════════════════════════════════════════════════════════════
-- 🛰️ TASK 14: PROGRESSIVE_MASTERY_GATE_SYSTEM
-- @mapping PHASE_14 | @silo AI_CONTENT_GTO_ENGINE (GREEN)
-- HARD LAW: Level [N+1] LOCKED until Level [N] reaches 85% / 20 questions
-- ═══════════════════════════════════════════════════════════════════════════════

-- 📊 MASTERY LEVELS TABLE (10-Level System)
CREATE TABLE IF NOT EXISTS mastery_levels (
    level_id INTEGER PRIMARY KEY CHECK (level_id >= 1 AND level_id <= 10),
    level_name TEXT NOT NULL UNIQUE,
    difficulty_multiplier FLOAT NOT NULL DEFAULT 1.0,
    ev_tolerance FLOAT NOT NULL DEFAULT 0.05,
    time_pressure_seconds INTEGER DEFAULT 30,
    min_questions_required INTEGER DEFAULT 20,
    accuracy_threshold INTEGER DEFAULT 85,
    xp_multiplier FLOAT DEFAULT 1.0,
    description TEXT
);

-- Seed 10 difficulty levels
INSERT INTO mastery_levels VALUES
    (1,  'INITIATE',      1.0,  0.10, 45, 20, 85, 1.0,  'Foundational concepts'),
    (2,  'STUDENT',       1.2,  0.08, 40, 20, 85, 1.1,  'Basic GTO principles'),
    (3,  'APPRENTICE',    1.4,  0.06, 35, 20, 85, 1.2,  'Intermediate spots'),
    (4,  'PRACTITIONER',  1.6,  0.05, 30, 20, 85, 1.3,  'Standard GTO'),
    (5,  'ADEPT',         1.8,  0.04, 28, 25, 85, 1.4,  'Multi-street'),
    (6,  'SPECIALIST',    2.0,  0.03, 25, 25, 85, 1.5,  'Complex textures'),
    (7,  'EXPERT',        2.3,  0.025,22, 25, 85, 1.6,  'Mixed strategies'),
    (8,  'MASTER',        2.6,  0.02, 20, 30, 85, 1.8,  'Near-perfect'),
    (9,  'GRANDMASTER',   3.0,  0.015,18, 30, 85, 2.0,  'ICM precision'),
    (10, 'LEGEND',        3.5,  0.01, 15, 30, 85, 2.5,  'Elite perfection')
ON CONFLICT (level_id) DO UPDATE SET level_name = EXCLUDED.level_name;

-- 📊 USER MASTERY PROGRESS TABLE
CREATE TABLE IF NOT EXISTS user_mastery_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    level_id INTEGER NOT NULL REFERENCES mastery_levels(level_id),
    status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'ACTIVE', 'COMPLETED')),
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    accuracy_percentage FLOAT GENERATED ALWAYS AS (
        CASE WHEN questions_answered > 0 
        THEN ROUND((questions_correct::FLOAT / questions_answered) * 100, 2)
        ELSE 0 END
    ) STORED,
    unlocked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mastery_user ON user_mastery_progress(user_id);

-- 🔐 HARD LAW ENFORCEMENT: Level Lock Trigger
CREATE OR REPLACE FUNCTION enforce_level_progression()
RETURNS TRIGGER AS $$
DECLARE
    v_prev_status TEXT;
    v_prev_accuracy FLOAT;
    v_prev_questions INTEGER;
BEGIN
    IF NEW.level_id = 1 THEN RETURN NEW; END IF;
    
    IF NEW.status = 'ACTIVE' AND OLD.status = 'LOCKED' THEN
        SELECT status, accuracy_percentage, questions_answered
        INTO v_prev_status, v_prev_accuracy, v_prev_questions
        FROM user_mastery_progress
        WHERE user_id = NEW.user_id AND level_id = (NEW.level_id - 1);
        
        IF v_prev_status IS NULL OR v_prev_status != 'COMPLETED' THEN
            RAISE EXCEPTION '🔒 HARD LAW: Cannot unlock Level % - Level % not completed',
                NEW.level_id, NEW.level_id - 1;
        END IF;
        IF v_prev_accuracy < 85 OR v_prev_questions < 20 THEN
            RAISE EXCEPTION '🔒 HARD LAW: Level % requires 85%%/20q, got %%/%q',
                NEW.level_id - 1, v_prev_accuracy, v_prev_questions;
        END IF;
        NEW.unlocked_at := NOW();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_level_progression ON user_mastery_progress;
CREATE TRIGGER trigger_enforce_level_progression
    BEFORE UPDATE ON user_mastery_progress FOR EACH ROW
    EXECUTE FUNCTION enforce_level_progression();

-- 🎯 AUTO COMPLETION TRIGGER
CREATE OR REPLACE FUNCTION check_level_completion()
RETURNS TRIGGER AS $$
DECLARE v_req_acc INTEGER; v_req_q INTEGER;
BEGIN
    IF NEW.status != 'ACTIVE' THEN RETURN NEW; END IF;
    SELECT accuracy_threshold, min_questions_required INTO v_req_acc, v_req_q
    FROM mastery_levels WHERE level_id = NEW.level_id;
    IF NEW.questions_answered >= v_req_q AND NEW.accuracy_percentage >= v_req_acc THEN
        NEW.status := 'COMPLETED'; NEW.completed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_level_completion ON user_mastery_progress;
CREATE TRIGGER trigger_check_level_completion
    BEFORE INSERT OR UPDATE ON user_mastery_progress FOR EACH ROW
    WHEN (NEW.status = 'ACTIVE') EXECUTE FUNCTION check_level_completion();

-- 📊 API: Get user mastery status
CREATE OR REPLACE FUNCTION get_user_mastery_status(p_user_id UUID)
RETURNS TABLE (level_id INT, level_name TEXT, status TEXT, accuracy FLOAT, 
               questions_answered INT, required_accuracy INT, can_unlock BOOLEAN)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT ml.level_id, ml.level_name, COALESCE(ump.status, 'LOCKED'),
           COALESCE(ump.accuracy_percentage, 0), COALESCE(ump.questions_answered, 0),
           ml.accuracy_threshold,
           (ml.level_id = 1 OR EXISTS (SELECT 1 FROM user_mastery_progress p 
            WHERE p.user_id = p_user_id AND p.level_id = ml.level_id - 1 
            AND p.status = 'COMPLETED'))
    FROM mastery_levels ml
    LEFT JOIN user_mastery_progress ump ON ump.level_id = ml.level_id AND ump.user_id = p_user_id
    ORDER BY ml.level_id;
$$;

-- RLS & Grants
ALTER TABLE mastery_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mastery_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Levels are public" ON mastery_levels FOR SELECT USING (true);
CREATE POLICY "Own progress only" ON user_mastery_progress FOR ALL USING (auth.uid() = user_id);
GRANT SELECT ON mastery_levels TO authenticated;
GRANT ALL ON user_mastery_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_mastery_status TO authenticated;

-- ✅ PHASE 14 COMPLETE
