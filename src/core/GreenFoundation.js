/**
 * 🛰️ GREEN_FOUNDATION: PROMPTS 1-3 (JavaScript Interface)
 * ═══════════════════════════════════════════════════════════════════════════
 * @silo AI_CONTENT_GTO_ENGINE (GREEN)
 * 
 * TASK_01: MULTI_LEVEL_SCHEMA_MAPPING
 * TASK_02: GTO_TRUTH_VAULT  
 * TASK_03: 85_PERCENT_GATE_LAW
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_01: TRAINING LEVEL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const TRAINING_LEVELS = {
    BEGINNER: {
        code: 'BEGINNER',
        title: 'Beginner',
        difficulty: 1,
        requiredXP: 0,
        unlockOrder: 1,
        timeLimitSeconds: 45,
        evTolerance: 0.10,
        minQuestionsForMastery: 20,
        accuracyThreshold: 0.85,
        icon: '🎯',
        color: '#00FF88'
    },
    INTERMEDIATE: {
        code: 'INTERMEDIATE',
        title: 'Intermediate',
        difficulty: 3,
        requiredXP: 1000,
        unlockOrder: 2,
        timeLimitSeconds: 35,
        evTolerance: 0.07,
        minQuestionsForMastery: 20,
        accuracyThreshold: 0.85,
        icon: '📈',
        color: '#88FF00'
    },
    ADVANCED: {
        code: 'ADVANCED',
        title: 'Advanced',
        difficulty: 5,
        requiredXP: 5000,
        unlockOrder: 3,
        timeLimitSeconds: 30,
        evTolerance: 0.05,
        minQuestionsForMastery: 20,
        accuracyThreshold: 0.85,
        icon: '🔥',
        color: '#FFFF00'
    },
    EXPERT: {
        code: 'EXPERT',
        title: 'Expert',
        difficulty: 7,
        requiredXP: 15000,
        unlockOrder: 4,
        timeLimitSeconds: 25,
        evTolerance: 0.03,
        minQuestionsForMastery: 25,
        accuracyThreshold: 0.85,
        icon: '⚡',
        color: '#FF8800'
    },
    ELITE: {
        code: 'ELITE',
        title: 'Elite',
        difficulty: 9,
        requiredXP: 50000,
        unlockOrder: 5,
        timeLimitSeconds: 20,
        evTolerance: 0.02,
        minQuestionsForMastery: 30,
        accuracyThreshold: 0.85,
        icon: '👑',
        color: '#FF0088'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_02: EV LOSS THRESHOLDS (Leak Signal Triggers)
// ═══════════════════════════════════════════════════════════════════════════════

export const EV_LOSS_THRESHOLDS = {
    OPTIMAL: {
        category: 'OPTIMAL',
        minEvLoss: 0.000,
        maxEvLoss: 0.000,
        xpAwarded: 150,
        leakSignalTriggered: false,
        label: 'Optimal Play',
        color: '#00FF88'
    },
    ACCEPTABLE: {
        category: 'ACCEPTABLE',
        minEvLoss: 0.000,
        maxEvLoss: 0.005,
        xpAwarded: 100,
        leakSignalTriggered: false,
        label: 'Acceptable',
        color: '#88FF00'
    },
    MINOR: {
        category: 'MINOR',
        minEvLoss: 0.005,
        maxEvLoss: 0.020,
        xpAwarded: 50,
        leakSignalTriggered: true,
        label: 'Minor Mistake',
        color: '#FFFF00'
    },
    MODERATE: {
        category: 'MODERATE',
        minEvLoss: 0.020,
        maxEvLoss: 0.100,
        xpAwarded: 25,
        leakSignalTriggered: true,
        label: 'Moderate Error',
        color: '#FF8800'
    },
    MAJOR: {
        category: 'MAJOR',
        minEvLoss: 0.100,
        maxEvLoss: 0.250,
        xpAwarded: 10,
        leakSignalTriggered: true,
        label: 'Major Mistake',
        color: '#FF4400'
    },
    BLUNDER: {
        category: 'BLUNDER',
        minEvLoss: 0.250,
        maxEvLoss: Infinity,
        xpAwarded: 5,
        leakSignalTriggered: true,
        label: 'Blunder',
        color: '#FF0000'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 TASK_02: GTO TRUTH VAULT
// ═══════════════════════════════════════════════════════════════════════════════

export class GTOTruthVault {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        console.log('📊 GTOTruthVault initialized (TASK_02 MAPPED)');
    }

    /**
     * Classify EV loss into a threshold category
     */
    classifyEvLoss(evLoss) {
        for (const threshold of Object.values(EV_LOSS_THRESHOLDS)) {
            if (evLoss >= threshold.minEvLoss && evLoss < threshold.maxEvLoss) {
                return threshold;
            }
        }
        return EV_LOSS_THRESHOLDS.BLUNDER;
    }

    /**
     * Evaluate user action against GTO truth
     */
    async evaluateAction(drillId, userAction) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('evaluate_user_action', {
                    p_drill_id: drillId,
                    p_user_action: userAction
                });

            if (error) {
                console.error('Evaluation error:', error);
                return { success: false, error: error.message };
            }

            return data;
        }

        // Mock mode
        return this.mockEvaluate(drillId, userAction);
    }

    /**
     * Get all solutions for a drill
     */
    async getDrillSolutions(drillId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('drill_solutions')
                .select('*')
                .eq('drill_id', drillId)
                .order('ev', { ascending: false });

            return error ? [] : data;
        }

        return [];
    }

    /**
     * Mock evaluation for testing
     */
    mockEvaluate(drillId, userAction) {
        const isOptimal = Math.random() > 0.5;
        const evLoss = isOptimal ? 0 : Math.random() * 0.15;
        const classification = this.classifyEvLoss(evLoss);

        return {
            success: true,
            drill_id: drillId,
            user_action: userAction,
            gto_action: 'RAISE',
            is_optimal: isOptimal,
            user_ev: isOptimal ? 0.15 : 0.15 - evLoss,
            gto_ev: 0.15,
            ev_loss: evLoss,
            ev_loss_bb: (evLoss * 100).toFixed(2),
            classification: {
                category: classification.category,
                xp_awarded: classification.xpAwarded,
                leak_signal_triggered: classification.leakSignalTriggered,
                label: classification.label,
                color: classification.color
            }
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 TASK_03: 85% GATE LAW ENFORCER
// ═══════════════════════════════════════════════════════════════════════════════

export class GatekeeperLaw {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        this.requiredAccuracy = 0.85;
        this.minQuestions = 20;

        // Mock mastery for testing
        this.mockMastery = new Map();

        console.log('🔐 GatekeeperLaw initialized (TASK_03: 85% Gate Law ENFORCED)');
    }

    /**
     * Check if a level can be unlocked
     */
    async checkLevelUnlockable(userId, targetLevel) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('check_level_unlockable', {
                    p_user_id: userId,
                    p_target_level: targetLevel
                });

            return error ? { unlockable: false, error: error.message } : data;
        }

        return this.mockCheckUnlockable(userId, targetLevel);
    }

    /**
     * Record a drill attempt
     */
    async recordAttempt(userId, drillId, userAction) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('record_drill_attempt', {
                    p_user_id: userId,
                    p_drill_id: drillId,
                    p_user_action: userAction
                });

            return error ? { success: false, error: error.message } : data;
        }

        return this.mockRecordAttempt(userId, userAction);
    }

    /**
     * Get user's mastery status for all levels
     */
    async getUserMasteryStatus(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('user_mastery')
                .select('*')
                .eq('user_id', userId)
                .order('level_code');

            return error ? [] : data;
        }

        return this.mockGetStatus(userId);
    }

    /**
     * Mock check unlockable for testing
     */
    mockCheckUnlockable(userId, targetLevel) {
        const level = TRAINING_LEVELS[targetLevel];
        if (!level) return { unlockable: false, error: 'INVALID_LEVEL' };

        // First level always unlockable
        if (level.unlockOrder === 1) {
            return { unlockable: true, reason: 'FIRST_LEVEL' };
        }

        // Get previous level
        const prevLevel = Object.values(TRAINING_LEVELS)
            .find(l => l.unlockOrder === level.unlockOrder - 1);

        const key = `${userId}_${prevLevel.code}`;
        const prevMastery = this.mockMastery.get(key);

        if (!prevMastery || prevMastery.status !== 'MASTERED') {
            return {
                unlockable: false,
                error: 'PREVIOUS_LEVEL_NOT_MASTERED',
                required_level: prevLevel.code,
                current_accuracy: prevMastery?.accuracy || 0,
                required_accuracy: 0.85
            };
        }

        return { unlockable: true, previous_level: prevLevel.code };
    }

    /**
     * Mock record attempt for testing
     */
    mockRecordAttempt(userId, userAction) {
        const isCorrect = Math.random() > 0.3;
        const xpAwarded = isCorrect ? 100 : 25;

        const key = `${userId}_BEGINNER`;
        const current = this.mockMastery.get(key) || {
            drills_attempted: 0,
            drills_correct: 0,
            accuracy: 0,
            status: 'ACTIVE'
        };

        current.drills_attempted++;
        if (isCorrect) current.drills_correct++;
        current.accuracy = current.drills_correct / current.drills_attempted;

        // Check mastery
        if (current.accuracy >= 0.85 && current.drills_attempted >= 20) {
            current.status = 'MASTERED';
        }

        this.mockMastery.set(key, current);

        return {
            success: true,
            evaluation: { is_optimal: isCorrect },
            progress: current,
            xp_awarded: xpAwarded
        };
    }

    /**
     * Mock get status for testing
     */
    mockGetStatus(userId) {
        const result = [];
        for (const level of Object.values(TRAINING_LEVELS)) {
            const key = `${userId}_${level.code}`;
            const mastery = this.mockMastery.get(key) || {
                status: level.unlockOrder === 1 ? 'ACTIVE' : 'LOCKED',
                drills_attempted: 0,
                accuracy: 0
            };
            result.push({
                level_code: level.code,
                ...mastery
            });
        }
        return result;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createGTOTruthVault(options = {}) {
    return new GTOTruthVault(options);
}

export function createGatekeeper(options = {}) {
    return new GatekeeperLaw(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    TRAINING_LEVELS,
    EV_LOSS_THRESHOLDS,
    GTOTruthVault,
    GatekeeperLaw,
    createGTOTruthVault,
    createGatekeeper
};
