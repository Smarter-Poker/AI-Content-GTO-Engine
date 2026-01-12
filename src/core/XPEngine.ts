/**
 * 🏆 XP ENGINE (BUS INTEGRATED)
 * ═══════════════════════════════════════════════════════════════════════════
 * The "Addiction" Core. Makes every action FEEL rewarding.
 * 
 * Laws:
 * - XP CAN NEVER BE LOST (Immutable)
 * - Streak multipliers reward consistency
 * - Combo bonuses for consecutive correct answers
 * 
 * NOW INTEGRATED WITH GLOBAL EVENT BUS
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { eventBus } from './EventBus';

export interface XPEvent {
    type: 'CORRECT' | 'INCORRECT' | 'STREAK_BONUS' | 'COMBO' | 'LEVEL_COMPLETE';
    baseXP: number;
    multiplier: number;
    totalXP: number;
    streak: number;
    timestamp: number;
}

export interface XPState {
    sessionXP: number;
    totalXP: number; // Persisted (NEVER decreases)
    currentStreak: number;
    maxStreak: number;
    correctCount: number;
    incorrectCount: number;
    comboLevel: number; // 0-4 (Normal, Good, Great, Excellent, Perfect)
}

// 🎯 XP VALUES
const XP_BASE = {
    CORRECT: 100,
    INCORRECT: 0, // No penalty, but no reward
    STREAK_3: 150, // Bonus at 3 streak
    STREAK_5: 300, // Bonus at 5 streak
    STREAK_10: 500, // Bonus at 10 streak
    STREAK_25: 1500,
    STREAK_50: 5000,
    STREAK_100: 15000,
    LEVEL_COMPLETE: 1000,
};

// 🔥 STREAK MULTIPLIERS
const STREAK_MULTIPLIER = (streak: number): number => {
    if (streak >= 25) return 3.0;
    if (streak >= 15) return 2.5;
    if (streak >= 10) return 2.0;
    if (streak >= 7) return 1.75;
    if (streak >= 5) return 1.5;
    if (streak >= 3) return 1.25;
    return 1.0;
};

// 🎮 COMBO LEVELS
const COMBO_THRESHOLDS = [0, 3, 5, 7, 10];
const COMBO_NAMES = ['NORMAL', 'GOOD', 'GREAT', 'EXCELLENT', 'PERFECT'] as const;

// 🏆 STREAK MILESTONES (for diamond rewards)
const STREAK_MILESTONES = [5, 10, 25, 50, 100];

export type ComboLevel = typeof COMBO_NAMES[number];

export class XPEngine {
    private state: XPState;
    private listeners: ((state: XPState, event: XPEvent) => void)[] = [];
    private eventHistory: XPEvent[] = [];
    private previousComboLevel: number = 0;

    constructor(initialXP: number = 0) {
        this.state = {
            sessionXP: 0,
            totalXP: initialXP,
            currentStreak: 0,
            maxStreak: 0,
            correctCount: 0,
            incorrectCount: 0,
            comboLevel: 0
        };
    }

    /**
     * Record a correct answer
     */
    public recordCorrect(): XPEvent {
        this.state.currentStreak++;
        this.state.correctCount++;

        if (this.state.currentStreak > this.state.maxStreak) {
            this.state.maxStreak = this.state.currentStreak;
        }

        // Calculate XP
        const multiplier = STREAK_MULTIPLIER(this.state.currentStreak);
        const baseXP = XP_BASE.CORRECT;
        const totalXP = Math.round(baseXP * multiplier);

        // Update combo level
        this.previousComboLevel = this.state.comboLevel;
        this.state.comboLevel = COMBO_THRESHOLDS.findIndex(
            (threshold, i) => this.state.currentStreak >= threshold &&
                (i === COMBO_THRESHOLDS.length - 1 || this.state.currentStreak < COMBO_THRESHOLDS[i + 1])
        );

        // Award XP
        this.state.sessionXP += totalXP;
        this.state.totalXP += totalXP;

        const event: XPEvent = {
            type: 'CORRECT',
            baseXP,
            multiplier,
            totalXP,
            streak: this.state.currentStreak,
            timestamp: Date.now()
        };

        this.eventHistory.push(event);

        // 🚌 EMIT TO GLOBAL BUS
        eventBus.emit('DECISION_CORRECT', {
            xp: totalXP,
            streak: this.state.currentStreak,
            multiplier,
            combo: this.getComboName()
        }, 'XPEngine');

        eventBus.emit('XP_EARNED', {
            amount: totalXP,
            source: 'TRAINING_CORRECT',
            multiplier
        }, 'XPEngine');

        // Check for combo level up
        if (this.state.comboLevel > this.previousComboLevel) {
            eventBus.emit('COMBO_LEVEL_UP', {
                newLevel: this.getComboName(),
                streak: this.state.currentStreak
            }, 'XPEngine');
        }

        // Check for streak milestones
        if (STREAK_MILESTONES.includes(this.state.currentStreak)) {
            this.awardStreakMilestone(this.state.currentStreak);
        }

        this.notify(event);

        return event;
    }

    /**
     * Record an incorrect answer
     */
    public recordIncorrect(): XPEvent {
        const lostStreak = this.state.currentStreak;
        this.state.currentStreak = 0;
        this.state.comboLevel = 0;
        this.state.incorrectCount++;

        const event: XPEvent = {
            type: 'INCORRECT',
            baseXP: 0,
            multiplier: 1,
            totalXP: 0,
            streak: lostStreak,
            timestamp: Date.now()
        };

        this.eventHistory.push(event);

        // 🚌 EMIT TO GLOBAL BUS
        eventBus.emit('DECISION_INCORRECT', {
            lostStreak
        }, 'XPEngine');

        if (lostStreak >= 3) {
            eventBus.emit('STREAK_LOST', {
                lostStreak
            }, 'XPEngine');
        }

        this.notify(event);

        return event;
    }

    /**
     * Award streak milestone bonus
     */
    private awardStreakMilestone(streak: number): void {
        const bonusMap: Record<number, number> = {
            5: XP_BASE.STREAK_5,
            10: XP_BASE.STREAK_10,
            25: XP_BASE.STREAK_25,
            50: XP_BASE.STREAK_50,
            100: XP_BASE.STREAK_100
        };
        const bonus = bonusMap[streak] || 0;

        if (bonus > 0) {
            this.state.sessionXP += bonus;
            this.state.totalXP += bonus;

            const event: XPEvent = {
                type: 'STREAK_BONUS',
                baseXP: bonus,
                multiplier: 1,
                totalXP: bonus,
                streak: streak,
                timestamp: Date.now()
            };

            this.eventHistory.push(event);

            // 🚌 EMIT STREAK MILESTONE
            eventBus.emit('STREAK_MILESTONE', {
                streak,
                bonusXP: bonus
            }, 'XPEngine');

            eventBus.emit('XP_BONUS', {
                amount: bonus,
                reason: `${streak} STREAK!`
            }, 'XPEngine');

            this.notify(event);
        }
    }

    /**
     * Get current state
     */
    public getState(): XPState {
        return { ...this.state };
    }

    /**
     * Get current combo level name
     */
    public getComboName(): ComboLevel {
        return COMBO_NAMES[this.state.comboLevel] || 'NORMAL';
    }

    /**
     * Get streak multiplier
     */
    public getMultiplier(): number {
        return STREAK_MULTIPLIER(this.state.currentStreak);
    }

    /**
     * Get accuracy percentage
     */
    public getAccuracy(): number {
        const total = this.state.correctCount + this.state.incorrectCount;
        if (total === 0) return 0;
        return Math.round((this.state.correctCount / total) * 100);
    }

    /**
     * Subscribe to XP events
     */
    public subscribe(listener: (state: XPState, event: XPEvent) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(event: XPEvent): void {
        this.listeners.forEach(l => l(this.state, event));
    }

    /**
     * Reset session (not total XP)
     */
    public resetSession(): void {
        this.state.sessionXP = 0;
        this.state.currentStreak = 0;
        this.state.maxStreak = 0;
        this.state.correctCount = 0;
        this.state.incorrectCount = 0;
        this.state.comboLevel = 0;
        this.previousComboLevel = 0;
        this.eventHistory = [];

        eventBus.emit('SESSION_START', {}, 'XPEngine');
    }

    /**
     * End session
     */
    public endSession(): void {
        eventBus.emit('SESSION_END', {
            accuracy: this.getAccuracy(),
            totalXP: this.state.sessionXP,
            maxStreak: this.state.maxStreak,
            handsPlayed: this.state.correctCount + this.state.incorrectCount
        }, 'XPEngine');
    }
}

// Singleton
export const xpEngine = new XPEngine();
