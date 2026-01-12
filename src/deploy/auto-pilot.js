#!/usr/bin/env node
/**
 * 🛰️ ANTIGRAVITY AUTO_PILOT: MASTER CONTROL
 * ═══════════════════════════════════════════════════════════════════════════
 * Executes all three orders in sequence:
 * - ORDER 13: AUTO_DEPLOY_GTO_SCHEMA
 * - ORDER 14: GENERATIVE_A+_CONTENT_STREAM
 * - ORDER 15: HARD_LAW_SEAL
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { AntigravityDeployer } from './antigravity-deployer.js';
import { ContentSeeder } from './content-seeder.js';
import { HardLawSealer } from './hard-law-seal.js';

async function executeAutoPilot() {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('   🛰️  A N T I G R A V I T Y   A U T O - P I L O T');
    console.log('');
    console.log('   GREEN_ENGINE_FINAL_SEAL — PROMPTS 13-15');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');

    const startTime = Date.now();
    const results = {
        order13: null,
        order14: null,
        order15: null
    };

    // ═══════════════════════════════════════════════════════════════════════
    // ORDER 13: AUTO_DEPLOY_GTO_SCHEMA
    // ═══════════════════════════════════════════════════════════════════════
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│  ORDER 13: AUTO_DEPLOY_GTO_SCHEMA                                       │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    try {
        const deployer = new AntigravityDeployer();
        results.order13 = await deployer.execute();
        console.log(`   Status: ${results.order13.success ? '✅ COMPLETE' : '⚠️ PARTIAL'}`);
    } catch (e) {
        console.log(`   Status: ❌ FAILED (${e.message})`);
        results.order13 = { success: false, error: e.message };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ORDER 14: GENERATIVE_A+_CONTENT_STREAM
    // ═══════════════════════════════════════════════════════════════════════
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│  ORDER 14: GENERATIVE_A+_CONTENT_STREAM                                 │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    try {
        const seeder = new ContentSeeder();
        await seeder.initialize();
        results.order14 = await seeder.seedLevel1Content();
        console.log(`   Status: ✅ COMPLETE (${results.order14.drills.length} drills generated)`);
    } catch (e) {
        console.log(`   Status: ❌ FAILED (${e.message})`);
        results.order14 = { success: false, error: e.message };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ORDER 15: HARD_LAW_SEAL
    // ═══════════════════════════════════════════════════════════════════════
    console.log('');
    console.log('┌─────────────────────────────────────────────────────────────────────────┐');
    console.log('│  ORDER 15: HARD_LAW_SEAL                                                │');
    console.log('└─────────────────────────────────────────────────────────────────────────┘');

    try {
        const sealer = new HardLawSealer();
        results.order15 = await sealer.execute();
        console.log(`   Status: ${results.order15.sealed ? '🔒 SEALED' : '⚠️ VERIFICATION NEEDED'}`);
    } catch (e) {
        console.log(`   Status: ❌ FAILED (${e.message})`);
        results.order15 = { success: false, error: e.message };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════════
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('   📊 ANTIGRAVITY AUTO_PILOT — MISSION REPORT');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log(`   ┌────────────────────────────────────────────────────────────────────┐`);
    console.log(`   │  ORDER 13: Schema Deployment      ${results.order13?.success ? '✅ COMPLETE' : '⚠️ PENDING '}              │`);
    console.log(`   │  ORDER 14: Content Generation     ${results.order14?.drills ? '✅ COMPLETE' : '⚠️ PENDING '}              │`);
    console.log(`   │  ORDER 15: Hard Law Seal          ${results.order15?.sealed ? '🔒 SEALED  ' : '⚠️ PENDING '}              │`);
    console.log(`   └────────────────────────────────────────────────────────────────────┘`);
    console.log('');
    console.log(`   Execution Time: ${elapsed}s`);
    console.log(`   Drills Generated: ${results.order14?.drills?.length || 0}`);
    console.log(`   GTO Solutions: ${results.order14?.gtoSolutions?.length || 0}`);
    console.log(`   Seal Tests: ${results.order15?.passed || 0}/${results.order15?.total || 0} passed`);
    console.log('');

    const allSuccess = results.order13?.success &&
        results.order14?.drills &&
        results.order15?.sealed;

    if (allSuccess) {
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('');
        console.log('   🛰️  M I S S I O N   A C C O M P L I S H E D');
        console.log('');
        console.log('   GREEN_ENGINE_FINAL_SEAL: COMPLETE ✅');
        console.log('   AUTO_PILOT_STATUS: ALL_SYSTEMS_NOMINAL 🚀');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════════════');
    } else {
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('');
        console.log('   ⚠️  MANUAL STEPS REQUIRED');
        console.log('');
        if (!results.order13?.success) {
            console.log('   1. Deploy SQL schema manually via Supabase Dashboard');
            console.log('      File: src/database/gatekeeper.sql');
        }
        if (!results.order14?.drills) {
            console.log('   2. Run content seeder with database connection');
        }
        if (!results.order15?.sealed) {
            console.log('   3. Verify Hard Law triggers are active');
        }
        console.log('');
        console.log('═══════════════════════════════════════════════════════════════════════════');
    }

    console.log('');

    return results;
}

// Export for programmatic use
export { executeAutoPilot };

// CLI execution
executeAutoPilot().then(results => {
    const allSuccess = results.order13?.success &&
        results.order14?.drills &&
        results.order15?.sealed;
    process.exit(allSuccess ? 0 : 1);
}).catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
