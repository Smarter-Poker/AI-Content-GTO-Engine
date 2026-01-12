/**
 * ⏰ SMARTER.POKER — DAILY GENERATION CRON HOOK
 * 
 * @task DAILY_A+_GENERATION_HOOK
 * ---------------------------------------------------------
 * Logic: At 00:00 UTC, call the AI engine to generate 20 fresh questions 
 * for every skill level and push to the queue.
 */

import { QueueManager } from '../queue/QueueManager.js';
import { SKILL_LEVELS } from '../config/constants.js';

export class DailyGenerationCron {
    constructor(options = {}) {
        this.queueManager = options.queueManager || new QueueManager(options.queueConfig);

        this.config = {
            generationTimeUTC: options.generationTimeUTC || '00:00',  // 00:00 UTC
            questionsPerLevel: options.questionsPerLevel || 20,
            enabled: options.enabled !== false,
            ...options
        };

        // State
        this.scheduledTimer = null;
        this.lastGeneration = null;
        this.isRunning = false;

        console.log('⏰ DailyGenerationCron initialized');
    }

    // ═══════════════════════════════════════════════════════════
    // 🚀 LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    start() {
        if (this.isRunning) return;

        console.log('⏰ DailyGenerationCron: Starting...');
        this.isRunning = true;

        // Schedule next generation
        this.scheduleNextGeneration();

        console.log(`⏰ Daily generation scheduled at ${this.config.generationTimeUTC} UTC`);
        return { status: 'RUNNING', nextRun: this.getNextRunTime() };
    }

    stop() {
        if (!this.isRunning) return;

        console.log('⏰ DailyGenerationCron: Stopping...');

        if (this.scheduledTimer) {
            clearTimeout(this.scheduledTimer);
            this.scheduledTimer = null;
        }

        this.isRunning = false;
        console.log('⏰ DailyGenerationCron: Stopped');
        return { status: 'STOPPED' };
    }

    // ═══════════════════════════════════════════════════════════
    // ⏰ SCHEDULING
    // ═══════════════════════════════════════════════════════════

    scheduleNextGeneration() {
        const msUntilRun = this.getMsUntilNextRun();

        console.log(`⏰ Next generation in ${Math.round(msUntilRun / 1000 / 60)} minutes`);

        this.scheduledTimer = setTimeout(async () => {
            await this.triggerDailyGeneration();

            // Reschedule for next day
            if (this.isRunning) {
                this.scheduleNextGeneration();
            }
        }, msUntilRun);
    }

    getMsUntilNextRun() {
        const now = new Date();
        const [hours, minutes] = this.config.generationTimeUTC.split(':').map(Number);

        // Create target time in UTC
        const target = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            hours,
            minutes,
            0,
            0
        ));

        // If target time has passed today, schedule for tomorrow
        if (target <= now) {
            target.setUTCDate(target.getUTCDate() + 1);
        }

        return target - now;
    }

    getNextRunTime() {
        const msUntilRun = this.getMsUntilNextRun();
        return new Date(Date.now() + msUntilRun).toISOString();
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 TRIGGER DAILY GENERATION
    // ═══════════════════════════════════════════════════════════

    /**
     * Trigger daily generation at 00:00 UTC
     * Generates 20 fresh questions for every skill level
     * Pushes to the queue
     */
    async triggerDailyGeneration() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('⏰ DAILY A+ GENERATION: Starting...');
        console.log(`   Time: ${new Date().toISOString()}`);
        console.log(`   Questions per level: ${this.config.questionsPerLevel}`);
        console.log('═══════════════════════════════════════════════════════════');

        const startTime = Date.now();
        const results = {
            timestamp: new Date().toISOString(),
            jobs: [],
            errors: [],
            totalJobsDropped: 0
        };

        try {
            // Generate for every skill level
            for (const levelKey of Object.keys(SKILL_LEVELS)) {
                try {
                    console.log(`📊 Dropping job for ${levelKey}...`);

                    const job = await this.queueManager.dropJob({
                        skillLevel: levelKey,
                        scenarioCount: this.config.questionsPerLevel,
                        priority: this.getLevelPriority(levelKey),
                        jobType: 'DAILY_DRILLS',
                        requestedBy: 'DAILY_CRON',
                        metadata: {
                            trigger: 'DAILY_GENERATION_CRON',
                            scheduledTime: this.config.generationTimeUTC,
                            generationDate: new Date().toISOString().split('T')[0],
                            batchId: `daily_${Date.now()}`
                        }
                    });

                    results.jobs.push({
                        level: levelKey,
                        jobId: job.id,
                        scenarioCount: this.config.questionsPerLevel,
                        status: 'QUEUED'
                    });

                    results.totalJobsDropped++;

                } catch (error) {
                    console.error(`❌ Failed to drop job for ${levelKey}:`, error.message);
                    results.errors.push({
                        level: levelKey,
                        error: error.message
                    });
                }
            }

            const duration = Date.now() - startTime;

            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ DAILY A+ GENERATION: Complete');
            console.log(`   Jobs dropped: ${results.totalJobsDropped}`);
            console.log(`   Errors: ${results.errors.length}`);
            console.log(`   Duration: ${duration}ms`);
            console.log('═══════════════════════════════════════════════════════════');

            this.lastGeneration = {
                timestamp: new Date().toISOString(),
                results
            };

            return results;

        } catch (error) {
            console.error('❌ DAILY GENERATION FAILED:', error.message);
            results.errors.push({ global: error.message });
            throw error;
        }
    }

    /**
     * Force trigger generation (manual override)
     */
    async forceGenerate() {
        console.log('🔄 Force triggering daily generation...');
        return await this.triggerDailyGeneration();
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

    getStatus() {
        return {
            isRunning: this.isRunning,
            enabled: this.config.enabled,
            generationTimeUTC: this.config.generationTimeUTC,
            questionsPerLevel: this.config.questionsPerLevel,
            nextRun: this.isRunning ? this.getNextRunTime() : null,
            lastGeneration: this.lastGeneration
        };
    }
}

export default DailyGenerationCron;
