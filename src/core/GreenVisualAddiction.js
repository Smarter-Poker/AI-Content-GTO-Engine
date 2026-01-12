/**
 * 🛰️ GREEN_VISUAL_ADDICTION: PROMPTS 19-21 (JavaScript Interface)
 * ═══════════════════════════════════════════════════════════════════════════
 * @silo AI_CONTENT_GTO_ENGINE (GREEN)
 * 
 * TASK_19: DYNAMIC_PROGRESS_BAR_MAPPING
 * TASK_20: LEVEL_UP_ANIMATION_DISPATCH
 * TASK_21: GTO_ACCURACY_LEADERBOARD
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 VISUAL STATE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const VISUAL_STATES = {
    GOLD_PULSE: { state: 'GOLD_PULSE', color: '#FFD700', animation: 'pulse_gold', glow: 1.0, threshold: 0.95 },
    GREEN_GLOW: { state: 'GREEN_GLOW', color: '#00FF88', animation: 'glow_green', glow: 0.8, threshold: 0.85 },
    YELLOW: { state: 'YELLOW', color: '#FFAA00', animation: 'none', glow: 0.4, threshold: 0.70 },
    RED_WARNING: { state: 'RED_WARNING', color: '#FF4444', animation: 'shake', glow: 0.0, threshold: 0 },
    NEUTRAL: { state: 'NEUTRAL', color: '#888888', animation: 'none', glow: 0.0, threshold: 0 }
};

export const ANIMATION_TYPES = {
    LEVEL_UNLOCKED: { type: 'LEVEL_UNLOCKED', priority: 5, duration: 3000 },
    BOSS_DEFEATED: { type: 'BOSS_DEFEATED', priority: 10, duration: 5000 },
    PERFECT_SESSION: { type: 'PERFECT_SESSION', priority: 8, duration: 4000 },
    MASTERY_UNLOCKED: { type: 'MASTERY_UNLOCKED', priority: 5, duration: 3000 },
    STREAK_FIRE: { type: 'STREAK_FIRE', priority: 3, duration: 2000 },
    XP_BURST: { type: 'XP_BURST', priority: 2, duration: 1500 },
    DIAMOND_SHOWER: { type: 'DIAMOND_SHOWER', priority: 4, duration: 2500 },
    RANK_UP: { type: 'RANK_UP', priority: 7, duration: 4000 }
};

export const RANK_TIERS = {
    LEGENDARY: { tier: 'LEGENDARY', icon: '👑', minPerfect: 50, color: '#FFD700' },
    GRANDMASTER: { tier: 'GRANDMASTER', icon: '🏆', minPerfect: 25, color: '#FF6B00' },
    MASTER: { tier: 'MASTER', icon: '⭐', minPerfect: 10, color: '#9B59B6' },
    EXPERT: { tier: 'EXPERT', icon: '💎', minPerfect: 5, color: '#3498DB' },
    ADVANCED: { tier: 'ADVANCED', icon: '🔥', minMastery: 10, color: '#E74C3C' },
    STUDENT: { tier: 'STUDENT', icon: '📚', minMastery: 0, color: '#95A5A6' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_19: SESSION MOMENTUM TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

export class SessionMomentumTracker {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Mock sessions
        this.mockSessions = new Map();

        console.log('📊 SessionMomentumTracker initialized (TASK_19: Progress Bar)');
    }

    /**
     * Start a new session
     */
    startSession(userId, levelId, totalQuestions = 20) {
        const sessionId = `session_${Date.now()}`;
        const session = {
            id: sessionId,
            user_id: userId,
            level_id: levelId,
            questions_answered: 0,
            questions_correct: 0,
            questions_total: totalQuestions,
            current_accuracy: 0,
            progress_percentage: 0,
            visual_state: 'NEUTRAL',
            current_streak: 0,
            best_streak: 0,
            status: 'ACTIVE',
            started_at: new Date().toISOString()
        };

        this.mockSessions.set(sessionId, session);
        return session;
    }

    /**
     * Get momentum bar render data
     * Glows Green at 85%, Pulses Gold at 95%
     */
    async getMomentumBar(sessionId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_momentum_bar', { p_session_id: sessionId });
            return error ? { success: false, error: error.message } : data;
        }

        return this.mockGetMomentumBar(sessionId);
    }

    /**
     * Mock momentum bar
     */
    mockGetMomentumBar(sessionId) {
        const session = this.mockSessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'SESSION_NOT_FOUND' };
        }

        const accuracy = session.current_accuracy;
        const visualState = this.getVisualState(accuracy);
        const stateConfig = VISUAL_STATES[visualState];

        return {
            success: true,
            session_id: sessionId,
            progress: {
                answered: session.questions_answered,
                correct: session.questions_correct,
                total: session.questions_total,
                percentage: (session.questions_answered / session.questions_total * 100).toFixed(1),
                accuracy: (accuracy * 100).toFixed(1)
            },
            visual: {
                state: visualState,
                color: stateConfig.color,
                animation: stateConfig.animation,
                glow_intensity: stateConfig.glow,
                show_sparkles: visualState === 'GOLD_PULSE',
                show_glow: visualState === 'GOLD_PULSE' || visualState === 'GREEN_GLOW'
            },
            streak: {
                current: session.current_streak,
                best: session.best_streak,
                on_fire: session.current_streak >= 5
            },
            status: session.status,
            is_mastery: accuracy >= 0.85,
            is_perfect: accuracy >= 1.0
        };
    }

    /**
     * Update session momentum
     */
    async updateMomentum(sessionId, isCorrect) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_update_momentum', {
                    p_session_id: sessionId,
                    p_is_correct: isCorrect
                });
            return error ? { success: false, error: error.message } : data;
        }

        return this.mockUpdateMomentum(sessionId, isCorrect);
    }

    /**
     * Mock update momentum
     */
    mockUpdateMomentum(sessionId, isCorrect) {
        const session = this.mockSessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'SESSION_NOT_FOUND' };
        }

        session.questions_answered++;
        if (isCorrect) {
            session.questions_correct++;
            session.current_streak++;
            session.best_streak = Math.max(session.best_streak, session.current_streak);
        } else {
            session.current_streak = 0;
        }

        session.current_accuracy = session.questions_answered > 0
            ? session.questions_correct / session.questions_answered
            : 0;
        session.progress_percentage = session.questions_answered / session.questions_total * 100;
        session.visual_state = this.getVisualState(session.current_accuracy);

        return this.mockGetMomentumBar(sessionId);
    }

    /**
     * Get visual state based on accuracy
     */
    getVisualState(accuracy) {
        if (accuracy >= 0.95) return 'GOLD_PULSE';
        if (accuracy >= 0.85) return 'GREEN_GLOW';
        if (accuracy >= 0.70) return 'YELLOW';
        if (accuracy > 0) return 'RED_WARNING';
        return 'NEUTRAL';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎬 TASK_20: LEVEL UP ANIMATION DISPATCH
// ═══════════════════════════════════════════════════════════════════════════════

export class AnimationDispatcher {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Animation queue
        this.animationQueue = [];

        // Animation listeners
        this.listeners = [];

        console.log('🎬 AnimationDispatcher initialized (TASK_20: Level-Up Animations)');
    }

    /**
     * Dispatch level-up animation
     */
    async dispatchLevelAnimation(userId, levelId, accuracy = 0.85) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_dispatch_level_animation', {
                    p_user_id: userId,
                    p_level_id: levelId,
                    p_accuracy: accuracy
                });
            return error ? { success: false, error: error.message } : data;
        }

        return this.mockDispatchAnimation(userId, levelId, accuracy);
    }

    /**
     * Mock animation dispatch
     */
    mockDispatchAnimation(userId, levelId, accuracy) {
        const isBossMode = levelId === 10;
        const isPerfect = accuracy >= 1.0;

        // Determine animation type
        let animationType, soundEffect, durationMs, priority;
        if (isBossMode) {
            animationType = 'BOSS_DEFEATED';
            soundEffect = 'boss_defeated_fanfare';
            durationMs = 5000;
            priority = 10;
        } else if (isPerfect) {
            animationType = 'PERFECT_SESSION';
            soundEffect = 'perfect_chime';
            durationMs = 4000;
            priority = 8;
        } else {
            animationType = 'MASTERY_UNLOCKED';
            soundEffect = 'level_up_fanfare';
            durationMs = 3000;
            priority = 5;
        }

        const levelNames = {
            1: 'Foundations', 2: 'Opening Ranges', 3: 'C-Bet Mastery',
            4: 'Defense Basics', 5: 'Multi-Street', 6: 'Board Texture',
            7: 'Mixed Strategy', 8: 'Exploitation', 9: 'ICM Mastery',
            10: '🔥 BOSS MODE 🔥'
        };

        const animationData = {
            level_id: levelId,
            level_name: levelNames[levelId] || `Level ${levelId}`,
            accuracy: (accuracy * 100).toFixed(1),
            is_boss_mode: isBossMode,
            is_perfect: isPerfect,
            effects: {
                particles: isBossMode ? 'fireworks_gold' : isPerfect ? 'confetti_rainbow' : 'sparkles_green',
                background_flash: isBossMode ? '#FFD700' : isPerfect ? '#00FF88' : '#88FF00',
                text_effect: isBossMode ? 'shake_zoom' : 'scale_bounce',
                screen_shake: isBossMode
            },
            title: isBossMode ? '🏆 BOSS DEFEATED! 🏆' : isPerfect ? '💯 PERFECT MASTERY!' : '🎉 LEVEL UNLOCKED!',
            subtitle: isBossMode ? 'You have conquered the ultimate challenge!'
                : isPerfect ? 'Flawless GTO execution achieved!'
                    : `Level ${levelId} mastered with ${(accuracy * 100).toFixed(0)}% accuracy`
        };

        const animation = {
            id: `anim_${Date.now()}`,
            user_id: userId,
            animation_type: animationType,
            animation_data: animationData,
            duration_ms: durationMs,
            priority,
            sound_effect: soundEffect,
            haptic_pattern: isBossMode ? 'victory_rumble' : 'success_tap',
            status: 'PENDING',
            created_at: new Date().toISOString()
        };

        this.animationQueue.push(animation);
        this.notifyListeners(animation);

        return {
            success: true,
            animation_id: animation.id,
            animation_type: animationType,
            animation_data: animationData,
            sound_effect: soundEffect,
            duration_ms: durationMs,
            broadcast_channel: 'animation_dispatch'
        };
    }

    /**
     * Subscribe to animation events
     */
    onAnimation(callback) {
        this.listeners.push(callback);
    }

    /**
     * Notify listeners
     */
    notifyListeners(animation) {
        for (const listener of this.listeners) {
            try {
                listener(animation);
            } catch (e) {
                console.error('Animation listener error:', e);
            }
        }
    }

    /**
     * Get pending animations
     */
    getPendingAnimations(userId) {
        return this.animationQueue
            .filter(a => a.user_id === userId && a.status === 'PENDING')
            .sort((a, b) => b.priority - a.priority);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏆 TASK_21: GTO ACCURACY LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════════

export class GTOAccuracyLeaderboard {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Mock leaderboard data
        this.mockPlayers = new Map();

        console.log('🏆 GTOAccuracyLeaderboard initialized (TASK_21: Perfect Session Rankings)');
    }

    /**
     * Get GTO leaderboard
     */
    async getLeaderboard(limit = 100, offset = 0, filterTier = null) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_gto_leaderboard', {
                    p_limit: limit,
                    p_offset: offset,
                    p_filter_tier: filterTier
                });
            return error ? { success: false, error: error.message } : data;
        }

        return this.mockGetLeaderboard(limit, offset, filterTier);
    }

    /**
     * Mock leaderboard
     */
    mockGetLeaderboard(limit, offset, filterTier) {
        const leaderboard = [];
        for (let i = 1; i <= Math.min(limit, 20); i++) {
            const perfectSessions = Math.floor(Math.random() * 60);
            const tier = this.getTierFromPerfect(perfectSessions);

            if (filterTier && tier !== filterTier) continue;

            leaderboard.push({
                rank: i + offset,
                user_id: `user_${i + offset}`,
                tier,
                perfect_sessions: perfectSessions,
                mastery_sessions: perfectSessions + Math.floor(Math.random() * 50),
                avg_accuracy: (85 + Math.random() * 15).toFixed(2),
                highest_level: Math.floor(Math.random() * 10) + 1,
                boss_mode_clears: Math.floor(Math.random() * 5),
                longest_streak: Math.floor(Math.random() * 20) + 5
            });
        }

        return {
            success: true,
            total_players: 2500,
            page_size: limit,
            offset,
            filter_tier: filterTier,
            leaderboard,
            tiers: Object.values(RANK_TIERS)
        };
    }

    /**
     * Get user's GTO rank
     */
    async getUserRank(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_get_user_gto_rank', { p_user_id: userId });
            return error ? null : data;
        }

        return this.mockGetUserRank(userId);
    }

    /**
     * Mock user rank
     */
    mockGetUserRank(userId) {
        const perfectSessions = Math.floor(Math.random() * 30);
        const masterySessions = perfectSessions + Math.floor(Math.random() * 40);
        const tier = this.getTierFromPerfect(perfectSessions);
        const tierConfig = RANK_TIERS[tier];

        // Calculate next tier
        let nextTier = null;
        if (tier === 'STUDENT') nextTier = { tier: 'ADVANCED', need: 10 - masterySessions };
        else if (tier === 'ADVANCED') nextTier = { tier: 'EXPERT', need: 5 - perfectSessions };
        else if (tier === 'EXPERT') nextTier = { tier: 'MASTER', need: 10 - perfectSessions };
        else if (tier === 'MASTER') nextTier = { tier: 'GRANDMASTER', need: 25 - perfectSessions };
        else if (tier === 'GRANDMASTER') nextTier = { tier: 'LEGENDARY', need: 50 - perfectSessions };

        return {
            success: true,
            user_id: userId,
            global_rank: Math.floor(Math.random() * 500) + 1,
            rank_tier: tier,
            tier_icon: tierConfig.icon,
            perfect_sessions: perfectSessions,
            mastery_sessions: masterySessions,
            total_sessions: masterySessions + Math.floor(Math.random() * 20),
            avg_accuracy: (88 + Math.random() * 10).toFixed(2),
            highest_level: Math.floor(Math.random() * 10) + 1,
            boss_mode_clears: Math.floor(Math.random() * 3),
            longest_streak: Math.floor(Math.random() * 15) + 3,
            next_tier: nextTier
        };
    }

    /**
     * Get tier from perfect session count
     */
    getTierFromPerfect(perfectSessions) {
        if (perfectSessions >= 50) return 'LEGENDARY';
        if (perfectSessions >= 25) return 'GRANDMASTER';
        if (perfectSessions >= 10) return 'MASTER';
        if (perfectSessions >= 5) return 'EXPERT';
        return 'ADVANCED';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createSessionMomentumTracker(options = {}) {
    return new SessionMomentumTracker(options);
}

export function createAnimationDispatcher(options = {}) {
    return new AnimationDispatcher(options);
}

export function createGTOAccuracyLeaderboard(options = {}) {
    return new GTOAccuracyLeaderboard(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    VISUAL_STATES,
    ANIMATION_TYPES,
    RANK_TIERS,
    SessionMomentumTracker,
    AnimationDispatcher,
    GTOAccuracyLeaderboard,
    createSessionMomentumTracker,
    createAnimationDispatcher,
    createGTOAccuracyLeaderboard
};
