/**
 * ⚡️ ORB_04_TRAINING: LEVEL REGISTRY
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 SOVEREIGN MAPPING: 12 DIFFICULTY LEVELS FOR DAILY A+ GTO DRILLS
 * 
 * This registry defines the complete level progression from Foundations
 * through Boss Mode. Each level is calibrated with specific:
 * - EV tolerance thresholds
 * - Time limits
 * - Scenario complexity
 * - XP & Diamond multipliers
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { MASTERY_THRESHOLD, BOSS_MODE_THRESHOLD } from './MasteryGate';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type DifficultyTier = 'BEGINNER' | 'STANDARD' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' | 'BOSS';

export type ScenarioType =
    | 'PREFLOP_RANGES'
    | 'POSTFLOP_DECISION'
    | 'BOARD_TEXTURE'
    | 'SIZING_LOGIC'
    | 'POSITION_BATTLE'
    | 'ICM_PRESSURE'
    | 'MIXED_STRATEGY'
    | 'EXPLOIT_DEVIANCE'
    | 'MULTI_STREET'
    | 'TOURNAMENT_ENDGAME';

export interface LevelDefinition {
    id: number;
    name: string;
    tier: DifficultyTier;
    description: string;

    // 🔐 Mastery requirements
    masteryThreshold: number;
    minQuestionsRequired: number;

    // ⚙️ Drill configuration
    evToleranceBB: number;       // Maximum acceptable EV loss in BB
    timeLimitSeconds: number;    // Per-decision time limit
    scenarioTypes: ScenarioType[];
    scenarioComplexity: number;  // 1-10 scale

    // 💎 Reward multipliers
    xpMultiplier: number;
    diamondMultiplier: number;

    // 🎨 Visual & UX
    accentColor: string;
    glowIntensity: number;
    unlockAnimation: string;
}

export interface DrillConfiguration {
    levelId: number;
    questionsPerSession: number;
    streakBonusEnabled: boolean;
    leakFocusEnabled: boolean;
    gtoBenchmarkEnabled: boolean;
    showAlternateLines: boolean;
    showEvExplanation: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🗺️ THE SOVEREIGN 12-LEVEL REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const LEVEL_REGISTRY: Record<number, LevelDefinition> = {
    // ═══════════════════════════════════════════════════════════════════════
    // 🟢 BEGINNER TIER (Levels 1-2)
    // ═══════════════════════════════════════════════════════════════════════
    1: {
        id: 1,
        name: 'Foundations',
        tier: 'BEGINNER',
        description: 'Master the basic opening ranges and preflop fundamentals',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.50,
        timeLimitSeconds: 30,
        scenarioTypes: ['PREFLOP_RANGES'],
        scenarioComplexity: 1,
        xpMultiplier: 1.0,
        diamondMultiplier: 1.0,
        accentColor: '#4ADE80',
        glowIntensity: 0.3,
        unlockAnimation: 'fade_in'
    },

    2: {
        id: 2,
        name: 'Opening Ranges',
        tier: 'BEGINNER',
        description: 'Expand position-based opening and 3-bet ranges',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.40,
        timeLimitSeconds: 25,
        scenarioTypes: ['PREFLOP_RANGES', 'POSITION_BATTLE'],
        scenarioComplexity: 2,
        xpMultiplier: 1.1,
        diamondMultiplier: 1.0,
        accentColor: '#34D399',
        glowIntensity: 0.35,
        unlockAnimation: 'slide_up'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 🔵 STANDARD TIER (Levels 3-4)
    // ═══════════════════════════════════════════════════════════════════════
    3: {
        id: 3,
        name: 'C-Bet Logic',
        tier: 'STANDARD',
        description: 'Master continuation betting frequency and sizing',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.35,
        timeLimitSeconds: 22,
        scenarioTypes: ['POSTFLOP_DECISION', 'SIZING_LOGIC'],
        scenarioComplexity: 3,
        xpMultiplier: 1.2,
        diamondMultiplier: 1.0,
        accentColor: '#3B82F6',
        glowIntensity: 0.4,
        unlockAnimation: 'pulse_in'
    },

    4: {
        id: 4,
        name: 'Defense Fundamentals',
        tier: 'STANDARD',
        description: 'Learn minimum defense frequencies and calling ranges',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.30,
        timeLimitSeconds: 20,
        scenarioTypes: ['POSTFLOP_DECISION', 'BOARD_TEXTURE'],
        scenarioComplexity: 4,
        xpMultiplier: 1.3,
        diamondMultiplier: 1.1,
        accentColor: '#60A5FA',
        glowIntensity: 0.45,
        unlockAnimation: 'shield_unlock'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 🟡 INTERMEDIATE TIER (Levels 5-6)
    // ═══════════════════════════════════════════════════════════════════════
    5: {
        id: 5,
        name: 'Multi-Street Play',
        tier: 'INTERMEDIATE',
        description: 'Navigate complex turn and river decisions',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.25,
        timeLimitSeconds: 18,
        scenarioTypes: ['MULTI_STREET', 'SIZING_LOGIC', 'BOARD_TEXTURE'],
        scenarioComplexity: 5,
        xpMultiplier: 1.4,
        diamondMultiplier: 1.15,
        accentColor: '#FBBF24',
        glowIntensity: 0.5,
        unlockAnimation: 'cascade'
    },

    6: {
        id: 6,
        name: 'Board Texture',
        tier: 'INTERMEDIATE',
        description: 'Master board reading and texture-based adjustments',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.22,
        timeLimitSeconds: 16,
        scenarioTypes: ['BOARD_TEXTURE', 'POSTFLOP_DECISION', 'SIZING_LOGIC'],
        scenarioComplexity: 6,
        xpMultiplier: 1.5,
        diamondMultiplier: 1.25,
        accentColor: '#F59E0B',
        glowIntensity: 0.55,
        unlockAnimation: 'texture_reveal'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 🟠 ADVANCED TIER (Levels 7-8)
    // ═══════════════════════════════════════════════════════════════════════
    7: {
        id: 7,
        name: 'Mixed Strategies',
        tier: 'ADVANCED',
        description: 'Execute solver-approved mixed frequencies',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.18,
        timeLimitSeconds: 15,
        scenarioTypes: ['MIXED_STRATEGY', 'MULTI_STREET'],
        scenarioComplexity: 7,
        xpMultiplier: 1.7,
        diamondMultiplier: 1.35,
        accentColor: '#F97316',
        glowIntensity: 0.6,
        unlockAnimation: 'rng_spinner'
    },

    8: {
        id: 8,
        name: 'Exploit Recognition',
        tier: 'ADVANCED',
        description: 'Identify villain leaks and optimal exploitation',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.15,
        timeLimitSeconds: 14,
        scenarioTypes: ['EXPLOIT_DEVIANCE', 'POSITION_BATTLE'],
        scenarioComplexity: 8,
        xpMultiplier: 1.9,
        diamondMultiplier: 1.4,
        accentColor: '#EA580C',
        glowIntensity: 0.65,
        unlockAnimation: 'villain_scan'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 🔴 ELITE TIER (Levels 9-10)
    // ═══════════════════════════════════════════════════════════════════════
    9: {
        id: 9,
        name: 'ICM Mastery',
        tier: 'ELITE',
        description: 'Master tournament equity and bubble dynamics',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.12,
        timeLimitSeconds: 12,
        scenarioTypes: ['ICM_PRESSURE', 'TOURNAMENT_ENDGAME'],
        scenarioComplexity: 9,
        xpMultiplier: 2.2,
        diamondMultiplier: 1.5,
        accentColor: '#EF4444',
        glowIntensity: 0.7,
        unlockAnimation: 'icm_pulse'
    },

    10: {
        id: 10,
        name: 'Tournament Endgame',
        tier: 'ELITE',
        description: 'Dominate final table and heads-up dynamics',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 20,
        evToleranceBB: 0.10,
        timeLimitSeconds: 12,
        scenarioTypes: ['TOURNAMENT_ENDGAME', 'ICM_PRESSURE', 'EXPLOIT_DEVIANCE'],
        scenarioComplexity: 9,
        xpMultiplier: 2.3,
        diamondMultiplier: 1.6,
        accentColor: '#DC2626',
        glowIntensity: 0.75,
        unlockAnimation: 'final_table'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 🟣 ELITE+ TIER (Level 11)
    // ═══════════════════════════════════════════════════════════════════════
    11: {
        id: 11,
        name: 'Elite Synthesis',
        tier: 'ELITE',
        description: 'Combine all skills in solver-thin spots',
        masteryThreshold: MASTERY_THRESHOLD,
        minQuestionsRequired: 25,
        evToleranceBB: 0.08,
        timeLimitSeconds: 10,
        scenarioTypes: ['MIXED_STRATEGY', 'EXPLOIT_DEVIANCE', 'MULTI_STREET', 'ICM_PRESSURE'],
        scenarioComplexity: 10,
        xpMultiplier: 2.4,
        diamondMultiplier: 1.75,
        accentColor: '#8B5CF6',
        glowIntensity: 0.8,
        unlockAnimation: 'synthesis_cascade'
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 👑 BOSS MODE (Level 12) — 90% THRESHOLD
    // ═══════════════════════════════════════════════════════════════════════
    12: {
        id: 12,
        name: 'BOSS MODE',
        tier: 'BOSS',
        description: '⚔️ THE ULTIMATE CHALLENGE — Random scenarios, max pressure',
        masteryThreshold: BOSS_MODE_THRESHOLD, // 90% required
        minQuestionsRequired: 30,
        evToleranceBB: 0.05,
        timeLimitSeconds: 8,
        scenarioTypes: [
            'PREFLOP_RANGES',
            'POSTFLOP_DECISION',
            'BOARD_TEXTURE',
            'SIZING_LOGIC',
            'POSITION_BATTLE',
            'ICM_PRESSURE',
            'MIXED_STRATEGY',
            'EXPLOIT_DEVIANCE',
            'MULTI_STREET',
            'TOURNAMENT_ENDGAME'
        ],
        scenarioComplexity: 10,
        xpMultiplier: 2.5,
        diamondMultiplier: 2.0,
        accentColor: '#FFD700',
        glowIntensity: 1.0,
        unlockAnimation: 'boss_emergence'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ LEVEL REGISTRY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class LevelRegistry {
    private readonly levels: Map<number, LevelDefinition>;

    constructor() {
        this.levels = new Map(Object.entries(LEVEL_REGISTRY).map(([k, v]) => [parseInt(k), v]));
        console.log('📊 LevelRegistry initialized');
        console.log(`   └─ ${this.levels.size} levels mapped (Foundations → Boss Mode)`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 📖 LEVEL QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get level definition by ID
     */
    getLevel(levelId: number): LevelDefinition | null {
        return this.levels.get(levelId) || null;
    }

    /**
     * Get all levels
     */
    getAllLevels(): LevelDefinition[] {
        return Array.from(this.levels.values()).sort((a, b) => a.id - b.id);
    }

    /**
     * Get levels by tier
     */
    getLevelsByTier(tier: DifficultyTier): LevelDefinition[] {
        return this.getAllLevels().filter(level => level.tier === tier);
    }

    /**
     * Get next level
     */
    getNextLevel(currentLevelId: number): LevelDefinition | null {
        return this.levels.get(currentLevelId + 1) || null;
    }

    /**
     * Check if level is Boss Mode
     */
    isBossMode(levelId: number): boolean {
        return levelId === 12;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ⚙️ DRILL CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get drill configuration for a level
     */
    getDrillConfig(levelId: number): DrillConfiguration {
        const level = this.getLevel(levelId);
        if (!level) {
            throw new Error(`Level ${levelId} not found in registry`);
        }

        return {
            levelId,
            questionsPerSession: level.tier === 'BOSS' ? 30 : 20,
            streakBonusEnabled: levelId >= 3,
            leakFocusEnabled: levelId >= 4,
            gtoBenchmarkEnabled: levelId >= 5,
            showAlternateLines: true, // Always show GTO + 2 alternate lines
            showEvExplanation: levelId >= 2
        };
    }

    /**
     * Get scenario configuration for AI content generation
     */
    getScenarioConfig(levelId: number): {
        types: ScenarioType[];
        complexity: number;
        evTolerance: number;
        timeLimit: number;
        requireMixedStrategy: boolean;
    } {
        const level = this.getLevel(levelId);
        if (!level) {
            throw new Error(`Level ${levelId} not found in registry`);
        }

        return {
            types: level.scenarioTypes,
            complexity: level.scenarioComplexity,
            evTolerance: level.evToleranceBB,
            timeLimit: level.timeLimitSeconds,
            requireMixedStrategy: level.scenarioTypes.includes('MIXED_STRATEGY')
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 💎 REWARD CALCULATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calculate XP reward for a drill
     */
    calculateXpReward(levelId: number, baseXp: number, accuracy: number): {
        baseXp: number;
        levelMultiplier: number;
        accuracyBonus: number;
        totalXp: number;
    } {
        const level = this.getLevel(levelId);
        if (!level) return { baseXp, levelMultiplier: 1, accuracyBonus: 0, totalXp: baseXp };

        const levelMultiplier = level.xpMultiplier;
        const accuracyBonus = accuracy >= 0.95 ? 1.2 : accuracy >= 0.90 ? 1.1 : 1.0;
        const totalXp = Math.floor(baseXp * levelMultiplier * accuracyBonus);

        return { baseXp, levelMultiplier, accuracyBonus, totalXp };
    }

    /**
     * Calculate Diamond reward for a level completion
     */
    calculateDiamondReward(levelId: number, baseDiamonds: number): {
        baseDiamonds: number;
        levelMultiplier: number;
        totalDiamonds: number;
    } {
        const level = this.getLevel(levelId);
        if (!level) return { baseDiamonds, levelMultiplier: 1, totalDiamonds: baseDiamonds };

        const levelMultiplier = level.diamondMultiplier;
        const totalDiamonds = Math.floor(baseDiamonds * levelMultiplier);

        return { baseDiamonds, levelMultiplier, totalDiamonds };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🎨 VISUAL CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get visual theme for a level
     */
    getVisualTheme(levelId: number): {
        accentColor: string;
        glowIntensity: number;
        unlockAnimation: string;
        tierBadge: string;
    } {
        const level = this.getLevel(levelId);
        if (!level) {
            return {
                accentColor: '#4ADE80',
                glowIntensity: 0.3,
                unlockAnimation: 'fade_in',
                tierBadge: 'BEGINNER'
            };
        }

        return {
            accentColor: level.accentColor,
            glowIntensity: level.glowIntensity,
            unlockAnimation: level.unlockAnimation,
            tierBadge: level.tier
        };
    }

    /**
     * Get progress visualization data
     */
    getProgressVisualization(): {
        levels: Array<{
            id: number;
            name: string;
            tier: DifficultyTier;
            color: string;
            isBoss: boolean;
        }>;
        tiers: DifficultyTier[];
    } {
        const levels = this.getAllLevels().map(level => ({
            id: level.id,
            name: level.name,
            tier: level.tier,
            color: level.accentColor,
            isBoss: level.tier === 'BOSS'
        }));

        const tiers: DifficultyTier[] = ['BEGINNER', 'STANDARD', 'INTERMEDIATE', 'ADVANCED', 'ELITE', 'BOSS'];

        return { levels, tiers };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭 FACTORY & SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

let levelRegistryInstance: LevelRegistry | null = null;

export function getLevelRegistry(): LevelRegistry {
    if (!levelRegistryInstance) {
        levelRegistryInstance = new LevelRegistry();
    }
    return levelRegistryInstance;
}

export function createLevelRegistry(): LevelRegistry {
    return new LevelRegistry();
}

export default LevelRegistry;
