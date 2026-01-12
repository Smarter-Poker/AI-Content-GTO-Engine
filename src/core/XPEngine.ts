/**
 * 🏆 XP ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * The "Addiction" Core. Makes every action FEEL rewarding.
 * 
 * Laws:
 * - XP CAN NEVER BE LOST (Immutable)
 * - Streak multipliers reward consistency
 * - Combo bonuses for consecutive correct answers
 * ═══════════════════════════════════════════════════════════════════════════
 */

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
    comboLevel: number; // 1-5 (Normal, Good, Great, Excellent, Perfect)
}

// 🎯 XP VALUES
const XP_BASE = {
    CORRECT: 100,
    INCORRECT: 0, // No penalty, but no reward
    STREAK_3: 150, // Bonus at 3 streak
    STREAK_5: 300, // Bonus at 5 streak
    STREAK_10: 500, // Bonus at 10 streak
    LEVEL_COMPLETE: 1000,
};

// 🔥 STREAK MULTIPLIERS
const STREAK_MULTIPLIER = (streak: number): number => {
    if (streak >= 10) return 2.5;
    if (streak >= 7) return 2.0;
    if (streak >= 5) return 1.75;
    if (streak >= 3) return 1.5;
    return 1.0;
};

// 🎮 COMBO LEVELS
const COMBO_THRESHOLDS = [0, 3, 5, 7, 10];
const COMBO_NAMES = ['NORMAL', 'GOOD', 'GREAT', 'EXCELLENT', 'PERFECT'] as const;

export type ComboLevel = typeof COMBO_NAMES[number];

export class XPEngine {
    private state: XPState;
    private listeners: ((state: XPState, event: XPEvent) => void)[] = [];
    private eventHistory: XPEvent[] = [];

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
        this.notify(event);

        // Check for streak bonuses
        if (this.state.currentStreak === 3) this.awardStreakBonus(3);
        if (this.state.currentStreak === 5) this.awardStreakBonus(5);
        if (this.state.currentStreak === 10) this.awardStreakBonus(10);

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
        this.notify(event);

        return event;
    }

    private awardStreakBonus(streakLevel: 3 | 5 | 10): void {
        const bonusMap = { 3: XP_BASE.STREAK_3, 5: XP_BASE.STREAK_5, 10: XP_BASE.STREAK_10 };
        const bonus = bonusMap[streakLevel];

        this.state.sessionXP += bonus;
        this.state.totalXP += bonus;

        const event: XPEvent = {
            type: 'STREAK_BONUS',
            baseXP: bonus,
            multiplier: 1,
            totalXP: bonus,
            streak: streakLevel,
            timestamp: Date.now()
        };

        this.eventHistory.push(event);
        this.notify(event);
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
        this.eventHistory = [];
    }
}

// Singleton
export const xpEngine = new XPEngine();
