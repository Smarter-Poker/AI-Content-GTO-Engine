/**
 * 🧬 SMARTER.POKER — DNA SCORE CALCULATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * ORB_01_SOCIAL_DNA: Core Identity Engine
 * 
 * Converts raw poker actions into normalized DNA floats:
 * - GRIT (0-1): Resilience under pressure, tilt resistance, loss recovery
 * - AGGRESSION (0-1): Betting frequency, sizing tendencies, bluff frequency
 * 
 * HARD LAW: All DNA metrics are 0-1 normalized for Holographic Radar display
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { LEAK_SIGNALS, MISTAKE_CATEGORIES } from '../../config/constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 DNA METRIC CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DNA_CONFIG = {
    // Rolling window for computation
    ANALYSIS_WINDOW: 100,           // Last 100 hands
    MIN_HANDS_FOR_VALID_DNA: 20,    // Minimum hands before DNA is reliable

    // Grit calculation weights
    GRIT_WEIGHTS: {
        TILT_RESISTANCE: 0.35,      // Performance after bad beats
        LOSS_RECOVERY: 0.25,        // Bounce-back after losses
        TIMEOUT_DISCIPLINE: 0.20,   // Never timing out
        PRESSURE_PERFORMANCE: 0.20  // Performance in high-stakes moments
    },

    // Aggression calculation weights
    AGGRESSION_WEIGHTS: {
        BET_FREQUENCY: 0.30,        // How often player bets when they can
        RAISE_FREQUENCY: 0.25,      // Raise vs call ratio
        BLUFF_FREQUENCY: 0.20,      // Bluffing when weak
        SIZING_TENDENCY: 0.25       // Average bet sizing vs pot
    },

    // Decay factor for older actions
    TEMPORAL_DECAY: 0.95,           // Per-hand decay multiplier

    // Normalization bounds
    FLOOR: 0.0,
    CEILING: 1.0
};

const DNA_METRICS = {
    GRIT: 'GRIT',
    AGGRESSION: 'AGGRESSION',
    ACCURACY: 'ACCURACY',         // From MasteryBusSync
    DISCIPLINE: 'DISCIPLINE',
    ADAPTABILITY: 'ADAPTABILITY'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 DNA SCORE CALCULATOR ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class DNAScoreCalculator {
    constructor(options = {}) {
        this.config = { ...DNA_CONFIG, ...options.config };

        // Action history per user
        this.userActionHistory = new Map();

        // Computed DNA cache
        this.dnaCache = new Map();

        // Statistics
        this.stats = {
            totalCalculations: 0,
            usersProcessed: 0,
            lastCalculation: null
        };

        console.log('🧬 DNAScoreCalculator initialized (ORB_01_SOCIAL_DNA)');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 ACTION RECORDING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Record a poker action for DNA analysis
     * @param {string} userId - User identifier
     * @param {object} action - The action taken
     */
    recordAction(userId, action) {
        if (!this.userActionHistory.has(userId)) {
            this.userActionHistory.set(userId, []);
        }

        const history = this.userActionHistory.get(userId);

        // Enrich action with metadata
        const enrichedAction = {
            ...action,
            timestamp: Date.now(),
            index: history.length
        };

        history.push(enrichedAction);

        // Trim to window size
        if (history.length > this.config.ANALYSIS_WINDOW) {
            history.shift();
        }

        // Invalidate cache
        this.dnaCache.delete(userId);

        return enrichedAction;
    }

    /**
     * Record multiple actions (batch import)
     */
    recordActionBatch(userId, actions) {
        for (const action of actions) {
            this.recordAction(userId, action);
        }
        return this.calculateDNA(userId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 GRIT CALCULATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Calculate GRIT score (0-1)
     * Measures resilience, tilt resistance, and mental fortitude
     */
    calculateGrit(userId) {
        const history = this.userActionHistory.get(userId) || [];

        if (history.length < this.config.MIN_HANDS_FOR_VALID_DNA) {
            return { value: 0.5, confidence: 'LOW', dataPoints: history.length };
        }

        const weights = this.config.GRIT_WEIGHTS;
        let gritScore = 0;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 1: Tilt Resistance (35%)
        // Performance after bad beats / coolers
        // ═══════════════════════════════════════════════════════════════
        const tiltResistance = this.measureTiltResistance(history);
        gritScore += tiltResistance * weights.TILT_RESISTANCE;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 2: Loss Recovery (25%)
        // Accuracy after losing sessions
        // ═══════════════════════════════════════════════════════════════
        const lossRecovery = this.measureLossRecovery(history);
        gritScore += lossRecovery * weights.LOSS_RECOVERY;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 3: Timeout Discipline (20%)
        // Never timing out under pressure
        // ═══════════════════════════════════════════════════════════════
        const timeoutDiscipline = this.measureTimeoutDiscipline(history);
        gritScore += timeoutDiscipline * weights.TIMEOUT_DISCIPLINE;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 4: Pressure Performance (20%)
        // Accuracy in high-stakes / final table moments
        // ═══════════════════════════════════════════════════════════════
        const pressurePerformance = this.measurePressurePerformance(history);
        gritScore += pressurePerformance * weights.PRESSURE_PERFORMANCE;

        return {
            value: this.normalize(gritScore),
            confidence: this.getConfidence(history.length),
            dataPoints: history.length,
            components: {
                tiltResistance,
                lossRecovery,
                timeoutDiscipline,
                pressurePerformance
            }
        };
    }

    /**
     * Measure tilt resistance: performance after bad beats
     */
    measureTiltResistance(history) {
        const badBeatActions = history.filter(a => a.context?.isBadBeat || a.context?.isCooler);

        if (badBeatActions.length === 0) return 0.75; // Neutral if no data

        let postBadBeatAccuracy = 0;
        let count = 0;

        for (const badBeat of badBeatActions) {
            // Find next 3 actions after bad beat
            const subsequentActions = history.filter(
                a => a.index > badBeat.index && a.index <= badBeat.index + 3
            );

            for (const action of subsequentActions) {
                if (action.isOptimal !== undefined) {
                    postBadBeatAccuracy += action.isOptimal ? 1 : 0;
                    count++;
                }
            }
        }

        if (count === 0) return 0.75;

        // Check for tilt signals
        const tiltSignals = history.filter(a =>
            a.leakSignals?.includes(LEAK_SIGNALS.TILT_DETECTED) ||
            a.leakSignals?.includes(LEAK_SIGNALS.PANIC_CLICK)
        ).length;

        const tiltPenalty = Math.min(tiltSignals * 0.05, 0.3);

        return Math.max(0, (postBadBeatAccuracy / count) - tiltPenalty);
    }

    /**
     * Measure loss recovery: bounce-back after losing streaks
     */
    measureLossRecovery(history) {
        const sessions = this.groupIntoSessions(history);

        if (sessions.length < 2) return 0.5;

        let recoveryScore = 0;
        let recoveryCount = 0;

        for (let i = 1; i < sessions.length; i++) {
            const prevSession = sessions[i - 1];
            const currSession = sessions[i];

            const prevAccuracy = this.getSessionAccuracy(prevSession);
            const currAccuracy = this.getSessionAccuracy(currSession);

            // If previous session was bad (<50% accuracy)
            if (prevAccuracy < 0.5) {
                // Score based on recovery
                const recovery = currAccuracy >= 0.7 ? 1.0 :
                    currAccuracy >= 0.5 ? 0.7 :
                        currAccuracy >= prevAccuracy ? 0.4 : 0.1;

                recoveryScore += recovery;
                recoveryCount++;
            }
        }

        return recoveryCount > 0 ? recoveryScore / recoveryCount : 0.6;
    }

    /**
     * Measure timeout discipline
     */
    measureTimeoutDiscipline(history) {
        const timedOutActions = history.filter(a =>
            a.timedOut ||
            a.leakSignals?.includes(LEAK_SIGNALS.TIMEOUT_FOLD)
        ).length;

        const timeoutRate = timedOutActions / history.length;

        // Perfect: 0 timeouts = 1.0, Each timeout reduces score
        return Math.max(0, 1.0 - (timeoutRate * 5));
    }

    /**
     * Measure pressure performance
     */
    measurePressurePerformance(history) {
        const pressureActions = history.filter(a =>
            a.context?.isPressureMode ||
            a.context?.isBubble ||
            a.context?.isFinalTable ||
            a.context?.isAllIn
        );

        if (pressureActions.length === 0) return 0.5;

        const optimalCount = pressureActions.filter(a => a.isOptimal).length;
        return optimalCount / pressureActions.length;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ⚔️ AGGRESSION CALCULATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Calculate AGGRESSION score (0-1)
     * Measures betting frequency, sizing, and bluffing tendencies
     */
    calculateAggression(userId) {
        const history = this.userActionHistory.get(userId) || [];

        if (history.length < this.config.MIN_HANDS_FOR_VALID_DNA) {
            return { value: 0.5, confidence: 'LOW', dataPoints: history.length };
        }

        const weights = this.config.AGGRESSION_WEIGHTS;
        let aggressionScore = 0;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 1: Bet Frequency (30%)
        // ═══════════════════════════════════════════════════════════════
        const betFrequency = this.measureBetFrequency(history);
        aggressionScore += betFrequency * weights.BET_FREQUENCY;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 2: Raise Frequency (25%)
        // ═══════════════════════════════════════════════════════════════
        const raiseFrequency = this.measureRaiseFrequency(history);
        aggressionScore += raiseFrequency * weights.RAISE_FREQUENCY;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 3: Bluff Frequency (20%)
        // ═══════════════════════════════════════════════════════════════
        const bluffFrequency = this.measureBluffFrequency(history);
        aggressionScore += bluffFrequency * weights.BLUFF_FREQUENCY;

        // ═══════════════════════════════════════════════════════════════
        // COMPONENT 4: Sizing Tendency (25%)
        // ═══════════════════════════════════════════════════════════════
        const sizingTendency = this.measureSizingTendency(history);
        aggressionScore += sizingTendency * weights.SIZING_TENDENCY;

        return {
            value: this.normalize(aggressionScore),
            confidence: this.getConfidence(history.length),
            dataPoints: history.length,
            components: {
                betFrequency,
                raiseFrequency,
                bluffFrequency,
                sizingTendency
            }
        };
    }

    /**
     * Measure bet frequency when player has opportunity
     */
    measureBetFrequency(history) {
        const betOpportunities = history.filter(a =>
            a.availableActions?.includes('BET') ||
            a.availableActions?.includes('CHECK')
        );

        if (betOpportunities.length === 0) return 0.5;

        const betActions = betOpportunities.filter(a =>
            a.action?.type === 'BET' ||
            a.action?.type?.startsWith('BET_')
        ).length;

        // Normalize: 33% bet rate = 0.5 aggression, 66% = 1.0
        const betRate = betActions / betOpportunities.length;
        return Math.min(1.0, betRate * 1.5);
    }

    /**
     * Measure raise vs call ratio
     */
    measureRaiseFrequency(history) {
        const facingBet = history.filter(a =>
            a.availableActions?.includes('RAISE') ||
            a.availableActions?.includes('CALL')
        );

        if (facingBet.length === 0) return 0.5;

        const raises = facingBet.filter(a =>
            a.action?.type === 'RAISE' ||
            a.action?.type === 'ALL_IN'
        ).length;

        const calls = facingBet.filter(a => a.action?.type === 'CALL').length;

        if (raises + calls === 0) return 0.5;

        // Raise/(Raise+Call) ratio
        return raises / (raises + calls);
    }

    /**
     * Measure bluff frequency (betting/raising with weak hands)
     */
    measureBluffFrequency(history) {
        const aggressiveActions = history.filter(a =>
            ['BET', 'RAISE', 'ALL_IN'].includes(a.action?.type) ||
            a.action?.type?.startsWith('BET_')
        );

        if (aggressiveActions.length === 0) return 0.5;

        const bluffs = aggressiveActions.filter(a =>
            a.handStrength === 'WEAK' ||
            a.handStrength === 'AIR' ||
            a.context?.isBluff
        ).length;

        // Target: ~30-40% bluffs in aggressive actions
        const bluffRate = bluffs / aggressiveActions.length;

        // Peak at 0.35 (GTO-ish), lower for extremes
        if (bluffRate <= 0.35) {
            return bluffRate / 0.35;
        } else {
            return Math.max(0.3, 1.0 - ((bluffRate - 0.35) * 2));
        }
    }

    /**
     * Measure bet sizing tendency
     */
    measureSizingTendency(history) {
        const betsWithSizing = history.filter(a =>
            a.action?.sizing || a.action?.multiplier
        );

        if (betsWithSizing.length === 0) return 0.5;

        const totalMultiplier = betsWithSizing.reduce((sum, a) => {
            const mult = a.action.multiplier || a.action.sizing?.multiplier || 0.5;
            return sum + mult;
        }, 0);

        const avgMultiplier = totalMultiplier / betsWithSizing.length;

        // Normalize: 0.33x = 0.3, 0.5x = 0.5, 0.75x = 0.75, 1.0x+ = 1.0
        return Math.min(1.0, avgMultiplier);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🧬 FULL DNA CALCULATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Calculate complete DNA profile for a user
     */
    calculateDNA(userId) {
        // Check cache
        const cached = this.dnaCache.get(userId);
        if (cached && Date.now() - cached.timestamp < 60000) {
            return cached.dna;
        }

        this.stats.totalCalculations++;

        const grit = this.calculateGrit(userId);
        const aggression = this.calculateAggression(userId);

        const dna = {
            userId,
            metrics: {
                [DNA_METRICS.GRIT]: grit.value,
                [DNA_METRICS.AGGRESSION]: aggression.value
            },
            details: {
                grit,
                aggression
            },
            confidence: this.combineConfidence(grit.confidence, aggression.confidence),
            calculatedAt: new Date().toISOString(),
            version: '1.0'
        };

        // Cache result
        this.dnaCache.set(userId, { dna, timestamp: Date.now() });
        this.stats.lastCalculation = new Date().toISOString();

        return dna;
    }

    /**
     * Get DNA with additional external metrics (Accuracy from MasteryBusSync)
     */
    getCompleteDNA(userId, externalMetrics = {}) {
        const baseDNA = this.calculateDNA(userId);

        return {
            ...baseDNA,
            metrics: {
                ...baseDNA.metrics,
                ...externalMetrics
            },
            isComplete: externalMetrics[DNA_METRICS.ACCURACY] !== undefined
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🛠️ UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Normalize value to 0-1 range
     */
    normalize(value) {
        return Math.max(
            this.config.FLOOR,
            Math.min(this.config.CEILING, value)
        );
    }

    /**
     * Get confidence level based on data points
     */
    getConfidence(dataPoints) {
        if (dataPoints < 20) return 'LOW';
        if (dataPoints < 50) return 'MEDIUM';
        if (dataPoints < 100) return 'HIGH';
        return 'VERY_HIGH';
    }

    /**
     * Combine multiple confidence levels
     */
    combineConfidence(...confidences) {
        const levels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'VERY_HIGH': 4 };
        const reverseLevels = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH', 4: 'VERY_HIGH' };

        const minLevel = Math.min(...confidences.map(c => levels[c]));
        return reverseLevels[minLevel];
    }

    /**
     * Group actions into sessions (by time gaps)
     */
    groupIntoSessions(history, gapMs = 30 * 60 * 1000) {
        if (history.length === 0) return [];

        const sessions = [];
        let currentSession = [history[0]];

        for (let i = 1; i < history.length; i++) {
            const gap = history[i].timestamp - history[i - 1].timestamp;

            if (gap > gapMs) {
                sessions.push(currentSession);
                currentSession = [];
            }
            currentSession.push(history[i]);
        }

        if (currentSession.length > 0) {
            sessions.push(currentSession);
        }

        return sessions;
    }

    /**
     * Get accuracy for a session
     */
    getSessionAccuracy(session) {
        const evaluated = session.filter(a => a.isOptimal !== undefined);
        if (evaluated.length === 0) return 0.5;

        const optimal = evaluated.filter(a => a.isOptimal).length;
        return optimal / evaluated.length;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 STATISTICS & EXPORT
    // ═══════════════════════════════════════════════════════════════════════

    getStats() {
        return {
            ...this.stats,
            usersTracked: this.userActionHistory.size,
            cachedProfiles: this.dnaCache.size
        };
    }

    exportUserHistory(userId) {
        return this.userActionHistory.get(userId) || [];
    }

    clearUserData(userId) {
        this.userActionHistory.delete(userId);
        this.dnaCache.delete(userId);
    }

    clearAllData() {
        this.userActionHistory.clear();
        this.dnaCache.clear();
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export function createDNAScoreCalculator(options = {}) {
    return new DNAScoreCalculator(options);
}

export { DNA_CONFIG, DNA_METRICS };

export default DNAScoreCalculator;
