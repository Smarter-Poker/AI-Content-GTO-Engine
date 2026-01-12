/**
 * 🤖 SMARTER.POKER — BACKGROUND WORKER (Agent)
 * Picks up jobs from content_generation_queue and populates ready_content
 * 
 * This worker runs as a background process, continuously processing
 * pending jobs to ensure the content pool is always full.
 * 
 * The Training Orb ONLY pulls content with status: READY
 * This makes the user experience instant (content generated 1 hour ago)
 */

import { ScenarioGenerator } from '../core/ScenarioGenerator.js';
import { JOB_STATUSES, CONTENT_STATUSES } from '../database/schema.js';

// Optional imports (works without them in mock mode)
let createClient = null;
let uuidv4 = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

try {
    const supabase = await import('@supabase/supabase-js');
    createClient = supabase.createClient;
} catch (e) { }

try {
    const uuid = await import('uuid');
    uuidv4 = uuid.v4;
} catch (e) { }


export class BackgroundWorker {
    constructor(options = {}) {
        this.workerId = options.workerId || `worker_${uuidv4().slice(0, 8)}`;

        this.supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = options.supabaseKey || process.env.SUPABASE_SERVICE_KEY;

        if (this.supabaseUrl && this.supabaseKey) {
            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
        } else {
            console.warn(`⚠️ Worker ${this.workerId}: Supabase credentials not provided, using mock mode`);
            this.supabase = null;
        }

        this.scenarioGenerator = new ScenarioGenerator(options.generatorConfig);

        this.config = {
            pollIntervalMs: options.pollIntervalMs || 5000,    // Check for jobs every 5s
            batchSize: options.batchSize || 10,                // Process up to 10 scenarios per batch
            maxConsecutiveErrors: options.maxConsecutiveErrors || 5,
            idleBackoffMs: options.idleBackoffMs || 30000,     // Back off when no jobs
            ...options
        };

        // State
        this.isRunning = false;
        this.pollInterval = null;
        this.consecutiveErrors = 0;
        this.stats = {
            jobsProcessed: 0,
            scenariosGenerated: 0,
            errors: 0,
            startedAt: null
        };

        console.log(`🔧 Worker ${this.workerId} initialized`);
    }

    // ═══════════════════════════════════════════════════════════
    // 🚀 LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    async start() {
        if (this.isRunning) return;

        console.log(`🚀 Worker ${this.workerId}: Starting...`);
        this.isRunning = true;
        this.stats.startedAt = new Date().toISOString();

        // Initial poll
        await this.poll();

        // Start polling loop
        this.pollInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.poll();
            }
        }, this.config.pollIntervalMs);

        console.log(`✅ Worker ${this.workerId}: Running (poll every ${this.config.pollIntervalMs}ms)`);
        return { status: 'RUNNING', workerId: this.workerId };
    }

    async stop() {
        if (!this.isRunning) return;

        console.log(`🛑 Worker ${this.workerId}: Stopping...`);
        this.isRunning = false;

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        console.log(`✅ Worker ${this.workerId}: Stopped`);
        return { status: 'STOPPED', workerId: this.workerId, stats: this.stats };
    }

    // ═══════════════════════════════════════════════════════════
    // 🔄 JOB PROCESSING
    // ═══════════════════════════════════════════════════════════

    async poll() {
        try {
            const job = await this.pickNextJob();

            if (!job) {
                // No jobs available, back off slightly
                return;
            }

            console.log(`📋 Worker ${this.workerId}: Processing job ${job.id} (${job.skill_level}, ${job.scenario_count} scenarios)`);

            await this.processJob(job);

            this.consecutiveErrors = 0;

        } catch (error) {
            this.consecutiveErrors++;
            this.stats.errors++;
            console.error(`❌ Worker ${this.workerId}: Poll error -`, error.message);

            if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
                console.error(`❌ Worker ${this.workerId}: Too many consecutive errors, stopping`);
                await this.stop();
            }
        }
    }

    async pickNextJob() {
        if (this.supabase) {
            // Use the atomic pick_next_job function
            const { data, error } = await this.supabase
                .rpc('pick_next_job', { p_worker_id: this.workerId });

            if (error) {
                // No job available or error
                if (error.message.includes('null')) return null;
                throw error;
            }

            return data;
        }

        // Mock mode - return null (no jobs)
        return null;
    }

    async processJob(job) {
        const startTime = Date.now();

        try {
            // Generate scenarios using existing generator
            const scenarios = await this.generateScenariosForJob(job);

            // Insert into ready_content
            await this.insertReadyContent(job, scenarios);

            // Mark job as completed
            await this.completeJob(job.id, scenarios.length);

            const duration = Date.now() - startTime;
            console.log(`✅ Job ${job.id} completed: ${scenarios.length} scenarios in ${duration}ms`);

            this.stats.jobsProcessed++;
            this.stats.scenariosGenerated += scenarios.length;

        } catch (error) {
            console.error(`❌ Job ${job.id} failed:`, error.message);
            await this.failJob(job.id, error.message);
            throw error;
        }
    }

    async generateScenariosForJob(job) {
        const scenarios = [];
        const level = job.skill_level;
        const count = job.scenario_count;

        // Generate in batches to avoid memory issues
        for (let i = 0; i < count; i += this.config.batchSize) {
            const batchSize = Math.min(this.config.batchSize, count - i);

            for (let j = 0; j < batchSize; j++) {
                const scenarioType = this.selectScenarioType(job, i + j);

                const scenario = await this.scenarioGenerator.generateScenario({
                    type: scenarioType,
                    level: level,
                    complexity: this.getComplexity(level, i + j),
                    index: i + j
                });

                if (scenario) {
                    scenarios.push(scenario);
                }
            }
        }

        return scenarios;
    }

    async insertReadyContent(job, scenarios) {
        if (!scenarios.length) return;

        const contentRecords = scenarios.map(scenario => ({
            scenario_id: scenario.id,
            content_type: 'POKER_SCENARIO',
            skill_level: job.skill_level,
            scenario_type: scenario.type,
            complexity: scenario.complexity,
            status: CONTENT_STATUSES.READY,  // CRITICAL: Set to READY
            quality_grade: scenario.quality || 'A+',
            scenario_data: {
                heroHand: scenario.heroHand,
                board: scenario.board,
                villainRanges: scenario.villainRanges,
                gameState: scenario.gameState,
                tags: scenario.tags
            },
            gto_solution: scenario.gtoSolution,
            tags: scenario.tags,
            generated_by_job: job.id,
            worker_id: this.workerId,
            ready_at: new Date().toISOString()
        }));

        if (this.supabase) {
            const { error } = await this.supabase
                .from('ready_content')
                .insert(contentRecords);

            if (error) throw error;
        }

        console.log(`📦 Inserted ${contentRecords.length} scenarios into ready_content`);
    }

    async completeJob(jobId, resultCount) {
        if (this.supabase) {
            const { error } = await this.supabase
                .from('content_generation_queue')
                .update({
                    status: JOB_STATUSES.COMPLETED,
                    completed_at: new Date().toISOString(),
                    result_count: resultCount
                })
                .eq('id', jobId);

            if (error) throw error;
        }
    }

    async failJob(jobId, errorMessage) {
        if (this.supabase) {
            // Check if max attempts reached
            const { data: job } = await this.supabase
                .from('content_generation_queue')
                .select('attempts, max_attempts')
                .eq('id', jobId)
                .single();

            const newStatus = job && job.attempts >= job.max_attempts
                ? JOB_STATUSES.FAILED
                : JOB_STATUSES.PENDING;  // Return to pending for retry

            const { error } = await this.supabase
                .from('content_generation_queue')
                .update({
                    status: newStatus,
                    error_message: errorMessage,
                    worker_id: null,
                    locked_at: null
                })
                .eq('id', jobId);

            if (error) throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 🔧 HELPERS
    // ═══════════════════════════════════════════════════════════

    selectScenarioType(job, index) {
        if (job.scenario_types && job.scenario_types.length > 0) {
            return job.scenario_types[index % job.scenario_types.length];
        }

        // Get types for skill level from generator
        const types = this.scenarioGenerator.getScenarioTypesForLevel(job.skill_level);
        return types[index % types.length];
    }

    getComplexity(level, index) {
        const baseComplexity = {
            BEGINNER: 1,
            INTERMEDIATE: 3,
            ADVANCED: 5,
            EXPERT: 7,
            ELITE: 9
        };

        // Add some variance
        return Math.min(10, (baseComplexity[level] || 5) + Math.floor(index / 5));
    }

    getStats() {
        return {
            workerId: this.workerId,
            isRunning: this.isRunning,
            ...this.stats,
            uptime: this.stats.startedAt
                ? Date.now() - new Date(this.stats.startedAt).getTime()
                : 0
        };
    }
}

export default BackgroundWorker;
