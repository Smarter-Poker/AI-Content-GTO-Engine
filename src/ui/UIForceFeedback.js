/**
 * 🚨 SMARTER.POKER — UI FORCE FEEDBACK CONTROLLER
 * 
 * @task LEAK_SIGNAL_AUTO_SHOW
 * ---------------------------------------------------------
 * Law: If 'is_repeated_leak' == true, the UI MUST display GTO + 2 Alternate lines.
 * Logic: Lock the 'Next' button for 3 seconds to ensure study.
 */

export class UIForceFeedback {
    constructor(options = {}) {
        this.config = {
            studyLockDurationMs: options.studyLockDurationMs || 3000,  // 3 seconds
            minAlternatesToShow: options.minAlternatesToShow || 2,
            ...options
        };

        // State
        this.isLocked = false;
        this.lockTimer = null;
        this.currentFeedback = null;

        console.log('🚨 UIForceFeedback initialized');
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 MAIN API: Process Leak Signal
    // ═══════════════════════════════════════════════════════════

    /**
     * Process evaluation result and determine if forced feedback is needed
     * Returns UI instructions for the frontend
     */
    processFeedback(evaluationResult, leakHistory = {}) {
        const isRepeatedLeak = this.detectRepeatedLeak(evaluationResult, leakHistory);

        // HARD LAW: If repeated leak, MUST show GTO + 2 alternates
        if (isRepeatedLeak) {
            return this.createForcedFeedback(evaluationResult);
        }

        // Standard feedback for non-repeated mistakes
        if (evaluationResult.status === 'SUB_OPTIMAL') {
            return this.createStandardFeedback(evaluationResult);
        }

        // Correct answer - no forced feedback
        return this.createSuccessFeedback(evaluationResult);
    }

    /**
     * Detect if this is a repeated leak pattern
     */
    detectRepeatedLeak(evaluationResult, leakHistory) {
        if (!evaluationResult.leakDetected) return false;

        const signals = evaluationResult.leakAnalysis?.signals || [];

        // Check if any signal has been seen 3+ times in session
        for (const signal of signals) {
            const signalCount = leakHistory[signal] || 0;
            if (signalCount >= 2) {  // 3rd occurrence triggers forced feedback
                return true;
            }
        }

        // Check if pattern warning was issued
        if (evaluationResult.leakAnalysis?.patternWarning) {
            return true;
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════════
    // 🚨 FORCED FEEDBACK (Repeated Leak)
    // ═══════════════════════════════════════════════════════════

    /**
     * Create forced feedback for repeated leaks
     * LOCKS the Next button for 3 seconds
     */
    createForcedFeedback(evaluationResult) {
        const gtoSolution = evaluationResult.gtoSolution || {};
        const alternates = gtoSolution.alternates || [];

        // Ensure we have at least 2 alternates (HARD LAW)
        const displayAlternates = alternates.slice(0, Math.max(2, this.config.minAlternatesToShow));

        const feedback = {
            type: 'FORCED_FEEDBACK',
            isRepeatedLeak: true,

            // Visual display requirements
            display: {
                showGTO: true,                    // MUST show GTO
                showAlternates: true,             // MUST show alternates
                alternateCount: displayAlternates.length,
                highlightRepeatedPattern: true,
                showLeakWarning: true
            },

            // GTO Solution (MUST display)
            gtoLine: {
                label: '🟢 GTO Optimal',
                action: gtoSolution.bestMove,
                ev: gtoSolution.bestMove?.ev,
                reasoning: gtoSolution.bestMove?.reasoning || 'The mathematically optimal play'
            },

            // Alternate Lines (MUST display 2+)
            alternates: displayAlternates.map((alt, i) => ({
                id: alt.id,
                label: alt.label || `🟠 Alternative ${i + 1}`,
                action: alt.action,
                reasoning: alt.reasoning,
                points: alt.points
            })),

            // Study Lock (MUST lock for 5 seconds)
            studyLock: {
                enabled: true,
                durationMs: this.config.studyLockDurationMs,
                message: 'Study the correct play before continuing...',
                countdownVisible: true
            },

            // Button states
            buttons: {
                next: {
                    disabled: true,
                    disabledDurationMs: this.config.studyLockDurationMs,
                    enableAfterStudy: true
                },
                showHint: { disabled: true },
                skip: { disabled: true }
            },

            // Leak information
            leakInfo: {
                signals: evaluationResult.leakAnalysis?.signals || [],
                patternWarning: evaluationResult.leakAnalysis?.patternWarning,
                remediation: evaluationResult.leakAnalysis?.remediation || [],
                message: '⚠️ This mistake has been repeated. Study the correct play carefully.'
            },

            // Evaluation data
            evaluation: {
                evLoss: evaluationResult.evaluation?.evLoss,
                mistakeCategory: evaluationResult.evaluation?.mistakeCategory,
                xpAwarded: evaluationResult.evaluation?.xpAwarded
            },

            // Timestamp for frontend tracking
            timestamp: new Date().toISOString(),
            unlockAt: new Date(Date.now() + this.config.studyLockDurationMs).toISOString()
        };

        this.currentFeedback = feedback;
        this.startStudyLock();

        console.log('🚨 FORCED FEEDBACK: Repeated leak detected, Next button locked for 3s');

        return feedback;
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 STANDARD FEEDBACK (First-time mistake)
    // ═══════════════════════════════════════════════════════════

    createStandardFeedback(evaluationResult) {
        const gtoSolution = evaluationResult.gtoSolution || {};
        const alternates = gtoSolution.alternates || [];

        return {
            type: 'STANDARD_FEEDBACK',
            isRepeatedLeak: false,

            display: {
                showGTO: true,
                showAlternates: true,
                alternateCount: alternates.length,
                highlightRepeatedPattern: false,
                showLeakWarning: false
            },

            gtoLine: {
                label: '🟢 GTO Optimal',
                action: gtoSolution.bestMove,
                ev: gtoSolution.bestMove?.ev,
                reasoning: gtoSolution.bestMove?.reasoning
            },

            alternates: alternates.map((alt, i) => ({
                id: alt.id,
                label: alt.label || `🟠 Alternative ${i + 1}`,
                action: alt.action,
                reasoning: alt.reasoning,
                points: alt.points
            })),

            // No study lock for first-time mistakes
            studyLock: {
                enabled: false,
                durationMs: 0
            },

            buttons: {
                next: { disabled: false },
                showHint: { disabled: false },
                skip: { disabled: false }
            },

            leakInfo: {
                signals: evaluationResult.leakAnalysis?.signals || [],
                message: 'Review the correct play and try again!'
            },

            evaluation: {
                evLoss: evaluationResult.evaluation?.evLoss,
                mistakeCategory: evaluationResult.evaluation?.mistakeCategory,
                xpAwarded: evaluationResult.evaluation?.xpAwarded
            },

            timestamp: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ✅ SUCCESS FEEDBACK (Correct answer)
    // ═══════════════════════════════════════════════════════════

    createSuccessFeedback(evaluationResult) {
        return {
            type: 'SUCCESS_FEEDBACK',
            isRepeatedLeak: false,

            display: {
                showGTO: false,
                showAlternates: false,
                showSuccessAnimation: true
            },

            studyLock: {
                enabled: false,
                durationMs: 0
            },

            buttons: {
                next: { disabled: false, highlight: true },
                showHint: { disabled: true },
                skip: { disabled: true }
            },

            evaluation: {
                evLoss: 0,
                mistakeCategory: evaluationResult.evaluation?.mistakeCategory || { label: 'Optimal' },
                xpAwarded: evaluationResult.evaluation?.xpAwarded || 150
            },

            message: '✅ Correct! Great play!',
            timestamp: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ⏱️ STUDY LOCK
    // ═══════════════════════════════════════════════════════════

    startStudyLock() {
        this.isLocked = true;

        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
        }

        this.lockTimer = setTimeout(() => {
            this.isLocked = false;
            console.log('🔓 Study lock released, Next button enabled');
        }, this.config.studyLockDurationMs);
    }

    isNextButtonLocked() {
        return this.isLocked;
    }

    getRemainingLockTime() {
        if (!this.currentFeedback?.unlockAt) return 0;
        return Math.max(0, new Date(this.currentFeedback.unlockAt) - Date.now());
    }

    forceUnlock() {
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
        }
        this.isLocked = false;
        console.log('🔓 Study lock force-released');
    }
}

export default UIForceFeedback;
