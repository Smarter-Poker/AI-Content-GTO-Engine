/**
 * 🤖 SMARTER.POKER — QUEUE MANAGER
 * Drops content generation jobs into the queue
 * 
 * Instead of generating 20 questions live, the Engine drops a 
 * 'request_job' into the content_generation_queue table.
 */

import { SKILL_LEVELS, SCENARIO_TYPES } from '../config/constants.js';
import { JOB_STATUSES, JOB_TYPES } from '../database/schema.js';

// Optional Supabase import (works without it in mock mode)
let createClient = null;
try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) {
    // Supabase not installed, will use mock mode
}


export class QueueManager {
    constructor(options = {}) {
        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            console.warn('⚠️ QueueManager: Supabase credentials not provided, using mock mode');
            this.supabase = null;
        }

        this.config = {
            defaultScenarioCount: options.defaultScenarioCount || 20,
            defaultPriority: options.defaultPriority || 5,
            ...options
        };

        // Local queue for mock mode
        this.mockQueue = [];
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 JOB CREATION API
    // ═══════════════════════════════════════════════════════════

    /**
     * Drop a content generation job into the queue
     * This replaces live generation with async processing
     */
    async dropJob(options = {}) {
        const job = {
            job_type: options.jobType || JOB_TYPES.DAILY_DRILLS,
            priority: options.priority || this.config.defaultPriority,
            skill_level: options.skillLevel,
            scenario_count: options.scenarioCount || this.config.defaultScenarioCount,
            scenario_types: options.scenarioTypes || null,
            status: JOB_STATUSES.PENDING,
            requested_by: options.requestedBy || 'SYSTEM',
            metadata: options.metadata || {}
        };

        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('content_generation_queue')
                .insert(job)
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to drop job:', error.message);
                throw error;
            }

            console.log(`📥 Job dropped: ${data.id} (${job.skill_level}, ${job.scenario_count} scenarios)`);
            return data;
        }

        // Mock mode
        const mockJob = {
            id: `mock_job_${Date.now()}`,
            ...job,
            created_at: new Date().toISOString()
        };
        this.mockQueue.push(mockJob);
        console.log(`📥 [MOCK] Job dropped: ${mockJob.id}`);
        return mockJob;
    }

    /**
     * Drop jobs for all skill levels (daily refresh)
     */
    async dropDailyJobs(options = {}) {
        console.log('📊 Dropping daily content generation jobs...');

        const jobs = [];
        for (const levelKey of Object.keys(SKILL_LEVELS)) {
            const job = await this.dropJob({
                skillLevel: levelKey,
                scenarioCount: options.scenarioCount || 20,
                priority: this.getLevelPriority(levelKey),
                jobType: JOB_TYPES.DAILY_DRILLS,
                requestedBy: 'DAILY_SCHEDULER',
                metadata: {
                    scheduledFor: new Date().toISOString(),
                    batchId: `daily_${new Date().toISOString().split('T')[0]}`
                }
            });
            jobs.push(job);
        }

        console.log(`✅ Dropped ${jobs.length} daily jobs`);
        return jobs;
    }

    /**
     * Drop urgent remediation job (higher priority)
     */
    async dropRemediationJob(userId, leakSignals, options = {}) {
        return await this.dropJob({
            skillLevel: options.skillLevel || 'INTERMEDIATE',
            scenarioCount: options.scenarioCount || 10,
            scenarioTypes: this.getRemediationTypes(leakSignals),
            priority: 2, // High priority
            jobType: JOB_TYPES.REMEDIATION,
            requestedBy: userId,
            metadata: {
                leakSignals,
                targetUserId: userId,
                urgency: 'HIGH'
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 QUEUE STATUS API
    // ═══════════════════════════════════════════════════════════

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        if (this.supabase) {
            const { data, error } = await this.supabase
                .from('queue_health')
                .select('*');

            if (error) throw error;
            return data;
        }

        // Mock stats
        return this.getMockQueueStats();
    }

    /**
     * Get pending jobs count
     */
    async getPendingCount() {
        if (this.supabase) {
            const { count, error } = await this.supabase
                .from('content_generation_queue')
                .select('*', { count: 'exact', head: true })
                .eq('status', JOB_STATUSES.PENDING);

            if (error) throw error;
            return count;
        }

        return this.mockQueue.filter(j => j.status === JOB_STATUSES.PENDING).length;
    }

    /**
     * Check if level needs content refresh
     */
    async needsRefresh(skillLevel, minReadyCount = 20) {
        if (this.supabase) {
            const { count, error } = await this.supabase
                .from('ready_content')
                .select('*', { count: 'exact', head: true })
                .eq('skill_level', skillLevel)
                .eq('status', 'READY');

            if (error) throw error;
            return count < minReadyCount;
        }

        return true; // Mock: always needs refresh
    }

    /**
     * Auto-replenish if content pool is low
     */
    async autoReplenish(minPerLevel = 20) {
        console.log('🔄 Checking content pool levels...');

        const jobsDropped = [];

        for (const levelKey of Object.keys(SKILL_LEVELS)) {
            if (await this.needsRefresh(levelKey, minPerLevel)) {
                console.log(`📉 ${levelKey} below threshold, dropping replenish job`);
                const job = await this.dropJob({
                    skillLevel: levelKey,
                    scenarioCount: minPerLevel,
                    priority: 3, // Higher than daily, lower than remediation
                    jobType: JOB_TYPES.DAILY_DRILLS,
                    requestedBy: 'AUTO_REPLENISH',
                    metadata: { reason: 'LOW_POOL' }
                });
                jobsDropped.push(job);
            }
        }

        return jobsDropped;
    }

    // ═══════════════════════════════════════════════════════════
    // 🔧 HELPERS
    // ═══════════════════════════════════════════════════════════

    getLevelPriority(levelKey) {
        // Higher skill levels = higher priority (more engaged users)
        const priorities = {
            ELITE: 3,
            EXPERT: 4,
            ADVANCED: 5,
            INTERMEDIATE: 6,
            BEGINNER: 7
        };
        return priorities[levelKey] || 5;
    }

    getRemediationTypes(leakSignals) {
        const signalToType = {
            'OVER_FOLDING': [SCENARIO_TYPES.PREFLOP_BLIND_DEFENSE, SCENARIO_TYPES.MULTISTREET_BLUFF_CATCHER],
            'PASSIVE_PLAY': [SCENARIO_TYPES.POSTFLOP_CBET, SCENARIO_TYPES.MULTISTREET_VALUE_BET],
            'OVER_AGGRESSION': [SCENARIO_TYPES.POSTFLOP_CHECK_RAISE],
            'ICM_SUICIDE': [SCENARIO_TYPES.TOURNAMENT_ICM, SCENARIO_TYPES.TOURNAMENT_BUBBLE],
            'BUBBLE_FEAR': [SCENARIO_TYPES.TOURNAMENT_BUBBLE]
        };

        const types = new Set();
        for (const signal of leakSignals) {
            const mapped = signalToType[signal];
            if (mapped) mapped.forEach(t => types.add(t));
        }

        return types.size > 0 ? Array.from(types) : null;
    }

    getMockQueueStats() {
        const stats = {};
        for (const job of this.mockQueue) {
            stats[job.status] = (stats[job.status] || 0) + 1;
        }
        return Object.entries(stats).map(([status, count]) => ({
            status,
            job_count: count
        }));
    }

    // For testing
    getMockQueue() {
        return this.mockQueue;
    }

    clearMockQueue() {
        this.mockQueue = [];
    }
}

export default QueueManager;
