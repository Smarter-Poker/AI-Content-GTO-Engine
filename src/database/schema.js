/**
 * 🤖 SMARTER.POKER — SUPABASE SCHEMA DEFINITIONS
 * Content Generation Queue & Ready Content Tables
 * 
 * Pattern: Asynchronous Queue Worker
 * - Jobs go into `content_generation_queue`
 * - Worker processes jobs → populates `ready_content`
 * - Training Orb only pulls `status: READY` content
 */

// ═══════════════════════════════════════════════════════════════
// 📊 TABLE: content_generation_queue
// ═══════════════════════════════════════════════════════════════

export const CONTENT_GENERATION_QUEUE_SCHEMA = `
-- Content Generation Queue Table
-- Jobs are dropped here by the Engine, picked up by the Worker Agent

CREATE TABLE IF NOT EXISTS content_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job Identity
    job_type TEXT NOT NULL DEFAULT 'DAILY_DRILLS',
    priority INTEGER NOT NULL DEFAULT 5,  -- 1 = highest, 10 = lowest
    
    -- Job Parameters
    skill_level TEXT NOT NULL,            -- BEGINNER, INTERMEDIATE, ADVANCED, EXPERT, ELITE
    scenario_count INTEGER NOT NULL DEFAULT 20,
    scenario_types TEXT[] DEFAULT NULL,   -- NULL = all types for level
    
    -- Job Status
    status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Worker Assignment
    worker_id TEXT DEFAULT NULL,
    locked_at TIMESTAMPTZ DEFAULT NULL,
    lock_timeout_seconds INTEGER DEFAULT 300,  -- 5 minute lock
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Results
    result_count INTEGER DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    
    -- Metadata
    requested_by TEXT DEFAULT 'SYSTEM',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for efficient job pickup
CREATE INDEX IF NOT EXISTS idx_queue_status_priority 
    ON content_generation_queue (status, priority, created_at);
    
CREATE INDEX IF NOT EXISTS idx_queue_skill_level 
    ON content_generation_queue (skill_level, status);

-- Function to pick up next job atomically
CREATE OR REPLACE FUNCTION pick_next_job(p_worker_id TEXT)
RETURNS content_generation_queue AS $$
DECLARE
    v_job content_generation_queue;
BEGIN
    -- Atomically select and lock the highest priority pending job
    UPDATE content_generation_queue
    SET 
        status = 'PROCESSING',
        worker_id = p_worker_id,
        locked_at = NOW(),
        started_at = NOW(),
        attempts = attempts + 1
    WHERE id = (
        SELECT id FROM content_generation_queue
        WHERE status = 'PENDING'
           OR (status = 'PROCESSING' AND locked_at < NOW() - (lock_timeout_seconds || ' seconds')::interval)
        ORDER BY priority ASC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO v_job;
    
    RETURN v_job;
END;
$$ LANGUAGE plpgsql;
`;

// ═══════════════════════════════════════════════════════════════
// ⚡ TABLE: pre_generated_content (LOCKED TABLE NAME)
// ⚡ CONTENT_QUEUE_LOCK: ContentQueue ONLY reads from this table
// ═══════════════════════════════════════════════════════════════

export const PRE_GENERATED_CONTENT_SCHEMA = `
-- ⚡ PRE-GENERATED CONTENT TABLE (LOCKED)
-- ContentQueue ONLY fetches from this table with status = 'READY'
-- NO LIVE GENERATION - Only pre-generated content is served

CREATE TABLE IF NOT EXISTS pre_generated_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content Identity
    scenario_id TEXT UNIQUE NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'POKER_SCENARIO',
    
    -- Targeting
    skill_level TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    complexity INTEGER NOT NULL DEFAULT 1,
    
    -- ⚡ Content Status (LOCKED: Only 'READY' content is served)
    status TEXT NOT NULL DEFAULT 'READY',  -- READY, SERVED, EXPIRED, FLAGGED
    quality_grade TEXT NOT NULL DEFAULT 'A+',
    
    -- The Actual Content (GTO-compliant scenario)
    scenario_data JSONB NOT NULL,
    
    -- GTO Solution (with alternates)
    gto_solution JSONB NOT NULL,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    
    -- Usage Tracking
    times_served INTEGER DEFAULT 0,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ready_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    last_served_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Source
    generated_by_job UUID REFERENCES content_generation_queue(id),
    worker_id TEXT DEFAULT NULL
);

-- ⚡ CRITICAL INDEX: Fast READY content lookup
CREATE INDEX IF NOT EXISTS idx_pre_gen_ready 
    ON pre_generated_content (status, skill_level, created_at) 
    WHERE status = 'READY';

CREATE INDEX IF NOT EXISTS idx_pre_gen_status_level 
    ON pre_generated_content (status, skill_level);

-- ⚡ Function: Fetch next READY drill (queue order)
CREATE OR REPLACE FUNCTION fetch_next_drill(
    p_user_id TEXT,
    p_skill_level TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS SETOF pre_generated_content AS $$
BEGIN
    RETURN QUERY
    SELECT pgc.* 
    FROM pre_generated_content pgc
    LEFT JOIN user_seen_content usc 
        ON usc.content_id = pgc.id AND usc.user_id = p_user_id
    WHERE pgc.status = 'READY'  -- ⚡ LOCKED: Only READY
      AND (p_skill_level IS NULL OR pgc.skill_level = p_skill_level)
      AND usc.id IS NULL  -- Not seen by this user
      AND (pgc.expires_at IS NULL OR pgc.expires_at > NOW())
    ORDER BY pgc.created_at ASC  -- Fair queue: oldest first
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
`;

// ═══════════════════════════════════════════════════════════════
// 🎯 TABLE: gto_solutions (GTO TRUTH STORAGE)
// Stores the GTO "Truth" for every scenario
// Enables instant comparison without recalculating
// ═══════════════════════════════════════════════════════════════

export const GTO_SOLUTIONS_SCHEMA = `
-- GTO Solutions Table
-- Stores the GTO "Truth" for every scenario/drill
-- The Assistant compares user moves instantly against this table

CREATE TABLE IF NOT EXISTS gto_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key to the drill/scenario
    drill_id UUID NOT NULL REFERENCES pre_generated_content(id) ON DELETE CASCADE,
    
    -- Action Details
    action TEXT NOT NULL,           -- 'FOLD', 'CHECK', 'CALL', 'BET_33', 'BET_50', 'BET_75', 'RAISE', 'ALL_IN'
    ev FLOAT NOT NULL DEFAULT 0,    -- Expected Value of this action
    is_best BOOLEAN NOT NULL DEFAULT false,  -- TRUE if this is the GTO optimal action
    
    -- Action Metadata
    action_type TEXT NOT NULL DEFAULT 'STANDARD',  -- 'STANDARD', 'ALT_EXPLOIT', 'ALT_SIMPLE'
    sizing_multiplier FLOAT DEFAULT NULL,          -- For bet/raise: pot multiplier (0.33, 0.5, 0.75, 1.0)
    frequency FLOAT DEFAULT NULL,                  -- Mixed strategy frequency (0.0 to 1.0)
    
    -- Strategic Context
    reasoning TEXT DEFAULT NULL,                   -- Explanation of why this action
    strategic_anchors TEXT[] DEFAULT '{}',         -- ['Nut Advantage', 'Board Texture', etc.]
    
    -- XP Awards (based on EV loss)
    xp_if_chosen INTEGER DEFAULT 0,               -- XP awarded if user chooses this action
    mistake_category TEXT DEFAULT NULL,            -- 'OPTIMAL', 'ACCEPTABLE', 'MINOR', 'MODERATE', 'MAJOR', 'BLUNDER'
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique action per drill
    UNIQUE(drill_id, action)
);

-- Index for fast lookup by drill
CREATE INDEX IF NOT EXISTS idx_gto_solutions_drill 
    ON gto_solutions (drill_id);

-- Index for finding best action quickly
CREATE INDEX IF NOT EXISTS idx_gto_solutions_best 
    ON gto_solutions (drill_id, is_best) 
    WHERE is_best = true;

-- Index for action type queries
CREATE INDEX IF NOT EXISTS idx_gto_solutions_action_type 
    ON gto_solutions (drill_id, action_type);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTION: Get GTO best action for a drill (instant lookup)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_gto_best_action(p_drill_id UUID)
RETURNS gto_solutions AS $$
DECLARE
    v_solution gto_solutions;
BEGIN
    SELECT * INTO v_solution
    FROM gto_solutions
    WHERE drill_id = p_drill_id AND is_best = true
    LIMIT 1;
    
    RETURN v_solution;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- FUNCTION: Compare user action against GTO (instant evaluation)
-- Returns: ev_loss, is_correct, mistake_category, xp_awarded
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION compare_user_action(
    p_drill_id UUID,
    p_user_action TEXT
)
RETURNS TABLE (
    is_correct BOOLEAN,
    ev_loss FLOAT,
    best_action TEXT,
    best_ev FLOAT,
    user_ev FLOAT,
    mistake_category TEXT,
    xp_awarded INTEGER,
    reasoning TEXT
) AS $$
DECLARE
    v_best gto_solutions;
    v_user gto_solutions;
BEGIN
    -- Get the best GTO action
    SELECT * INTO v_best
    FROM gto_solutions
    WHERE drill_id = p_drill_id AND is_best = true
    LIMIT 1;
    
    -- Get user's chosen action (if it exists in our solutions)
    SELECT * INTO v_user
    FROM gto_solutions
    WHERE drill_id = p_drill_id AND action = p_user_action
    LIMIT 1;
    
    -- Return comparison result
    RETURN QUERY SELECT
        (p_user_action = v_best.action) AS is_correct,
        COALESCE(v_best.ev - COALESCE(v_user.ev, v_best.ev - 1), 1.0) AS ev_loss,
        v_best.action AS best_action,
        v_best.ev AS best_ev,
        COALESCE(v_user.ev, v_best.ev - 1) AS user_ev,
        COALESCE(v_user.mistake_category, 'BLUNDER') AS mistake_category,
        COALESCE(v_user.xp_if_chosen, 5) AS xp_awarded,
        v_best.reasoning;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- FUNCTION: Get all actions for a drill (for showing alternates)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_drill_actions(p_drill_id UUID)
RETURNS SETOF gto_solutions AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM gto_solutions
    WHERE drill_id = p_drill_id
    ORDER BY ev DESC;  -- Best EV first
END;
$$ LANGUAGE plpgsql;
`;

// ═══════════════════════════════════════════════════════════════
// 📊 TABLE: ready_content
// ═══════════════════════════════════════════════════════════════

export const READY_CONTENT_SCHEMA = `
-- Ready Content Table
-- Pre-generated content pool that Training Orb pulls from
-- ONLY content with status = 'READY' is served to users

CREATE TABLE IF NOT EXISTS ready_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Content Identity
    scenario_id TEXT UNIQUE NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'POKER_SCENARIO',
    
    -- Targeting
    skill_level TEXT NOT NULL,
    scenario_type TEXT NOT NULL,
    complexity INTEGER NOT NULL DEFAULT 1,
    
    -- Content Status (CRITICAL: Training Orb ONLY reads status = 'READY')
    status TEXT NOT NULL DEFAULT 'READY',  -- READY, SERVED, EXPIRED, FLAGGED
    quality_grade TEXT NOT NULL DEFAULT 'A+',
    
    -- The Actual Content (GTO-compliant scenario)
    scenario_data JSONB NOT NULL,
    
    -- GTO Solution
    gto_solution JSONB NOT NULL,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    
    -- Usage Tracking
    times_served INTEGER DEFAULT 0,
    max_serves INTEGER DEFAULT NULL,  -- NULL = unlimited
    
    -- Timing
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    ready_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    last_served_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Source
    generated_by_job UUID REFERENCES content_generation_queue(id),
    worker_id TEXT DEFAULT NULL
);

-- Indexes for fast content retrieval
CREATE INDEX IF NOT EXISTS idx_ready_content_status_level 
    ON ready_content (status, skill_level);
    
CREATE INDEX IF NOT EXISTS idx_ready_content_type_level 
    ON ready_content (scenario_type, skill_level, status);

CREATE INDEX IF NOT EXISTS idx_ready_content_ready 
    ON ready_content (status, skill_level, generated_at) 
    WHERE status = 'READY';

-- Function to get fresh content (never seen by user)
CREATE OR REPLACE FUNCTION get_fresh_content(
    p_user_id TEXT,
    p_skill_level TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS SETOF ready_content AS $$
BEGIN
    RETURN QUERY
    SELECT rc.* 
    FROM ready_content rc
    LEFT JOIN user_seen_content usc 
        ON usc.content_id = rc.id AND usc.user_id = p_user_id
    WHERE rc.status = 'READY'
      AND rc.skill_level = p_skill_level
      AND usc.id IS NULL  -- Not seen by this user
      AND (rc.expires_at IS NULL OR rc.expires_at > NOW())
      AND (rc.max_serves IS NULL OR rc.times_served < rc.max_serves)
    ORDER BY rc.generated_at DESC
    LIMIT p_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark content as served
CREATE OR REPLACE FUNCTION mark_content_served(
    p_content_id UUID,
    p_user_id TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update serve count
    UPDATE ready_content
    SET times_served = times_served + 1,
        last_served_at = NOW()
    WHERE id = p_content_id;
    
    -- Track user view (for never-repeat guarantee)
    INSERT INTO user_seen_content (user_id, content_id, seen_at)
    VALUES (p_user_id, p_content_id, NOW())
    ON CONFLICT (user_id, content_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
`;

// ═══════════════════════════════════════════════════════════════
// 📊 TABLE: user_seen_content (Never-Repeat Tracking)
// ═══════════════════════════════════════════════════════════════

export const USER_SEEN_CONTENT_SCHEMA = `
-- User Seen Content Table
-- Ensures users NEVER see the same content twice

CREATE TABLE IF NOT EXISTS user_seen_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    content_id UUID NOT NULL REFERENCES ready_content(id) ON DELETE CASCADE,
    seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_user_seen_content_user 
    ON user_seen_content (user_id, seen_at DESC);
`;

// ═══════════════════════════════════════════════════════════════
// 📊 COMBINED MIGRATION
// ═══════════════════════════════════════════════════════════════

export const FULL_MIGRATION = `
-- ═══════════════════════════════════════════════════════════════
-- AI_CONTENT_GTO_ENGINE - Async Queue Worker Schema
-- Run this migration in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

${CONTENT_GENERATION_QUEUE_SCHEMA}

${READY_CONTENT_SCHEMA}

${USER_SEEN_CONTENT_SCHEMA}

-- ═══════════════════════════════════════════════════════════════
-- CONTENT POOL HEALTH VIEW
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW content_pool_health AS
SELECT 
    skill_level,
    COUNT(*) FILTER (WHERE status = 'READY') as ready_count,
    COUNT(*) FILTER (WHERE status = 'SERVED') as served_count,
    COUNT(*) FILTER (WHERE status = 'EXPIRED') as expired_count,
    AVG(times_served) as avg_serves,
    MIN(generated_at) FILTER (WHERE status = 'READY') as oldest_ready,
    MAX(generated_at) FILTER (WHERE status = 'READY') as newest_ready
FROM ready_content
GROUP BY skill_level;

-- ═══════════════════════════════════════════════════════════════
-- QUEUE HEALTH VIEW
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW queue_health AS
SELECT 
    status,
    COUNT(*) as job_count,
    AVG(attempts) as avg_attempts,
    MIN(created_at) as oldest_job,
    MAX(created_at) as newest_job
FROM content_generation_queue
GROUP BY status;

-- Grant access (adjust for your setup)
-- GRANT SELECT, INSERT, UPDATE ON content_generation_queue TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON ready_content TO authenticated;
-- GRANT SELECT, INSERT ON user_seen_content TO authenticated;
`;

// ═══════════════════════════════════════════════════════════════
// 📊 TYPESCRIPT TYPES (for reference)
// ═══════════════════════════════════════════════════════════════

export const JOB_STATUSES = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED'
};

export const CONTENT_STATUSES = {
    READY: 'READY',       // Available for serving
    SERVED: 'SERVED',     // Has been served (can still be re-served)
    EXPIRED: 'EXPIRED',   // Past expiration date
    FLAGGED: 'FLAGGED'    // Flagged for review
};

export const JOB_TYPES = {
    DAILY_DRILLS: 'DAILY_DRILLS',
    REMEDIATION: 'REMEDIATION',
    ARCADE: 'ARCADE',
    CUSTOM: 'CUSTOM'
};

export default {
    CONTENT_GENERATION_QUEUE_SCHEMA,
    PRE_GENERATED_CONTENT_SCHEMA,  // ⚡ LOCKED TABLE
    GTO_SOLUTIONS_SCHEMA,          // 🎯 GTO TRUTH STORAGE
    READY_CONTENT_SCHEMA,
    USER_SEEN_CONTENT_SCHEMA,
    FULL_MIGRATION,
    JOB_STATUSES,
    CONTENT_STATUSES,
    JOB_TYPES
};
