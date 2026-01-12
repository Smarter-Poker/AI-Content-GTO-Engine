-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 ANALYTICS SCHEMA — PERFORMANCE TRACKING & INSIGHTS
-- ═══════════════════════════════════════════════════════════════════════════════
-- Tables: performance_snapshots, concept_mastery, leak_history
-- Views: daily_stats, weekly_trends, concept_heatmap
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📈 PERFORMANCE SNAPSHOTS — Daily aggregated stats
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS performance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Session Stats
    sessions_completed INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    accuracy DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN questions_answered > 0 
             THEN correct_answers::DECIMAL / questions_answered 
             ELSE 0 
        END
    ) STORED,
    
    -- Streak & Timing
    best_streak INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    total_time_seconds INTEGER DEFAULT 0,
    
    -- EV Tracking
    total_ev_earned DECIMAL(12,4) DEFAULT 0,
    total_ev_lost DECIMAL(12,4) DEFAULT 0,
    net_ev DECIMAL(12,4) GENERATED ALWAYS AS (total_ev_earned - total_ev_lost) STORED,
    
    -- Rewards
    xp_earned INTEGER DEFAULT 0,
    diamonds_earned INTEGER DEFAULT 0,
    levels_unlocked INTEGER DEFAULT 0,
    
    -- Leak Detection
    leak_signals_triggered INTEGER DEFAULT 0,
    most_common_leak TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, snapshot_date)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎯 CONCEPT MASTERY — Per-concept performance tracking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_category TEXT NOT NULL,
    
    -- Performance
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    accuracy DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE WHEN total_attempts > 0 
             THEN correct_attempts::DECIMAL / total_attempts 
             ELSE 0 
        END
    ) STORED,
    
    -- Mastery Status
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 5),
    -- 0: Untested, 1: Novice (<50%), 2: Learning (50-70%), 
    -- 3: Competent (70-85%), 4: Proficient (85-95%), 5: Master (>95%)
    
    -- Trend
    last_5_attempts BOOLEAN[] DEFAULT '{}',
    trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
    
    -- EV
    total_ev_earned DECIMAL(10,4) DEFAULT 0,
    total_ev_lost DECIMAL(10,4) DEFAULT 0,
    
    -- Timestamps
    first_attempt_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, concept_category)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚨 LEAK HISTORY — Persistent leak tracking
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leak_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_category TEXT NOT NULL,
    session_id UUID REFERENCES training_sessions(id),
    
    -- Context
    level_id INTEGER,
    question_ids UUID[] DEFAULT '{}',
    
    -- Severity
    occurrences INTEGER DEFAULT 1,
    severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    -- minor: 2 misses, moderate: 3-4, severe: 5-6, critical: 7+
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolution_accuracy DECIMAL(5,4),
    
    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT leak_history_occurrences_check CHECK (occurrences >= 1)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_performance_snapshots_user ON performance_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_snapshots_date ON performance_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_user ON concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_category ON concept_mastery(concept_category);
CREATE INDEX IF NOT EXISTS idx_leak_history_user ON leak_history(user_id);
CREATE INDEX IF NOT EXISTS idx_leak_history_resolved ON leak_history(is_resolved);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📈 VIEW: DAILY STATS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_daily_stats AS
SELECT 
    user_id,
    snapshot_date,
    sessions_completed,
    questions_answered,
    accuracy,
    best_streak,
    net_ev,
    xp_earned,
    diamonds_earned,
    leak_signals_triggered,
    LAG(accuracy) OVER (PARTITION BY user_id ORDER BY snapshot_date) as prev_day_accuracy,
    accuracy - LAG(accuracy) OVER (PARTITION BY user_id ORDER BY snapshot_date) as accuracy_change
FROM performance_snapshots
ORDER BY snapshot_date DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📈 VIEW: WEEKLY TRENDS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_weekly_trends AS
SELECT 
    user_id,
    DATE_TRUNC('week', snapshot_date) as week_start,
    SUM(sessions_completed) as total_sessions,
    SUM(questions_answered) as total_questions,
    AVG(accuracy) as avg_accuracy,
    MAX(best_streak) as best_streak,
    SUM(net_ev) as total_net_ev,
    SUM(xp_earned) as total_xp,
    SUM(diamonds_earned) as total_diamonds,
    SUM(leak_signals_triggered) as total_leaks
FROM performance_snapshots
GROUP BY user_id, DATE_TRUNC('week', snapshot_date)
ORDER BY week_start DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: UPDATE DAILY SNAPSHOT
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_update_daily_snapshot(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_stats RECORD;
BEGIN
    -- Aggregate today's stats from training_sessions
    SELECT 
        COUNT(*) as sessions,
        COALESCE(SUM(questions_answered), 0) as questions,
        COALESCE(SUM(correct_answers), 0) as correct,
        COALESCE(MAX(max_streak), 0) as streak,
        COALESCE(SUM(total_ev_earned), 0) as ev_earned,
        COALESCE(SUM(total_ev_lost), 0) as ev_lost,
        COALESCE(SUM(xp_earned), 0) as xp,
        COALESCE(SUM(diamonds_earned + bonus_diamonds), 0) as diamonds,
        COUNT(*) FILTER (WHERE mastery_achieved) as unlocked,
        COALESCE(SUM(jsonb_array_length(leak_signals)), 0) as leaks
    INTO v_stats
    FROM training_sessions
    WHERE user_id = p_user_id
      AND DATE(started_at) = v_today
      AND status = 'completed';
    
    -- Upsert snapshot
    INSERT INTO performance_snapshots (
        user_id, snapshot_date, sessions_completed, questions_answered,
        correct_answers, best_streak, total_ev_earned, total_ev_lost,
        xp_earned, diamonds_earned, levels_unlocked, leak_signals_triggered
    ) VALUES (
        p_user_id, v_today, v_stats.sessions, v_stats.questions,
        v_stats.correct, v_stats.streak, v_stats.ev_earned, v_stats.ev_lost,
        v_stats.xp, v_stats.diamonds, v_stats.unlocked, v_stats.leaks
    )
    ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
        sessions_completed = EXCLUDED.sessions_completed,
        questions_answered = EXCLUDED.questions_answered,
        correct_answers = EXCLUDED.correct_answers,
        best_streak = GREATEST(performance_snapshots.best_streak, EXCLUDED.best_streak),
        total_ev_earned = EXCLUDED.total_ev_earned,
        total_ev_lost = EXCLUDED.total_ev_lost,
        xp_earned = EXCLUDED.xp_earned,
        diamonds_earned = EXCLUDED.diamonds_earned,
        levels_unlocked = EXCLUDED.levels_unlocked,
        leak_signals_triggered = EXCLUDED.leak_signals_triggered,
        updated_at = NOW();
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: UPDATE CONCEPT MASTERY
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_update_concept_mastery(
    p_user_id UUID,
    p_concept_category TEXT,
    p_is_correct BOOLEAN,
    p_ev_earned DECIMAL DEFAULT 0,
    p_ev_lost DECIMAL DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_new_accuracy DECIMAL;
    v_new_level INTEGER;
    v_new_trend TEXT;
    v_last_5 BOOLEAN[];
BEGIN
    -- Get or create record
    SELECT * INTO v_record FROM concept_mastery 
    WHERE user_id = p_user_id AND concept_category = p_concept_category;
    
    IF NOT FOUND THEN
        INSERT INTO concept_mastery (user_id, concept_category, first_attempt_at)
        VALUES (p_user_id, p_concept_category, NOW())
        RETURNING * INTO v_record;
    END IF;
    
    -- Calculate new accuracy
    v_new_accuracy := (v_record.correct_attempts + (CASE WHEN p_is_correct THEN 1 ELSE 0 END))::DECIMAL 
                    / (v_record.total_attempts + 1);
    
    -- Calculate mastery level
    v_new_level := CASE
        WHEN v_new_accuracy >= 0.95 THEN 5
        WHEN v_new_accuracy >= 0.85 THEN 4
        WHEN v_new_accuracy >= 0.70 THEN 3
        WHEN v_new_accuracy >= 0.50 THEN 2
        ELSE 1
    END;
    
    -- Update last 5 attempts (keep only last 5)
    v_last_5 := array_append(v_record.last_5_attempts, p_is_correct);
    IF array_length(v_last_5, 1) > 5 THEN
        v_last_5 := v_last_5[2:5];
    END IF;
    
    -- Calculate trend from last 5
    v_new_trend := CASE
        WHEN array_length(v_last_5, 1) < 3 THEN 'stable'
        WHEN (v_last_5[array_length(v_last_5, 1)] AND v_last_5[array_length(v_last_5, 1) - 1]) THEN 'improving'
        WHEN NOT (v_last_5[array_length(v_last_5, 1)] OR v_last_5[array_length(v_last_5, 1) - 1]) THEN 'declining'
        ELSE 'stable'
    END;
    
    -- Update record
    UPDATE concept_mastery SET
        total_attempts = total_attempts + 1,
        correct_attempts = correct_attempts + (CASE WHEN p_is_correct THEN 1 ELSE 0 END),
        mastery_level = v_new_level,
        last_5_attempts = v_last_5,
        trend = v_new_trend,
        total_ev_earned = total_ev_earned + p_ev_earned,
        total_ev_lost = total_ev_lost + p_ev_lost,
        last_attempt_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id AND concept_category = p_concept_category;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FUNCTION: GET USER ANALYTICS SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_get_analytics_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_weekly RECORD;
    v_concepts JSONB;
    v_leaks JSONB;
BEGIN
    -- Get last 7 days stats
    SELECT jsonb_build_object(
        'total_sessions', COALESCE(SUM(sessions_completed), 0),
        'total_questions', COALESCE(SUM(questions_answered), 0),
        'avg_accuracy', COALESCE(AVG(accuracy), 0),
        'best_streak', COALESCE(MAX(best_streak), 0),
        'total_xp', COALESCE(SUM(xp_earned), 0),
        'total_diamonds', COALESCE(SUM(diamonds_earned), 0),
        'net_ev', COALESCE(SUM(net_ev), 0)
    ) INTO v_result
    FROM performance_snapshots
    WHERE user_id = p_user_id AND snapshot_date >= CURRENT_DATE - INTERVAL '7 days';
    
    -- Get concept breakdown
    SELECT jsonb_agg(jsonb_build_object(
        'category', concept_category,
        'accuracy', accuracy,
        'mastery_level', mastery_level,
        'trend', trend,
        'attempts', total_attempts
    ) ORDER BY accuracy DESC) INTO v_concepts
    FROM concept_mastery WHERE user_id = p_user_id;
    
    -- Get active leaks
    SELECT jsonb_agg(jsonb_build_object(
        'category', concept_category,
        'severity', severity,
        'occurrences', occurrences
    ) ORDER BY occurrences DESC) INTO v_leaks
    FROM leak_history WHERE user_id = p_user_id AND is_resolved = false;
    
    RETURN jsonb_build_object(
        'weekly_summary', v_result,
        'concepts', COALESCE(v_concepts, '[]'::jsonb),
        'active_leaks', COALESCE(v_leaks, '[]'::jsonb)
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔐 ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE leak_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own snapshots" ON performance_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own mastery" ON concept_mastery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own leaks" ON leak_history FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 📊 GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON performance_snapshots TO authenticated;
GRANT SELECT ON concept_mastery TO authenticated;
GRANT SELECT ON leak_history TO authenticated;
GRANT SELECT ON v_daily_stats TO authenticated;
GRANT SELECT ON v_weekly_trends TO authenticated;
GRANT EXECUTE ON FUNCTION fn_update_daily_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION fn_update_concept_mastery TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_analytics_summary TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
