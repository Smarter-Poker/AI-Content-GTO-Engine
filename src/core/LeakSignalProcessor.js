/**
 * 🤖 SMARTER.POKER — LEAK SIGNAL PROCESSOR
 * Detects sub-optimal plays and triggers GTO + 2 Alternate Lines feedback
 * 
 * HARD LAW: On wrong answers, ALWAYS show GTO + 2 Alternate Lines
 * Target: ORB_4 (Training) | ORB_6 (Assistant)
 */

import {
    MISTAKE_CATEGORIES,
    LEAK_SIGNALS,
    EVALUATION_TIERS,
    EVENT_TYPES
} from '../config/constants.js';

// ═══════════════════════════════════════════════════════════════
// 🚨 LEAK SIGNAL PROCESSOR CLASS
// ═══════════════════════════════════════════════════════════════

export class LeakSignalProcessor {
    constructor(options = {}) {
        this.config = {
            leakThreshold: options.leakThreshold || 3, // Leaks before flagging pattern
            sessionWindow: options.sessionWindow || 20, // Hands to analyze
            ...options
        };

        // Leak tracking
        this.leakHistory = new Map(); // userId -> leak records
        this.sessionLeaks = new Map(); // sessionId -> current session leaks

        // Statistics
        this.stats = {
            totalEvaluations: 0,
            subOptimalCount: 0,
            optimalCount: 0,
            leaksDetected: {},
            avgEVLoss: 0
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 MAIN PROCESSING API (Hard Law Implementation)
    // ═══════════════════════════════════════════════════════════

    /**
     * Process user response against GTO solution
     * HARD LAW: Always return GTO + 2 alternates on sub-optimal play
     */
    processResponse(userAction, gtoSolution, context = {}) {
        this.stats.totalEvaluations++;

        const { userId, sessionId, scenarioId } = context;
        const bestMove = gtoSolution.bestMove;

        // Check if user action matches GTO best move
        const isOptimal = this.compareActions(userAction, bestMove);

        if (isOptimal) {
            this.stats.optimalCount++;
            return this.createOptimalResponse(userAction, gtoSolution, context);
        }

        // Sub-optimal play detected - enforce Hard Law
        this.stats.subOptimalCount++;

        // Calculate EV loss
        const evLoss = this.calculateEVLoss(userAction, gtoSolution);

        // Classify mistake severity
        const mistakeCategory = this.classifyMistake(evLoss);

        // Detect specific leak signals
        const leakSignals = this.detectLeakSignals(userAction, gtoSolution, context);

        // Record leak for pattern detection
        this.recordLeak(userId, sessionId, leakSignals, evLoss, scenarioId);

        // HARD LAW: Always show GTO + 2 Alternate Lines on wrong answer
        return {
            status: 'SUB_OPTIMAL',
            showGTO: true, // HARD LAW: Always true on wrong answer
            alternates: gtoSolution.alternates, // HARD LAW: Always show 2 alternate lines
            leakDetected: true,

            // Detailed feedback
            evaluation: {
                userAction,
                gtoAction: bestMove,
                evLoss,
                mistakeCategory,
                xpAwarded: mistakeCategory.xp
            },

            // Leak analysis
            leakAnalysis: {
                signals: leakSignals,
                patternWarning: this.checkPatternWarning(userId, leakSignals),
                remediation: this.suggestRemediation(leakSignals)
            },

            // Triple-Truth context
            tripleTruth: {
                gtoLine: {
                    type: EVALUATION_TIERS.GTO_BASELINE.id,
                    label: EVALUATION_TIERS.GTO_BASELINE.label,
                    action: bestMove,
                    points: EVALUATION_TIERS.GTO_BASELINE.points,
                    explanation: 'The mathematically optimal play'
                },
                altLine1: gtoSolution.alternates[0],
                altLine2: gtoSolution.alternates[1]
            },

            // Strategic feedback
            strategicFeedback: this.generateStrategicFeedback(userAction, gtoSolution, leakSignals)
        };
    }

    /**
     * Create response for optimal play
     */
    createOptimalResponse(userAction, gtoSolution, context) {
        return {
            status: 'OPTIMAL',
            showGTO: false,
            alternates: null, // Not shown on correct answer
            leakDetected: false,

            evaluation: {
                userAction,
                gtoAction: gtoSolution.bestMove,
                evLoss: 0,
                mistakeCategory: MISTAKE_CATEGORIES.OPTIMAL,
                xpAwarded: MISTAKE_CATEGORIES.OPTIMAL.xp
            },

            // Optional: show alternates for learning (collapsible)
            optionalContext: {
                alternates: gtoSolution.alternates,
                strategicAnchors: gtoSolution.strategicAnchors
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 🧮 EVALUATION LOGIC
    // ═══════════════════════════════════════════════════════════

    /**
     * Compare user action to GTO best move
     */
    compareActions(userAction, gtoAction) {
        // Normalize action types
        const userType = this.normalizeAction(userAction);
        const gtoType = this.normalizeAction(gtoAction);

        // Exact match check
        if (userType.type !== gtoType.type) return false;

        // For betting actions, check sizing tolerance
        if (['BET', 'RAISE', 'ALL_IN'].includes(userType.type)) {
            return this.isSizingAcceptable(userType.sizing, gtoType.sizing);
        }

        return true;
    }

    /**
     * Normalize action format
     */
    normalizeAction(action) {
        if (typeof action === 'string') {
            return { type: action.toUpperCase(), sizing: null };
        }
        return {
            type: (action.type || action.action || '').toUpperCase(),
            sizing: action.sizing || action.amount || null
        };
    }

    /**
     * Check if bet sizing is within acceptable range
     */
    isSizingAcceptable(userSizing, gtoSizing, tolerance = 0.1) {
        if (!userSizing || !gtoSizing) return true;

        const userAmount = this.extractAmount(userSizing);
        const gtoAmount = this.extractAmount(gtoSizing);

        if (gtoAmount === 0) return userAmount === 0;

        const deviation = Math.abs(userAmount - gtoAmount) / gtoAmount;
        return deviation <= tolerance;
    }

    /**
     * Extract numeric amount from sizing
     */
    extractAmount(sizing) {
        if (typeof sizing === 'number') return sizing;
        if (sizing && sizing.multiplier) return sizing.multiplier;
        if (sizing && sizing.amount) return sizing.amount;
        return 0;
    }

    /**
     * Calculate EV loss from sub-optimal play
     */
    calculateEVLoss(userAction, gtoSolution) {
        const userNorm = this.normalizeAction(userAction);

        // Find user's action in ranked list
        const userRankedAction = gtoSolution.rankedActions?.find(
            a => this.normalizeAction(a).type === userNorm.type
        );

        if (!userRankedAction) {
            // Action not in GTO tree - significant error
            return 0.25;
        }

        // EV loss = Best EV - User's EV
        const evLoss = Math.abs(gtoSolution.bestMove.ev - userRankedAction.ev);
        return Math.round(evLoss * 10000) / 10000;
    }

    /**
     * Classify mistake by EV loss
     */
    classifyMistake(evLoss) {
        for (const [key, category] of Object.entries(MISTAKE_CATEGORIES)) {
            if (evLoss >= category.evLossMin && evLoss < category.evLossMax) {
                return { ...category, key };
            }
        }
        return { ...MISTAKE_CATEGORIES.BLUNDER, key: 'BLUNDER' };
    }

    // ═══════════════════════════════════════════════════════════
    // 🔍 LEAK SIGNAL DETECTION
    // ═══════════════════════════════════════════════════════════

    /**
     * Detect specific leak signals from the play
     */
    detectLeakSignals(userAction, gtoSolution, context) {
        const signals = [];
        const userNorm = this.normalizeAction(userAction);
        const gtoNorm = this.normalizeAction(gtoSolution.bestMove);

        // Frequency-based leaks
        if (userNorm.type === 'FOLD' && gtoNorm.type !== 'FOLD') {
            signals.push(LEAK_SIGNALS.OVER_FOLDING);
        }

        if (userNorm.type === 'CALL' && ['BET', 'RAISE'].includes(gtoNorm.type)) {
            signals.push(LEAK_SIGNALS.PASSIVE_PLAY);
        }

        if (['BET', 'RAISE'].includes(userNorm.type) && gtoNorm.type === 'CHECK') {
            signals.push(LEAK_SIGNALS.OVER_AGGRESSION);
        }

        if (userNorm.type === 'CALL' && gtoNorm.type === 'FOLD') {
            signals.push(LEAK_SIGNALS.OVER_CALLING);
        }

        // Sizing-based leaks
        if (['BET', 'RAISE'].includes(userNorm.type)) {
            const userAmount = this.extractAmount(userNorm.sizing);
            const gtoAmount = this.extractAmount(gtoNorm.sizing);

            if (gtoAmount > 0) {
                const ratio = userAmount / gtoAmount;
                if (ratio < 0.7) signals.push(LEAK_SIGNALS.SIZING_ERROR_SMALL);
                if (ratio > 1.5) signals.push(LEAK_SIGNALS.SIZING_ERROR_LARGE);
                if (ratio < 0.5 && context.handStrength === 'STRONG') {
                    signals.push(LEAK_SIGNALS.THIN_VALUE_COWARDICE);
                }
            }
        }

        // Behavioral leaks (from context)
        if (context.decisionTimeMs !== undefined) {
            if (context.decisionTimeMs < 500) signals.push(LEAK_SIGNALS.PANIC_CLICK);
            if (context.decisionTimeMs > 14000) signals.push(LEAK_SIGNALS.TIMING_TELL);
        }

        if (context.timedOut) signals.push(LEAK_SIGNALS.TIMEOUT_FOLD);

        // Tournament-specific leaks
        if (context.format === 'MTT' && context.bubbleFactor > 1.5) {
            if (userNorm.type === 'FOLD' && gtoNorm.type !== 'FOLD') {
                signals.push(LEAK_SIGNALS.BUBBLE_FEAR);
            }
            if (userNorm.type === 'CALL' && context.icmAdjustedAction === 'FOLD') {
                signals.push(LEAK_SIGNALS.ICM_SUICIDE);
            }
        }

        return signals;
    }

    /**
     * Record leak for pattern analysis
     */
    recordLeak(userId, sessionId, signals, evLoss, scenarioId) {
        if (!userId) return;

        // Get or create user leak history
        if (!this.leakHistory.has(userId)) {
            this.leakHistory.set(userId, []);
        }

        const record = {
            timestamp: Date.now(),
            sessionId,
            scenarioId,
            signals,
            evLoss
        };

        this.leakHistory.get(userId).push(record);

        // Update session leaks
        if (sessionId) {
            if (!this.sessionLeaks.has(sessionId)) {
                this.sessionLeaks.set(sessionId, []);
            }
            this.sessionLeaks.get(sessionId).push(record);
        }

        // Update stats
        for (const signal of signals) {
            this.stats.leaksDetected[signal] = (this.stats.leaksDetected[signal] || 0) + 1;
        }
    }

    /**
     * Check for pattern warning (repeated leaks)
     */
    checkPatternWarning(userId, currentSignals) {
        if (!userId || !this.leakHistory.has(userId)) return null;

        const history = this.leakHistory.get(userId);
        const recentHistory = history.slice(-this.config.sessionWindow);

        // Count occurrences of each signal
        const signalCounts = {};
        for (const record of recentHistory) {
            for (const signal of record.signals) {
                signalCounts[signal] = (signalCounts[signal] || 0) + 1;
            }
        }

        // Check for pattern threshold
        const patternWarnings = [];
        for (const signal of currentSignals) {
            if ((signalCounts[signal] || 0) >= this.config.leakThreshold) {
                patternWarnings.push({
                    signal,
                    occurrences: signalCounts[signal],
                    severity: 'HIGH',
                    message: `Pattern detected: ${signal} (${signalCounts[signal]}x in last ${this.config.sessionWindow} hands)`
                });
            }
        }

        return patternWarnings.length > 0 ? patternWarnings : null;
    }

    /**
     * Suggest remediation for detected leaks
     */
    suggestRemediation(leakSignals) {
        const remediation = [];

        const leakToClinic = {
            [LEAK_SIGNALS.OVER_FOLDING]: { clinic: 'Iron Wall Clinic', focus: 'Defense' },
            [LEAK_SIGNALS.OVER_CALLING]: { clinic: 'Discipline Clinic', focus: 'Fold Equity' },
            [LEAK_SIGNALS.PASSIVE_PLAY]: { clinic: 'Aggression Clinic', focus: 'Value Betting' },
            [LEAK_SIGNALS.OVER_AGGRESSION]: { clinic: 'Balance Clinic', focus: 'Range Construction' },
            [LEAK_SIGNALS.SIZING_ERROR_SMALL]: { clinic: 'Value Extractor', focus: 'Sizing' },
            [LEAK_SIGNALS.SIZING_ERROR_LARGE]: { clinic: 'Polarization Clinic', focus: 'Sizing' },
            [LEAK_SIGNALS.THIN_VALUE_COWARDICE]: { clinic: 'Value Extractor', focus: 'Thin Value' },
            [LEAK_SIGNALS.BUBBLE_FEAR]: { clinic: 'ICM Clinic', focus: 'Tournament Pressure' },
            [LEAK_SIGNALS.ICM_SUICIDE]: { clinic: 'Final Table Pressure', focus: 'Risk Assessment' },
            [LEAK_SIGNALS.PANIC_CLICK]: { clinic: 'Metronome Clinic', focus: 'Timing Discipline' },
            [LEAK_SIGNALS.TIMING_TELL]: { clinic: 'Metronome Clinic', focus: 'Consistency' }
        };

        for (const signal of leakSignals) {
            if (leakToClinic[signal]) {
                remediation.push({
                    signal,
                    ...leakToClinic[signal],
                    priority: this.getRemediationPriority(signal)
                });
            }
        }

        return remediation;
    }

    /**
     * Get priority for remediation
     */
    getRemediationPriority(signal) {
        const highPriority = [LEAK_SIGNALS.ICM_SUICIDE, LEAK_SIGNALS.OVER_FOLDING, LEAK_SIGNALS.PASSIVE_PLAY];
        const mediumPriority = [LEAK_SIGNALS.SIZING_ERROR_SMALL, LEAK_SIGNALS.SIZING_ERROR_LARGE];

        if (highPriority.includes(signal)) return 'HIGH';
        if (mediumPriority.includes(signal)) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Generate strategic feedback for the play
     */
    generateStrategicFeedback(userAction, gtoSolution, leakSignals) {
        const feedback = {
            summary: '',
            concepts: [],
            improvement: ''
        };

        const userNorm = this.normalizeAction(userAction);
        const gtoNorm = this.normalizeAction(gtoSolution.bestMove);

        // Generate summary
        if (leakSignals.includes(LEAK_SIGNALS.OVER_FOLDING)) {
            feedback.summary = 'You folded when GTO recommends defending. Your range becomes exploitably tight.';
            feedback.concepts = ['Minimum Defense Frequency', 'Range Protection'];
        } else if (leakSignals.includes(LEAK_SIGNALS.PASSIVE_PLAY)) {
            feedback.summary = 'You called when GTO recommends raising for value. You missed value extraction.';
            feedback.concepts = ['Value Betting', 'Polarized Ranges'];
        } else if (leakSignals.includes(LEAK_SIGNALS.OVER_AGGRESSION)) {
            feedback.summary = 'You bet/raised when GTO recommends checking. This unbalances your range.';
            feedback.concepts = ['Range Balance', 'Check-Calling Lines'];
        } else {
            feedback.summary = `GTO recommends ${gtoNorm.type} but you chose ${userNorm.type}.`;
            feedback.concepts = gtoSolution.strategicAnchors || [];
        }

        // Generate improvement suggestion
        feedback.improvement = `Study the ${feedback.concepts[0] || 'fundamental'} concept to improve this spot.`;

        return feedback;
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 ANALYTICS API
    // ═══════════════════════════════════════════════════════════

    getStats() { return this.stats; }

    getUserLeakProfile(userId) {
        if (!this.leakHistory.has(userId)) return null;

        const history = this.leakHistory.get(userId);
        const signalCounts = {};
        let totalEVLoss = 0;

        for (const record of history) {
            totalEVLoss += record.evLoss;
            for (const signal of record.signals) {
                signalCounts[signal] = (signalCounts[signal] || 0) + 1;
            }
        }

        return {
            userId,
            totalHands: history.length,
            totalEVLoss: Math.round(totalEVLoss * 10000) / 10000,
            avgEVLoss: history.length > 0 ? Math.round((totalEVLoss / history.length) * 10000) / 10000 : 0,
            leaksBySignal: signalCounts,
            topLeaks: Object.entries(signalCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
        };
    }

    getSessionSummary(sessionId) {
        if (!this.sessionLeaks.has(sessionId)) return null;

        const leaks = this.sessionLeaks.get(sessionId);
        return {
            sessionId,
            totalSubOptimal: leaks.length,
            totalEVLoss: leaks.reduce((sum, l) => sum + l.evLoss, 0),
            signals: leaks.flatMap(l => l.signals)
        };
    }

    clearHistory(userId) {
        if (userId) {
            this.leakHistory.delete(userId);
        } else {
            this.leakHistory.clear();
            this.sessionLeaks.clear();
        }
    }
}

export default LeakSignalProcessor;
