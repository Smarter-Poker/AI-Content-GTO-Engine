/**
 * 🛰️ GREEN_ACTIVE_LOGIC: PROMPTS 4-6 (JavaScript Interface)
 * ═══════════════════════════════════════════════════════════════════════════
 * @silo AI_CONTENT_GTO_ENGINE (GREEN)
 * 
 * TASK_04: 85_PERCENT_MASTERY_TRIGGER
 * TASK_05: GTO_LEAK_SIGNAL_ANALYZER
 * TASK_06: MULTI_LEVEL_PROGRESSION_ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TASK_06: PROGRESSION LEVELS (10-Level with Boss Mode)
// ═══════════════════════════════════════════════════════════════════════════════

export const PROGRESSION_LEVELS = {
    1: { id: 1, name: 'Foundations', difficulty: 1, evTolerance: 0.12, timeLimit: 45, minQuestions: 20, accuracy: 0.85, xpMultiplier: 1.0, bossMode: false },
    2: { id: 2, name: 'Opening Ranges', difficulty: 2, evTolerance: 0.10, timeLimit: 40, minQuestions: 20, accuracy: 0.85, xpMultiplier: 1.1, bossMode: false },
    3: { id: 3, name: 'C-Bet Mastery', difficulty: 3, evTolerance: 0.08, timeLimit: 35, minQuestions: 20, accuracy: 0.85, xpMultiplier: 1.2, bossMode: false },
    4: { id: 4, name: 'Defense Basics', difficulty: 4, evTolerance: 0.07, timeLimit: 32, minQuestions: 20, accuracy: 0.85, xpMultiplier: 1.3, bossMode: false },
    5: { id: 5, name: 'Multi-Street', difficulty: 5, evTolerance: 0.06, timeLimit: 30, minQuestions: 25, accuracy: 0.85, xpMultiplier: 1.4, bossMode: false },
    6: { id: 6, name: 'Board Texture', difficulty: 6, evTolerance: 0.05, timeLimit: 28, minQuestions: 25, accuracy: 0.85, xpMultiplier: 1.5, bossMode: false, boardRandomization: true },
    7: { id: 7, name: 'Mixed Strategy', difficulty: 7, evTolerance: 0.04, timeLimit: 26, minQuestions: 25, accuracy: 0.85, xpMultiplier: 1.6, bossMode: false, mixedStrategies: true },
    8: { id: 8, name: 'Exploitation', difficulty: 8, evTolerance: 0.03, timeLimit: 24, minQuestions: 25, accuracy: 0.85, xpMultiplier: 1.8, bossMode: false, mixedStrategies: true },
    9: { id: 9, name: 'ICM Mastery', difficulty: 9, evTolerance: 0.025, timeLimit: 22, minQuestions: 30, accuracy: 0.85, xpMultiplier: 2.0, bossMode: false, icmPressure: true },
    10: { id: 10, name: 'BOSS MODE', difficulty: 10, evTolerance: 0.02, timeLimit: 20, minQuestions: 30, accuracy: 0.90, xpMultiplier: 2.5, bossMode: true, boardRandomization: true, mixedStrategies: true, icmPressure: true }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 BOARD TEXTURES (for randomization)
// ═══════════════════════════════════════════════════════════════════════════════

export const BOARD_TEXTURES = [
    { code: 'DRY_HIGH', name: 'Dry High', example: ['A♠', 'K♦', '3♣'], cbetFreq: 0.75, complexity: 1 },
    { code: 'DRY_MIDDLE', name: 'Dry Middle', example: ['J♠', '7♦', '2♣'], cbetFreq: 0.65, complexity: 2 },
    { code: 'DRY_LOW', name: 'Dry Low', example: ['7♠', '4♦', '2♣'], cbetFreq: 0.55, complexity: 3 },
    { code: 'WET_HIGH', name: 'Wet High', example: ['K♠', 'Q♥', 'J♦'], cbetFreq: 0.35, complexity: 5 },
    { code: 'WET_MIDDLE', name: 'Wet Middle', example: ['9♠', '8♥', '7♦'], cbetFreq: 0.30, complexity: 6 },
    { code: 'WET_LOW', name: 'Wet Low', example: ['6♣', '5♣', '4♦'], cbetFreq: 0.40, complexity: 5 },
    { code: 'PAIRED_HIGH', name: 'Paired High', example: ['K♠', 'K♦', '5♣'], cbetFreq: 0.80, complexity: 4 },
    { code: 'PAIRED_LOW', name: 'Paired Low', example: ['5♠', '5♦', '2♣'], cbetFreq: 0.70, complexity: 4 },
    { code: 'MONOTONE', name: 'Monotone', example: ['A♠', '8♠', '4♠'], cbetFreq: 0.45, complexity: 7 },
    { code: 'RAINBOW_CONN', name: 'Rainbow Connected', example: ['9♠', '8♦', '7♣'], cbetFreq: 0.40, complexity: 6 }
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 TASK_04: 85% MASTERY TRIGGER
// ═══════════════════════════════════════════════════════════════════════════════

export class MasteryTrigger {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Mock user progress for testing
        this.mockProgress = new Map();

        console.log('🔐 MasteryTrigger initialized (TASK_04: 85% Gate Law)');
    }

    /**
     * Validate if user can unlock a level
     * HARD LAW: Level [N+1] only unlocks if Level [N] score >= 0.85
     */
    async validateLevelUnlock(userId, targetLevelId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_validate_level_unlock', {
                    p_user_id: userId,
                    p_target_level_id: targetLevelId
                });

            return error ? { valid: false, error: error.message } : data;
        }

        return this.mockValidateLevelUnlock(userId, targetLevelId);
    }

    /**
     * Mock validation for testing
     */
    mockValidateLevelUnlock(userId, targetLevelId) {
        const targetLevel = PROGRESSION_LEVELS[targetLevelId];
        if (!targetLevel) {
            return { valid: false, error: 'INVALID_LEVEL' };
        }

        // Level 1 always unlockable
        if (targetLevelId === 1) {
            return { valid: true, level_id: 1, status: 'UNLOCKED', reason: 'FIRST_LEVEL' };
        }

        // Check previous level mastery
        const prevLevelId = targetLevelId - 1;
        const key = `${userId}_${prevLevelId}`;
        const prevProgress = this.mockProgress.get(key);

        if (!prevProgress) {
            return {
                valid: false,
                error: 'PREVIOUS_LEVEL_NOT_STARTED',
                required_level: prevLevelId
            };
        }

        const accuracy = prevProgress.correct / prevProgress.attempted;
        const requiredAccuracy = PROGRESSION_LEVELS[prevLevelId].accuracy;
        const minQuestions = PROGRESSION_LEVELS[prevLevelId].minQuestions;

        if (accuracy < requiredAccuracy) {
            return {
                valid: false,
                error: 'ACCURACY_BELOW_THRESHOLD',
                current_accuracy: (accuracy * 100).toFixed(1),
                required_accuracy: requiredAccuracy * 100,
                deficit: ((requiredAccuracy - accuracy) * 100).toFixed(1)
            };
        }

        if (prevProgress.attempted < minQuestions) {
            return {
                valid: false,
                error: 'INSUFFICIENT_QUESTIONS',
                questions_answered: prevProgress.attempted,
                questions_required: minQuestions
            };
        }

        return {
            valid: true,
            level_id: targetLevelId,
            level_name: targetLevel.name,
            status: 'UNLOCKED',
            previous_accuracy: (accuracy * 100).toFixed(1)
        };
    }

    /**
     * Update mock progress
     */
    updateMockProgress(userId, levelId, correct, attempted) {
        const key = `${userId}_${levelId}`;
        this.mockProgress.set(key, { correct, attempted });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚨 TASK_05: GTO LEAK SIGNAL ANALYZER
// ═══════════════════════════════════════════════════════════════════════════════

export class LeakSignalAnalyzer {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Leak type definitions
        this.leakTypes = {
            OVER_FOLDING: { label: 'Over-Folding', icon: '🏳️', description: 'Folding when you should continue' },
            PASSIVE_PLAY: { label: 'Passive Play', icon: '😴', description: 'Calling when you should raise' },
            OVER_AGGRESSION: { label: 'Over-Aggression', icon: '🔥', description: 'Raising when you should call' },
            MISSED_VALUE: { label: 'Missed Value', icon: '💸', description: 'Checking when you should bet' },
            STRATEGIC_ERROR: { label: 'Strategic Error', icon: '❌', description: 'General misplay' }
        };

        console.log('🚨 LeakSignalAnalyzer initialized (TASK_05: Leak Detection)');
    }

    /**
     * Calculate action EV and trigger leak signals
     * Logic: If User_Action_EV < GTO_Action_EV → Trigger Leak Signal
     */
    async calculateActionEV(drillId, userAction) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('calculate_action_ev', {
                    p_drill_id: drillId,
                    p_user_action: userAction
                });

            return error ? { success: false, error: error.message } : data;
        }

        return this.mockCalculateActionEV(drillId, userAction);
    }

    /**
     * Mock EV calculation with leak signal
     */
    mockCalculateActionEV(drillId, userAction) {
        // Simulate GTO action
        const gtoAction = 'RAISE';
        const gtoEV = 0.15;

        // Simulate user action EV
        const isOptimal = userAction.toUpperCase() === gtoAction;
        const userEV = isOptimal ? gtoEV : gtoEV - (Math.random() * 0.15);
        const evLoss = gtoEV - userEV;

        // Determine if leak triggered
        const leakTriggered = userEV < gtoEV;

        // Classify leak type
        let leakType = 'STRATEGIC_ERROR';
        if (userAction.toUpperCase().includes('FOLD')) leakType = 'OVER_FOLDING';
        else if (userAction.toUpperCase().includes('CALL')) leakType = 'PASSIVE_PLAY';
        else if (userAction.toUpperCase().includes('CHECK')) leakType = 'MISSED_VALUE';

        // Determine severity
        let severity = 'LOW';
        if (evLoss >= 0.25) severity = 'CRITICAL';
        else if (evLoss >= 0.10) severity = 'HIGH';
        else if (evLoss >= 0.02) severity = 'MEDIUM';

        // Calculate XP
        let xpAwarded = 150;
        if (evLoss > 0.25) xpAwarded = 5;
        else if (evLoss > 0.10) xpAwarded = 10;
        else if (evLoss > 0.02) xpAwarded = 25;
        else if (evLoss > 0.005) xpAwarded = 50;
        else if (evLoss > 0) xpAwarded = 100;

        // Build response with leak signal
        const response = {
            success: true,
            drill_id: drillId,
            user_action: userAction,
            user_ev: parseFloat(userEV.toFixed(4)),
            gto_action: gtoAction,
            gto_ev: gtoEV,
            ev_loss: parseFloat(evLoss.toFixed(4)),
            ev_loss_bb: parseFloat((evLoss * 100).toFixed(2)),
            is_optimal: isOptimal,
            xp_awarded: xpAwarded
        };

        // ═══════════════════════════════════════════════════════════════════
        // 🚨 LEAK SIGNAL GENERATION
        // ═══════════════════════════════════════════════════════════════════
        if (leakTriggered) {
            response.leak_signal = {
                triggered: true,
                type: leakType,
                type_info: this.leakTypes[leakType],
                severity,
                gto_reasoning: `GTO optimal play is ${gtoAction} for maximum EV`,

                // Display 2 Alternate Lines (sub-optimal paths)
                alternate_lines: [
                    {
                        action: 'CALL',
                        ev: (gtoEV - 0.03).toFixed(4),
                        ev_loss: '0.03',
                        type: 'ALT_SIMPLE',
                        reasoning: 'Simplified alternative: Lower variance but -EV'
                    },
                    {
                        action: 'FOLD',
                        ev: (gtoEV - 0.08).toFixed(4),
                        ev_loss: '0.08',
                        type: 'ALT_EXPLOIT',
                        reasoning: 'Exploitative adjustment: Only works vs specific opponent types'
                    }
                ],

                // Correct GTO play
                correct_play: {
                    action: gtoAction,
                    ev: gtoEV,
                    reasoning: 'Mathematically optimal play based on range vs range analysis'
                }
            };
        } else {
            response.leak_signal = { triggered: false };
        }

        return response;
    }

    /**
     * Get leak type information
     */
    getLeakTypeInfo(leakType) {
        return this.leakTypes[leakType] || this.leakTypes.STRATEGIC_ERROR;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 TASK_06: MULTI-LEVEL PROGRESSION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class ProgressionEngine {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        this.masteryTrigger = new MasteryTrigger(options);
        this.leakAnalyzer = new LeakSignalAnalyzer(options);

        console.log('🎮 ProgressionEngine initialized (TASK_06: 10-Level System)');
    }

    /**
     * Get level configuration
     */
    getLevelConfig(levelId) {
        return PROGRESSION_LEVELS[levelId] || null;
    }

    /**
     * Get all level configurations
     */
    getAllLevels() {
        return Object.values(PROGRESSION_LEVELS);
    }

    /**
     * Check if level uses Boss Mode
     */
    isBossMode(levelId) {
        const level = PROGRESSION_LEVELS[levelId];
        return level?.bossMode || false;
    }

    /**
     * Get random board texture (for Boss Mode)
     */
    getRandomBoard() {
        const index = Math.floor(Math.random() * BOARD_TEXTURES.length);
        return BOARD_TEXTURES[index];
    }

    /**
     * Evaluate user action with level-specific logic
     */
    async evaluateAction(userId, drillId, userAction, levelId) {
        const level = PROGRESSION_LEVELS[levelId];
        if (!level) {
            return { success: false, error: 'INVALID_LEVEL' };
        }

        // Use Boss Mode evaluation for Level 10
        if (level.bossMode) {
            return await this.evaluateBossMode(userId, drillId, userAction);
        }

        // Standard evaluation
        const result = await this.leakAnalyzer.calculateActionEV(drillId, userAction);

        // Apply level-specific EV tolerance
        if (result.success && result.ev_loss <= level.evTolerance) {
            result.is_optimal = true;
            result.xp_awarded = Math.floor(result.xp_awarded * level.xpMultiplier);
        }

        return result;
    }

    /**
     * Boss Mode evaluation (Level 10)
     * - 90% accuracy threshold
     * - Board randomization
     * - 2.5x XP multiplier
     */
    async evaluateBossMode(userId, drillId, userAction) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('fn_boss_mode_evaluate', {
                    p_user_id: userId,
                    p_drill_id: drillId,
                    p_user_action: userAction
                });

            return error ? { success: false, error: error.message } : data;
        }

        // Mock Boss Mode evaluation
        const baseResult = await this.leakAnalyzer.calculateActionEV(drillId, userAction);

        // Apply Boss Mode modifiers
        const bossConfig = PROGRESSION_LEVELS[10];
        const isCorrect = baseResult.ev_loss <= bossConfig.evTolerance;
        const xpEarned = Math.floor(baseResult.xp_awarded * bossConfig.xpMultiplier);
        const bossBonus = (isCorrect && baseResult.ev_loss === 0) ? 100 : 0;

        return {
            success: true,
            boss_mode: true,
            drill_id: drillId,
            evaluation: baseResult,
            is_correct: isCorrect,
            ev_tolerance_used: bossConfig.evTolerance,
            accuracy_threshold: bossConfig.accuracy * 100,
            xp_earned: xpEarned,
            boss_bonus: bossBonus,
            total_xp: xpEarned + bossBonus,
            features_active: {
                board_randomization: true,
                mixed_strategies: true,
                icm_pressure: true
            },
            random_board: this.getRandomBoard()
        };
    }

    /**
     * Get user's current active level
     */
    async getUserActiveLevel(userId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('user_mastery_progress')
                .select('level_id, status')
                .eq('user_id', userId)
                .eq('status', 'ACTIVE')
                .single();

            return error ? 1 : data.level_id;
        }

        return 1; // Default to level 1
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createMasteryTrigger(options = {}) {
    return new MasteryTrigger(options);
}

export function createLeakAnalyzer(options = {}) {
    return new LeakSignalAnalyzer(options);
}

export function createProgressionEngine(options = {}) {
    return new ProgressionEngine(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    PROGRESSION_LEVELS,
    BOARD_TEXTURES,
    MasteryTrigger,
    LeakSignalAnalyzer,
    ProgressionEngine,
    createMasteryTrigger,
    createLeakAnalyzer,
    createProgressionEngine
};
