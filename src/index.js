/**
 * 🤖 SMARTER.POKER — AI CONTENT GTO ENGINE
 * Main Entry Point (v2.0 - Async Queue Architecture)
 * 
 * ⚡ CONTENT_QUEUE_LOCK ACTIVE
 * - NO live generation
 * - Training Orb ONLY pulls from pre_generated_content with status: READY
 * - Users always play content generated 1 hour ago (instant UX)
 * 
 * color: GREEN
 * focus: Daily_Generative_A+_Content_&_GTO_Solutions
 * target: ORB_4 (Training) | ORB_6 (Assistant)
 */

// Core Engines
import { AIContentEngine } from './core/AIContentEngine.js';
import { ScenarioGenerator } from './core/ScenarioGenerator.js';
import { LeakSignalProcessor } from './core/LeakSignalProcessor.js';

// Queue System (Async Worker Pattern)
import { QueueManager } from './queue/QueueManager.js';
import { BackgroundWorker } from './queue/BackgroundWorker.js';
import { ContentPool } from './queue/ContentPool.js';
import { ContentQueue } from './queue/ContentQueue.js';  // ⚡ LOCKED READY-ONLY

// Database Schema
import * as Schema from './database/schema.js';

// Constants
import * as Constants from './config/constants.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_FOUNDATION (PROMPTS 1-3)
// ═══════════════════════════════════════════════════════════════

// Foundation Classes (TASK_01, TASK_02, TASK_03)
import {
    GTOTruthVault,
    GatekeeperLaw,
    TRAINING_LEVELS,
    EV_LOSS_THRESHOLDS,
    createGTOTruthVault,
    createGatekeeper
} from './core/GreenFoundation.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_ACTIVE_LOGIC (PROMPTS 4-6)
// ═══════════════════════════════════════════════════════════════

// Active Logic Classes (TASK_04, TASK_05, TASK_06)
import {
    MasteryTrigger,
    LeakSignalAnalyzer,
    ProgressionEngine,
    PROGRESSION_LEVELS,
    BOARD_TEXTURES,
    createMasteryTrigger,
    createLeakAnalyzer,
    createProgressionEngine
} from './core/GreenActiveLogic.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_ADDICTION_ENGINE (PROMPTS 7-9)
// ═══════════════════════════════════════════════════════════════

// Addiction Engine Classes (TASK_07, TASK_08, TASK_09)
import {
    XPScalingEngine,
    LeaderboardEngine,
    FocusSessionGenerator,
    XP_REWARD_SCALING,
    STREAK_BONUSES,
    createXPScalingEngine,
    createLeaderboardEngine,
    createFocusSessionGenerator
} from './core/GreenAddictionEngine.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_MASTER_BUS (PROMPTS 10-12)
// ═══════════════════════════════════════════════════════════════

// Master Bus Classes (TASK_10, TASK_11, TASK_12)
import {
    GTOTruthMigration,
    RewardOracle,
    MasteryStream,
    SOLUTION_TYPES,
    MINT_SIGNAL_TYPES,
    MASTERY_EVENT_TYPES,
    createGTOTruthMigration,
    createRewardOracle,
    createMasteryStream
} from './core/GreenMasterBus.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_INTEGRATION_STRIKE (PROMPTS 16-18)
// ═══════════════════════════════════════════════════════════════

// Integration Strike Classes (TASK_16, TASK_17, TASK_18)
import {
    CrossSiloHandshake,
    LeakSignalOverlayService,
    RewardSignalDispatcher,
    PAYOUT_TYPES,
    SEVERITY_LEVELS,
    createCrossSiloHandshake,
    createLeakSignalOverlayService,
    createRewardSignalDispatcher
} from './core/GreenIntegrationStrike.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_VISUAL_ADDICTION (PROMPTS 19-21)
// ═══════════════════════════════════════════════════════════════

// Visual Addiction Classes (TASK_19, TASK_20, TASK_21)
import {
    SessionMomentumTracker,
    AnimationDispatcher,
    GTOAccuracyLeaderboard,
    VISUAL_STATES,
    ANIMATION_TYPES,
    RANK_TIERS,
    createSessionMomentumTracker,
    createAnimationDispatcher,
    createGTOAccuracyLeaderboard
} from './core/GreenVisualAddiction.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_PRODUCTION_HARDENING (PROMPTS 22-24)
// ═══════════════════════════════════════════════════════════════

// Production Hardening Classes (TASK_22, TASK_23, TASK_24)
import {
    GTOIntegrityAuditor,
    GTO_INTEGRITY_RULES,
    INTEGRITY_STATUS,
    createGTOIntegrityAuditor
} from './audit/GTOIntegrityAuditor.js';

import {
    MasterySealEngine,
    MASTERY_SEAL_CONFIG,
    SEAL_STATUS,
    createMasterySealEngine
} from './core/MasterySealEngine.js';

import {
    ContentHydrationV3,
    HYDRATION_CONFIG,
    AI_PROMPT_TEMPLATES,
    createContentHydrationV3
} from './hydration/ContentHydrationV3.js';

// ═══════════════════════════════════════════════════════════════
// 🛰️ GREEN_SOVEREIGN_SEAL (PROMPTS 25-30) — FINAL SEAL
// ═══════════════════════════════════════════════════════════════

// Sovereign Seal Classes (TASK_25-30)
import {
    GTOTruthHardener,
    LeakOverlayTrigger,
    LevelGateEnforcer,
    DailyHydrationCron,
    LevelProgressionEngine,
    SovereignSeal,
    EV_CLASSIFICATION,
    LEVEL_PROGRESSION,
    HARD_LAWS,
    createGTOTruthHardener,
    createLeakOverlayTrigger,
    createLevelGateEnforcer,
    createDailyHydrationCron,
    createLevelProgressionEngine,
    createSovereignSeal
} from './core/GreenSovereignSeal.js';

// ═══════════════════════════════════════════════════════════════
// 🏭 FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create the main engine (queue mode by default)
 */
export function createEngine(options = {}) {
    return new AIContentEngine({
        mode: 'queue', // Use async queue by default
        ...options
    });
}

/**
 * Create a background worker for processing jobs
 */
export function createWorker(options = {}) {
    return new BackgroundWorker(options);
}

/**
 * ⚡ Create a content queue accessor (LOCKED TO READY-ONLY)
 * This is the primary way for Training Orb to fetch content
 */
export function createContentQueue(options = {}) {
    return new ContentQueue(options);
}

/**
 * Create a content pool accessor for Training Orb (legacy)
 */
export function createContentPool(options = {}) {
    return new ContentPool(options);
}

/**
 * Create a queue manager for dropping jobs
 */
export function createQueueManager(options = {}) {
    return new QueueManager(options);
}

// Services
import { GTOSolutionService } from './services/GTOSolutionService.js';

/**
 * 🎯 Create a GTO Solution service for instant truth lookup
 * Enables Assistant to compare user moves without recalculating
 */
export function createGTOService(options = {}) {
    return new GTOSolutionService(options);
}

// UI Controllers
import { UIForceFeedback } from './ui/UIForceFeedback.js';

/**
 * 🚨 Create UI Force Feedback controller
 * If is_repeated_leak == true, MUST show GTO + 2 alternates, lock Next for 5s
 */
export function createUIForceFeedback(options = {}) {
    return new UIForceFeedback(options);
}

// Cron Jobs
import { DailyGenerationCron } from './cron/DailyGenerationCron.js';

/**
 * ⏰ Create daily generation cron
 * At 00:00 UTC, generates 20 fresh questions per skill level
 */
export function createDailyCron(options = {}) {
    return new DailyGenerationCron(options);
}

// Guards
import { MasteryGateGuard } from './guards/MasteryGateGuard.js';

/**
 * 🔒 Create mastery gate guard
 * Verifies 85% score on level N-1 before allowing level N. No skipping.
 */
export function createMasteryGuard(options = {}) {
    return new MasteryGateGuard(options);
}

// ═══════════════════════════════════════════════════════════════
// 🛰️ PHASE 13-15 MODULES (FINAL SEAL)
// ═══════════════════════════════════════════════════════════════

// Validators (PHASE 13)
import { GTOTruthValidator } from './validators/GTOTruthValidator.js';

/**
 * 🛰️ Create GTO Truth Validator (PHASE 13)
 * Audits all drill solutions: 1 GTO + 2 Alternates required
 * Triggers leak signals with EV loss on sub-optimal selections
 */
export function createGTOValidator(options = {}) {
    return new GTOTruthValidator(options);
}

// Hydration Service (PHASE 15)
import { ContentHydrationService } from './services/ContentHydrationService.js';

/**
 * 🛰️ Create Content Hydration Service (PHASE 15)
 * No-Repeat enforcement with ORANGE Silo connection
 * Triggers emergency AI generation when pool exhausted
 */
export function createHydrationService(options = {}) {
    return new ContentHydrationService(options);
}

// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
    // Core
    AIContentEngine,
    ScenarioGenerator,
    LeakSignalProcessor,

    // Queue System
    QueueManager,
    BackgroundWorker,
    ContentPool,
    ContentQueue,  // ⚡ LOCKED READY-ONLY

    // Services
    GTOSolutionService,  // 🎯 GTO TRUTH LOOKUP
    ContentHydrationService,  // 🛰️ PHASE 15: NO-REPEAT HYDRATION

    // Validators
    GTOTruthValidator,  // 🛰️ PHASE 13: GTO TRUTH VALIDATION

    // UI Controllers
    UIForceFeedback,  // 🚨 LEAK AUTO-SHOW

    // Cron Jobs
    DailyGenerationCron,  // ⏰ DAILY A+ GENERATION

    // Guards  
    MasteryGateGuard,  // 🔒 BYPASS PROTECTION (+ PHASE 14: 10-LEVEL GATEKEEPER)

    // GREEN_FOUNDATION (PROMPTS 1-3)
    GTOTruthVault,      // 📊 TASK_02: GTO Truth Vault
    GatekeeperLaw,      // 🔐 TASK_03: 85% Gate Law Enforcer
    TRAINING_LEVELS,    // 📊 TASK_01: Level Definitions
    EV_LOSS_THRESHOLDS, // 📊 TASK_02: Leak Signal Thresholds

    // GREEN_ACTIVE_LOGIC (PROMPTS 4-6)
    MasteryTrigger,     // 🔐 TASK_04: 85% Mastery Trigger
    LeakSignalAnalyzer, // 🚨 TASK_05: GTO Leak Signal Analyzer
    ProgressionEngine,  // 🎮 TASK_06: 10-Level Progression + Boss Mode
    PROGRESSION_LEVELS, // 📊 TASK_06: 10-Level Configuration
    BOARD_TEXTURES,     // 📊 TASK_06: Board Randomization

    // GREEN_ADDICTION_ENGINE (PROMPTS 7-9)
    XPScalingEngine,       // 💎 TASK_07: XP/Diamond Scaling (+25% Elite)
    LeaderboardEngine,     // 🏆 TASK_08: Competitive Leaderboard
    FocusSessionGenerator, // 🎯 TASK_09: Auto Weakness Drills
    XP_REWARD_SCALING,     // 📊 TASK_07: Reward Configuration
    STREAK_BONUSES,        // 📊 TASK_07: Streak Multipliers

    // GREEN_MASTER_BUS (PROMPTS 10-12)
    GTOTruthMigration,     // 📦 TASK_10: GTO Truth Migration (EV > 0)
    RewardOracle,          // 📡 TASK_11: 85% MINT_SIGNAL Oracle
    MasteryStream,         // 📡 TASK_12: Realtime Level Unlock Broadcast
    SOLUTION_TYPES,        // 📊 TASK_10: GTO Solution Types
    MINT_SIGNAL_TYPES,     // 📊 TASK_11: Mint Signal Types
    MASTERY_EVENT_TYPES,   // 📊 TASK_12: Mastery Event Types

    // GREEN_INTEGRATION_STRIKE (PROMPTS 16-18)
    CrossSiloHandshake,        // 🔴 TASK_16: RED Silo DNA Fetch
    LeakSignalOverlayService,  // 📊 TASK_17: Dynamic EV Comparison UI
    RewardSignalDispatcher,    // 💎 TASK_18: Encrypted YELLOW Payout
    PAYOUT_TYPES,              // 📊 TASK_18: Payout Type Constants
    SEVERITY_LEVELS,           // 📊 TASK_17: EV Loss Severity Levels

    // GREEN_VISUAL_ADDICTION (PROMPTS 19-21)
    SessionMomentumTracker,    // 📊 TASK_19: Progress Bar (Green/Gold)
    AnimationDispatcher,       // 🎬 TASK_20: Level-Up & Boss Defeated
    GTOAccuracyLeaderboard,    // 🏆 TASK_21: Perfect Session Rankings
    VISUAL_STATES,             // 📊 TASK_19: Progress Visual States
    ANIMATION_TYPES,           // 📊 TASK_20: Animation Type Config
    RANK_TIERS,                // 📊 TASK_21: Leaderboard Rank Tiers

    // GREEN_PRODUCTION_HARDENING (PROMPTS 22-24)
    GTOIntegrityAuditor,       // 🔍 TASK_22: GTO Solver Integrity Check
    MasterySealEngine,         // 🔐 TASK_23: 85% Mastery Seal (Token Auth)
    ContentHydrationV3,        // 🌊 TASK_24: AI Content Hydration Templates
    GTO_INTEGRITY_RULES,       // 📊 TASK_22: Integrity Rule Constants
    INTEGRITY_STATUS,          // 📊 TASK_22: Integrity Status Codes
    MASTERY_SEAL_CONFIG,       // 📊 TASK_23: Mastery Seal Config
    SEAL_STATUS,               // 📊 TASK_23: Seal Status Codes
    HYDRATION_CONFIG,          // 📊 TASK_24: Hydration Config
    AI_PROMPT_TEMPLATES,       // 📊 TASK_24: AI Prompt Templates

    // GREEN_SOVEREIGN_SEAL (PROMPTS 25-30) — FINAL SEAL
    GTOTruthHardener,          // 🔐 TASK_25: Sealed EV Calculation
    LeakOverlayTrigger,        // 🎯 TASK_26: Auto-UI Mistake Detection
    LevelGateEnforcer,         // 🔐 TASK_27: 85% Gate RPC
    DailyHydrationCron,        // 🌊 TASK_28: 24h Content Cron
    LevelProgressionEngine,    // 📊 TASK_29: 10-Level Staking
    SovereignSeal,             // 🔐 TASK_30: Production Lock
    EV_CLASSIFICATION,         // 📊 TASK_25: EV Classification Codes
    LEVEL_PROGRESSION,         // 📊 TASK_29: Level Config
    HARD_LAWS,                 // 📊 TASK_30: Hard Law Registry

    // Database
    Schema,

    // Constants
    Constants
};

export default AIContentEngine;
