/**
 * 🛰️ GREEN_ADDICTION_ENGINE: PROMPTS 7-9 (JavaScript Interface)
 * ═══════════════════════════════════════════════════════════════════════════
 * @silo AI_CONTENT_GTO_ENGINE (GREEN)
 * 
 * TASK_07: MULTI_LEVEL_XP_SCALING_ENGINE
 * TASK_08: LEADERBOARD_RANKING_HOOK
 * TASK_09: FOCUS_SESSION_AUTO_GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_07: XP REWARD SCALING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const XP_REWARD_SCALING = {
    // STANDARD TIER (Levels 1-5)
    1: { tier: 'STANDARD', baseXP: 100, xpMultiplier: 1.0, baseDiamonds: 5, diamondBonus: 0, perfectBonus: 50 },
    2: { tier: 'STANDARD', baseXP: 120, xpMultiplier: 1.1, baseDiamonds: 6, diamondBonus: 0, perfectBonus: 75 },
    3: { tier: 'STANDARD', baseXP: 140, xpMultiplier: 1.2, baseDiamonds: 7, diamondBonus: 0, perfectBonus: 100 },
    4: { tier: 'STANDARD', baseXP: 160, xpMultiplier: 1.3, baseDiamonds: 8, diamondBonus: 0, perfectBonus: 125 },
    5: { tier: 'STANDARD', baseXP: 180, xpMultiplier: 1.4, baseDiamonds: 10, diamondBonus: 0, perfectBonus: 150 },

    // ELITE TIER (Levels 6-10) - +25% Diamond Bonus
    6: { tier: 'ELITE', baseXP: 200, xpMultiplier: 1.5, baseDiamonds: 12, diamondBonus: 25, perfectBonus: 200 },
    7: { tier: 'ELITE', baseXP: 240, xpMultiplier: 1.6, baseDiamonds: 15, diamondBonus: 25, perfectBonus: 250 },
    8: { tier: 'ELITE', baseXP: 280, xpMultiplier: 1.8, baseDiamonds: 18, diamondBonus: 25, perfectBonus: 300 },
    9: { tier: 'ELITE', baseXP: 320, xpMultiplier: 2.0, baseDiamonds: 22, diamondBonus: 25, perfectBonus: 400 },
    10: { tier: 'ELITE', baseXP: 400, xpMultiplier: 2.5, baseDiamonds: 30, diamondBonus: 25, perfectBonus: 500 }
};

export const STREAK_BONUSES = {
    3: 1.1,   // 10% bonus at 3 streak
    5: 1.25,  // 25% bonus at 5 streak
    10: 1.5    // 50% bonus at 10 streak
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💎 TASK_07: XP SCALING ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class XPScalingEngine {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        console.log('💎 XPScalingEngine initialized (TASK_07: Difficulty vs Reward)');
    }

    /**
     * Calculate session rewards based on level and performance
     */
    async calculateSessionRewards(levelId, correctAnswers, totalQuestions, currentStreak = 0, isPerfect = false) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_calculate_session_rewards', {
                    p_level_id: levelId,
                    p_correct_answers: correctAnswers,
                    p_total_questions: totalQuestions,
                    p_current_streak: currentStreak,
                    p_is_perfect_session: isPerfect
                });

            return error ? { error: error.message } : data;
        }

        return this.mockCalculateRewards(levelId, correctAnswers, totalQuestions, currentStreak, isPerfect);
    }

    /**
     * Mock reward calculation
     */
    mockCalculateRewards(levelId, correctAnswers, totalQuestions, currentStreak, isPerfect) {
        const scaling = XP_REWARD_SCALING[levelId];
        if (!scaling) return { error: 'INVALID_LEVEL' };

        const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

        // Calculate XP
        let xpEarned = Math.floor(scaling.baseXP * correctAnswers * scaling.xpMultiplier);

        // Apply streak multiplier
        let streakMultiplier = 1.0;
        if (currentStreak >= 10) streakMultiplier = STREAK_BONUSES[10];
        else if (currentStreak >= 5) streakMultiplier = STREAK_BONUSES[5];
        else if (currentStreak >= 3) streakMultiplier = STREAK_BONUSES[3];

        xpEarned = Math.floor(xpEarned * streakMultiplier);

        // Perfect session bonus
        let perfectBonus = 0;
        if (isPerfect) {
            perfectBonus = scaling.perfectBonus;
            xpEarned += perfectBonus;
        }

        // ═══════════════════════════════════════════════════════════════════
        // 💎 DIAMOND CALCULATION (+25% for Elite Levels 6-10)
        // ═══════════════════════════════════════════════════════════════════

        let diamondBase = Math.floor(scaling.baseDiamonds * (correctAnswers / 10));
        let diamondBonusAmount = Math.floor(diamondBase * (scaling.diamondBonus / 100));
        let diamondsEarned = diamondBase + diamondBonusAmount;

        // Streak bonus on diamonds
        if (currentStreak >= 5) {
            diamondsEarned = Math.floor(diamondsEarned * 1.5);
        }

        return {
            success: true,
            level_id: levelId,
            tier: scaling.tier,

            // Performance
            accuracy: (accuracy * 100).toFixed(2),
            correct: correctAnswers,
            total: totalQuestions,
            streak: currentStreak,
            is_perfect: isPerfect,

            // XP
            xp: {
                base: scaling.baseXP,
                multiplier: scaling.xpMultiplier,
                streak_multiplier: streakMultiplier,
                perfect_bonus: perfectBonus,
                total: xpEarned
            },

            // Diamonds
            diamonds: {
                base: diamondBase,
                bonus_percentage: scaling.diamondBonus,
                bonus_amount: diamondBonusAmount,
                streak_applied: currentStreak >= 5,
                total: diamondsEarned
            },

            is_elite: scaling.tier === 'ELITE',
            elite_bonus_active: scaling.diamondBonus > 0
        };
    }

    /**
     * Get scaling config for a level
     */
    getScalingConfig(levelId) {
        return XP_REWARD_SCALING[levelId] || null;
    }

    /**
     * Check if level is Elite tier
     */
    isEliteTier(levelId) {
        const scaling = XP_REWARD_SCALING[levelId];
        return scaling?.tier === 'ELITE';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 TASK_08: LEADERBOARD ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class LeaderboardEngine {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Mock leaderboard data
        this.mockSessions = [];

        console.log('🏆 LeaderboardEngine initialized (TASK_08: Competitive Rankings)');
    }

    /**
     * Get leaderboard with pagination
     */
    async getLeaderboard(limit = 100, offset = 0, timeframe = 'ALL_TIME') {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_leaderboard', {
                    p_limit: limit,
                    p_offset: offset,
                    p_timeframe: timeframe
                });

            return error ? { error: error.message } : data;
        }

        return this.mockGetLeaderboard(limit, offset, timeframe);
    }

    /**
     * Get user's rank and stats
     */
    async getUserRank(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_user_rank', { p_user_id: userId });

            return error ? null : data;
        }

        return this.mockGetUserRank(userId);
    }

    /**
     * Record a training session
     */
    async recordSession(userId, levelId, questionsAnswered, questionsCorrect, xpEarned, diamondsEarned) {
        const session = {
            id: `session_${Date.now()}`,
            user_id: userId,
            level_id: levelId,
            questions_answered: questionsAnswered,
            questions_correct: questionsCorrect,
            accuracy: questionsCorrect / questionsAnswered,
            is_mastery_session: questionsAnswered >= 10 && (questionsCorrect / questionsAnswered) >= 0.85,
            xp_earned: xpEarned,
            diamonds_earned: diamondsEarned,
            completed_at: new Date().toISOString()
        };

        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('training_sessions')
                .insert(session)
                .select()
                .single();

            return error ? { error: error.message } : data;
        }

        // Mock mode
        this.mockSessions.push(session);
        return session;
    }

    /**
     * Mock leaderboard
     */
    mockGetLeaderboard(limit, offset, timeframe) {
        // Generate mock leaderboard
        const leaderboard = [];
        for (let i = 1; i <= Math.min(limit, 20); i++) {
            leaderboard.push({
                rank: i + offset,
                user_id: `user_${i + offset}`,
                mastery_sessions: Math.floor(Math.random() * 100) + 10,
                avg_accuracy: (85 + Math.random() * 15).toFixed(2),
                perfect_sessions: Math.floor(Math.random() * 20),
                highest_level: Math.floor(Math.random() * 10) + 1,
                total_xp: Math.floor(Math.random() * 50000) + 5000,
                total_diamonds: Math.floor(Math.random() * 1000) + 100
            });
        }

        return {
            success: true,
            timeframe,
            total_players: 1500,
            page_size: limit,
            offset,
            leaderboard
        };
    }

    /**
     * Mock user rank
     */
    mockGetUserRank(userId) {
        return {
            success: true,
            user_id: userId,
            global_rank: Math.floor(Math.random() * 500) + 1,
            total_85_plus_sessions: Math.floor(Math.random() * 50) + 5,
            total_sessions: Math.floor(Math.random() * 100) + 10,
            avg_accuracy: (85 + Math.random() * 10).toFixed(2),
            perfect_sessions: Math.floor(Math.random() * 10),
            highest_level: Math.floor(Math.random() * 10) + 1,
            total_xp: Math.floor(Math.random() * 25000) + 2000,
            total_diamonds: Math.floor(Math.random() * 500) + 50,
            sessions_this_week: Math.floor(Math.random() * 20),
            sessions_today: Math.floor(Math.random() * 5)
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 TASK_09: FOCUS SESSION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class FocusSessionGenerator {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Leak threshold for focus session trigger
        this.LEAK_THRESHOLD = 5;

        // Mock leak patterns
        this.mockLeakPatterns = new Map();
        this.mockFocusSessions = [];

        console.log('🎯 FocusSessionGenerator initialized (TASK_09: Weakness Drills)');
    }

    /**
     * Record a leak pattern and check for focus session trigger
     * Logic: If leak count > 5 for a category → Auto-generate 10-question drill
     */
    async recordLeakPattern(userId, leakCategory, leakValue, evLoss = 0) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_record_leak_pattern', {
                    p_user_id: userId,
                    p_leak_category: leakCategory,
                    p_leak_value: leakValue,
                    p_ev_loss: evLoss
                });

            return error ? { error: error.message } : data;
        }

        return this.mockRecordLeakPattern(userId, leakCategory, leakValue, evLoss);
    }

    /**
     * Mock leak pattern recording
     */
    mockRecordLeakPattern(userId, leakCategory, leakValue, evLoss) {
        const key = `${userId}_${leakCategory}_${leakValue}`;

        let pattern = this.mockLeakPatterns.get(key);
        if (!pattern) {
            pattern = {
                user_id: userId,
                leak_category: leakCategory,
                leak_value: leakValue,
                leak_count: 0,
                total_ev_loss: 0,
                focus_session_generated: false
            };
        }

        pattern.leak_count++;
        pattern.total_ev_loss += evLoss;
        this.mockLeakPatterns.set(key, pattern);

        // ═══════════════════════════════════════════════════════════════════
        // 🎯 FOCUS SESSION TRIGGER: Leak Count >= 5
        // ═══════════════════════════════════════════════════════════════════

        let focusTriggered = false;
        let focusSessionId = null;

        if (pattern.leak_count >= this.LEAK_THRESHOLD && !pattern.focus_session_generated) {
            // Generate 10-question Weakness Drill
            focusSessionId = `focus_${Date.now()}`;
            const focusSession = {
                id: focusSessionId,
                user_id: userId,
                leak_category: leakCategory,
                leak_value: leakValue,
                question_count: 10,
                bonus_xp: pattern.leak_count >= 10 ? 400 : pattern.leak_count >= 7 ? 300 : 200,
                status: 'PENDING',
                created_at: new Date().toISOString()
            };

            this.mockFocusSessions.push(focusSession);
            pattern.focus_session_generated = true;
            focusTriggered = true;
        }

        return {
            success: true,
            user_id: userId,
            leak_category: leakCategory,
            leak_value: leakValue,
            new_count: pattern.leak_count,
            total_ev_loss: pattern.total_ev_loss.toFixed(4),
            focus_session_triggered: focusTriggered,
            focus_session_id: focusSessionId,
            threshold: this.LEAK_THRESHOLD,
            message: focusTriggered
                ? `🎯 Weakness detected! A 10-question Focus Drill has been generated for ${leakCategory}: ${leakValue}`
                : pattern.leak_count >= this.LEAK_THRESHOLD - 1
                    ? `⚠️ ${this.LEAK_THRESHOLD - pattern.leak_count} more leak on ${leakCategory}: ${leakValue} will trigger a Focus Drill`
                    : null
        };
    }

    /**
     * Get user's weakness patterns
     */
    async getUserWeaknesses(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_user_weaknesses', { p_user_id: userId });

            return error ? { error: error.message } : data;
        }

        // Mock mode
        const weaknesses = [];
        for (const [key, pattern] of this.mockLeakPatterns.entries()) {
            if (pattern.user_id === userId) {
                weaknesses.push({
                    category: pattern.leak_category,
                    value: pattern.leak_value,
                    leak_count: pattern.leak_count,
                    total_ev_loss_bb: (pattern.total_ev_loss * 100).toFixed(2),
                    focus_session_pending: pattern.focus_session_generated
                });
            }
        }

        return {
            success: true,
            user_id: userId,
            weaknesses: weaknesses.sort((a, b) => b.leak_count - a.leak_count),
            pending_focus_sessions: this.mockFocusSessions.filter(s => s.user_id === userId && s.status === 'PENDING').length
        };
    }

    /**
     * Get pending focus sessions
     */
    async getPendingFocusSessions(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_pending_focus_sessions', { p_user_id: userId });

            return error ? { error: error.message } : data;
        }

        // Mock mode
        const sessions = this.mockFocusSessions
            .filter(s => s.user_id === userId && s.status === 'PENDING')
            .map(s => ({
                id: s.id,
                target: {
                    category: s.leak_category,
                    value: s.leak_value
                },
                question_count: s.question_count,
                bonus_xp: s.bonus_xp,
                status: s.status,
                created_at: s.created_at
            }));

        return {
            success: true,
            user_id: userId,
            focus_sessions: sessions
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createXPScalingEngine(options = {}) {
    return new XPScalingEngine(options);
}

export function createLeaderboardEngine(options = {}) {
    return new LeaderboardEngine(options);
}

export function createFocusSessionGenerator(options = {}) {
    return new FocusSessionGenerator(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    XP_REWARD_SCALING,
    STREAK_BONUSES,
    XPScalingEngine,
    LeaderboardEngine,
    FocusSessionGenerator,
    createXPScalingEngine,
    createLeaderboardEngine,
    createFocusSessionGenerator
};
