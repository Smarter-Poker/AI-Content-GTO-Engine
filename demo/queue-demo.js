/**
 * 🤖 SMARTER.POKER — ASYNC QUEUE WORKER DEMO
 * Demonstrates the new queue-based content generation pattern
 * 
 * ARCHITECTURE:
 * 1. Engine drops jobs into content_generation_queue (instant)
 * 2. BackgroundWorker picks up jobs and populates ready_content
 * 3. Training Orb ONLY pulls content with status: READY
 * 4. Users always play pre-generated content (instant experience)
 */

import {
    AIContentEngine,
    QueueManager,
    BackgroundWorker,
    ContentPool,
    Schema
} from '../src/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🤖 SMARTER.POKER — ASYNC QUEUE WORKER DEMO');
console.log('   Architecture: Queue-Based Content Generation');
console.log('   Pattern: Engine → Queue → Worker → Ready Pool → Training Orb');
console.log('═══════════════════════════════════════════════════════════════');
console.log();

async function runDemo() {
    // ═══════════════════════════════════════════════════════════
    // DEMO 1: Show Supabase Schema
    // ═══════════════════════════════════════════════════════════

    console.log('📊 DEMO 1: Supabase Tables Required');
    console.log('───────────────────────────────────────────────────────────');
    console.log();
    console.log('   📋 content_generation_queue');
    console.log('      - Jobs dropped by Engine');
    console.log('      - Fields: job_type, skill_level, scenario_count, status, priority');
    console.log('      - Statuses: PENDING → PROCESSING → COMPLETED/FAILED');
    console.log();
    console.log('   📋 ready_content');
    console.log('      - Pre-generated content pool');
    console.log('      - Fields: scenario_data, gto_solution, status, skill_level');
    console.log('      - CRITICAL: Training Orb ONLY reads status = "READY"');
    console.log();
    console.log('   📋 user_seen_content');
    console.log('      - Never-repeat tracking');
    console.log('      - Ensures users never see same content twice');
    console.log();

    // ═══════════════════════════════════════════════════════════
    // DEMO 2: Queue Manager - Dropping Jobs
    // ═══════════════════════════════════════════════════════════

    console.log('📥 DEMO 2: Queue Manager - Dropping Jobs (INSTANT)');
    console.log('───────────────────────────────────────────────────────────');

    const queueManager = new QueueManager();

    // Drop a single job
    console.log('   Dropping single job for INTERMEDIATE level...');
    const singleJob = await queueManager.dropJob({
        skillLevel: 'INTERMEDIATE',
        scenarioCount: 20,
        priority: 5
    });
    console.log(`   ✓ Job dropped: ${singleJob.id}`);
    console.log(`     Status: ${singleJob.status}`);
    console.log(`     Scenarios requested: ${singleJob.scenario_count}`);
    console.log();

    // Drop daily jobs for all levels
    console.log('   Dropping daily jobs for ALL skill levels...');
    const dailyJobs = await queueManager.dropDailyJobs({ scenarioCount: 20 });
    console.log(`   ✓ ${dailyJobs.length} jobs dropped (one per skill level)`);
    console.log();

    // ═══════════════════════════════════════════════════════════
    // DEMO 3: Content Pool - Pulling READY Content
    // ═══════════════════════════════════════════════════════════

    console.log('📦 DEMO 3: Content Pool - Pulling READY Content (INSTANT)');
    console.log('───────────────────────────────────────────────────────────');

    const contentPool = new ContentPool();

    // Get fresh content for a user
    console.log('   Getting fresh content for user "demo_player_1"...');
    const freshContent = await contentPool.getFreshContent('demo_player_1', 'INTERMEDIATE', 3);
    console.log(`   ✓ Retrieved ${freshContent.length} pre-generated drills`);

    if (freshContent.length > 0) {
        console.log();
        console.log('   📋 Sample Pre-Generated Drill:');
        console.log(`      ID: ${freshContent[0].scenarioId}`);
        console.log(`      Type: ${freshContent[0].type}`);
        console.log(`      Level: ${freshContent[0].level}`);
        console.log(`      Status: ${freshContent[0].status} (CRITICAL: Must be READY)`);
        console.log(`      Quality: ${freshContent[0].quality}`);
        console.log(`      Hero Hand: ${freshContent[0].heroHand.map(c => c.id).join(', ')}`);
    }
    console.log();

    // Get a training session bundle
    console.log('   Getting training session bundle (10 drills)...');
    const bundle = await contentPool.getSessionBundle('demo_player_1', 'ADVANCED', 10);
    console.log(`   ✓ Session ${bundle.sessionId}`);
    console.log(`     Drills: ${bundle.count}`);
    console.log(`     Level: ${bundle.skillLevel}`);
    console.log();

    // ═══════════════════════════════════════════════════════════
    // DEMO 4: Engine in Queue Mode
    // ═══════════════════════════════════════════════════════════

    console.log('🤖 DEMO 4: AI Content Engine (Queue Mode)');
    console.log('───────────────────────────────────────────────────────────');

    const engine = new AIContentEngine({ mode: 'queue' });

    console.log(`   Mode: ${engine.mode}`);
    console.log();

    // Request daily drills (drops jobs instead of live generation)
    console.log('   Requesting daily drills (drops jobs, does NOT generate live)...');
    const requestResult = await engine.requestDailyDrills();
    console.log(`   ✓ Status: ${requestResult.status}`);
    console.log(`     Message: ${requestResult.message}`);
    console.log(`     Jobs queued: ${requestResult.jobs}`);
    console.log(`     Estimated ready: ${requestResult.estimatedReadyIn}`);
    console.log();

    // Get drills for training (pulls from READY pool)
    console.log('   Getting drills for training (pulls from READY pool)...');
    const trainingDrills = await engine.getDrillsForTraining('demo_player_2', 'EXPERT', 5);
    console.log(`   ✓ Served ${trainingDrills.count} pre-generated drills`);
    console.log(`     Session: ${trainingDrills.sessionId}`);
    console.log();

    // ═══════════════════════════════════════════════════════════
    // DEMO 5: Background Worker (Would Process Jobs)
    // ═══════════════════════════════════════════════════════════

    console.log('🔧 DEMO 5: Background Worker (Agent)');
    console.log('───────────────────────────────────────────────────────────');

    const worker = new BackgroundWorker({ workerId: 'demo_worker_1' });

    console.log(`   Worker ID: ${worker.workerId}`);
    console.log(`   Poll Interval: ${worker.config.pollIntervalMs}ms`);
    console.log(`   Batch Size: ${worker.config.batchSize}`);
    console.log();
    console.log('   Worker lifecycle in production:');
    console.log('   1. worker.start() → begins polling for PENDING jobs');
    console.log('   2. Picks up job from content_generation_queue');
    console.log('   3. Generates scenarios using ScenarioGenerator');
    console.log('   4. Inserts into ready_content with status: READY');
    console.log('   5. Marks job as COMPLETED');
    console.log('   6. Repeats until stopped');
    console.log();

    // ═══════════════════════════════════════════════════════════
    // DEMO 6: User Experience Flow
    // ═══════════════════════════════════════════════════════════

    console.log('👤 DEMO 6: User Experience Flow');
    console.log('───────────────────────────────────────────────────────────');
    console.log();
    console.log('   BEFORE (Live Generation):');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ User clicks "Start Training"                        │');
    console.log('   │     ↓                                               │');
    console.log('   │ Engine generates 10 scenarios (2-5 seconds wait)    │');
    console.log('   │     ↓                                               │');
    console.log('   │ User starts playing (delayed experience)            │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log();
    console.log('   AFTER (Queue-Based / Pre-Generated):');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ User clicks "Start Training"                        │');
    console.log('   │     ↓                                               │');
    console.log('   │ Pool returns pre-generated READY content (INSTANT)  │');
    console.log('   │     ↓                                               │');
    console.log('   │ User starts playing immediately! 🚀                 │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log();
    console.log('   Background (invisible to user):');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ Scheduler drops daily jobs → Queue                  │');
    console.log('   │     ↓                                               │');
    console.log('   │ Worker picks up jobs → Generates scenarios          │');
    console.log('   │     ↓                                               │');
    console.log('   │ Inserts into ready_content with status: READY       │');
    console.log('   │     ↓                                               │');
    console.log('   │ Content available ~1 hour before user needs it      │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log();

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ ASYNC QUEUE WORKER DEMO COMPLETE');
    console.log();
    console.log('   Key Components:');
    console.log('   ✓ QueueManager: Drops jobs into content_generation_queue');
    console.log('   ✓ BackgroundWorker: Picks up jobs, populates ready_content');
    console.log('   ✓ ContentPool: Pulls ONLY status: READY content');
    console.log('   ✓ AIContentEngine: Orchestrates everything in queue mode');
    console.log();
    console.log('   Supabase Tables:');
    console.log('   ✓ content_generation_queue (jobs)');
    console.log('   ✓ ready_content (pre-generated scenarios)');
    console.log('   ✓ user_seen_content (never-repeat tracking)');
    console.log();
    console.log('   User Experience:');
    console.log('   ✓ INSTANT content delivery (no waiting)');
    console.log('   ✓ Content generated 1 hour ahead');
    console.log('   ✓ Never see same content twice');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log();
    console.log('📋 To deploy: Run the migration SQL in Supabase SQL Editor:');
    console.log('   import { Schema } from "./src/index.js"');
    console.log('   console.log(Schema.FULL_MIGRATION)');
}

runDemo().catch(console.error);
