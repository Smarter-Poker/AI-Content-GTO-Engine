/**
 * 🛰️ GREEN_PRODUCTION_HARDENING: TASK_22
 * ═══════════════════════════════════════════════════════════════════════════
 * GTO SOLVER INTEGRITY CHECK
 * 
 * Ensures no drill is served without a validated GTO truth-line.
 * Auto-deletes corrupt scenario files that violate Hard Laws.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 HARD LAW CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const GTO_INTEGRITY_RULES = {
    // Every drill MUST have a GTO_PRIMARY solution
    REQUIRE_PRIMARY_GTO: true,

    // GTO_PRIMARY must have EV > 0
    REQUIRE_POSITIVE_EV: true,

    // Every drill MUST have at least 2 alternate lines
    MIN_ALTERNATE_LINES: 2,

    // Maximum EV loss for alternates (prevent absurd scenarios)
    MAX_ALTERNATE_EV_LOSS: 0.50,

    // Solution must have reasoning
    REQUIRE_REASONING: true,

    // Auto-delete corrupt files
    AUTO_DELETE_CORRUPT: true
};

const INTEGRITY_STATUS = {
    VALID: 'VALID',
    MISSING_GTO_PRIMARY: 'MISSING_GTO_PRIMARY',
    NEGATIVE_GTO_EV: 'NEGATIVE_GTO_EV',
    INSUFFICIENT_ALTERNATES: 'INSUFFICIENT_ALTERNATES',
    MISSING_REASONING: 'MISSING_REASONING',
    CORRUPT_DATA: 'CORRUPT_DATA',
    INVALID_EV_VALUES: 'INVALID_EV_VALUES'
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 GTO INTEGRITY AUDITOR
// ═══════════════════════════════════════════════════════════════════════════════

export class GTOIntegrityAuditor {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        this.rules = { ...GTO_INTEGRITY_RULES, ...options.rules };
        this.auditLog = [];
        this.corruptCount = 0;
        this.validCount = 0;

        console.log('🔍 GTOIntegrityAuditor initialized (TASK_22: Solver Integrity Check)');
    }

    /**
     * Validate a single drill's GTO solutions
     * Returns VALID or specific violation code
     */
    validateDrill(drill) {
        const solutions = drill.solutions || [];
        const errors = [];

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 RULE 1: Must have GTO_PRIMARY solution
        // ═══════════════════════════════════════════════════════════════════
        const gtoSolution = solutions.find(s =>
            s.solution_type === 'GTO_PRIMARY' || s.is_optimal === true
        );

        if (!gtoSolution && this.rules.REQUIRE_PRIMARY_GTO) {
            errors.push({
                code: INTEGRITY_STATUS.MISSING_GTO_PRIMARY,
                message: '🔐 HARD LAW VIOLATION: Missing GTO_PRIMARY solution',
                severity: 'CRITICAL'
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 RULE 2: GTO_PRIMARY must have EV > 0
        // ═══════════════════════════════════════════════════════════════════
        if (gtoSolution && this.rules.REQUIRE_POSITIVE_EV) {
            if (typeof gtoSolution.ev !== 'number' || gtoSolution.ev <= 0) {
                errors.push({
                    code: INTEGRITY_STATUS.NEGATIVE_GTO_EV,
                    message: `🔐 HARD LAW VIOLATION: GTO_PRIMARY EV must be > 0, got ${gtoSolution.ev}`,
                    severity: 'CRITICAL',
                    actual_ev: gtoSolution.ev
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 RULE 3: Must have at least 2 alternate lines
        // ═══════════════════════════════════════════════════════════════════
        const alternates = solutions.filter(s =>
            s.solution_type === 'ALT_SIMPLE' ||
            s.solution_type === 'ALT_EXPLOIT' ||
            (s.is_optimal === false && s !== gtoSolution)
        );

        if (alternates.length < this.rules.MIN_ALTERNATE_LINES) {
            errors.push({
                code: INTEGRITY_STATUS.INSUFFICIENT_ALTERNATES,
                message: `🔐 HARD LAW VIOLATION: Need ${this.rules.MIN_ALTERNATE_LINES} alternates, got ${alternates.length}`,
                severity: 'CRITICAL',
                found: alternates.length,
                required: this.rules.MIN_ALTERNATE_LINES
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 RULE 4: Validate EV values
        // ═══════════════════════════════════════════════════════════════════
        for (const solution of solutions) {
            if (typeof solution.ev !== 'number' || isNaN(solution.ev)) {
                errors.push({
                    code: INTEGRITY_STATUS.INVALID_EV_VALUES,
                    message: `Invalid EV value: ${solution.ev} for action ${solution.action}`,
                    severity: 'HIGH'
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // 🔐 RULE 5: GTO must have reasoning (for educational value)
        // ═══════════════════════════════════════════════════════════════════
        if (gtoSolution && this.rules.REQUIRE_REASONING) {
            if (!gtoSolution.reasoning || gtoSolution.reasoning.trim() === '') {
                errors.push({
                    code: INTEGRITY_STATUS.MISSING_REASONING,
                    message: 'GTO solution missing educational reasoning',
                    severity: 'MEDIUM'
                });
            }
        }

        // Build result
        const isValid = errors.filter(e => e.severity === 'CRITICAL').length === 0;

        return {
            drill_id: drill.id || drill.drill_id,
            is_valid: isValid,
            status: isValid ? INTEGRITY_STATUS.VALID : errors[0]?.code || INTEGRITY_STATUS.CORRUPT_DATA,
            errors,
            solutions_count: solutions.length,
            has_gto: !!gtoSolution,
            alternates_count: alternates.length,
            gto_ev: gtoSolution?.ev
        };
    }

    /**
     * Audit all drills in the content pool
     */
    async auditContentPool(drills) {
        const results = {
            total: drills.length,
            valid: 0,
            corrupt: 0,
            violations: [],
            deleted: [],
            summary: {}
        };

        for (const drill of drills) {
            const validation = this.validateDrill(drill);

            if (validation.is_valid) {
                results.valid++;
                this.validCount++;
            } else {
                results.corrupt++;
                this.corruptCount++;
                results.violations.push({
                    drill_id: validation.drill_id,
                    status: validation.status,
                    errors: validation.errors
                });

                // ═══════════════════════════════════════════════════════════════
                // 🗑️ AUTO-DELETE CORRUPT SCENARIOS
                // ═══════════════════════════════════════════════════════════════
                if (this.rules.AUTO_DELETE_CORRUPT) {
                    const deleted = await this.deleteCorruptDrill(drill);
                    if (deleted) {
                        results.deleted.push(validation.drill_id);
                    }
                }
            }

            // Log audit
            this.auditLog.push({
                timestamp: new Date().toISOString(),
                drill_id: validation.drill_id,
                status: validation.status,
                is_valid: validation.is_valid
            });
        }

        // Build summary
        results.summary = {
            pass_rate: ((results.valid / results.total) * 100).toFixed(2) + '%',
            critical_violations: results.violations.filter(v =>
                v.errors.some(e => e.severity === 'CRITICAL')
            ).length,
            auto_deleted: results.deleted.length
        };

        return results;
    }

    /**
     * Delete corrupt drill from content pool
     */
    async deleteCorruptDrill(drill) {
        const drillId = drill.id || drill.drill_id;

        if (this.supabase) {
            // Mark as invalid in database
            const { error } = await this.supabase
                .from('drills')
                .update({ status: 'INVALID', invalidated_at: new Date().toISOString() })
                .eq('id', drillId);

            if (!error) {
                console.log(`🗑️ Deleted corrupt drill: ${drillId}`);
                return true;
            }
        }

        // Mock mode
        console.log(`🗑️ [MOCK] Would delete corrupt drill: ${drillId}`);
        return true;
    }

    /**
     * Run integrity check before serving any drill
     * HARD LAW: No drill served without validated GTO truth-line
     */
    canServeDrill(drill) {
        const validation = this.validateDrill(drill);

        if (!validation.is_valid) {
            console.warn(`🚫 BLOCKED: Drill ${validation.drill_id} failed integrity check`);
            return {
                allowed: false,
                reason: validation.status,
                errors: validation.errors
            };
        }

        return {
            allowed: true,
            drill_id: validation.drill_id,
            gto_ev: validation.gto_ev,
            alternates: validation.alternates_count
        };
    }

    /**
     * Get audit statistics
     */
    getStats() {
        return {
            total_audited: this.auditLog.length,
            valid: this.validCount,
            corrupt: this.corruptCount,
            integrity_rate: this.auditLog.length > 0
                ? ((this.validCount / this.auditLog.length) * 100).toFixed(2) + '%'
                : '0%',
            last_audit: this.auditLog[this.auditLog.length - 1]?.timestamp || null
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createGTOIntegrityAuditor(options = {}) {
    return new GTOIntegrityAuditor(options);
}

export { GTO_INTEGRITY_RULES, INTEGRITY_STATUS };

export default GTOIntegrityAuditor;
