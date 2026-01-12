/**
 * 🎯 SMARTER.POKER — GTO SOLUTION SERVICE
 * 
 * Provides instant access to GTO "Truth" for every scenario.
 * Enables the Assistant to compare user moves without recalculating.
 * 
 * Table: gto_solutions
 * Fields: id (uuid), drill_id (fkey), action (text), ev (float), is_best (bool)
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

export class GTOSolutionService {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        this.TABLE_NAME = 'gto_solutions';

        // Mock storage for testing without database
        this.mockSolutions = new Map();

        console.log('🎯 GTOSolutionService initialized');
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 CORE API: Instant GTO Lookup
    // ═══════════════════════════════════════════════════════════

    /**
     * Get the GTO best action for a drill (instant lookup)
     */
    async getBestAction(drillId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('get_gto_best_action', { p_drill_id: drillId });

            if (error) {
                console.error('🎯 GTOSolutionService: getBestAction error -', error.message);
                return null;
            }

            return data;
        }

        // Mock mode
        return this.getMockBestAction(drillId);
    }

    /**
     * Compare user action against GTO (instant evaluation)
     * Returns: is_correct, ev_loss, best_action, mistake_category, xp_awarded
     */
    async compareUserAction(drillId, userAction) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('compare_user_action', {
                    p_drill_id: drillId,
                    p_user_action: userAction
                });

            if (error) {
                console.error('🎯 GTOSolutionService: compareUserAction error -', error.message);
                throw error;
            }

            return data?.[0] || null;
        }

        // Mock mode
        return this.getMockComparison(drillId, userAction);
    }

    /**
     * Get all actions for a drill (for showing alternates)
     */
    async getAllActions(drillId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .rpc('get_drill_actions', { p_drill_id: drillId });

            if (error) {
                console.error('🎯 GTOSolutionService: getAllActions error -', error.message);
                return [];
            }

            return data || [];
        }

        // Mock mode
        return this.getMockAllActions(drillId);
    }

    /**
     * Get alternate lines (non-best actions) for a drill
     */
    async getAlternateLines(drillId) {
        const allActions = await this.getAllActions(drillId);
        return allActions.filter(a => !a.is_best);
    }

    // ═══════════════════════════════════════════════════════════
    // 📝 WRITE API: Store GTO Solutions
    // ═══════════════════════════════════════════════════════════

    /**
     * Store a GTO solution for a drill
     */
    async storeSolution(solution) {
        const record = {
            drill_id: solution.drillId,
            action: solution.action,
            ev: solution.ev,
            is_best: solution.isBest || false,
            action_type: solution.actionType || 'STANDARD',
            sizing_multiplier: solution.sizingMultiplier || null,
            frequency: solution.frequency || null,
            reasoning: solution.reasoning || null,
            strategic_anchors: solution.strategicAnchors || [],
            xp_if_chosen: solution.xpIfChosen || this.calculateXP(solution.ev, solution.isBest),
            mistake_category: solution.mistakeCategory || this.categorizeMistake(solution.ev, solution.isBest)
        };

        if (this.supabase) {
            const { data, error } = await this.supabase
                .from(this.TABLE_NAME)
                .upsert(record, { onConflict: 'drill_id,action' })
                .select()
                .single();

            if (error) {
                console.error('🎯 GTOSolutionService: storeSolution error -', error.message);
                throw error;
            }

            return data;
        }

        // Mock mode
        const mockId = `mock_solution_${Date.now()}`;
        this.mockSolutions.set(`${solution.drillId}_${solution.action}`, { id: mockId, ...record });
        return { id: mockId, ...record };
    }

    /**
     * Store multiple solutions for a drill (batch insert)
     */
    async storeSolutions(drillId, solutions) {
        const results = [];
        for (const solution of solutions) {
            const result = await this.storeSolution({
                drillId,
                ...solution
            });
            results.push(result);
        }
        return results;
    }

    /**
     * Store a complete GTO solution set for a drill (best + alternates)
     */
    async storeCompleteSolution(drillId, gtoSolution) {
        const solutions = [];

        // Store the best action
        if (gtoSolution.bestMove) {
            solutions.push({
                action: gtoSolution.bestMove.type,
                ev: gtoSolution.bestMove.ev || 0,
                isBest: true,
                actionType: 'STANDARD',
                sizingMultiplier: gtoSolution.bestMove.sizing?.multiplier,
                reasoning: gtoSolution.bestMove.reasoning,
                strategicAnchors: gtoSolution.strategicAnchors || []
            });
        }

        // Store ranked actions
        if (gtoSolution.rankedActions) {
            for (const action of gtoSolution.rankedActions) {
                if (action.type !== gtoSolution.bestMove?.type) {
                    solutions.push({
                        action: action.type,
                        ev: action.ev || 0,
                        isBest: false,
                        actionType: 'STANDARD',
                        sizingMultiplier: action.sizing?.multiplier,
                        reasoning: action.reasoning
                    });
                }
            }
        }

        // Store alternate lines
        if (gtoSolution.alternates) {
            for (const alt of gtoSolution.alternates) {
                solutions.push({
                    action: `${alt.type}_${alt.action?.type || 'ALT'}`,
                    ev: alt.points ? alt.points / 100 : 0,
                    isBest: false,
                    actionType: alt.type,  // ALT_EXPLOIT, ALT_SIMPLE
                    reasoning: alt.reasoning
                });
            }
        }

        return await this.storeSolutions(drillId, solutions);
    }

    // ═══════════════════════════════════════════════════════════
    // 🔧 HELPERS
    // ═══════════════════════════════════════════════════════════

    calculateXP(ev, isBest) {
        if (isBest) return 150;
        if (ev > -0.005) return 100;  // Acceptable
        if (ev > -0.02) return 50;    // Minor
        if (ev > -0.10) return 25;    // Moderate
        if (ev > -0.25) return 10;    // Major
        return 5;                      // Blunder
    }

    categorizeMistake(ev, isBest) {
        if (isBest) return 'OPTIMAL';
        if (ev > -0.005) return 'ACCEPTABLE';
        if (ev > -0.02) return 'MINOR';
        if (ev > -0.10) return 'MODERATE';
        if (ev > -0.25) return 'MAJOR';
        return 'BLUNDER';
    }

    // ═══════════════════════════════════════════════════════════
    // 🧪 MOCK MODE
    // ═══════════════════════════════════════════════════════════

    getMockBestAction(drillId) {
        return {
            id: `mock_best_${drillId}`,
            drill_id: drillId,
            action: 'RAISE',
            ev: 0.3,
            is_best: true,
            action_type: 'STANDARD',
            reasoning: 'GTO optimal play with strong hand',
            xp_if_chosen: 150,
            mistake_category: 'OPTIMAL'
        };
    }

    getMockComparison(drillId, userAction) {
        const bestAction = 'RAISE';
        const isCorrect = userAction === bestAction;

        return {
            is_correct: isCorrect,
            ev_loss: isCorrect ? 0 : 0.15,
            best_action: bestAction,
            best_ev: 0.3,
            user_ev: isCorrect ? 0.3 : 0.15,
            mistake_category: isCorrect ? 'OPTIMAL' : 'MODERATE',
            xp_awarded: isCorrect ? 150 : 25,
            reasoning: 'GTO optimal play with strong hand'
        };
    }

    getMockAllActions(drillId) {
        return [
            { id: '1', drill_id: drillId, action: 'RAISE', ev: 0.3, is_best: true, action_type: 'STANDARD', xp_if_chosen: 150, mistake_category: 'OPTIMAL' },
            { id: '2', drill_id: drillId, action: 'CALL', ev: 0.15, is_best: false, action_type: 'STANDARD', xp_if_chosen: 25, mistake_category: 'MODERATE' },
            { id: '3', drill_id: drillId, action: 'FOLD', ev: -0.2, is_best: false, action_type: 'STANDARD', xp_if_chosen: 10, mistake_category: 'MAJOR' },
            { id: '4', drill_id: drillId, action: 'ALT_EXPLOIT_CALL', ev: 0.2, is_best: false, action_type: 'ALT_EXPLOIT', reasoning: 'Trap against aggressive villain' },
            { id: '5', drill_id: drillId, action: 'ALT_SIMPLE_RAISE', ev: 0.28, is_best: false, action_type: 'ALT_SIMPLE', reasoning: 'Simplified standard line' }
        ];
    }
}

export default GTOSolutionService;
