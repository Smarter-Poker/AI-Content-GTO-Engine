/**
 * 📊 TRAINING SESSION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * Persists training sessions to Supabase.
 * 
 * Features:
 * - Create/end session tracking
 * - Save individual hand results  
 * - Track XP earned per session
 * - Record leak signals for analysis
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client (uses env vars)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface TrainingSession {
    id?: string;
    user_id: string;
    game_id: string;
    game_name: string;
    started_at: string;
    ended_at?: string;
    total_hands: number;
    correct_hands: number;
    accuracy: number;
    max_streak: number;
    xp_earned: number;
    mastery_achieved: boolean;
    leak_signals: string[];
}

export interface HandResult {
    session_id: string;
    hand_number: number;
    hero_cards: [string, string];
    board: string[];
    hero_action: string;
    gto_action: string;
    is_correct: boolean;
    ev_loss: number;
    streak_at_time: number;
    xp_earned: number;
    timestamp: string;
}

class SessionService {
    private currentSession: TrainingSession | null = null;
    private handResults: HandResult[] = [];

    /**
     * Start a new training session
     */
    async startSession(userId: string, gameId: string, gameName: string): Promise<TrainingSession> {
        const session: TrainingSession = {
            user_id: userId,
            game_id: gameId,
            game_name: gameName,
            started_at: new Date().toISOString(),
            total_hands: 0,
            correct_hands: 0,
            accuracy: 0,
            max_streak: 0,
            xp_earned: 0,
            mastery_achieved: false,
            leak_signals: []
        };

        // Persist to Supabase if available
        if (supabase) {
            const { data, error } = await supabase
                .from('training_sessions')
                .insert(session)
                .select()
                .single();

            if (error) {
                console.error('Error starting session:', error);
            } else if (data) {
                session.id = data.id;
            }
        } else {
            // Local mock ID
            session.id = `local_${Date.now()}`;
        }

        this.currentSession = session;
        this.handResults = [];

        return session;
    }

    /**
     * Record a hand result
     */
    recordHand(result: Omit<HandResult, 'session_id' | 'hand_number' | 'timestamp'>): HandResult | null {
        if (!this.currentSession) {
            console.error('No active session');
            return null;
        }

        const handResult: HandResult = {
            ...result,
            session_id: this.currentSession.id!,
            hand_number: this.handResults.length + 1,
            timestamp: new Date().toISOString()
        };

        this.handResults.push(handResult);

        // Update session stats
        this.currentSession.total_hands++;
        if (result.is_correct) {
            this.currentSession.correct_hands++;
        }
        this.currentSession.accuracy = Math.round(
            (this.currentSession.correct_hands / this.currentSession.total_hands) * 100
        );
        this.currentSession.xp_earned += result.xp_earned;
        if (result.streak_at_time > this.currentSession.max_streak) {
            this.currentSession.max_streak = result.streak_at_time;
        }

        // Detect leak signals (mock logic)
        if (!result.is_correct && result.ev_loss > 1.0) {
            const leakType = this.detectLeakType(result);
            if (leakType && !this.currentSession.leak_signals.includes(leakType)) {
                this.currentSession.leak_signals.push(leakType);
            }
        }

        return handResult;
    }

    /**
     * End the current session
     */
    async endSession(): Promise<TrainingSession | null> {
        if (!this.currentSession) return null;

        this.currentSession.ended_at = new Date().toISOString();
        this.currentSession.mastery_achieved = this.currentSession.accuracy >= 85;

        // Persist final session to Supabase
        if (supabase && this.currentSession.id && !this.currentSession.id.startsWith('local_')) {
            const { error } = await supabase
                .from('training_sessions')
                .update({
                    ended_at: this.currentSession.ended_at,
                    total_hands: this.currentSession.total_hands,
                    correct_hands: this.currentSession.correct_hands,
                    accuracy: this.currentSession.accuracy,
                    max_streak: this.currentSession.max_streak,
                    xp_earned: this.currentSession.xp_earned,
                    mastery_achieved: this.currentSession.mastery_achieved,
                    leak_signals: this.currentSession.leak_signals
                })
                .eq('id', this.currentSession.id);

            if (error) {
                console.error('Error ending session:', error);
            }

            // Also save hand results
            if (this.handResults.length > 0) {
                const { error: handError } = await supabase
                    .from('hand_results')
                    .insert(this.handResults);

                if (handError) {
                    console.error('Error saving hand results:', handError);
                }
            }
        }

        const completedSession = this.currentSession;
        this.currentSession = null;
        this.handResults = [];

        return completedSession;
    }

    /**
     * Get current session
     */
    getCurrentSession(): TrainingSession | null {
        return this.currentSession;
    }

    /**
     * Detect leak type from result (mock implementation)
     */
    private detectLeakType(result: Omit<HandResult, 'session_id' | 'hand_number' | 'timestamp'>): string | null {
        // Simple heuristic leak detection
        if (result.hero_action === 'FOLD' && result.gto_action !== 'FOLD') {
            return 'OVER_FOLDING';
        }
        if (result.hero_action === 'CALL' && result.gto_action === 'RAISE') {
            return 'PASSIVE_PLAY';
        }
        if (result.hero_action === 'RAISE' && result.gto_action === 'FOLD') {
            return 'OVER_AGGRESSION';
        }
        return null;
    }
}

// Singleton
export const sessionService = new SessionService();
