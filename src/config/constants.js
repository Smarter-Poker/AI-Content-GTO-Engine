/**
 * 🤖 SMARTER.POKER — AI_CONTENT_GTO_ENGINE
 * Core Constants & Configuration
 * 
 * Target: ORB_4 (Training) | ORB_6 (Assistant)
 * Status: ACTIVE_DEVELOPMENT
 */

// ═══════════════════════════════════════════════════════════════
// 🎯 CONTENT GENERATION TARGETS
// ═══════════════════════════════════════════════════════════════

export const DAILY_DRILL_CONFIG = {
    // Minimum unique scenarios per skill level per day
    MIN_DRILLS_PER_LEVEL: 20,
    
    // Total levels in the system
    SKILL_LEVELS: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ELITE'],
    
    // Quality threshold (A+ = 95%+ GTO accuracy)
    QUALITY_THRESHOLD: 0.95,
    
    // Refresh cycle (hours)
    REFRESH_INTERVAL_HOURS: 24,
    
    // Maximum cache age before forced regeneration
    MAX_CACHE_AGE_HOURS: 48
};

// ═══════════════════════════════════════════════════════════════
// 🎰 SCENARIO TYPES (GTO Compliant)
// ═══════════════════════════════════════════════════════════════

export const SCENARIO_TYPES = {
    // Preflop Categories
    PREFLOP_OPENING: 'preflop_opening',
    PREFLOP_3BET: 'preflop_3bet',
    PREFLOP_4BET: 'preflop_4bet',
    PREFLOP_SQUEEZE: 'preflop_squeeze',
    PREFLOP_BLIND_DEFENSE: 'preflop_blind_defense',
    
    // Postflop Categories
    POSTFLOP_CBET: 'postflop_cbet',
    POSTFLOP_CHECK_RAISE: 'postflop_check_raise',
    POSTFLOP_PROBE_BET: 'postflop_probe_bet',
    POSTFLOP_DELAYED_CBET: 'postflop_delayed_cbet',
    
    // Multi-Street Categories
    MULTISTREET_BARREL: 'multistreet_barrel',
    MULTISTREET_BLUFF_CATCHER: 'multistreet_bluff_catcher',
    MULTISTREET_VALUE_BET: 'multistreet_value_bet',
    
    // Tournament Specific
    TOURNAMENT_ICM: 'tournament_icm',
    TOURNAMENT_BUBBLE: 'tournament_bubble',
    TOURNAMENT_PKO: 'tournament_pko',
    TOURNAMENT_FINAL_TABLE: 'tournament_final_table',
    
    // Special Modes
    EXPLOIT_JUDGMENT: 'exploit_judgment',
    RANGE_RECALL: 'range_recall',
    RNG_EXECUTION: 'rng_execution'
};

// ═══════════════════════════════════════════════════════════════
// ⚖️ GTO EVALUATION TIERS (Triple-Truth System)
// ═══════════════════════════════════════════════════════════════

export const EVALUATION_TIERS = {
    // The Mathematical Truth
    GTO_BASELINE: {
        id: 'GTO_BASELINE',
        label: '🟢 GTO Optimal',
        points: 100,
        evLossMax: 0,
        description: 'Mathematically optimal play from PioSolved solutions'
    },
    
    // Human-executable alternative
    ALT_SIMPLE: {
        id: 'ALT_SIMPLE',
        label: '🟡 Simplified',
        points: 85,
        evLossMax: 0.02,
        description: 'Human-executable simplified alternative'
    },
    
    // Population-based exploit
    ALT_EXPLOIT: {
        id: 'ALT_EXPLOIT',
        label: '🟠 Exploitative',
        points: 70,
        evLossMax: 0.05,
        description: 'Adjustment based on population tendencies'
    }
};

// ═══════════════════════════════════════════════════════════════
// 📊 MISTAKE CLASSIFICATION (EV Loss → XP)
// ═══════════════════════════════════════════════════════════════

export const MISTAKE_CATEGORIES = {
    OPTIMAL: { evLossMin: 0, evLossMax: 0, xp: 150, label: 'Optimal', color: '#00FF88' },
    ACCEPTABLE: { evLossMin: 0, evLossMax: 0.005, xp: 100, label: 'Acceptable', color: '#88FF00' },
    MINOR: { evLossMin: 0.005, evLossMax: 0.02, xp: 50, label: 'Minor', color: '#FFFF00' },
    MODERATE: { evLossMin: 0.02, evLossMax: 0.10, xp: 25, label: 'Moderate', color: '#FF8800' },
    MAJOR: { evLossMin: 0.10, evLossMax: 0.25, xp: 10, label: 'Major', color: '#FF4400' },
    BLUNDER: { evLossMin: 0.25, evLossMax: Infinity, xp: 5, label: 'Blunder', color: '#FF0000' }
};

// ═══════════════════════════════════════════════════════════════
// 🚨 LEAK SIGNAL TYPES
// ═══════════════════════════════════════════════════════════════

export const LEAK_SIGNALS = {
    // Frequency Leaks
    OVER_FOLDING: 'OVER_FOLDING',
    OVER_CALLING: 'OVER_CALLING',
    PASSIVE_PLAY: 'PASSIVE_PLAY',
    OVER_AGGRESSION: 'OVER_AGGRESSION',
    
    // Sizing Leaks
    SIZING_ERROR_SMALL: 'SIZING_ERROR_SMALL',
    SIZING_ERROR_LARGE: 'SIZING_ERROR_LARGE',
    THIN_VALUE_COWARDICE: 'THIN_VALUE_COWARDICE',
    
    // Positional Leaks
    OOP_AGGRESSION: 'OOP_AGGRESSION',
    IP_PASSIVITY: 'IP_PASSIVITY',
    BLIND_DEFENSE_WEAK: 'BLIND_DEFENSE_WEAK',
    
    // Tournament Leaks
    ICM_SUICIDE: 'ICM_SUICIDE',
    BUBBLE_FEAR: 'BUBBLE_FEAR',
    STACK_MISMANAGEMENT: 'STACK_MISMANAGEMENT',
    
    // Behavioral Leaks
    TIMING_TELL: 'TIMING_TELL',
    PANIC_CLICK: 'PANIC_CLICK',
    TIMEOUT_FOLD: 'TIMEOUT_FOLD',
    TILT_DETECTED: 'TILT_DETECTED',
    
    // Range Leaks
    RANGE_CAPPING: 'RANGE_CAPPING',
    NO_BLUFFS: 'NO_BLUFFS',
    NO_VALUE: 'NO_VALUE',
    
    // RNG Leaks
    STATIC_STRATEGY: 'STATIC_STRATEGY',
    RNG_IGNORED: 'RNG_IGNORED'
};

// ═══════════════════════════════════════════════════════════════
// 🎓 SKILL LEVEL DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const SKILL_LEVELS = {
    BEGINNER: {
        id: 'BEGINNER',
        label: 'Beginner',
        minXP: 0,
        maxXP: 999,
        complexityMax: 2,
        evToleranceMultiplier: 1.5,
        alternateLineCount: 1
    },
    INTERMEDIATE: {
        id: 'INTERMEDIATE',
        label: 'Intermediate',
        minXP: 1000,
        maxXP: 4999,
        complexityMax: 4,
        evToleranceMultiplier: 1.25,
        alternateLineCount: 2
    },
    ADVANCED: {
        id: 'ADVANCED',
        label: 'Advanced',
        minXP: 5000,
        maxXP: 14999,
        complexityMax: 6,
        evToleranceMultiplier: 1.1,
        alternateLineCount: 2
    },
    EXPERT: {
        id: 'EXPERT',
        label: 'Expert',
        minXP: 15000,
        maxXP: 49999,
        complexityMax: 8,
        evToleranceMultiplier: 1.0,
        alternateLineCount: 2
    },
    ELITE: {
        id: 'ELITE',
        label: 'Elite',
        minXP: 50000,
        maxXP: Infinity,
        complexityMax: 10,
        evToleranceMultiplier: 0.9,
        alternateLineCount: 3
    }
};

// ═══════════════════════════════════════════════════════════════
// 📡 EVENT TYPES (Pentagon Bus Integration)
// ═══════════════════════════════════════════════════════════════

export const EVENT_TYPES = {
    // Content Generation Events
    DAILY_DRILLS_GENERATED: 'DAILY_DRILLS_GENERATED',
    SCENARIO_CREATED: 'SCENARIO_CREATED',
    CONTENT_REFRESH_TRIGGERED: 'CONTENT_REFRESH_TRIGGERED',
    
    // Evaluation Events
    USER_RESPONSE_RECEIVED: 'USER_RESPONSE_RECEIVED',
    GTO_EVALUATION_COMPLETE: 'GTO_EVALUATION_COMPLETE',
    LEAK_DETECTED: 'LEAK_DETECTED',
    
    // Feedback Events
    ALTERNATE_LINES_REQUESTED: 'ALTERNATE_LINES_REQUESTED',
    FEEDBACK_DELIVERED: 'FEEDBACK_DELIVERED',
    
    // Session Events
    TRAINING_SESSION_START: 'TRAINING_SESSION_START',
    TRAINING_SESSION_END: 'TRAINING_SESSION_END',
    
    // Health Events
    ENGINE_HEARTBEAT: 'ENGINE_HEARTBEAT',
    ENGINE_ERROR: 'ENGINE_ERROR'
};

// ═══════════════════════════════════════════════════════════════
// 🧬 BOARD TEXTURE CLASSIFICATIONS
// ═══════════════════════════════════════════════════════════════

export const BOARD_TEXTURES = {
    DRY_HIGH: { id: 'DRY_HIGH', label: 'Dry High', example: 'A♠K♦3♣', cbetFreq: 0.75 },
    DRY_MIDDLE: { id: 'DRY_MIDDLE', label: 'Dry Middle', example: 'J♠7♦2♣', cbetFreq: 0.65 },
    DRY_LOW: { id: 'DRY_LOW', label: 'Dry Low', example: '7♠4♦2♣', cbetFreq: 0.55 },
    WET_HIGH: { id: 'WET_HIGH', label: 'Wet High', example: 'K♠Q♥J♦', cbetFreq: 0.35 },
    WET_MIDDLE: { id: 'WET_MIDDLE', label: 'Wet Middle', example: '9♠8♥7♦', cbetFreq: 0.30 },
    WET_LOW: { id: 'WET_LOW', label: 'Wet Low', example: '6♣5♣4♦', cbetFreq: 0.40 },
    PAIRED: { id: 'PAIRED', label: 'Paired', example: 'K♠K♦5♣', cbetFreq: 0.80 },
    MONOTONE: { id: 'MONOTONE', label: 'Monotone', example: 'A♠8♠4♠', cbetFreq: 0.45 }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 BET SIZING ARCHETYPES
// ═══════════════════════════════════════════════════════════════

export const BET_SIZINGS = {
    SMALL: { label: '33% Pot', multiplier: 0.33, use: 'Range betting, dry boards' },
    MEDIUM: { label: '50% Pot', multiplier: 0.50, use: 'Standard value, protection' },
    LARGE: { label: '75% Pot', multiplier: 0.75, use: 'Polarized, wet boards' },
    OVERBET: { label: '125% Pot', multiplier: 1.25, use: 'Nut advantage, static boards' },
    ALL_IN: { label: 'All-In', multiplier: null, use: 'Short stack, max pressure' }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 SYSTEM CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const SYSTEM_CONFIG = {
    // Pentagon Bus Connection
    BUS_HOST: '127.0.0.1',
    BUS_PORT: 4000,
    
    // Engine Identity
    ENGINE_NAME: 'AI_CONTENT_GTO_ENGINE',
    ENGINE_VERSION: '1.0.0',
    
    // Heartbeat Interval (ms)
    HEARTBEAT_INTERVAL: 60000,
    
    // Content Generation Batch Size
    BATCH_SIZE: 10,
    
    // Maximum retries for AI generation
    MAX_RETRIES: 3,
    
    // Timeout for AI calls (ms)
    AI_TIMEOUT: 30000
};

export default {
    DAILY_DRILL_CONFIG,
    SCENARIO_TYPES,
    EVALUATION_TIERS,
    MISTAKE_CATEGORIES,
    LEAK_SIGNALS,
    SKILL_LEVELS,
    EVENT_TYPES,
    BOARD_TEXTURES,
    BET_SIZINGS,
    SYSTEM_CONFIG
};
