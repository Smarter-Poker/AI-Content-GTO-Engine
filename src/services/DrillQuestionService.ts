/**
 * 🎯 DRILL QUESTION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * Fetches GTO training scenarios from the database.
 * 
 * Features:
 * - Never-repeat logic (tracks seen questions)
 * - Level-appropriate difficulty
 * - Category filtering
 * - Fallback to mock scenarios when DB unavailable
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface ActionOption {
    action: string;      // 'FOLD', 'CALL', 'RAISE 5.5bb'
    ev: number;          // Expected value in BB
    frequency: number;   // 0-100 (GTO frequency)
    isGTO: boolean;      // Is this the optimal play?
}

export interface DrillQuestion {
    id: string;
    gameId: string;
    level: number;
    heroPosition: string;          // 'BTN', 'BB', 'UTG', etc.
    villainPosition: string;       // 'CO', 'SB', etc.
    heroCards: [string, string];   // ['Ah', 'Kd']
    board: string[];               // ['Qs', 'Jh', 'Tc']
    street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER';
    pot: number;                   // In BB
    facing: string;                // 'RAISE 2.5bb', 'CHECK', etc.
    stackDepth: number;            // Effective stack in BB
    actions: ActionOption[];       // Available actions with EV
    explanation: string;           // Why GTO line is optimal
    conceptCategory: string;       // 'C-Betting', 'Blind Defense', etc.
}

// Mock scenarios for when DB isn't available
const MOCK_SCENARIOS: DrillQuestion[] = [
    {
        id: 'mock_1',
        gameId: 'cash_01',
        level: 1,
        heroPosition: 'BTN',
        villainPosition: 'CO',
        heroCards: ['Ah', 'Kd'],
        board: [],
        street: 'PREFLOP',
        pot: 2.5,
        facing: 'RAISE 2.5bb',
        stackDepth: 100,
        actions: [
            { action: 'FOLD', ev: 0, frequency: 0, isGTO: false },
            { action: 'CALL', ev: 0.8, frequency: 35, isGTO: false },
            { action: 'RAISE 7.5bb', ev: 1.2, frequency: 65, isGTO: true }
        ],
        explanation: 'AKo is a premium hand that plays best as a 3-bet for value and to build the pot in position.',
        conceptCategory: '3-Betting'
    },
    {
        id: 'mock_2',
        gameId: 'cash_01',
        level: 1,
        heroPosition: 'BB',
        villainPosition: 'BTN',
        heroCards: ['9s', '8s'],
        board: [],
        street: 'PREFLOP',
        pot: 2.5,
        facing: 'RAISE 2.5bb',
        stackDepth: 100,
        actions: [
            { action: 'FOLD', ev: -0.5, frequency: 30, isGTO: false },
            { action: 'CALL', ev: 0.1, frequency: 55, isGTO: true },
            { action: 'RAISE 8bb', ev: -0.2, frequency: 15, isGTO: false }
        ],
        explanation: 'Suited connectors play well postflop with position disadvantage offset by pot odds and implied odds.',
        conceptCategory: 'Blind Defense'
    },
    {
        id: 'mock_3',
        gameId: 'cash_01',
        level: 2,
        heroPosition: 'BTN',
        villainPosition: 'BB',
        heroCards: ['Qs', 'Jh'],
        board: ['Kd', '7c', '2s'],
        street: 'FLOP',
        pot: 6.5,
        facing: 'CHECK',
        stackDepth: 97,
        actions: [
            { action: 'CHECK', ev: 0.3, frequency: 45, isGTO: false },
            { action: 'BET 3bb', ev: 0.8, frequency: 55, isGTO: true }
        ],
        explanation: 'As the preflop aggressor, we c-bet this dry board with our overcards and gutshot for value and fold equity.',
        conceptCategory: 'C-Betting'
    },
    {
        id: 'mock_4',
        gameId: 'mtt_01',
        level: 1,
        heroPosition: 'BTN',
        villainPosition: 'BB',
        heroCards: ['As', '5s'],
        board: [],
        street: 'PREFLOP',
        pot: 1.5,
        facing: 'FOLD to Hero',
        stackDepth: 15,
        actions: [
            { action: 'FOLD', ev: 0, frequency: 0, isGTO: false },
            { action: 'RAISE 2bb', ev: 0.3, frequency: 20, isGTO: false },
            { action: 'ALL-IN 15bb', ev: 0.8, frequency: 80, isGTO: true }
        ],
        explanation: 'At 15bb effective, A5s is a clear shove from the button. We have fold equity plus a live hand if called.',
        conceptCategory: 'Push/Fold'
    },
    {
        id: 'mock_5',
        gameId: 'cash_01',
        level: 3,
        heroPosition: 'BB',
        villainPosition: 'BTN',
        heroCards: ['Th', 'Tc'],
        board: ['8s', '6c', '3d', 'Kh'],
        street: 'TURN',
        pot: 12,
        facing: 'BET 8bb',
        stackDepth: 80,
        actions: [
            { action: 'FOLD', ev: -4, frequency: 0, isGTO: false },
            { action: 'CALL', ev: 1.2, frequency: 85, isGTO: true },
            { action: 'RAISE 24bb', ev: 0.5, frequency: 15, isGTO: false }
        ],
        explanation: 'TT is an overpair to the flop and still beats most of villain\'s value range. Calling maintains our range advantage.',
        conceptCategory: 'Hand Reading'
    }
];

class DrillQuestionService {
    private seenQuestionIds: Set<string> = new Set();
    private currentLevel: number = 1;
    private mockIndex: number = 0;

    /**
     * Get the next unseen question for a game/level
     */
    async getNextQuestion(gameId: string, level: number): Promise<DrillQuestion | null> {
        this.currentLevel = level;

        // Try database first
        if (supabase) {
            const question = await this.fetchFromDB(gameId, level);
            if (question) return question;
        }

        // Fallback to mock
        return this.getNextMockQuestion(gameId, level);
    }

    /**
     * Fetch from Supabase with never-repeat logic
     */
    private async fetchFromDB(gameId: string, level: number): Promise<DrillQuestion | null> {
        if (!supabase) return null;

        const seenIds = Array.from(this.seenQuestionIds);

        const { data, error } = await supabase
            .from('training_questions')
            .select('*')
            .eq('game_id', gameId)
            .lte('level_id', level)
            .not('id', 'in', `(${seenIds.join(',')})`)
            .limit(1)
            .single();

        if (error || !data) {
            console.log('No DB questions available, using mock');
            return null;
        }

        this.seenQuestionIds.add(data.id);

        // Transform DB format to DrillQuestion
        return this.transformDBQuestion(data);
    }

    /**
     * Get next mock question (cycling through)
     */
    private getNextMockQuestion(gameId: string, level: number): DrillQuestion {
        // Filter mocks by game/level
        const applicable = MOCK_SCENARIOS.filter(
            q => q.level <= level && (q.gameId === gameId || gameId.startsWith(q.gameId.split('_')[0]))
        );

        if (applicable.length === 0) {
            // Just return any mock
            const q = MOCK_SCENARIOS[this.mockIndex % MOCK_SCENARIOS.length];
            this.mockIndex++;
            return { ...q, id: `mock_${Date.now()}` };
        }

        const q = applicable[this.mockIndex % applicable.length];
        this.mockIndex++;
        return { ...q, id: `mock_${Date.now()}` };
    }

    /**
     * Transform database record to DrillQuestion format
     */
    private transformDBQuestion(data: any): DrillQuestion {
        return {
            id: data.id,
            gameId: data.game_id,
            level: data.level_id,
            heroPosition: data.hero_position || 'BTN',
            villainPosition: data.villain_position || 'BB',
            heroCards: data.hero_cards,
            board: data.board_cards || [],
            street: data.street || 'PREFLOP',
            pot: data.pot_size || 2.5,
            facing: data.facing_action || 'CHECK',
            stackDepth: data.stack_depth || 100,
            actions: this.parseActions(data.gto_line, data.alternate_lines),
            explanation: data.explanation || '',
            conceptCategory: data.concept_category || 'General'
        };
    }

    /**
     * Parse GTO and alternate lines into ActionOption array
     */
    private parseActions(gtoLine: any, alternates: any[]): ActionOption[] {
        const actions: ActionOption[] = [];

        if (gtoLine) {
            actions.push({
                action: gtoLine.action,
                ev: gtoLine.ev || 0,
                frequency: gtoLine.frequency || 100,
                isGTO: true
            });
        }

        if (alternates && Array.isArray(alternates)) {
            alternates.forEach(alt => {
                actions.push({
                    action: alt.action,
                    ev: alt.ev || 0,
                    frequency: alt.frequency || 0,
                    isGTO: false
                });
            });
        }

        return actions;
    }

    /**
     * Mark a question as seen
     */
    markSeen(questionId: string): void {
        this.seenQuestionIds.add(questionId);
    }

    /**
     * Reset seen questions (new session)
     */
    resetSeen(): void {
        this.seenQuestionIds.clear();
        this.mockIndex = 0;
    }

    /**
     * Get count of seen questions
     */
    getSeenCount(): number {
        return this.seenQuestionIds.size;
    }
}

// Singleton
export const drillQuestionService = new DrillQuestionService();
