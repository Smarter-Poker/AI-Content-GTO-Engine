/**
 * 🗄️ TRAINING SERVICE — Supabase API Integration
 * ═══════════════════════════════════════════════════════════════════════════
 * Connects TrainingArena to Supabase stored procedures.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface Question {
    question_id: string;
    level_id: number;
    concept_category: string;
    title: string;
    description?: string;
    scenario_context: Record<string, any>;
    hero_cards: string[];
    board_cards: string[];
    pot_size: number;
    effective_stack: number;
    position: string;
    street: string;
    gto_line: Record<string, any>;
    alternate_lines: Record<string, any>[];
    available_actions: string[];
    correct_action: string;
}

export interface AnswerResult {
    is_correct: boolean;
    correct_action: string;
    gto_line: Record<string, any>;
    alternate_lines: Record<string, any>[];
    ev_earned: number;
    ev_lost: number;
    xp_earned: number;
    diamonds_earned: number;
    is_leak_signal: boolean;
    concept_category: string;
}

export interface SessionResult {
    mastery_achieved: boolean;
    accuracy: number;
    threshold: number;
    next_level_unlocked?: number;
    bonus_diamonds?: number;
    message: string;
}

export class TrainingService {
    constructor(private supabase: SupabaseClient) { }

    /**
     * Create a new training session
     */
    async createSession(
        userId: string,
        levelId: number,
        gameType: 'cash' | 'tournament' = 'cash',
        questionCount: number = 20
    ): Promise<string> {
        const { data, error } = await this.supabase.rpc('fn_create_training_session', {
            p_user_id: userId,
            p_level_id: levelId,
            p_game_type: gameType,
            p_question_count: questionCount
        });

        if (error) throw new Error(`Failed to create session: ${error.message}`);
        return data as string;
    }

    /**
     * Get unseen questions for a level (anti-repeat algorithm)
     */
    async getUnseenQuestions(
        userId: string,
        levelId: number,
        gameType: 'cash' | 'tournament' = 'cash',
        count: number = 20
    ): Promise<Question[]> {
        const { data, error } = await this.supabase.rpc('fn_get_unseen_questions', {
            p_user_id: userId,
            p_target_level: levelId,
            p_game_type: gameType,
            p_count: count
        });

        if (error) throw new Error(`Failed to get questions: ${error.message}`);
        return (data as Question[]) || [];
    }

    /**
     * Record an answer and get feedback
     */
    async recordAnswer(
        userId: string,
        questionId: string,
        sessionId: string,
        userAction: string,
        responseTimeMs?: number
    ): Promise<AnswerResult> {
        const { data, error } = await this.supabase.rpc('fn_record_answer', {
            p_user_id: userId,
            p_question_id: questionId,
            p_session_id: sessionId,
            p_user_action: userAction,
            p_response_time_ms: responseTimeMs || null
        });

        if (error) throw new Error(`Failed to record answer: ${error.message}`);
        return data as AnswerResult;
    }

    /**
     * Check for level advancement after session completion
     */
    async checkLevelAdvancement(sessionId: string): Promise<SessionResult> {
        const { data, error } = await this.supabase.rpc('fn_check_level_advancement', {
            p_session_id: sessionId
        });

        if (error) throw new Error(`Failed to check advancement: ${error.message}`);
        return data as SessionResult;
    }

    /**
     * Get session details
     */
    async getSession(sessionId: string) {
        const { data, error } = await this.supabase
            .from('training_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw new Error(`Failed to get session: ${error.message}`);
        return data;
    }

    /**
     * Get user's question history for leak analysis
     */
    async getLeakAnalysis(userId: string, sessionId: string): Promise<Record<string, number>> {
        const { data, error } = await this.supabase
            .from('user_question_history')
            .select('concept_category, is_correct')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .eq('is_correct', false);

        if (error) throw new Error(`Failed to get leak analysis: ${error.message}`);

        // Count misses per category
        const leaks: Record<string, number> = {};
        (data || []).forEach(row => {
            leaks[row.concept_category] = (leaks[row.concept_category] || 0) + 1;
        });

        return leaks;
    }

    /**
     * Get user's progress summary
     */
    async getUserProgress(userId: string) {
        const { data, error } = await this.supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error(`Failed to get user progress: ${error.message}`);
        }

        return data;
    }

    /**
     * Get recent sessions for a user
     */
    async getRecentSessions(userId: string, limit: number = 10) {
        const { data, error } = await this.supabase
            .from('training_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(`Failed to get sessions: ${error.message}`);
        return data || [];
    }
}

/**
 * Hook factory for TrainingService
 */
export const createTrainingService = (supabase: SupabaseClient) => {
    return new TrainingService(supabase);
};

export default TrainingService;
