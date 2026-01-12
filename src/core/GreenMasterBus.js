/**
 * 🛰️ GREEN_MASTER_BUS: PROMPTS 10-12 (JavaScript Interface)
 * ═══════════════════════════════════════════════════════════════════════════
 * @silo AI_CONTENT_GTO_ENGINE (GREEN)
 * 
 * TASK_10: GTO_TRUTH_DATA_MIGRATION
 * TASK_11: 85_PERCENT_REWARD_ORACLE
 * TASK_12: LEVEL_UP_BROADCAST_SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_10: GTO TRUTH SOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const SOLUTION_TYPES = {
    GTO_PRIMARY: { type: 'GTO_PRIMARY', label: 'GTO Primary', xpMultiplier: 1.5, evRequired: true },
    GTO_SECONDARY: { type: 'GTO_SECONDARY', label: 'GTO Secondary', xpMultiplier: 1.2, evRequired: false },
    ALT_SIMPLE: { type: 'ALT_SIMPLE', label: 'Simplified Alternative', xpMultiplier: 0.85, evRequired: false },
    ALT_EXPLOIT: { type: 'ALT_EXPLOIT', label: 'Exploitative', xpMultiplier: 0.7, evRequired: false }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_11: MINT SIGNAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const MINT_SIGNAL_TYPES = {
    SUCCESS: { type: 'SUCCESS', label: '✅ 85%+ Mastery', threshold: 0.85, color: '#00FF88' },
    PERFECT: { type: 'PERFECT', label: '🏆 Perfect Session', threshold: 1.0, color: '#FFD700' },
    FAILURE: { type: 'FAILURE', label: '❌ Below Threshold', threshold: 0, color: '#FF4444' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_12: EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export const MASTERY_EVENT_TYPES = {
    LEVEL_UNLOCKED: { type: 'LEVEL_UNLOCKED', icon: '🎉', isGlobal: true },
    LEVEL_MASTERED: { type: 'LEVEL_MASTERED', icon: '🏆', isGlobal: true },
    PERFECT_SESSION: { type: 'PERFECT_SESSION', icon: '💯', isGlobal: false },
    STREAK_MILESTONE: { type: 'STREAK_MILESTONE', icon: '🔥', isGlobal: false },
    BOSS_MODE_COMPLETE: { type: 'BOSS_MODE_COMPLETE', icon: '🔥', isGlobal: true },
    LEADERBOARD_CLIMB: { type: 'LEADERBOARD_CLIMB', icon: '📈', isGlobal: true }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 TASK_10: GTO TRUTH MIGRATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class GTOTruthMigration {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Mock truth table
        this.mockTruthTable = new Map();

        console.log('📦 GTOTruthMigration initialized (TASK_10: Force-write with EV > 0)');
    }

    /**
     * Migrate GTO truth data with validation
     * HARD LAW: Primary GTO path must have EV > 0
     */
    async migrateGTOTruth(drillId, scenarioId, solutions) {
        // Validate primary path has EV > 0
        const primaryPath = solutions.find(s => s.solution_type === 'GTO_PRIMARY');

        if (!primaryPath) {
            return {
                success: false,
                error: 'MISSING_PRIMARY_PATH',
                message: '🔐 HARD LAW: Migration must include GTO_PRIMARY path'
            };
        }

        if (primaryPath.ev <= 0) {
            return {
                success: false,
                error: 'PRIMARY_PATH_NEGATIVE_EV',
                message: `🔐 HARD LAW: GTO_PRIMARY must have EV > 0, got ${primaryPath.ev}`
            };
        }

        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_migrate_gto_truth', {
                    p_drill_id: drillId,
                    p_scenario_id: scenarioId,
                    p_solutions: solutions
                });

            return error ? { success: false, error: error.message } : data;
        }

        // Mock mode
        return this.mockMigrate(drillId, scenarioId, solutions);
    }

    /**
     * Mock migration
     */
    mockMigrate(drillId, scenarioId, solutions) {
        this.mockTruthTable.set(drillId, {
            scenario_id: scenarioId,
            solutions,
            migrated_at: new Date().toISOString()
        });

        return {
            success: true,
            drill_id: drillId,
            solutions_migrated: solutions.length,
            primary_path_verified: true
        };
    }

    /**
     * Get GTO truth for a drill
     */
    async getGTOTruth(drillId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('gto_truth_solutions')
                .select('*')
                .eq('drill_id', drillId)
                .order('ev', { ascending: false });

            return error ? null : data;
        }

        return this.mockTruthTable.get(drillId)?.solutions || null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📡 TASK_11: 85% REWARD ORACLE (MINT SIGNAL)
// ═══════════════════════════════════════════════════════════════════════════════

export class RewardOracle {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Mock signals
        this.mockSignals = [];

        // Event listeners for YELLOW Silo
        this.yellowSiloListeners = [];

        console.log('📡 RewardOracle initialized (TASK_11: 85% MINT_SIGNAL)');
    }

    /**
     * Process session and emit MINT_SIGNAL
     * HARD LAW: If accuracy >= 0.85, broadcast SUCCESS to YELLOW Silo
     */
    async mintSignal(userId, sessionId, levelId, correctAnswers, totalQuestions, currentStreak = 0) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_mint_signal', {
                    p_user_id: userId,
                    p_session_id: sessionId,
                    p_level_id: levelId,
                    p_correct_answers: correctAnswers,
                    p_total_questions: totalQuestions,
                    p_current_streak: currentStreak
                });

            return error ? { success: false, error: error.message } : data;
        }

        return this.mockMintSignal(userId, sessionId, levelId, correctAnswers, totalQuestions, currentStreak);
    }

    /**
     * Mock MINT_SIGNAL
     */
    mockMintSignal(userId, sessionId, levelId, correctAnswers, totalQuestions, currentStreak) {
        const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;

        // Determine signal type
        let signalType = 'FAILURE';
        let perfectBonus = 0;

        if (accuracy >= 1.0) {
            signalType = 'PERFECT';
            perfectBonus = 500;
        } else if (accuracy >= 0.85) {
            signalType = 'SUCCESS';
        }

        // Calculate rewards
        const baseXP = 100 * levelId;
        let xpReward = Math.floor(baseXP * correctAnswers);
        let diamondReward = Math.floor(5 * levelId * (correctAnswers / 10));

        // Elite bonus (+25% for levels 6-10)
        if (levelId >= 6) {
            diamondReward = Math.floor(diamondReward * 1.25);
        }

        // Streak bonus
        let streakBonus = 0;
        if (currentStreak >= 10) streakBonus = Math.floor(xpReward * 0.5);
        else if (currentStreak >= 5) streakBonus = Math.floor(xpReward * 0.25);
        else if (currentStreak >= 3) streakBonus = Math.floor(xpReward * 0.1);

        xpReward += streakBonus + perfectBonus;

        // Create signal
        const signal = {
            id: `signal_${Date.now()}`,
            user_id: userId,
            session_id: sessionId,
            level_id: levelId,
            accuracy,
            signal_type: signalType,
            xp_reward: xpReward,
            diamond_reward: diamondReward,
            streak_bonus: streakBonus,
            perfect_bonus: perfectBonus,
            broadcasted_at: new Date().toISOString()
        };

        this.mockSignals.push(signal);

        // ═══════════════════════════════════════════════════════════════════
        // 📡 BROADCAST TO YELLOW SILO (if SUCCESS or PERFECT)
        // ═══════════════════════════════════════════════════════════════════

        const yellowSiloBroadcast = signalType !== 'FAILURE';
        if (yellowSiloBroadcast) {
            this.notifyYellowSilo({
                signal_id: signal.id,
                user_id: userId,
                xp: xpReward,
                diamonds: diamondReward,
                type: signalType
            });
        }

        return {
            success: true,
            signal_id: signal.id,
            signal_type: signalType,
            accuracy: (accuracy * 100).toFixed(2),
            correct: correctAnswers,
            total: totalQuestions,
            streak: currentStreak,
            rewards: {
                xp: xpReward,
                diamonds: diamondReward,
                streak_bonus: streakBonus,
                perfect_bonus: perfectBonus,
                total_xp: xpReward
            },
            yellow_silo_broadcast: yellowSiloBroadcast,
            broadcast_channel: 'yellow_silo_mint',
            message: signalType === 'PERFECT'
                ? '🏆 PERFECT SESSION! Maximum rewards applied!'
                : signalType === 'SUCCESS'
                    ? '✅ 85%+ Mastery achieved! Rewards minted!'
                    : '❌ Below 85% threshold. Keep practicing!'
        };
    }

    /**
     * Subscribe to YELLOW Silo broadcasts
     */
    onYellowSiloBroadcast(callback) {
        this.yellowSiloListeners.push(callback);
    }

    /**
     * Notify YELLOW Silo listeners
     */
    notifyYellowSilo(payload) {
        for (const listener of this.yellowSiloListeners) {
            try {
                listener(payload);
            } catch (e) {
                console.error('YELLOW Silo listener error:', e);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📡 TASK_12: REALTIME MASTERY STREAM
// ═══════════════════════════════════════════════════════════════════════════════

export class MasteryStream {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Event listeners
        this.listeners = new Map();
        this.globalFeed = [];

        console.log('📡 MasteryStream initialized (TASK_12: Realtime Level Unlock)');
    }

    /**
     * Broadcast level unlock event
     */
    async broadcastLevelUnlock(userId, levelId, triggerSource = 'MINT_SIGNAL', triggerId = null) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_broadcast_level_unlock', {
                    p_user_id: userId,
                    p_level_id: levelId,
                    p_trigger_source: triggerSource,
                    p_trigger_id: triggerId
                });

            return error ? { success: false, error: error.message } : data;
        }

        return this.mockBroadcastLevelUnlock(userId, levelId, triggerSource, triggerId);
    }

    /**
     * Mock level unlock broadcast
     */
    mockBroadcastLevelUnlock(userId, levelId, triggerSource, triggerId) {
        const levelNames = {
            1: 'Foundations', 2: 'Opening Ranges', 3: 'C-Bet Mastery',
            4: 'Defense Basics', 5: 'Multi-Street', 6: 'Board Texture',
            7: 'Mixed Strategy', 8: 'Exploitation', 9: 'ICM Mastery', 10: 'BOSS MODE'
        };

        const isBossMode = levelId === 10;
        const levelName = levelNames[levelId] || `Level ${levelId}`;

        const event = {
            id: `event_${Date.now()}`,
            user_id: userId,
            event_type: isBossMode ? 'BOSS_MODE_COMPLETE' : 'LEVEL_UNLOCKED',
            level_id: levelId,
            level_name: levelName,
            is_global: levelId >= 5,
            trigger_source: triggerSource,
            trigger_id: triggerId,
            created_at: new Date().toISOString()
        };

        // Add to global feed if level >= 5
        if (event.is_global) {
            this.globalFeed.unshift(event);
            if (this.globalFeed.length > 100) {
                this.globalFeed.pop();
            }
        }

        // Notify listeners
        this.notifyListeners('LEVEL_UNLOCKED', event);

        return {
            success: true,
            event_id: event.id,
            event_type: event.event_type,
            user_id: userId,
            level: {
                id: levelId,
                name: levelName,
                difficulty: levelId,
                is_boss_mode: isBossMode
            },
            broadcast_channel: 'realtime_mastery_stream',
            is_global_broadcast: event.is_global,
            message: `🎉 Player unlocked ${isBossMode ? '🔥 BOSS MODE' : levelName}!`
        };
    }

    /**
     * Process complete session (combines MINT_SIGNAL + Level Unlock)
     */
    async processSessionComplete(userId, levelId, correctAnswers, totalQuestions, currentStreak = 0) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_process_session_complete', {
                    p_user_id: userId,
                    p_level_id: levelId,
                    p_correct_answers: correctAnswers,
                    p_total_questions: totalQuestions,
                    p_current_streak: currentStreak
                });

            return error ? { success: false, error: error.message } : data;
        }

        // Mock mode: Combine mint signal and potential level unlock
        const oracle = new RewardOracle();
        const sessionId = `session_${Date.now()}`;
        const mintResult = oracle.mockMintSignal(userId, sessionId, levelId, correctAnswers, totalQuestions, currentStreak);

        const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
        let levelUnlockResult = null;

        // Check for level unlock (85% + simulate having 20+ questions)
        if (accuracy >= 0.85 && totalQuestions >= 10) {
            levelUnlockResult = this.mockBroadcastLevelUnlock(userId, levelId + 1, 'MINT_SIGNAL', mintResult.signal_id);
        }

        return {
            success: true,
            session_id: sessionId,
            mint_signal: mintResult,
            progress: {
                level_id: levelId,
                accuracy: (accuracy * 100).toFixed(2),
                questions_answered: totalQuestions
            },
            level_unlock: levelUnlockResult,
            next_level_unlocked: levelUnlockResult !== null
        };
    }

    /**
     * Subscribe to mastery events
     */
    subscribe(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * Notify event listeners
     */
    notifyListeners(eventType, event) {
        const callbacks = this.listeners.get(eventType) || [];
        for (const callback of callbacks) {
            try {
                callback(event);
            } catch (e) {
                console.error('Listener error:', e);
            }
        }
    }

    /**
     * Get global feed
     */
    getGlobalFeed(limit = 20) {
        return this.globalFeed.slice(0, limit);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createGTOTruthMigration(options = {}) {
    return new GTOTruthMigration(options);
}

export function createRewardOracle(options = {}) {
    return new RewardOracle(options);
}

export function createMasteryStream(options = {}) {
    return new MasteryStream(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    SOLUTION_TYPES,
    MINT_SIGNAL_TYPES,
    MASTERY_EVENT_TYPES,
    GTOTruthMigration,
    RewardOracle,
    MasteryStream,
    createGTOTruthMigration,
    createRewardOracle,
    createMasteryStream
};
