/**
 * 💎 DIAMOND ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * The Premium Currency System for PokerIQ.
 * 
 * HARD LAWS:
 * - Diamonds are earned through mastery achievements
 * - 25% burn on marketplace transfers
 * - Streak bonuses increase diamond rewards
 * - Diamonds can unlock premium content
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { eventBus, busEmit } from './EventBus';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// 💎 DIAMOND REWARD VALUES
const DIAMOND_REWARDS = {
    // Level completion (by tier)
    LEVEL_COMPLETE_BEGINNER: 0,
    LEVEL_COMPLETE_STANDARD: 5,
    LEVEL_COMPLETE_INTERMEDIATE: 10,
    LEVEL_COMPLETE_ADVANCED: 15,
    LEVEL_COMPLETE_ELITE: 25,
    LEVEL_COMPLETE_BOSS: 50,

    // Streak milestones
    STREAK_5: 2,
    STREAK_10: 5,
    STREAK_25: 15,
    STREAK_50: 50,
    STREAK_100: 200,

    // Perfect session (100% accuracy)
    PERFECT_SESSION: 25,

    // Daily login
    DAILY_LOGIN: 1,

    // First mastery of a game
    FIRST_MASTERY: 100,
};

export interface DiamondTransaction {
    id?: string;
    userId: string;
    amount: number;
    type: 'EARN' | 'SPEND' | 'BURN';
    reason: string;
    metadata?: Record<string, any>;
    timestamp: number;
}

export interface DiamondState {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalBurned: number;
    pendingRewards: number;
}

class DiamondEngine {
    private state: DiamondState;
    private listeners: ((state: DiamondState) => void)[] = [];
    private transactionHistory: DiamondTransaction[] = [];

    constructor() {
        this.state = {
            balance: 0,
            totalEarned: 0,
            totalSpent: 0,
            totalBurned: 0,
            pendingRewards: 0
        };

        this.setupEventListeners();
    }

    /**
     * Listen to game events and award diamonds
     */
    private setupEventListeners(): void {
        // Streak milestones
        eventBus.on('STREAK_MILESTONE', (event) => {
            const streak = event.payload.streak;
            if (streak === 5) this.awardDiamonds(DIAMOND_REWARDS.STREAK_5, 'STREAK_5', { streak });
            if (streak === 10) this.awardDiamonds(DIAMOND_REWARDS.STREAK_10, 'STREAK_10', { streak });
            if (streak === 25) this.awardDiamonds(DIAMOND_REWARDS.STREAK_25, 'STREAK_25', { streak });
            if (streak === 50) this.awardDiamonds(DIAMOND_REWARDS.STREAK_50, 'STREAK_50', { streak });
            if (streak === 100) this.awardDiamonds(DIAMOND_REWARDS.STREAK_100, 'STREAK_100', { streak });
        });

        // Level completion
        eventBus.on('LEVEL_UNLOCKED', (event) => {
            const tier = event.payload.tier;
            const tierRewards: Record<string, number> = {
                'BEGINNER': DIAMOND_REWARDS.LEVEL_COMPLETE_BEGINNER,
                'STANDARD': DIAMOND_REWARDS.LEVEL_COMPLETE_STANDARD,
                'INTERMEDIATE': DIAMOND_REWARDS.LEVEL_COMPLETE_INTERMEDIATE,
                'ADVANCED': DIAMOND_REWARDS.LEVEL_COMPLETE_ADVANCED,
                'ELITE': DIAMOND_REWARDS.LEVEL_COMPLETE_ELITE,
                'BOSS': DIAMOND_REWARDS.LEVEL_COMPLETE_BOSS
            };
            const reward = tierRewards[tier] || 0;
            if (reward > 0) {
                this.awardDiamonds(reward, 'LEVEL_COMPLETE', { tier, level: event.payload.level });
            }
        });

        // Mastery achieved
        eventBus.on('MASTERY_ACHIEVED', (event) => {
            if (event.payload.isFirstTime) {
                this.awardDiamonds(DIAMOND_REWARDS.FIRST_MASTERY, 'FIRST_MASTERY', { gameId: event.payload.gameId });
            }
        });

        // Perfect session
        eventBus.on('SESSION_END', (event) => {
            if (event.payload.accuracy === 100) {
                this.awardDiamonds(DIAMOND_REWARDS.PERFECT_SESSION, 'PERFECT_SESSION', {
                    gameId: event.payload.gameId,
                    handsPlayed: event.payload.handsPlayed
                });
            }
        });
    }

    /**
     * Award diamonds to user
     */
    async awardDiamonds(amount: number, reason: string, metadata?: Record<string, any>): Promise<void> {
        if (amount <= 0) return;

        this.state.balance += amount;
        this.state.totalEarned += amount;

        const transaction: DiamondTransaction = {
            userId: 'local', // Will be replaced with actual user ID
            amount,
            type: 'EARN',
            reason,
            metadata,
            timestamp: Date.now()
        };

        this.transactionHistory.unshift(transaction);

        // Emit event for UI celebration
        busEmit.diamondsEarned(amount, reason);
        busEmit.celebration('diamonds');

        // Persist to Supabase
        await this.persistTransaction(transaction);

        this.notify();
    }

    /**
     * Spend diamonds
     */
    async spendDiamonds(amount: number, reason: string, metadata?: Record<string, any>): Promise<boolean> {
        if (amount > this.state.balance) {
            console.error('Insufficient diamond balance');
            return false;
        }

        this.state.balance -= amount;
        this.state.totalSpent += amount;

        const transaction: DiamondTransaction = {
            userId: 'local',
            amount,
            type: 'SPEND',
            reason,
            metadata,
            timestamp: Date.now()
        };

        this.transactionHistory.unshift(transaction);

        eventBus.emit('DIAMONDS_SPENT', { amount, reason }, 'DiamondEngine');

        await this.persistTransaction(transaction);

        this.notify();
        return true;
    }

    /**
     * Burn diamonds (25% marketplace tax)
     */
    async burnDiamonds(amount: number): Promise<void> {
        const burnAmount = Math.ceil(amount * 0.25);
        this.state.totalBurned += burnAmount;

        const transaction: DiamondTransaction = {
            userId: 'local',
            amount: burnAmount,
            type: 'BURN',
            reason: 'MARKETPLACE_TAX',
            timestamp: Date.now()
        };

        this.transactionHistory.unshift(transaction);
        await this.persistTransaction(transaction);

        this.notify();
    }

    /**
     * Persist to Supabase
     */
    private async persistTransaction(transaction: DiamondTransaction): Promise<void> {
        if (!supabase) return;

        // This would insert into a diamond_ledger table
        // For now, we'll just log it
        console.log('💎 Diamond Transaction:', transaction);
    }

    /**
     * Load user's diamond balance
     */
    async loadBalance(userId: string): Promise<void> {
        if (!supabase) return;

        const { data, error } = await supabase
            .from('diamond_ledger')
            .select('amount, type')
            .eq('user_id', userId);

        if (!error && data) {
            let balance = 0;
            let earned = 0;
            let spent = 0;
            let burned = 0;

            data.forEach(tx => {
                if (tx.type === 'EARN') {
                    balance += tx.amount;
                    earned += tx.amount;
                } else if (tx.type === 'SPEND') {
                    balance -= tx.amount;
                    spent += tx.amount;
                } else if (tx.type === 'BURN') {
                    burned += tx.amount;
                }
            });

            this.state = { balance, totalEarned: earned, totalSpent: spent, totalBurned: burned, pendingRewards: 0 };
            this.notify();
        }
    }

    /**
     * Get current state
     */
    getState(): DiamondState {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: (state: DiamondState) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify(): void {
        this.listeners.forEach(l => l(this.state));
    }

    /**
     * Get transaction history
     */
    getHistory(limit: number = 20): DiamondTransaction[] {
        return this.transactionHistory.slice(0, limit);
    }
}

// Singleton
export const diamondEngine = new DiamondEngine();
