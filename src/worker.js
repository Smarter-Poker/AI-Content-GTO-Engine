/**
 * 🤖 SMARTER.POKER — BACKGROUND WORKER ENTRY POINT
 * Run this as a separate process to continuously process queue jobs
 * 
 * Usage: npm run worker
 * 
 * Environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_KEY: Your Supabase service role key
 */

import { BackgroundWorker } from './queue/BackgroundWorker.js';

const WORKER_CONFIG = {
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL || '5000'),
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '10'),
    maxConsecutiveErrors: parseInt(process.env.WORKER_MAX_ERRORS || '5')
};

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔧 SMARTER.POKER — BACKGROUND WORKER');
    console.log('   Processes content_generation_queue → populates ready_content');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log();

    const worker = new BackgroundWorker(WORKER_CONFIG);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await worker.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await worker.stop();
        process.exit(0);
    });

    // Start the worker
    await worker.start();

    console.log();
    console.log('Worker is running. Press Ctrl+C to stop.');
    console.log(`Poll interval: ${WORKER_CONFIG.pollIntervalMs}ms`);
    console.log(`Batch size: ${WORKER_CONFIG.batchSize}`);
}

main().catch(err => {
    console.error('❌ Worker failed to start:', err);
    process.exit(1);
});
