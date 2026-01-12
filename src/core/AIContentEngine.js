/**
 * 🤖 SMARTER.POKER — AI CONTENT ENGINE (Async Queue Version)
 * Main Engine Class - Now uses queue-based async content generation
 * 
 * ARCHITECTURE:
 * 1. Engine drops jobs into content_generation_queue
 * 2. Background Worker picks up jobs and populates ready_content
 * 3. Training Orb ONLY pulls content with status: READY
 * 4. Users always play pre-generated content (instant experience)
 * 
 * Target: ORB_4 (Training) | ORB_6 (Assistant)
 */

import net from 'net';
import { ScenarioGenerator } from './ScenarioGenerator.js';
import { LeakSignalProcessor } from './LeakSignalProcessor.js';
import { QueueManager } from '../queue/QueueManager.js';
import { ContentPool } from '../queue/ContentPool.js';
import { EVENT_TYPES, SYSTEM_CONFIG } from '../config/constants.js';

export class AIContentEngine {
    constructor(options = {}) {
        this.config = { ...SYSTEM_CONFIG, ...options };

        // Core engines
        this.scenarioGenerator = new ScenarioGenerator(options.scenarioConfig);
        this.leakProcessor = new LeakSignalProcessor(options.leakConfig);

        // Queue system (NEW)
        this.queueManager = new QueueManager(options.queueConfig);
        this.contentPool = new ContentPool(options.poolConfig);

        // Bus connection
        this.busConnection = null;
        this.isConnected = false;

        // State
        this.isRunning = false;
        this.lastHeartbeat = null;
        this.heartbeatInterval = null;

        // Daily drill schedule
        this.drillGenerationTime = options.drillGenerationTime || '00:00';
        this.scheduledGeneration = null;

        // Mode: 'queue' (async) or 'live' (sync, legacy)
        this.mode = options.mode || 'queue';

        console.log(`🤖 ${this.config.ENGINE_NAME} v${this.config.ENGINE_VERSION} initialized (mode: ${this.mode})`);
    }

    // ═══════════════════════════════════════════════════════════
    // 🚀 LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    async start() {
        if (this.isRunning) return;

        console.log('🚀 AI_CONTENT_ENGINE: Starting...');

        await this.connectToBus();
        this.startHeartbeat();
        this.scheduleDailyGeneration();

        // Auto-replenish content if pool is low
        if (this.mode === 'queue') {
            await this.ensureContentPool();
        }

        this.isRunning = true;
        console.log('✅ AI_CONTENT_ENGINE: Running');

        return { status: 'RUNNING', mode: this.mode, timestamp: new Date().toISOString() };
    }

    async stop() {
        if (!this.isRunning) return;

        console.log('🛑 AI_CONTENT_ENGINE: Stopping...');

        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.scheduledGeneration) clearTimeout(this.scheduledGeneration);

        if (this.busConnection) {
            this.busConnection.end();
            this.busConnection = null;
        }

        this.isRunning = false;
        console.log('✅ AI_CONTENT_ENGINE: Stopped');

        return { status: 'STOPPED', timestamp: new Date().toISOString() };
    }

    // ═══════════════════════════════════════════════════════════
    // 🎯 MAIN API METHODS (Queue-Based)
    // ═══════════════════════════════════════════════════════════

    /**
     * Request daily drills (ASYNC - drops jobs into queue)
     * Instead of generating live, drops request_job into queue
     * Background worker picks up and populates ready_content
     */
    async requestDailyDrills() {
        if (this.mode === 'queue') {
            console.log('📊 AI_CONTENT_ENGINE: Dropping daily drill jobs into queue...');

            const jobs = await this.queueManager.dropDailyJobs({
                scenarioCount: 20
            });

            this.publishEvent(EVENT_TYPES.CONTENT_REFRESH_TRIGGERED, {
                jobCount: jobs.length,
                jobIds: jobs.map(j => j.id)
            });

            return {
                status: 'JOBS_QUEUED',
                message: 'Content generation jobs dropped into queue. Worker will process.',
                jobs: jobs.length,
                estimatedReadyIn: '5 minutes'
            };
        }

        // Legacy live mode
        return await this.generateDailyDrillsLive();
    }

    /**
     * Legacy: Generate daily drills synchronously (live)
     */
    async generateDailyDrillsLive() {
        console.log('📊 AI_CONTENT_ENGINE: Generating daily drills LIVE...');
        const result = await this.scenarioGenerator.generateDailyDrills();

        this.publishEvent(EVENT_TYPES.DAILY_DRILLS_GENERATED, {
            totalScenarios: result.metadata.totalScenarios,
            generationTimeMs: result.metadata.generationTimeMs
        });

        return result;
    }

    /**
     * Get drills for training (pulls from READY content pool)
     * This is INSTANT because content is pre-generated
     */
    async getDrillsForTraining(userId, skillLevel, count = 10) {
        if (this.mode === 'queue') {
            const bundle = await this.contentPool.getSessionBundle(userId, skillLevel, count);

            console.log(`📦 Served ${bundle.count} pre-generated drills to ${userId}`);
            return bundle;
        }

        // Legacy mode - use cached content
        const cached = this.scenarioGenerator.getCachedDrills();
        return cached?.drills?.[skillLevel] || [];
    }

    /**
     * Get a single random drill for quick play
     */
    async getRandomDrill(userId, skillLevel) {
        if (this.mode === 'queue') {
            const drill = await this.contentPool.getRandomDrill(userId, skillLevel);
            if (drill) {
                await this.contentPool.markServed(userId, drill.id);
            }
            return drill;
        }

        const drills = this.scenarioGenerator.getCachedDrills()?.drills?.[skillLevel];
        if (!drills || drills.length === 0) return null;
        return drills[Math.floor(Math.random() * drills.length)];
    }

    /**
     * Process user response (unchanged - still real-time)
     * HARD LAW: Shows GTO + 2 alternates on wrong answers
     */
    processResponse(userAction, gtoSolution, context = {}) {
        const result = this.leakProcessor.processResponse(userAction, gtoSolution, context);

        if (result.leakDetected) {
            this.publishEvent(EVENT_TYPES.LEAK_DETECTED, {
                userId: context.userId,
                sessionId: context.sessionId,
                signals: result.leakAnalysis.signals,
                evLoss: result.evaluation.evLoss
            });

            // Queue remediation content if pattern detected
            if (this.mode === 'queue' && result.leakAnalysis.patternWarning) {
                this.queueRemediationContent(context.userId, result.leakAnalysis.signals);
            }
        }

        return result;
    }

    /**
     * Queue remediation content for repeated leaks
     */
    async queueRemediationContent(userId, leakSignals) {
        try {
            const job = await this.queueManager.dropRemediationJob(userId, leakSignals);
            console.log(`📥 Queued remediation content for ${userId}: ${leakSignals.join(', ')}`);
            return job;
        } catch (error) {
            console.warn('⚠️ Failed to queue remediation:', error.message);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 POOL MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * Ensure content pool has enough pre-generated content
     */
    async ensureContentPool(minPerLevel = 20) {
        const replenishJobs = await this.queueManager.autoReplenish(minPerLevel);

        if (replenishJobs.length > 0) {
            console.log(`🔄 Queued ${replenishJobs.length} replenishment jobs`);
        }

        return replenishJobs;
    }

    /**
     * Get content pool health status
     */
    async getPoolHealth() {
        return await this.contentPool.getPoolHealth();
    }

    /**
     * Check queue status
     */
    async getQueueStatus() {
        return {
            pendingJobs: await this.queueManager.getPendingCount(),
            queueStats: await this.queueManager.getQueueStats()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // 📡 PENTAGON BUS INTEGRATION
    // ═══════════════════════════════════════════════════════════

    async connectToBus() {
        return new Promise((resolve, reject) => {
            try {
                this.busConnection = net.connect(this.config.BUS_PORT, this.config.BUS_HOST);

                this.busConnection.on('connect', () => {
                    this.isConnected = true;
                    console.log(`📡 Connected to Pentagon Bus at ${this.config.BUS_HOST}:${this.config.BUS_PORT}`);
                    this.publishEvent(EVENT_TYPES.ENGINE_HEARTBEAT, {
                        engine: this.config.ENGINE_NAME,
                        version: this.config.ENGINE_VERSION,
                        mode: this.mode,
                        status: 'ONLINE'
                    });
                    resolve();
                });

                this.busConnection.on('data', (data) => this.handleBusMessage(data));
                this.busConnection.on('error', (err) => {
                    console.warn(`⚠️ Bus connection error: ${err.message}`);
                    this.isConnected = false;
                });
                this.busConnection.on('close', () => {
                    this.isConnected = false;
                    console.log('📡 Bus connection closed');
                });

            } catch (err) {
                console.warn(`⚠️ Could not connect to bus: ${err.message}`);
                resolve();
            }
        });
    }

    handleBusMessage(data) {
        try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
                case 'CONTENT_REFRESH_REQUEST':
                    this.requestDailyDrills();
                    break;

                case 'GET_DRILLS':
                    this.getDrillsForTraining(message.userId, message.level, message.count)
                        .then(drills => {
                            this.publishEvent('DRILLS_RESPONSE', { drills, requestId: message.requestId });
                        });
                    break;

                case 'EVALUATE_RESPONSE':
                    const result = this.processResponse(
                        message.userAction,
                        message.gtoSolution,
                        message.context
                    );
                    this.publishEvent('EVALUATION_RESULT', { ...result, requestId: message.requestId });
                    break;
            }
        } catch (e) { }
    }

    publishEvent(type, payload) {
        if (!this.isConnected || !this.busConnection) return;
        try {
            this.busConnection.write(JSON.stringify({
                type,
                source: this.config.ENGINE_NAME,
                timestamp: new Date().toISOString(),
                payload
            }) + '\n');
        } catch (e) { }
    }

    // ═══════════════════════════════════════════════════════════
    // ⏰ SCHEDULING
    // ═══════════════════════════════════════════════════════════

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.lastHeartbeat = new Date().toISOString();
            this.publishEvent(EVENT_TYPES.ENGINE_HEARTBEAT, {
                engine: this.config.ENGINE_NAME,
                mode: this.mode,
                status: 'ALIVE',
                uptime: process.uptime()
            });
        }, this.config.HEARTBEAT_INTERVAL);
    }

    scheduleDailyGeneration() {
        const now = new Date();
        const [hours, minutes] = this.drillGenerationTime.split(':').map(Number);

        let nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);

        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        const msUntilRun = nextRun - now;
        console.log(`⏰ Next content generation scheduled for ${nextRun.toISOString()}`);

        this.scheduledGeneration = setTimeout(async () => {
            await this.requestDailyDrills();
            this.scheduleDailyGeneration();
        }, msUntilRun);
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 STATISTICS
    // ═══════════════════════════════════════════════════════════

    async getStats() {
        const stats = {
            engine: this.config.ENGINE_NAME,
            version: this.config.ENGINE_VERSION,
            mode: this.mode,
            isRunning: this.isRunning,
            isConnected: this.isConnected,
            lastHeartbeat: this.lastHeartbeat,
            leakStats: this.leakProcessor.getStats()
        };

        if (this.mode === 'queue') {
            stats.poolHealth = await this.getPoolHealth();
            stats.queueStatus = await this.getQueueStatus();
        } else {
            stats.scenarioStats = this.scenarioGenerator.getStats();
        }

        return stats;
    }

    getLeakProfile(userId) {
        return this.leakProcessor.getUserLeakProfile(userId);
    }

    async forceRefresh() {
        console.log('🔄 Force refreshing content...');
        return await this.requestDailyDrills();
    }

    clearLeakHistory(userId) {
        this.leakProcessor.clearHistory(userId);
        console.log(`🧹 Cleared leak history for ${userId || 'all users'}`);
    }
}

export default AIContentEngine;
