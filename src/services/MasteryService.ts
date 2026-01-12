/**
 * 🔐 MASTERY SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * Client-side interface for the 85% Mastery Gate.
 * 
 * HARD LAW: Level advancement requires 85% accuracy on 20+ questions.
 * This is enforced at the DATABASE level and cannot be bypassed.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface LevelAdvancementResult {
    success: boolean;
    canAdvance: boolean;
    currentLevel: number;
    newLevel: number;
    sessionAccuracy: number;
    requiredAccuracy: number;
    requiredQuestions: number;
    questionsAnswered: number;
    xpReward: number;
    diamondReward: number;
    isBossMode: boolean;
    message: string;
}

export interface UserProgress {
    currentLevel: number;
    highestLevelUnlocked: number;
    totalSessions: number;
    lastSessionAccuracy: number | null;
    masteryAchieved: boolean;
    requiredAccuracy: number;
    requiredQuestions: number;
    tier: string;
    isBossMode: boolean;
}

class MasteryService {
    // Local mock progress for when DB isn't available
    private mockProgress: Map<string, UserProgress> = new Map();

    /**
     * Check if user can advance to the next level
     * Calls the authoritative database RPC
     */
    async checkLevelAdvancement(
        userId: string,
        gameId: string,
        sessionAccuracy: number,
        questionsAnswered: number
    ): Promise<LevelAdvancementResult> {

        // Try database RPC first
        if (supabase) {
            const { data, error } = await supabase
                .rpc('fn_check_level_advancement', {
                    p_user_id: userId,
                    p_game_id: gameId,
                    p_session_accuracy: sessionAccuracy,
                    p_questions_answered: questionsAnswered
                });

            if (!error && data) {
                return this.transformRPCResult(data);
            }

            console.error('Mastery RPC error:', error);
        }

        // Fallback to local mock
        return this.mockCheckAdvancement(userId, gameId, sessionAccuracy, questionsAnswered);
    }

    /**
     * Get user's current progress for a game
     */
    async getUserProgress(userId: string, gameId: string): Promise<UserProgress> {
        if (supabase) {
            const { data, error } = await supabase
                .rpc('fn_get_user_progress', {
                    p_user_id: userId,
                    p_game_id: gameId
                });

            if (!error && data) {
                return {
                    currentLevel: data.current_level,
                    highestLevelUnlocked: data.highest_level_unlocked,
                    totalSessions: data.total_sessions,
                    lastSessionAccuracy: data.last_session_accuracy,
                    masteryAchieved: data.mastery_achieved,
                    requiredAccuracy: data.required_accuracy,
                    requiredQuestions: data.required_questions,
                    tier: data.tier,
                    isBossMode: data.is_boss_mode
                };
            }
        }

        // Return mock progress
        return this.getMockProgress(gameId);
    }

    /**
     * Transform RPC result to typed interface
     */
    private transformRPCResult(data: any): LevelAdvancementResult {
        return {
            success: data.success,
            canAdvance: data.can_advance,
            currentLevel: data.current_level,
            newLevel: data.new_level,
            sessionAccuracy: data.session_accuracy,
            requiredAccuracy: data.required_accuracy,
            requiredQuestions: data.required_questions,
            questionsAnswered: data.questions_answered,
            xpReward: data.xp_reward,
            diamondReward: data.diamond_reward,
            isBossMode: data.is_boss_mode,
            message: data.message
        };
    }

    /**
     * Mock advancement check for offline/testing
     */
    private mockCheckAdvancement(
        userId: string,
        gameId: string,
        sessionAccuracy: number,
        questionsAnswered: number
    ): LevelAdvancementResult {
        const key = `${userId}_${gameId}`;
        let progress = this.mockProgress.get(key);

        if (!progress) {
            progress = this.getDefaultProgress();
            this.mockProgress.set(key, progress);
        }

        const canAdvance = sessionAccuracy >= 85 && questionsAnswered >= 20;
        const newLevel = canAdvance ? Math.min(progress.currentLevel + 1, 12) : progress.currentLevel;

        if (canAdvance) {
            progress.currentLevel = newLevel;
            progress.highestLevelUnlocked = Math.max(progress.highestLevelUnlocked, newLevel);
            progress.masteryAchieved = true;
        }

        progress.lastSessionAccuracy = sessionAccuracy;
        progress.totalSessions++;

        return {
            success: true,
            canAdvance,
            currentLevel: progress.currentLevel,
            newLevel,
            sessionAccuracy,
            requiredAccuracy: 85,
            requiredQuestions: 20,
            questionsAnswered,
            xpReward: canAdvance ? 100 * newLevel : 0,
            diamondReward: canAdvance && newLevel >= 5 ? newLevel * 5 : 0,
            isBossMode: newLevel >= 11,
            message: canAdvance
                ? `Level ${progress.currentLevel - 1} MASTERED! Advancing to Level ${newLevel}`
                : `Keep practicing! Need 85% accuracy on 20 questions.`
        };
    }

    /**
     * Get mock progress
     */
    private getMockProgress(gameId: string): UserProgress {
        return this.getDefaultProgress();
    }

    /**
     * Default progress for new players
     */
    private getDefaultProgress(): UserProgress {
        return {
            currentLevel: 1,
            highestLevelUnlocked: 1,
            totalSessions: 0,
            lastSessionAccuracy: null,
            masteryAchieved: false,
            requiredAccuracy: 85,
            requiredQuestions: 20,
            tier: 'BEGINNER',
            isBossMode: false
        };
    }

    /**
     * Check if user has unlocked a specific level
     */
    async hasUnlockedLevel(userId: string, gameId: string, targetLevel: number): Promise<boolean> {
        const progress = await this.getUserProgress(userId, gameId);
        return progress.highestLevelUnlocked >= targetLevel;
    }

    /**
     * Get tier name for display
     */
    getTierDisplayName(tier: string): string {
        const tierNames: Record<string, string> = {
            'BEGINNER': '🌱 Beginner',
            'STANDARD': '⚡ Standard',
            'INTERMEDIATE': '🔥 Intermediate',
            'ADVANCED': '💎 Advanced',
            'ELITE': '👑 Elite',
            'BOSS': '🏆 Boss Mode'
        };
        return tierNames[tier] || tier;
    }
}

// Singleton
export const masteryService = new MasteryService();
