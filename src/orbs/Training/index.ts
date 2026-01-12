/**
 * ⚡️ ORB_04_TRAINING: SOVEREIGN EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎮 THE TRAINING ORB — Complete GTO Mastery System
 * 
 * This module exports all Training Orb components:
 * - MasteryGate: 85% Hard Law enforcement
 * - LevelRegistry: 12-level difficulty progression
 * - DrillInterface: Interactive training UI
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 MASTERY GATE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    MasteryGate,
    getMasteryGate,
    createMasteryGate,
    MASTERY_THRESHOLD,
    BOSS_MODE_THRESHOLD,
    MIN_QUESTIONS_REQUIRED,
    TOKEN_VALIDITY_MS,
    type GateStatus,
    type MasteryCheckResult,
    type LevelAccessResult,
    type MasteryTokenPayload,
    type UserMasteryState
} from './MasteryGate';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 LEVEL REGISTRY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    LevelRegistry,
    getLevelRegistry,
    createLevelRegistry,
    LEVEL_REGISTRY,
    type DifficultyTier,
    type ScenarioType,
    type LevelDefinition,
    type DrillConfiguration
} from './LevelRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 DRILL INTERFACE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    DrillInterface,
    DrillInterfaceStyles,
    type DrillInterfaceProps
} from './DrillInterface';

// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ ORB #4 TRAINING MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════

export const ORB_04_MANIFEST = {
    id: 4,
    name: 'The Training Orb',
    codename: 'GTO_TRAINING_ENGINE',

    // 🔐 Hard Laws
    laws: {
        MASTERY_GATE: {
            threshold: 0.85,
            description: 'Players must achieve 85% accuracy to unlock next level',
            immutable: true
        },
        BOSS_MODE: {
            threshold: 0.90,
            description: 'Level 12 (Boss Mode) requires 90% accuracy',
            immutable: true
        },
        MIN_QUESTIONS: {
            value: 20,
            description: 'Minimum 20 questions before mastery evaluation',
            immutable: true
        }
    },

    // 📊 Level Structure
    levels: {
        total: 12,
        tiers: ['BEGINNER', 'STANDARD', 'INTERMEDIATE', 'ADVANCED', 'ELITE', 'BOSS'],
        bossMode: 12
    },

    // 🎮 Features
    features: [
        'Physics-based card animations',
        'Pressure mode with dynamic timer',
        'Streak tracking and combo bonuses',
        'Real-time EV loss visualization',
        'XP and Diamond rewards',
        'Mastery token cryptographic signing'
    ],

    // 🛡️ Status
    status: 'LOCKED_PRODUCTION',
    sealedAt: '2026-01-09T23:01:02-06:00'
} as const;

// Re-import for default export
import { MasteryGate as MasteryGateClass } from './MasteryGate';
import { LevelRegistry as LevelRegistryClass } from './LevelRegistry';
import { DrillInterface as DrillInterfaceComponent } from './DrillInterface';

export default {
    MasteryGate: MasteryGateClass,
    LevelRegistry: LevelRegistryClass,
    DrillInterface: DrillInterfaceComponent,
    ORB_04_MANIFEST
};

