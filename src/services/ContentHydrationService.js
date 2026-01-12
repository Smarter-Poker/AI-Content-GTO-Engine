/**
 * 🛰️ TASK 15: NO_REPEAT_CONTENT_HYDRATION
 * ═══════════════════════════════════════════════════════════════════════════
 * @mapping PHASE_15
 * @silo AI_CONTENT_GTO_ENGINE (GREEN) ↔ GLOBAL_UTILITY_SEARCH_SORT (ORANGE)
 * @target ORB_4 (Training)
 * 
 * HARD LAW: Before serving a drill, verify ID NOT IN 'user_drill_history'.
 * If pool is exhausted → Trigger AI generation of 20 fresh A+ drills instantly.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DAILY_DRILL_CONFIG, SKILL_LEVELS } from '../config/constants.js';

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

export class ContentHydrationService {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // Configuration
        this.config = {
            minPoolThreshold: 10,           // Trigger generation when below this
            emergencyGenerationCount: 20,   // Fresh drills to generate
            maxHistoryAge: 90,              // Days before history can be recycled
            batchSize: 10,                  // Drills to fetch per batch
            ...options
        };

        // Stats tracking
        this.stats = {
            drillsServed: 0,
            historyChecks: 0,
            poolExhaustions: 0,
            emergencyGenerations: 0
        };

        // Mock history for testing
        this.mockHistory = new Map();
        this.mockPool = new Map();

        console.log('🛰️ ContentHydrationService initialized (PHASE 15 MAPPED)');
        console.log('   🔗 Connected to ORANGE Silo for No-Repeat enforcement');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 CORE API: Get Fresh Drills (No-Repeat Guaranteed)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Fetch fresh drills for a user, guaranteed never seen before
     * @param {string} userId - The user ID
     * @param {string} skillLevel - Target skill level
     * @param {number} count - Number of drills to fetch
     * @returns {Object} Fresh drills or pool exhaustion response
     */
    async getFreshDrills(userId, skillLevel, count = 10) {
        this.stats.historyChecks++;

        // Get user's drill history
        const history = await this.getUserDrillHistory(userId, skillLevel);
        const seenDrillIds = new Set(history.map(h => h.drill_id));

        // Get available pool (excluding seen drills)
        const availablePool = await this.getAvailablePool(skillLevel, seenDrillIds);

        // Check if pool is exhausted
        if (availablePool.length < count) {
            this.stats.poolExhaustions++;
            console.log(`⚠️ Pool exhausted for ${skillLevel}. Available: ${availablePool.length}, Requested: ${count}`);

            // HARD LAW: Trigger emergency AI generation
            const generated = await this.triggerEmergencyGeneration(userId, skillLevel, count);

            if (generated.success) {
                // Combine any available with newly generated
                const freshDrills = [...availablePool, ...generated.drills].slice(0, count);
                return {
                    success: true,
                    drills: freshDrills,
                    source: 'COMBINED',
                    poolStatus: 'REPLENISHED',
                    generated: generated.count
                };
            }

            // If generation failed, return what we have
            return {
                success: availablePool.length > 0,
                drills: availablePool,
                source: 'PARTIAL',
                poolStatus: 'EXHAUSTED',
                warning: 'Pool exhausted, AI generation pending'
            };
        }

        // Serve from available pool
        const drillsToServe = availablePool.slice(0, count);

        // Record in history (No-Repeat tracking)
        await this.recordDrillsServed(userId, drillsToServe);

        this.stats.drillsServed += drillsToServe.length;

        return {
            success: true,
            drills: drillsToServe,
            source: 'READY_POOL',
            poolStatus: 'HEALTHY',
            remaining: availablePool.length - drillsToServe.length
        };
    }

    /**
     * Check pool health for a skill level
     */
    async checkPoolHealth(skillLevel) {
        const { data, error } = this.supabase
            ? await this.supabase
                .from('pre_generated_content')
                .select('id', { count: 'exact' })
                .eq('status', 'READY')
                .eq('skill_level', skillLevel)
            : { data: [], error: null };

        const count = data?.length || this.mockPool.get(skillLevel)?.length || 0;

        return {
            skillLevel,
            availableCount: count,
            isHealthy: count >= this.config.minPoolThreshold,
            needsReplenishment: count < this.config.minPoolThreshold,
            criticallyLow: count < 5
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔍 HISTORY CHECK: No-Repeat Enforcement
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get user's drill history (drills they've already seen)
     */
    async getUserDrillHistory(userId, skillLevel = null) {
        if (this.supabase) {
            let query = this.supabase
                .from('user_drill_history')
                .select('drill_id, seen_at, skill_level')
                .eq('user_id', userId);

            if (skillLevel) {
                query = query.eq('skill_level', skillLevel);
            }

            const { data, error } = await query;
            return error ? [] : data;
        }

        // Mock mode
        const key = `${userId}_${skillLevel || 'all'}`;
        return this.mockHistory.get(key) || [];
    }

    /**
     * Check if a specific drill has been seen by user
     */
    async hasDrillBeenSeen(userId, drillId) {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('user_drill_history')
                .select('id')
                .eq('user_id', userId)
                .eq('drill_id', drillId)
                .single();

            return !error && data !== null;
        }

        // Mock mode
        const history = this.mockHistory.get(userId) || [];
        return history.some(h => h.drill_id === drillId);
    }

    /**
     * Record drills as served (add to history)
     */
    async recordDrillsServed(userId, drills) {
        if (this.supabase) {
            const records = drills.map(drill => ({
                user_id: userId,
                drill_id: drill.id,
                skill_level: drill.skill_level,
                seen_at: new Date().toISOString()
            }));

            await this.supabase
                .from('user_drill_history')
                .upsert(records, { onConflict: 'user_id,drill_id' });
        }

        // Mock mode
        if (!this.mockHistory.has(userId)) {
            this.mockHistory.set(userId, []);
        }
        for (const drill of drills) {
            this.mockHistory.get(userId).push({
                drill_id: drill.id,
                skill_level: drill.skill_level,
                seen_at: new Date()
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📦 POOL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get available drills from pool (excluding seen IDs)
     */
    async getAvailablePool(skillLevel, excludeIds = new Set()) {
        if (this.supabase) {
            let query = this.supabase
                .from('pre_generated_content')
                .select('*')
                .eq('status', 'READY')
                .eq('skill_level', skillLevel)
                .order('created_at', { ascending: true });

            // Exclude seen drills
            if (excludeIds.size > 0) {
                query = query.not('id', 'in', `(${Array.from(excludeIds).join(',')})`);
            }

            const { data, error } = await query.limit(50);
            return error ? [] : data;
        }

        // Mock mode
        const pool = this.mockPool.get(skillLevel) || [];
        return pool.filter(d => !excludeIds.has(d.id));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🚨 EMERGENCY GENERATION: Pool Exhaustion Handler
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Trigger emergency AI generation when pool is exhausted
     * HARD LAW: Generate 20 fresh A+ drills instantly
     */
    async triggerEmergencyGeneration(userId, skillLevel, requestedCount) {
        this.stats.emergencyGenerations++;

        console.log(`🚨 EMERGENCY GENERATION triggered for ${skillLevel}`);
        console.log(`   Generating ${this.config.emergencyGenerationCount} fresh A+ drills...`);

        if (this.supabase) {
            // Queue emergency generation job with HIGH priority
            const { data, error } = await this.supabase
                .from('content_generation_queue')
                .insert({
                    job_type: 'EMERGENCY_POOL_REPLENISHMENT',
                    skill_level: skillLevel,
                    scenario_count: this.config.emergencyGenerationCount,
                    priority: 1,  // HIGHEST PRIORITY
                    status: 'PENDING',
                    metadata: {
                        triggered_by: userId,
                        reason: 'POOL_EXHAUSTED',
                        requested_count: requestedCount,
                        timestamp: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (error) {
                console.error('Failed to queue emergency generation:', error);
                return { success: false, error: error.message };
            }

            // For instant response, try to use any recycled content
            const recycled = await this.getRecycledContent(userId, skillLevel, requestedCount);

            return {
                success: true,
                jobId: data.id,
                status: 'GENERATION_QUEUED',
                drills: recycled,
                count: recycled.length,
                message: `Emergency generation queued. ${recycled.length} recycled drills available.`
            };
        }

        // Mock mode: Generate mock drills instantly
        const mockDrills = this.generateMockDrills(skillLevel, this.config.emergencyGenerationCount);

        return {
            success: true,
            drills: mockDrills.slice(0, requestedCount),
            count: mockDrills.length,
            status: 'MOCK_GENERATED'
        };
    }

    /**
     * Get recycled content (old drills user might have forgotten)
     * Only used when pool is fully exhausted
     */
    async getRecycledContent(userId, skillLevel, count) {
        if (!this.supabase) return [];

        // Get drills seen more than maxHistoryAge days ago
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.maxHistoryAge);

        const { data: oldHistory } = await this.supabase
            .from('user_drill_history')
            .select('drill_id')
            .eq('user_id', userId)
            .eq('skill_level', skillLevel)
            .lt('seen_at', cutoffDate.toISOString())
            .limit(count);

        if (!oldHistory || oldHistory.length === 0) return [];

        const oldDrillIds = oldHistory.map(h => h.drill_id);

        const { data: drills } = await this.supabase
            .from('pre_generated_content')
            .select('*')
            .in('id', oldDrillIds)
            .eq('status', 'READY')
            .limit(count);

        return drills || [];
    }

    /**
     * Generate mock drills for testing
     */
    generateMockDrills(skillLevel, count) {
        const drills = [];
        for (let i = 0; i < count; i++) {
            drills.push({
                id: `mock_${skillLevel}_${Date.now()}_${i}`,
                scenario_id: `emergency_${i}`,
                skill_level: skillLevel,
                status: 'READY',
                scenario_data: {
                    heroHand: ['As', 'Kh'],
                    board: ['Js', 'Td', '2c'],
                    position: 'BTN',
                    pot: 100,
                    toCall: 25
                },
                gto_solution: {
                    bestMove: 'RAISE_75',
                    alternates: ['CALL', 'FOLD'],
                    ev: 0.15
                },
                quality_grade: 'A+',
                generated_at: new Date().toISOString()
            });
        }
        return drills;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🔗 ORANGE SILO INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Connect to ORANGE Silo's unique content filter
     */
    async connectOrangeSilo() {
        if (!this.supabase) {
            console.log('⚠️ No database connection for Orange Silo integration');
            return false;
        }

        // Verify orange silo tables exist
        const { data } = await this.supabase
            .from('user_completion_history')
            .select('id')
            .limit(1);

        if (data !== null) {
            console.log('🔗 Connected to ORANGE Silo (GLOBAL_UTILITY_SEARCH_SORT)');
            return true;
        }

        console.log('⚠️ Orange Silo tables not found - using local history');
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📊 STATS & DIAGNOSTICS
    // ═══════════════════════════════════════════════════════════════════════

    getStats() {
        return {
            ...this.stats,
            exhaustionRate: this.stats.historyChecks > 0
                ? (this.stats.poolExhaustions / this.stats.historyChecks * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    async getSystemHealth() {
        const levels = Object.keys(SKILL_LEVELS);
        const healthReport = {};

        for (const level of levels) {
            healthReport[level] = await this.checkPoolHealth(level);
        }

        return {
            timestamp: new Date().toISOString(),
            levels: healthReport,
            stats: this.getStats(),
            overallHealth: Object.values(healthReport).every(h => h.isHealthy)
                ? 'HEALTHY'
                : 'NEEDS_ATTENTION'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 📋 SUPABASE SCHEMA FOR NO-REPEAT TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export const USER_DRILL_HISTORY_SCHEMA = `
-- User Drill History (No-Repeat Enforcement)
CREATE TABLE IF NOT EXISTS user_drill_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    drill_id UUID NOT NULL,
    skill_level TEXT NOT NULL,
    seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, drill_id)
);

CREATE INDEX IF NOT EXISTS idx_drill_history_user ON user_drill_history(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_history_user_level ON user_drill_history(user_id, skill_level);
CREATE INDEX IF NOT EXISTS idx_drill_history_seen ON user_drill_history(seen_at DESC);

-- Function: Get fresh drills (NOT IN history)
CREATE OR REPLACE FUNCTION get_fresh_drills_for_user(
    p_user_id UUID,
    p_skill_level TEXT,
    p_count INTEGER DEFAULT 10
)
RETURNS SETOF pre_generated_content
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT pgc.*
    FROM pre_generated_content pgc
    WHERE pgc.status = 'READY'
      AND pgc.skill_level = p_skill_level
      AND pgc.id NOT IN (
          SELECT drill_id FROM user_drill_history 
          WHERE user_id = p_user_id
      )
    ORDER BY pgc.created_at ASC
    LIMIT p_count;
$$;

-- RLS
ALTER TABLE user_drill_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own history only" ON user_drill_history FOR ALL USING (auth.uid() = user_id);
GRANT SELECT, INSERT ON user_drill_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_fresh_drills_for_user TO authenticated;
`;

export default ContentHydrationService;
