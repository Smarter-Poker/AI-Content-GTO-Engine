/**
 * 🛰️ TASK 13: GTO_TRUTH_VALIDATION_ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * @mapping PHASE_13
 * @silo AI_CONTENT_GTO_ENGINE (GREEN)
 * @target ORB_4 (Training) | ORB_6 (Assistant)
 * 
 * HARD LAW: Every drill MUST contain:
 * - 1 GTO Line (Best EV) → is_optimal = true
 * - 2 Alternate Lines (Sub-optimal) → action_type = 'ALT_SIMPLE' | 'ALT_EXPLOIT'
 * 
 * TRIGGER: If user selects Alt Line → Display Leak_Signal with EV loss vs GTO
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EVALUATION_TIERS, MISTAKE_CATEGORIES, LEAK_SIGNALS } from '../config/constants.js';

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

export class GTOTruthValidator {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Hard Law Configuration
        this.config = {
            requiredGTOLines: 1,           // Exactly 1 GTO line (Best EV)
            requiredAltLines: 2,           // Minimum 2 alternate lines
            maxEvLossForOptimal: 0,        // EV loss = 0 for GTO line
            ...options
        };

        // Validation stats
        this.stats = {
            drillsValidated: 0,
            drillsPassed: 0,
            drillsFailed: 0,
            leakSignalsTriggered: 0
        };

        console.log('🛰️ GTOTruthValidator initialized (PHASE 13 MAPPED)');
        console.log('   📋 Hard Law: 1 GTO + 2 Alternates per drill');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 CORE VALIDATION: Audit Drill Solutions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Validate a single drill has correct GTO structure
     * @param {Object} drill - The drill to validate
     * @returns {Object} Validation result
     */
    async validateDrill(drill) {
        this.stats.drillsValidated++;

        const validation = {
            drillId: drill.id || drill.drill_id,
            isValid: false,
            gtoLine: null,
            altLines: [],
            errors: [],
            warnings: []
        };

        // Get drill solutions (from DB or embedded)
        const solutions = await this.getDrillSolutions(drill);

        if (!solutions || solutions.length === 0) {
            validation.errors.push('NO_SOLUTIONS: Drill has no solutions mapped');
            this.stats.drillsFailed++;
            return validation;
        }

        // Find GTO line (is_optimal = true OR highest EV)
        const gtoLine = this.extractGTOLine(solutions);

        if (!gtoLine) {
            validation.errors.push('NO_GTO_LINE: Missing optimal GTO action');
            this.stats.drillsFailed++;
            return validation;
        }

        validation.gtoLine = gtoLine;

        // Find alternate lines
        const altLines = this.extractAltLines(solutions, gtoLine);

        if (altLines.length < this.config.requiredAltLines) {
            validation.errors.push(
                `INSUFFICIENT_ALT_LINES: Found ${altLines.length}, required ${this.config.requiredAltLines}`
            );
            this.stats.drillsFailed++;
            return validation;
        }

        validation.altLines = altLines;

        // Validate EV structure
        for (const alt of altLines) {
            if (alt.ev >= gtoLine.ev) {
                validation.warnings.push(
                    `ALT_EV_ANOMALY: ${alt.action} has EV >= GTO (${alt.ev} >= ${gtoLine.ev})`
                );
            }
        }

        // All checks passed
        validation.isValid = true;
        this.stats.drillsPassed++;

        return validation;
    }

    /**
     * Batch validate all drills in the ready content pool
     * @returns {Object} Batch validation results
     */
    async validateAllDrills() {
        console.log('🔍 Starting batch validation of all drill solutions...');

        if (!this.supabase) {
            return {
                success: false,
                error: 'NO_DB_CONNECTION',
                message: 'Cannot validate without Supabase connection'
            };
        }

        // Get all drills with solutions
        const { data: drills, error } = await this.supabase
            .from('pre_generated_content')
            .select(`
                id,
                scenario_id,
                skill_level,
                gto_solutions (*)
            `)
            .eq('status', 'READY');

        if (error) {
            return { success: false, error: error.message };
        }

        const results = {
            total: drills.length,
            valid: 0,
            invalid: 0,
            warnings: 0,
            details: []
        };

        for (const drill of drills) {
            const validation = await this.validateDrill({
                ...drill,
                solutions: drill.gto_solutions
            });

            if (validation.isValid) {
                results.valid++;
            } else {
                results.invalid++;
            }

            if (validation.warnings.length > 0) {
                results.warnings += validation.warnings.length;
            }

            results.details.push(validation);
        }

        console.log(`✅ Validation complete: ${results.valid}/${results.total} valid`);

        return {
            success: true,
            ...results,
            complianceRate: (results.valid / results.total * 100).toFixed(2) + '%'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚨 LEAK SIGNAL TRIGGER: EV Loss Display
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Process user action and trigger leak signal if sub-optimal
     * @param {string} drillId - The drill ID
     * @param {string} userAction - The action the user selected
     * @returns {Object} Evaluation result with leak signal if applicable
     */
    async evaluateUserAction(drillId, userAction) {
        const solutions = await this.getDrillSolutionsByDrillId(drillId);

        if (!solutions || solutions.length === 0) {
            return {
                success: false,
                error: 'NO_SOLUTIONS_FOUND',
                drillId
            };
        }

        const gtoLine = this.extractGTOLine(solutions);
        const userSolution = solutions.find(s =>
            s.action.toUpperCase() === userAction.toUpperCase()
        );

        // Calculate EV loss
        const evLoss = gtoLine ? (gtoLine.ev - (userSolution?.ev || 0)) : 0;
        const isOptimal = userSolution?.is_optimal || userAction === gtoLine?.action;
        const isAltLine = !isOptimal && userSolution !== undefined;

        // Build base result
        const result = {
            success: true,
            drillId,
            userAction,
            isOptimal,
            evLoss: Math.max(0, evLoss),
            evLossBB: (evLoss * 100).toFixed(2) + ' bb',
            gtoAction: gtoLine?.action,
            gtoEV: gtoLine?.ev,
            userEV: userSolution?.ev || null,
            xpAwarded: this.calculateXP(evLoss),
            mistakeCategory: this.classifyMistake(evLoss)
        };

        // HARD LAW: If user selects Alt Line → Trigger Leak Signal
        if (isAltLine || !isOptimal) {
            this.stats.leakSignalsTriggered++;

            result.leakSignal = {
                triggered: true,
                type: this.detectLeakType(userAction, gtoLine.action, evLoss),
                severity: this.calculateSeverity(evLoss),
                display: {
                    showGTO: true,
                    showAlternates: true,
                    lockDuration: evLoss > 0.10 ? 5000 : 3000, // Lock Next button
                    message: this.generateLeakMessage(evLoss, gtoLine, userSolution)
                }
            };

            // Include all lines for educational display
            result.educationalPayload = {
                gtoLine: {
                    action: gtoLine.action,
                    ev: gtoLine.ev,
                    reasoning: gtoLine.reasoning || 'Mathematically optimal play',
                    tier: EVALUATION_TIERS.GTO_BASELINE
                },
                alternates: this.extractAltLines(solutions, gtoLine).map(alt => ({
                    action: alt.action,
                    ev: alt.ev,
                    evLoss: (gtoLine.ev - alt.ev).toFixed(4),
                    reasoning: alt.reasoning || 'Sub-optimal alternative',
                    tier: alt.action_type === 'ALT_SIMPLE'
                        ? EVALUATION_TIERS.ALT_SIMPLE
                        : EVALUATION_TIERS.ALT_EXPLOIT
                })),
                userSelection: {
                    action: userAction,
                    wasCorrect: isOptimal,
                    evLostVsGTO: evLoss.toFixed(4)
                }
            };
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔧 HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════

    async getDrillSolutions(drill) {
        // If solutions are embedded
        if (drill.solutions) {
            return drill.solutions;
        }

        // If gto_solution is JSONB on the drill
        if (drill.gto_solution) {
            return Array.isArray(drill.gto_solution)
                ? drill.gto_solution
                : [drill.gto_solution];
        }

        // Fetch from gto_solutions table
        return await this.getDrillSolutionsByDrillId(drill.id);
    }

    async getDrillSolutionsByDrillId(drillId) {
        if (!this.supabase) return null;

        const { data, error } = await this.supabase
            .from('gto_solutions')
            .select('*')
            .eq('drill_id', drillId)
            .order('ev', { ascending: false });

        if (error) {
            console.error('Failed to fetch solutions:', error);
            return null;
        }

        return data;
    }

    extractGTOLine(solutions) {
        // First try to find explicitly marked optimal
        let gtoLine = solutions.find(s => s.is_optimal === true);

        // Fallback: highest EV action
        if (!gtoLine) {
            gtoLine = solutions.reduce((best, current) =>
                (current.ev > (best?.ev || -Infinity)) ? current : best
                , null);
        }

        return gtoLine;
    }

    extractAltLines(solutions, gtoLine) {
        return solutions.filter(s =>
            s.action !== gtoLine.action &&
            s.is_optimal !== true
        ).sort((a, b) => b.ev - a.ev); // Sort by EV descending
    }

    calculateXP(evLoss) {
        for (const [category, config] of Object.entries(MISTAKE_CATEGORIES)) {
            if (evLoss >= config.evLossMin && evLoss < config.evLossMax) {
                return config.xp;
            }
        }
        return MISTAKE_CATEGORIES.BLUNDER.xp;
    }

    classifyMistake(evLoss) {
        for (const [category, config] of Object.entries(MISTAKE_CATEGORIES)) {
            if (evLoss >= config.evLossMin && evLoss < config.evLossMax) {
                return {
                    category,
                    label: config.label,
                    color: config.color
                };
            }
        }
        return { category: 'BLUNDER', label: 'Blunder', color: '#FF0000' };
    }

    calculateSeverity(evLoss) {
        if (evLoss < 0.02) return 'LOW';
        if (evLoss < 0.10) return 'MEDIUM';
        if (evLoss < 0.25) return 'HIGH';
        return 'CRITICAL';
    }

    detectLeakType(userAction, gtoAction, evLoss) {
        const user = userAction.toUpperCase();
        const gto = gtoAction.toUpperCase();

        // Frequency leaks
        if (user.includes('FOLD') && !gto.includes('FOLD')) {
            return LEAK_SIGNALS.OVER_FOLDING;
        }
        if (user.includes('CALL') && gto.includes('RAISE')) {
            return LEAK_SIGNALS.PASSIVE_PLAY;
        }
        if (user.includes('RAISE') && gto.includes('CALL')) {
            return LEAK_SIGNALS.OVER_AGGRESSION;
        }

        // Sizing leaks
        if (user.includes('BET') && gto.includes('BET')) {
            const userSize = this.extractSize(user);
            const gtoSize = this.extractSize(gto);
            if (userSize < gtoSize - 10) return LEAK_SIGNALS.SIZING_ERROR_SMALL;
            if (userSize > gtoSize + 10) return LEAK_SIGNALS.SIZING_ERROR_LARGE;
        }

        // Default to general leak based on severity
        if (evLoss > 0.25) return LEAK_SIGNALS.RANGE_CAPPING;
        return LEAK_SIGNALS.PASSIVE_PLAY;
    }

    extractSize(action) {
        const match = action.match(/(\d+)/);
        return match ? parseInt(match[1]) : 50;
    }

    generateLeakMessage(evLoss, gtoLine, userSolution) {
        const evBB = (evLoss * 100).toFixed(1);

        if (evLoss < 0.02) {
            return `Minor deviation: ${userSolution?.action || 'Your choice'} costs ~${evBB}bb vs GTO`;
        }
        if (evLoss < 0.10) {
            return `Mistake detected: ${gtoLine.action} was optimal. EV loss: ${evBB}bb`;
        }
        if (evLoss < 0.25) {
            return `⚠️ Major mistake: You lost ${evBB}bb vs GTO. Study the correct line.`;
        }
        return `🚨 BLUNDER: ${evBB}bb lost! The GTO play was ${gtoLine.action}. Review required.`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 STATS & REPORTING
    // ═══════════════════════════════════════════════════════════════════════

    getStats() {
        return {
            ...this.stats,
            passRate: this.stats.drillsValidated > 0
                ? (this.stats.drillsPassed / this.stats.drillsValidated * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    resetStats() {
        this.stats = {
            drillsValidated: 0,
            drillsPassed: 0,
            drillsFailed: 0,
            leakSignalsTriggered: 0
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📋 SUPABASE VALIDATION FUNCTION (For Database-Level Enforcement)
// ═══════════════════════════════════════════════════════════════════════════

export const GTO_VALIDATION_FUNCTION = `
-- ═══════════════════════════════════════════════════════════════════════════
-- 🛰️ GTO TRUTH VALIDATION FUNCTION (PHASE 13)
-- Ensures every drill has exactly 1 GTO + 2 Alternates
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION validate_drill_solutions(p_drill_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gto_count INTEGER;
    v_alt_count INTEGER;
    v_gto_ev FLOAT;
    v_max_alt_ev FLOAT;
BEGIN
    -- Count GTO lines (is_optimal = true)
    SELECT COUNT(*), MAX(ev)
    INTO v_gto_count, v_gto_ev
    FROM gto_solutions
    WHERE drill_id = p_drill_id AND is_optimal = TRUE;
    
    -- Count alternate lines
    SELECT COUNT(*), MAX(ev)
    INTO v_alt_count, v_max_alt_ev
    FROM gto_solutions
    WHERE drill_id = p_drill_id AND (is_optimal = FALSE OR is_optimal IS NULL);
    
    -- Validate structure
    IF v_gto_count < 1 THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'MISSING_GTO_LINE',
            'message', 'Drill must have exactly 1 optimal GTO line'
        );
    END IF;
    
    IF v_alt_count < 2 THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'INSUFFICIENT_ALT_LINES',
            'message', format('Drill has %s alternates, requires 2 minimum', v_alt_count)
        );
    END IF;
    
    -- Validate EV ordering (GTO should have highest EV)
    IF v_max_alt_ev >= v_gto_ev THEN
        RETURN jsonb_build_object(
            'valid', FALSE,
            'error', 'EV_ORDERING_VIOLATION',
            'message', 'Alternate line has EV >= GTO line',
            'gto_ev', v_gto_ev,
            'max_alt_ev', v_max_alt_ev
        );
    END IF;
    
    -- All validations passed
    RETURN jsonb_build_object(
        'valid', TRUE,
        'gto_lines', v_gto_count,
        'alt_lines', v_alt_count,
        'gto_ev', v_gto_ev
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 🛡️ TRIGGER: Block Invalid Drill Insertion
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_gto_structure()
RETURNS TRIGGER AS $$
DECLARE
    v_solution_count INTEGER;
BEGIN
    -- Count solutions for this drill after insert
    SELECT COUNT(*) INTO v_solution_count
    FROM gto_solutions
    WHERE drill_id = NEW.id;
    
    -- Only enforce when marking as READY
    IF NEW.status = 'READY' THEN
        IF v_solution_count < 3 THEN
            RAISE EXCEPTION '🚫 HARD LAW VIOLATION: Drill % has only % solutions. Requires 1 GTO + 2 Alternates (3 minimum)',
                NEW.id, v_solution_count;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to pre_generated_content
DROP TRIGGER IF EXISTS trigger_enforce_gto_structure ON pre_generated_content;
CREATE TRIGGER trigger_enforce_gto_structure
    BEFORE UPDATE ON pre_generated_content
    FOR EACH ROW
    WHEN (NEW.status = 'READY' AND OLD.status != 'READY')
    EXECUTE FUNCTION enforce_gto_structure();

COMMENT ON FUNCTION validate_drill_solutions IS '🛰️ PHASE 13: GTO Truth Validation Engine';
`;

export default GTOTruthValidator;
