-- 🏋️ TRAINING SESSIONS SCHEMA
-- Tracks user training sessions and performance metrics

-- 1. Training Sessions Table
CREATE TABLE IF NOT EXISTS training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL REFERENCES games(id),
    game_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_hands INTEGER DEFAULT 0,
    correct_hands INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 100),
    max_streak INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    mastery_achieved BOOLEAN DEFAULT FALSE,
    leak_signals TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hand Results Table (Individual hands within a session)
CREATE TABLE IF NOT EXISTS hand_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
    hand_number INTEGER NOT NULL,
    hero_cards JSONB NOT NULL, -- ['Ah', 'Kd']
    board JSONB DEFAULT '[]', -- ['Qs', 'Jh', 'Tc']
    hero_action TEXT NOT NULL,
    gto_action TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    ev_loss DECIMAL(10, 4) DEFAULT 0,
    streak_at_time INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User XP Ledger (Immutable XP tracking)
CREATE TABLE IF NOT EXISTS xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0), -- XP CAN NEVER BE NEGATIVE
    source TEXT NOT NULL, -- 'TRAINING', 'STREAK_BONUS', 'LEVEL_COMPLETE'
    session_id UUID REFERENCES training_sessions(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User XP Totals View (Aggregated XP)
CREATE OR REPLACE VIEW user_xp_totals AS
SELECT 
    user_id,
    SUM(amount) as total_xp,
    COUNT(*) as total_events,
    MAX(created_at) as last_earned_at
FROM xp_ledger
GROUP BY user_id;

-- 5. Enable RLS
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hand_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Users can view own sessions" ON training_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON training_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON training_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own hand results" ON hand_results
    FOR SELECT USING (
        session_id IN (SELECT id FROM training_sessions WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own hand results" ON hand_results
    FOR INSERT WITH CHECK (
        session_id IN (SELECT id FROM training_sessions WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view own XP" ON xp_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own XP" ON xp_ledger
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_game_id ON training_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_hand_results_session_id ON hand_results(session_id);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_id ON xp_ledger(user_id);

-- 8. XP Protection Trigger (XP CAN NEVER BE DELETED/REDUCED)
CREATE OR REPLACE FUNCTION prevent_xp_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'XP records cannot be deleted. XP is immutable.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.amount < OLD.amount THEN
        RAISE EXCEPTION 'XP amount cannot be reduced. XP is immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xp_immutability_guard
    BEFORE UPDATE OR DELETE ON xp_ledger
    FOR EACH ROW
    EXECUTE FUNCTION prevent_xp_modification();
