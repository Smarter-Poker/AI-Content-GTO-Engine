/**
 * 🤖 SMARTER.POKER — CONTENT POOL
 * Training Orb API for retrieving READY content
 * 
 * CRITICAL: This module ONLY pulls content with status: READY
 * Users always play content generated 1 hour ago (instant experience)
 */

import { CONTENT_STATUSES } from '../database/schema.js';

// Optional Supabase import (works without it in mock mode)
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }


export class ContentPool {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY;

        if (this.supabaseUrl && this.supabaseKey) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            console.warn('⚠️ ContentPool: Supabase credentials not provided, using mock mode');
            this.supabase = null;
        }

        // Mock content for testing
        this.mockContent = new Map();

        console.log('📦 ContentPool initialized');
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 TRAINING ORB API (ONLY READY CONTENT)
    // ═══════════════════════════════════════════════════════════

    /**
     * Get fresh content for training session
     * CRITICAL: Only returns content with status: READY
     * Never returns content the user has seen before
     */
    async getFreshContent(userId, skillLevel, count = 1) {
        if (this.supabase) {
            // Use the database function for never-repeat guarantee
            const { data, error } = await this.supabase
                .rpc('get_fresh_content', {
                    p_user_id: userId,
                    p_skill_level: skillLevel,
                    p_count: count
                });

            if (error) {
                console.error('❌ Failed to get fresh content:', error.message);
                throw error;
            }

            // Format for Training Orb consumption
            return data.map(this.formatForTraining);
        }

        // Mock mode
        return this.getMockContent(skillLevel, count);
    }

    /**
     * Get content for specific scenario type
     */
    async getContentByType(userId, skillLevel, scenarioType, count = 1) {
        if (this.supabase) {
            // Get content not seen by user, filtered by type
            const { data: seenIds } = await this.supabase
                .from('user_seen_content')
                .select('content_id')
                .eq('user_id', userId);

            const excludeIds = seenIds?.map(r => r.content_id) || [];

            let query = this.supabase
                .from('ready_content')
                .select('*')
                .eq('status', CONTENT_STATUSES.READY)  // CRITICAL: Only READY
                .eq('skill_level', skillLevel)
                .eq('scenario_type', scenarioType)
                .order('generated_at', { ascending: false })
                .limit(count);

            if (excludeIds.length > 0) {
                query = query.not('id', 'in', `(${excludeIds.join(',')})`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data.map(this.formatForTraining);
        }

        return this.getMockContent(skillLevel, count);
    }

    /**
     * Mark content as served (for tracking and never-repeat)
     */
    async markServed(userId, contentId) {
        if (this.supabase) {
            const { error } = await this.supabase
                .rpc('mark_content_served', {
                    p_content_id: contentId,
                    p_user_id: userId
                });

            if (error) {
                console.error('❌ Failed to mark content served:', error.message);
            }
        }
    }

    /**
     * Get a single random drill (for quick play)
     */
    async getRandomDrill(userId, skillLevel) {
        const content = await this.getFreshContent(userId, skillLevel, 1);
        return content.length > 0 ? content[0] : null;
    }

    /**
     * Get a training session bundle (multiple drills)
     */
    async getSessionBundle(userId, skillLevel, sessionSize = 10) {
        const content = await this.getFreshContent(userId, skillLevel, sessionSize);

        return {
            sessionId: `session_${Date.now()}`,
            userId,
            skillLevel,
            drills: content,
            count: content.length,
            createdAt: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 POOL HEALTH CHECK
    // ═══════════════════════════════════════════════════════════

    /**
     * Check content pool health for a skill level
     */
    async getPoolHealth(skillLevel = null) {
        if (this.supabase) {
            let query = this.supabase
                .from('content_pool_health')
                .select('*');

            if (skillLevel) {
                query = query.eq('skill_level', skillLevel);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        }

        return [{
            skill_level: skillLevel || 'ALL',
            ready_count: 100,
            served_count: 50,
            expired_count: 10
        }];
    }

    /**
     * Check if pool has enough content for a user session
     */
    async hasEnoughContent(skillLevel, minCount = 10) {
        const health = await this.getPoolHealth(skillLevel);
        const levelHealth = health.find(h => h.skill_level === skillLevel);
        return levelHealth && levelHealth.ready_count >= minCount;
    }

    /**
     * Get available content count
     */
    async getAvailableCount(skillLevel) {
        if (this.supabase) {
            const { count, error } = await this.supabase
                .from('ready_content')
                .select('*', { count: 'exact', head: true })
                .eq('status', CONTENT_STATUSES.READY)
                .eq('skill_level', skillLevel);

            if (error) throw error;
            return count;
        }

        return 100; // Mock
    }

    // ═══════════════════════════════════════════════════════════
    // 🔧 FORMATTING
    // ═══════════════════════════════════════════════════════════

    /**
     * Format database record for Training Orb consumption
     */
    formatForTraining(record) {
        return {
            id: record.id,
            scenarioId: record.scenario_id,
            type: record.scenario_type,
            level: record.skill_level,
            complexity: record.complexity,
            quality: record.quality_grade,

            // Scenario data
            heroHand: record.scenario_data.heroHand,
            board: record.scenario_data.board,
            villainRanges: record.scenario_data.villainRanges,
            gameState: record.scenario_data.gameState,

            // GTO solution
            gtoSolution: record.gto_solution,

            // Metadata
            tags: record.tags,
            generatedAt: record.generated_at,

            // For display
            status: 'READY'
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 🧪 MOCK MODE
    // ═══════════════════════════════════════════════════════════

    getMockContent(skillLevel, count) {
        // Generate mock content for testing without database
        const mockScenarios = [];

        for (let i = 0; i < count; i++) {
            mockScenarios.push({
                id: `mock_${Date.now()}_${i}`,
                scenarioId: `scenario_mock_${skillLevel}_${Date.now()}_${i}`,
                type: 'preflop_opening',
                level: skillLevel,
                complexity: 3,
                quality: 'A+',

                heroHand: [
                    { rank: 'A', suit: '♠', id: 'A♠' },
                    { rank: 'K', suit: '♥', id: 'K♥' }
                ],
                board: { flop: null, turn: null, river: null },
                villainRanges: [{ position: 'CO', range: 'Top 15%' }],
                gameState: {
                    format: 'CASH',
                    players: 6,
                    heroPosition: 'BTN',
                    street: 'PREFLOP',
                    pot: 1.5,
                    effectiveStack: 100
                },

                gtoSolution: {
                    bestMove: { type: 'RAISE', sizing: { multiplier: 0.75 }, ev: 0.3 },
                    alternates: [
                        { id: 'ALT_EXPLOIT', type: 'ALT_EXPLOIT', label: '🟠 Exploitative', action: { type: 'CALL' }, reasoning: 'Trap', points: 70 },
                        { id: 'ALT_SIMPLE', type: 'ALT_SIMPLE', label: '🟡 Simplified', action: { type: 'RAISE' }, reasoning: 'Standard', points: 85 }
                    ]
                },

                tags: ['preflop_opening', 'CASH', 'BTN'],
                generatedAt: new Date().toISOString(),
                status: 'READY'
            });
        }

        return mockScenarios;
    }

    /**
     * Add mock content for testing
     */
    addMockContent(content) {
        this.mockContent.set(content.id, content);
    }
}

export default ContentPool;
