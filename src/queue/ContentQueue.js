/**
 * ⚡ CONTENT_QUEUE_LOCK — ENFORCER
 * 
 * SILO_COMMAND: IGNORE_EXTERNAL_CONTEXT
 * SCOPE: ./AI_CONTENT_GTO_ENGINE/
 * ACTION: CONTENT_QUEUE_LOCK
 * 
 * HARD LAW: NO LIVE GENERATION. ONLY 'READY' CONTENT.
 * This module enforces the Next-In-Line queue logic.
 */

import { CONTENT_STATUSES } from '../database/schema.js';

// Optional Supabase import
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

// ═══════════════════════════════════════════════════════════════
// ⚡ CONTENT QUEUE (LOCKED TO READY-ONLY)
// ═══════════════════════════════════════════════════════════════

export class ContentQueue {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY;

        if (this.supabaseUrl && this.supabaseKey && createClient) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            this.supabase = null;
        }

        // LOCK: Table name is fixed
        this.TABLE_NAME = 'pre_generated_content';

        // LOCK: Only READY status is allowed
        this.REQUIRED_STATUS = 'READY';

        console.log('⚡ ContentQueue: LOCKED to READY-only mode');
    }

    // ═══════════════════════════════════════════════════════════
    // ⚡ FETCH NEXT DRILL (LOCKED IMPLEMENTATION)
    // ═══════════════════════════════════════════════════════════

    /**
     * Fetch next drill(s) for user
     * LOCKED: Only pulls content marked 'READY'
     * NO LIVE GENERATION ALLOWED
     */
    async fetchNextDrill(userId, options = {}) {
        const limit = options.limit || 20;
        const skillLevel = options.skillLevel || null;

        if (this.supabase) {
            let query = this.supabase
                .from(this.TABLE_NAME)
                .select('*')
                .eq('status', this.REQUIRED_STATUS)  // LOCKED: Only READY
                .limit(limit);

            // Optional skill level filter
            if (skillLevel) {
                query = query.eq('skill_level', skillLevel);
            }

            // Exclude already-seen content for this user
            if (userId) {
                const seenIds = await this.getSeenContentIds(userId);
                if (seenIds.length > 0) {
                    query = query.not('id', 'in', `(${seenIds.join(',')})`);
                }
            }

            // Order by creation time (oldest first = fair queue)
            query = query.order('created_at', { ascending: true });

            const { data, error } = await query;

            if (error) {
                console.error('⚡ ContentQueue: Fetch error -', error.message);
                throw error;
            }

            return data || [];
        }

        // Mock mode
        return this.getMockReadyContent(limit, skillLevel);
    }

    /**
     * Fetch single next drill
     */
    async fetchOne(userId, skillLevel = null) {
        const drills = await this.fetchNextDrill(userId, { limit: 1, skillLevel });
        return drills.length > 0 ? drills[0] : null;
    }

    /**
     * Fetch session bundle (multiple drills)
     */
    async fetchSessionBundle(userId, skillLevel, count = 10) {
        const drills = await this.fetchNextDrill(userId, { limit: count, skillLevel });

        return {
            sessionId: `session_${Date.now()}`,
            userId,
            skillLevel,
            drills,
            count: drills.length,
            status: 'READY_CONTENT_ONLY',
            createdAt: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ⚡ SEEN CONTENT TRACKING (NEVER REPEAT)
    // ═══════════════════════════════════════════════════════════

    /**
     * Get content IDs already seen by user
     */
    async getSeenContentIds(userId) {
        if (!this.supabase) return [];

        const { data, error } = await this.supabase
            .from('user_seen_content')
            .select('content_id')
            .eq('user_id', userId);

        if (error) return [];
        return data?.map(r => r.content_id) || [];
    }

    /**
     * Mark content as seen by user
     */
    async markAsSeen(userId, contentId) {
        if (!this.supabase) return;

        await this.supabase
            .from('user_seen_content')
            .upsert({
                user_id: userId,
                content_id: contentId,
                seen_at: new Date().toISOString()
            }, { onConflict: 'user_id,content_id' });
    }

    // ═══════════════════════════════════════════════════════════
    // ⚡ POOL STATUS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get count of READY content available
     */
    async getReadyCount(skillLevel = null) {
        if (this.supabase) {
            let query = this.supabase
                .from(this.TABLE_NAME)
                .select('*', { count: 'exact', head: true })
                .eq('status', this.REQUIRED_STATUS);

            if (skillLevel) {
                query = query.eq('skill_level', skillLevel);
            }

            const { count, error } = await query;
            if (error) return 0;
            return count || 0;
        }

        return 100; // Mock
    }

    /**
     * Check if pool has enough content
     */
    async hasEnoughContent(skillLevel, minCount = 20) {
        const count = await this.getReadyCount(skillLevel);
        return count >= minCount;
    }

    // ═══════════════════════════════════════════════════════════
    // ⚡ MOCK MODE (For testing without Supabase)
    // ═══════════════════════════════════════════════════════════

    getMockReadyContent(limit, skillLevel) {
        const content = [];
        for (let i = 0; i < limit; i++) {
            content.push({
                id: `ready_${Date.now()}_${i}`,
                scenario_id: `scenario_ready_${skillLevel || 'ALL'}_${i}`,
                skill_level: skillLevel || 'INTERMEDIATE',
                status: 'READY',  // LOCKED
                quality_grade: 'A+',
                scenario_data: {
                    heroHand: [
                        { rank: 'A', suit: '♠', id: 'A♠' },
                        { rank: 'K', suit: '♥', id: 'K♥' }
                    ],
                    board: { flop: null, turn: null, river: null },
                    gameState: {
                        format: 'CASH',
                        heroPosition: 'BTN',
                        street: 'PREFLOP',
                        pot: 1.5
                    }
                },
                gto_solution: {
                    bestMove: { type: 'RAISE', ev: 0.3 },
                    alternates: [
                        { id: 'ALT_1', label: '🟠 Exploitative', action: { type: 'CALL' } },
                        { id: 'ALT_2', label: '🟡 Simplified', action: { type: 'RAISE' } }
                    ]
                },
                created_at: new Date().toISOString()
            });
        }
        return content;
    }
}

// ═══════════════════════════════════════════════════════════════
// ⚡ LOCKED EXPORT (Single Source of Truth)
// ═══════════════════════════════════════════════════════════════

export default ContentQueue;
