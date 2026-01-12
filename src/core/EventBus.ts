/**
 * 🚌 GLOBAL EVENT BUS
 * ═══════════════════════════════════════════════════════════════════════════
 * The Central Nervous System of PokerIQ.
 * 
 * All engines, services, and components communicate through this bus.
 * This enables loose coupling and real-time reactivity across the system.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type EventType =
    // XP Events
    | 'XP_EARNED'
    | 'XP_BONUS'
    | 'STREAK_MILESTONE'
    | 'STREAK_LOST'
    | 'COMBO_LEVEL_UP'

    // Diamond Events
    | 'DIAMONDS_EARNED'
    | 'DIAMONDS_SPENT'
    | 'DIAMOND_CELEBRATION'

    // Game Events
    | 'DECISION_CORRECT'
    | 'DECISION_INCORRECT'
    | 'HAND_COMPLETE'
    | 'SESSION_START'
    | 'SESSION_END'

    // Level Events
    | 'LEVEL_UNLOCKED'
    | 'MASTERY_ACHIEVED'
    | 'BOSS_MODE_ENTERED'

    // Pressure Events
    | 'TIMER_WARNING'
    | 'TIMER_CRITICAL'
    | 'TIMER_EXPIRED'
    | 'PRESSURE_INCREASED'

    // UI Events
    | 'SCREEN_SHAKE'
    | 'SCREEN_FLASH'
    | 'CELEBRATION_TRIGGER'
    | 'SOUND_PLAY';

export interface BusEvent<T = any> {
    type: EventType;
    payload: T;
    timestamp: number;
    source: string;
}

type EventCallback<T = any> = (event: BusEvent<T>) => void;

class GlobalEventBus {
    private listeners: Map<EventType, Set<EventCallback>> = new Map();
    private history: BusEvent[] = [];
    private maxHistory: number = 100;

    /**
     * Subscribe to an event type
     */
    on<T = any>(eventType: EventType, callback: EventCallback<T>): () => void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType)!.add(callback as EventCallback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(eventType)?.delete(callback as EventCallback);
        };
    }

    /**
     * Emit an event
     */
    emit<T = any>(eventType: EventType, payload: T, source: string = 'system'): void {
        const event: BusEvent<T> = {
            type: eventType,
            payload,
            timestamp: Date.now(),
            source
        };

        // Store in history
        this.history.unshift(event);
        if (this.history.length > this.maxHistory) {
            this.history.pop();
        }

        // Notify listeners
        const callbacks = this.listeners.get(eventType);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    console.error(`Event bus error for ${eventType}:`, error);
                }
            });
        }

        // Debug logging in development
        if (import.meta.env.DEV) {
            console.log(`🚌 [BUS] ${eventType}`, payload);
        }
    }

    /**
     * Subscribe to multiple event types
     */
    onMany(eventTypes: EventType[], callback: EventCallback): () => void {
        const unsubscribes = eventTypes.map(type => this.on(type, callback));
        return () => unsubscribes.forEach(unsub => unsub());
    }

    /**
     * Get recent events
     */
    getHistory(limit: number = 10): BusEvent[] {
        return this.history.slice(0, limit);
    }

    /**
     * Clear all listeners (for cleanup)
     */
    clear(): void {
        this.listeners.clear();
        this.history = [];
    }
}

// Singleton
export const eventBus = new GlobalEventBus();

// Convenience emit functions for common events
export const busEmit = {
    xpEarned: (amount: number, source: string) =>
        eventBus.emit('XP_EARNED', { amount, source }, 'XPEngine'),

    diamondsEarned: (amount: number, reason: string) =>
        eventBus.emit('DIAMONDS_EARNED', { amount, reason }, 'DiamondEngine'),

    decisionCorrect: (xp: number, streak: number) =>
        eventBus.emit('DECISION_CORRECT', { xp, streak }, 'TrainingArena'),

    decisionIncorrect: (lostStreak: number) =>
        eventBus.emit('DECISION_INCORRECT', { lostStreak }, 'TrainingArena'),

    screenShake: (intensity: 'light' | 'medium' | 'heavy' = 'medium') =>
        eventBus.emit('SCREEN_SHAKE', { intensity }, 'Effects'),

    screenFlash: (color: string, duration: number = 200) =>
        eventBus.emit('SCREEN_FLASH', { color, duration }, 'Effects'),

    celebration: (type: 'streak' | 'level' | 'mastery' | 'diamonds') =>
        eventBus.emit('CELEBRATION_TRIGGER', { type }, 'Celebration'),

    playSound: (sound: string) =>
        eventBus.emit('SOUND_PLAY', { sound }, 'Audio'),

    timerWarning: () =>
        eventBus.emit('TIMER_WARNING', {}, 'PressureTimer'),

    timerCritical: () =>
        eventBus.emit('TIMER_CRITICAL', {}, 'PressureTimer'),

    timerExpired: () =>
        eventBus.emit('TIMER_EXPIRED', {}, 'PressureTimer')
};
