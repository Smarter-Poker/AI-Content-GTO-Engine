/**
 * 🔒 SMARTER.POKER — MASTERY GATE BYPASS PROTECTION
 * 
 * @task MASTERY_GATE_BYPASS_PROTECTION
 * ---------------------------------------------------------
 * Logic: Before allowing level N, check that level N-1 has an 85% score in the DB.
 * No skipping allowed.
 */

import { SKILL_LEVELS } from '../config/constants.js';

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

export class MasteryGateGuard {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        this.config = {
            requiredScore: options.requiredScore || 85,  // 85% required
            minQuestionsRequired: options.minQuestionsRequired || 20,
            ...options
        };

        // Level order (for N-1 check)
        this.levelOrder = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ELITE'];

        // Mock scores for testing
        this.mockScores = new Map();

        console.log('🔒 MasteryGateGuard initialized (85% required for unlock)');
    }

    // ═══════════════════════════════════════════════════════════
    // 🔒 MAIN API: Verify Level Unlock
    // ═══════════════════════════════════════════════════════════

    /**
     * Verify if user can unlock level N
     * RULE: Level N-1 must have 85% score. NO SKIPPING.
     */
    async verifyLevelUnlock(userId, targetLevel) {
        // BEGINNER is always unlocked
        if (targetLevel === 'BEGINNER') {
            return {
                allowed: true,
                targetLevel,
                reason: 'BEGINNER level is always unlocked',
                requiredScore: 0,
                currentScore: null
            };
        }

        const previousLevel = this.getPreviousLevel(targetLevel);

        if (!previousLevel) {
            return {
                allowed: false,
                targetLevel,
                reason: `Invalid target level: ${targetLevel}`,
                requiredScore: this.config.requiredScore,
                currentScore: null
            };
        }

        // Get user's score for previous level
        const previousScore = await this.getUserLevelScore(userId, previousLevel);

        // Check if meets 85% threshold
        const meetsRequirement = previousScore >= this.config.requiredScore;

        if (!meetsRequirement) {
            console.log(`🔒 BLOCKED: ${userId} cannot access ${targetLevel} (${previousLevel} score: ${previousScore}%)`);

            return {
                allowed: false,
                targetLevel,
                previousLevel,
                reason: `Must achieve ${this.config.requiredScore}% on ${previousLevel} first`,
                requiredScore: this.config.requiredScore,
                currentScore: previousScore,
                deficit: this.config.requiredScore - previousScore
            };
        }

        console.log(`🔓 ALLOWED: ${userId} can access ${targetLevel} (${previousLevel} score: ${previousScore}%)`);

        return {
            allowed: true,
            targetLevel,
            previousLevel,
            reason: `${previousLevel} mastery verified (${previousScore}%)`,
            requiredScore: this.config.requiredScore,
            currentScore: previousScore
        };
    }

    /**
     * Get all unlocked levels for a user
     */
    async getUnlockedLevels(userId) {
        const unlocked = ['BEGINNER'];  // Always unlocked

        for (let i = 1; i < this.levelOrder.length; i++) {
            const targetLevel = this.levelOrder[i];
            const result = await this.verifyLevelUnlock(userId, targetLevel);

            if (result.allowed) {
                unlocked.push(targetLevel);
            } else {
                break;  // Can't skip - stop checking higher levels
            }
        }

        return unlocked;
    }

    /**
     * Get next level to unlock (and requirements)
     */
    async getNextLevelToUnlock(userId) {
        const unlockedLevels = await this.getUnlockedLevels(userId);
        const highestUnlocked = unlockedLevels[unlockedLevels.length - 1];
        const nextLevel = this.getNextLevel(highestUnlocked);

        if (!nextLevel) {
            return {
                nextLevel: null,
                status: 'MAX_LEVEL_REACHED',
                message: 'You have unlocked all levels!'
            };
        }

        const currentScore = await this.getUserLevelScore(userId, highestUnlocked);

        return {
            currentLevel: highestUnlocked,
            nextLevel,
            currentScore,
            requiredScore: this.config.requiredScore,
            deficit: Math.max(0, this.config.requiredScore - currentScore),
            isReady: currentScore >= this.config.requiredScore
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 SCORE RETRIEVAL
    // ═══════════════════════════════════════════════════════════

    /**
     * Get user's score for a specific level from DB
     */
    async getUserLevelScore(userId, level) {
        if (this.supabase) {
            // Query user_level_progress table
            const { data, error } = await this.supabase
                .from('user_level_progress')
                .select('accuracy_percentage, questions_answered')
                .eq('user_id', userId)
                .eq('skill_level', level)
                .single();

            if (error || !data) {
                return 0;  // No progress = 0%
            }

            // Must have answered minimum questions
            if (data.questions_answered < this.config.minQuestionsRequired) {
                return 0;
            }

            return data.accuracy_percentage || 0;
        }

        // Mock mode
        return this.mockScores.get(`${userId}_${level}`) || 0;
    }

    /**
     * Update user's score for a level (after answering questions)
     */
    async updateUserScore(userId, level, correct, total) {
        const accuracy = Math.round((correct / total) * 100);

        if (this.supabase) {
            await this.supabase
                .from('user_level_progress')
                .upsert({
                    user_id: userId,
                    skill_level: level,
                    accuracy_percentage: accuracy,
                    questions_answered: total,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,skill_level' });
        }

        // Mock mode
        this.mockScores.set(`${userId}_${level}`, accuracy);

        return accuracy;
    }

    // ═══════════════════════════════════════════════════════════
    // 🔧 HELPERS
    // ═══════════════════════════════════════════════════════════

    getPreviousLevel(level) {
        const index = this.levelOrder.indexOf(level);
        if (index <= 0) return null;
        return this.levelOrder[index - 1];
    }

    getNextLevel(level) {
        const index = this.levelOrder.indexOf(level);
        if (index < 0 || index >= this.levelOrder.length - 1) return null;
        return this.levelOrder[index + 1];
    }

    getLevelIndex(level) {
        return this.levelOrder.indexOf(level);
    }

    // ═══════════════════════════════════════════════════════════
    // 🛡️ MIDDLEWARE (For route protection)
    // ═══════════════════════════════════════════════════════════

    /**
     * Express/API middleware for protecting level routes
     */
    createMiddleware() {
        return async (req, res, next) => {
            const userId = req.user?.id || req.body?.userId;
            const targetLevel = req.params?.level || req.body?.level;

            if (!userId || !targetLevel) {
                return res.status(400).json({ error: 'Missing userId or level' });
            }

            const result = await this.verifyLevelUnlock(userId, targetLevel);

            if (!result.allowed) {
                return res.status(403).json({
                    error: 'LEVEL_LOCKED',
                    ...result
                });
            }

            req.levelVerification = result;
            next();
        };
    }

    /**
     * Simple check function for use in handlers
     */
    async canAccessLevel(userId, level) {
        const result = await this.verifyLevelUnlock(userId, level);
        return result.allowed;
    }
}

// Supabase table schema for user_level_progress
export const USER_LEVEL_PROGRESS_SCHEMA = `
-- User Level Progress Table
-- Tracks mastery score for each skill level per user

CREATE TABLE IF NOT EXISTS user_level_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    skill_level TEXT NOT NULL,
    
    -- Progress metrics
    accuracy_percentage INTEGER NOT NULL DEFAULT 0,  -- 0-100
    questions_answered INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(user_id, skill_level)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_level_progress 
    ON user_level_progress (user_id, skill_level);

-- Function to check if level is unlocked
CREATE OR REPLACE FUNCTION is_level_unlocked(
    p_user_id TEXT,
    p_target_level TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_previous_level TEXT;
    v_previous_score INTEGER;
    v_level_order TEXT[] := ARRAY['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ELITE'];
    v_target_index INTEGER;
BEGIN
    -- BEGINNER is always unlocked
    IF p_target_level = 'BEGINNER' THEN
        RETURN true;
    END IF;
    
    -- Find target level index
    v_target_index := array_position(v_level_order, p_target_level);
    
    IF v_target_index IS NULL OR v_target_index <= 1 THEN
        RETURN false;
    END IF;
    
    -- Get previous level
    v_previous_level := v_level_order[v_target_index - 1];
    
    -- Get score for previous level
    SELECT accuracy_percentage INTO v_previous_score
    FROM user_level_progress
    WHERE user_id = p_user_id AND skill_level = v_previous_level;
    
    -- Check if meets 85% requirement
    RETURN COALESCE(v_previous_score, 0) >= 85;
END;
$$ LANGUAGE plpgsql;
`;

export default MasteryGateGuard;
